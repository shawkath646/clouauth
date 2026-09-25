"use client";

import Script from "next/script";
import { useEffect, useCallback, useState, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { signInWithGoogleOneTap } from "@/actions/auth/google-one-tap.actions";
import { handleError } from "@/utils/error";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            isDismissedMoment: () => boolean;
            getNotDisplayedReason?: () => string;
            getSkippedReason?: () => string;
            getDismissedReason?: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapProps {
  gClientId?: string;
  isLoggedIn?: boolean;
}

export default function GoogleOneTap({ gClientId, isLoggedIn = false }: GoogleOneTapProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const isPromptingRef = useRef<boolean>(false);

  // Component is only eligible to show One Tap when configured, logged out,
  // and not already on the profile page.
  const isEligible = !!gClientId && !isLoggedIn && !pathname.startsWith("/profile");

  // Swallow benign FedCM AbortError and GSI_LOGGER logs so Next.js does not treat it as an unhandled error
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const isAbortError =
        reason?.name === "AbortError" ||
        (typeof reason?.message === "string" &&
          (reason.message.includes("signal is aborted") ||
            reason.message.includes("AbortError")));

      if (isAbortError) {
        event.preventDefault();
      }
    };

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    const shouldSuppress = (args: unknown[]) => {
      return args.some(
        (arg) =>
          typeof arg === "string" &&
          (arg.includes("FedCM get() rejects with AbortError") ||
            (arg.includes("[GSI_LOGGER]") && arg.includes("AbortError")))
      );
    };

    console.error = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      originalConsoleWarn.apply(console, args);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  const redirectToTempAuth = useCallback(
    (tempSessionId: string) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      params.set("tid", tempSessionId);
      if (pathname === "/signin") {
        window.history.replaceState(null, "", `/signin?${params.toString()}`);
      } else {
        router.push(`/signin?${params.toString()}`);
      }
    },
    [router, pathname]
  );

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response?.credential) {
        toast.error("Google Sign-In failed", {
          description: "No credential received from Google.",
        });
        return;
      }

      // Notify the sign-in page to enter a smooth authenticating state
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("clou_auth_start", {
            detail: { provider: "google", message: "Signing in with Google..." },
          })
        );
      }

      const toastId = toast.loading("Signing in with Google...");

      try {
        const result = await signInWithGoogleOneTap(response.credential);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("clou_auth_action", { detail: result }));
        }

        if (result.action === "LOGIN_SUCCESS") {
          toast.success("Signed in successfully!", { id: toastId });

          const currentParams = searchParamsRef.current;
          const clientId = currentParams.get("client_id");
          const redirectUri = currentParams.get("redirect_uri");
          const returnTo = currentParams.get("return_to");

          // When on /signin, SigninClient orchestrates the smooth visual transition
          // to prevent colliding navigations.
          if (pathname === "/signin") {
            return;
          }

          if (clientId && redirectUri) {
            router.refresh();
          } else if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
            router.replace(returnTo);
          } else {
            router.replace("/profile");
          }
        } else if (result.action === "ACCOUNT_DISABLED") {
          if (result.selfEnable && "tempSessionId" in result && result.tempSessionId) {
            toast.error("Account Disabled", {
              id: toastId,
              description: "Your account is disabled. Redirecting to enable account...",
            });
            redirectToTempAuth(result.tempSessionId);
          } else {
            toast.error("Account Disabled", {
              id: toastId,
              description: "Your account has been deactivated. Please contact support.",
            });
          }
        } else if (result.action === "METHOD_SELECTION") {
          toast.info("Two-Factor Authentication Required", {
            id: toastId,
            description: "Please complete two-factor verification to continue.",
          });
          redirectToTempAuth(result.tempSessionId);
        } else if (result.action === "ERROR") {
          toast.error("Authentication Error", {
            id: toastId,
            description: result.error || "Failed to sign in with Google.",
          });
        }
      } catch (err: unknown) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("clou_auth_action", {
              detail: { action: "ERROR", error: handleError(err, true) },
            })
          );
        }
        toast.error("Sign-In Error", {
          id: toastId,
          description: handleError(err, true),
        });
      }
    },
    [router, pathname, redirectToTempAuth]
  );

  const initializeGoogleOneTap = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isEligible || !window.google?.accounts?.id) return;

    const currentParams = searchParamsRef.current;
    if (currentParams.get("tid")) return;

    if (isPromptingRef.current) return;
    isPromptingRef.current = true;

    const context = pathname === "/signup" ? "signup" : pathname === "/signin" ? "signin" : "use";

    try {
      window.google.accounts.id.initialize({
        client_id: gClientId,
        callback: handleCredentialResponse,
        auto_select: false,
        itp_support: true,
        use_fedcm_for_prompt: true,
        context,
        prompt_parent_id: "google-one-tap-container",
      });

      window.google.accounts.id.prompt();
    } catch (e) {
      console.debug("Google One Tap prompt initialization failed:", e);
    }
  }, [isEligible, gClientId, pathname, handleCredentialResponse]);

  // Trigger One Tap on route change or when script becomes ready.
  useEffect(() => {
    isPromptingRef.current = false;
    initializeGoogleOneTap();

    return () => {
      try {
        window.google?.accounts?.id?.cancel();
      } catch { }
      isPromptingRef.current = false;
    };
  }, [pathname, scriptLoaded, initializeGoogleOneTap]);

  if (!isEligible) {
    return null;
  }

  return (
    <>
      <div
        id="google-one-tap-container"
        className="fixed top-4 right-4 z-50 pointer-events-auto"
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
    </>
  );
}