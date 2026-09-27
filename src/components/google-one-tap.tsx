"use client";

import Script from "next/script";
import { useEffect, useCallback, useState, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { signInWithGoogleOneTap } from "@/actions/auth/google-one-tap.actions";
import { handleError } from "@/utils/error";

declare global {
  interface Window {
    __gsi_console_filter_installed?: boolean;
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

// Global FedCM state across component lifecycles & Next.js route transitions
let isFedCMPromptActive = false;
let lastFedCMActionTime = 0;

// Smart console filter: Google Identity Services (GSI) internally logs benign FedCM
// AbortError (e.g. user dismisses or navigates) and cooldown NotAllowedError to console.error
// with prefix [GSI_LOGGER]. In Next.js Turbopack, any console.error triggers an intrusive
// developer error overlay. We demote these third-party benign logs to console.debug.
if (typeof window !== "undefined" && !window.__gsi_console_filter_installed) {
  window.__gsi_console_filter_installed = true;

  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    const firstArg = typeof args[0] === "string" ? args[0] : "";
    if (
      firstArg.includes("[GSI_LOGGER]") &&
      (firstArg.includes("FedCM get() rejects") ||
        firstArg.includes("AbortError") ||
        firstArg.includes("NotAllowedError") ||
        firstArg.includes("signal is aborted") ||
        firstArg.includes("Only one navigator.credentials.get"))
    ) {
      console.debug(...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: unknown[]) {
    const firstArg = typeof args[0] === "string" ? args[0] : "";
    if (
      firstArg.includes("[GSI_LOGGER]") &&
      (firstArg.includes("FedCM") ||
        firstArg.includes("AbortError") ||
        firstArg.includes("NotAllowedError"))
    ) {
      console.debug(...args);
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
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
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Component is only eligible to show One Tap when configured, logged out,
  // and not already on the profile page.
  const isEligible = !!gClientId && !isLoggedIn && !pathname.startsWith("/profile");

  // Secondary safety net for unhandled promise rejections
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const isAbortOrConflict =
        reason?.name === "AbortError" ||
        reason?.name === "NotAllowedError" ||
        (typeof reason?.message === "string" &&
          (reason.message.includes("signal is aborted") ||
            reason.message.includes("AbortError") ||
            reason.message.includes("navigator.credentials.get")));

      if (isAbortOrConflict) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
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
          toast.dismiss(toastId);
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

  const cleanupPromptTimer = useCallback(() => {
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  }, []);

  const initializeGoogleOneTap = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isEligible || !window.google?.accounts?.id) return;

    // Do not prompt if a temporary verification session is active
    const currentParams = searchParamsRef.current;
    if (currentParams.get("tid")) return;

    // Clear any pending timer
    cleanupPromptTimer();

    // Prevent prompt collisions by calculating needed settlement delay
    const now = Date.now();
    const timeSinceLastAction = now - lastFedCMActionTime;
    const cooldownDelay = timeSinceLastAction < 1000 ? 1000 - timeSinceLastAction : 0;
    // Always provide at least 450ms debounce to absorb React StrictMode mount/unmount cycles
    const totalDelay = Math.max(450, cooldownDelay);

    promptTimerRef.current = setTimeout(() => {
      if (!isEligible || typeof window === "undefined" || !window.google?.accounts?.id) return;
      if (searchParamsRef.current.get("tid")) return;

      // Ensure no concurrent prompt is already active
      if (isFedCMPromptActive) return;

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

        isFedCMPromptActive = true;
        lastFedCMActionTime = Date.now();

        window.google.accounts.id.prompt((notification) => {
          if (
            notification.isNotDisplayed() ||
            notification.isSkippedMoment() ||
            notification.isDismissedMoment()
          ) {
            isFedCMPromptActive = false;
            lastFedCMActionTime = Date.now();
            if (notification.isDismissedMoment()) {
              // Add a cooldown if user closed the prompt
              lastFedCMActionTime = Date.now() + 4000;
            }
          }
        });
      } catch (e) {
        isFedCMPromptActive = false;
        console.debug("Google One Tap prompt initialization failed:", e);
      }
    }, totalDelay);
  }, [isEligible, gClientId, pathname, handleCredentialResponse, cleanupPromptTimer]);

  // Cancel One Tap if another authentication method begins
  useEffect(() => {
    const handleAuthStart = () => {
      cleanupPromptTimer();
      if (isFedCMPromptActive) {
        try {
          window.google?.accounts?.id?.cancel();
        } catch {}
        isFedCMPromptActive = false;
        lastFedCMActionTime = Date.now();
      }
    };

    window.addEventListener("clou_auth_start", handleAuthStart);
    return () => {
      window.removeEventListener("clou_auth_start", handleAuthStart);
    };
  }, [cleanupPromptTimer]);

  // Trigger One Tap on route change or when script becomes ready
  useEffect(() => {
    initializeGoogleOneTap();

    return () => {
      cleanupPromptTimer();
      if (isFedCMPromptActive) {
        try {
          window.google?.accounts?.id?.cancel();
        } catch {}
        isFedCMPromptActive = false;
        lastFedCMActionTime = Date.now();
      }
    };
  }, [pathname, scriptLoaded, initializeGoogleOneTap, cleanupPromptTimer]);

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