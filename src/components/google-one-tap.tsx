"use client";

import Script from "next/script";
import { useEffect, useCallback, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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

// Demote benign FedCM GSI log noise (e.g. user dismissal or navigation aborts) to console.debug
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
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedConfigKeyRef = useRef<string | null>(null);
  const credentialResponseRef = useRef<(response: { credential?: string }) => Promise<void>>(async () => {});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAuthPage = pathname === "/signin" || pathname === "/signup";

  // Check login indicator: on auth pages, any existing session cookie is outdated/invalid
  // (otherwise signin would have redirected to /profile), so it must NOT block One Tap.
  const hasSessionCookie =
    !isAuthPage &&
    isMounted &&
    typeof document !== "undefined" &&
    (document.cookie.includes("clou_logged_in=1") ||
      document.cookie.includes("session_token"));

  const isEligible =
    isMounted &&
    Boolean(gClientId) &&
    !isLoggedIn &&
    !hasSessionCookie &&
    !pathname.startsWith("/profile");

  // Proactively clear stale clou_logged_in indicator when visiting unauthenticated auth pages
  useEffect(() => {
    if (isAuthPage && typeof document !== "undefined" && document.cookie.includes("clou_logged_in=1")) {
      document.cookie = "clou_logged_in=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }, [isAuthPage]);

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
      const params = new URLSearchParams(window.location.search);
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

      const isSigninPage = pathname === "/signin";

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("clou_auth_start", {
            detail: { provider: "google", message: "Signing in with Google..." },
          })
        );
      }

      const toastId = isSigninPage ? undefined : toast.loading("Signing in with Google...");

      try {
        const result = await signInWithGoogleOneTap(response.credential);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("clou_auth_action", { detail: result }));
        }

        if (result.action === "LOGIN_SUCCESS") {
          if (!isSigninPage && toastId) {
            toast.success("Signed in successfully!", { id: toastId });
          }

          // In signin page, SigninClient orchestrates the smooth visual transition
          if (isSigninPage) {
            return;
          }

          // Direct client navigation using URL search params
          const params = new URLSearchParams(window.location.search);
          const clientId = params.get("client_id");
          const redirectUri = params.get("redirect_uri");
          const returnTo = params.get("return_to");

          if (clientId && redirectUri) {
            router.refresh();
          } else {
            const target =
              returnTo &&
              returnTo.startsWith("/") &&
              !returnTo.startsWith("//") &&
              !returnTo.startsWith("/signin")
                ? returnTo
                : "/profile";
            router.refresh();
            router.push(target);
          }
        } else if (result.action === "ACCOUNT_DISABLED") {
          if (isSigninPage) return;
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
          if (isSigninPage) return;
          if (toastId) toast.dismiss(toastId);
          redirectToTempAuth(result.tempSessionId);
        } else if (result.action === "ERROR") {
          if (!isSigninPage) {
            toast.error("Authentication Error", {
              id: toastId,
              description: result.error || "Failed to sign in with Google.",
            });
          }
        }
      } catch (err: unknown) {
        const errorDetail = handleError(err, true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("clou_auth_action", {
              detail: { action: "ERROR", error: errorDetail },
            })
          );
        }
        if (!isSigninPage) {
          toast.error("Sign-In Error", {
            id: toastId,
            description: errorDetail,
          });
        }
      }
    },
    [router, pathname, redirectToTempAuth]
  );

  useEffect(() => {
    credentialResponseRef.current = handleCredentialResponse;
  }, [handleCredentialResponse]);

  const cleanupPromptTimer = useCallback(() => {
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  }, []);

  const initializeGoogleOneTap = useCallback(() => {
    if (typeof window === "undefined" || !isEligible || !window.google?.accounts?.id) return;

    // Do not prompt if a temporary verification session is active in the URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("tid")) return;

    cleanupPromptTimer();

    const now = Date.now();
    const timeSinceLastAction = now - lastFedCMActionTime;
    const cooldownDelay = timeSinceLastAction < 1000 ? 1000 - timeSinceLastAction : 0;
    const totalDelay = Math.max(450, cooldownDelay);

    promptTimerRef.current = setTimeout(() => {
      if (!isEligible || typeof window === "undefined" || !window.google?.accounts?.id) return;

      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.get("tid")) return;

      if (isFedCMPromptActive) return;

      const context = pathname === "/signup" ? "signup" : pathname === "/signin" ? "signin" : "use";
      const configKey = `${gClientId}_${context}`;

      try {
        // Prevent duplicate initialize() calls that trigger GSI warning:
        // 'google.accounts.id.initialize() is called multiple times.'
        if (initializedConfigKeyRef.current !== configKey) {
          window.google.accounts.id.initialize({
            client_id: gClientId,
            callback: (response: { credential?: string }) => {
              credentialResponseRef.current(response);
            },
            auto_select: false,
            itp_support: true,
            use_fedcm_for_prompt: true,
            context,
            prompt_parent_id: "google-one-tap-container",
          });
          initializedConfigKeyRef.current = configKey;
        }

        isFedCMPromptActive = true;
        lastFedCMActionTime = Date.now();

        window.google.accounts.id.prompt((notification) => {
          const notDisplayed = notification.isNotDisplayed();
          const skipped = notification.isSkippedMoment();
          const dismissed = notification.isDismissedMoment();

          if (notDisplayed || skipped || dismissed) {
            isFedCMPromptActive = false;
            lastFedCMActionTime = Date.now();
            if (dismissed) {
              lastFedCMActionTime = Date.now() + 4000;
            }
            if (notDisplayed) {
              console.debug("[Google One Tap] Prompt not displayed:", notification.getNotDisplayedReason?.());
            }
            if (skipped) {
              console.debug("[Google One Tap] Prompt skipped:", notification.getSkippedReason?.());
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

  if (!isMounted || !isEligible) {
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
