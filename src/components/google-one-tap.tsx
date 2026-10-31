"use client";

import Script from "next/script";
import { useEffect, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
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

/* ----------------------------- helpers ----------------------------- */

const subscribe = () => () => { };
/** false on server + hydration, true on the client; no setState-in-effect. */
function useIsMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// Global FedCM state across component lifecycles & route transitions
let isFedCMPromptActive = false;
let lastFedCMActionTime = 0;

function cancelActivePrompt() {
  if (!isFedCMPromptActive) return;
  try {
    window.google?.accounts?.id?.cancel();
  } catch { }
  isFedCMPromptActive = false;
  lastFedCMActionTime = Date.now();
}

// Demote benign FedCM GSI log noise to console.debug
function demoteGsiLogs(method: "error" | "warn", needles: string[]) {
  const original = console[method];
  console[method] = (...args: unknown[]) => {
    const first = typeof args[0] === "string" ? args[0] : "";
    if (first.includes("[GSI_LOGGER]") && needles.some((n) => first.includes(n))) {
      console.debug(...args);
      return;
    }
    original.apply(console, args);
  };
}

if (typeof window !== "undefined" && !window.__gsi_console_filter_installed) {
  window.__gsi_console_filter_installed = true;
  demoteGsiLogs("error", [
    "FedCM get() rejects",
    "AbortError",
    "NotAllowedError",
    "signal is aborted",
    "Only one navigator.credentials.get",
  ]);
  demoteGsiLogs("warn", ["FedCM", "AbortError", "NotAllowedError"]);
}

const dispatch = (name: string, detail: unknown) =>
  window.dispatchEvent(new CustomEvent(name, { detail }));

interface GoogleOneTapProps {
  gClientId?: string;
  isLoggedIn?: boolean;
}

export default function GoogleOneTap({ gClientId, isLoggedIn = false }: GoogleOneTapProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useParams<{ lang: string }>();

  const prefix =
    lang && (pathname === `/${lang}` || pathname.startsWith(`/${lang}/`)) ? `/${lang}` : "";
  const path = pathname.slice(prefix.length) || "/";

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedConfigKeyRef = useRef<string | null>(null);
  const credentialResponseRef = useRef<(r: { credential?: string }) => Promise<void>>(
    async () => { }
  );

  const isAuthPage = path === "/signin" || path === "/signup";

  const hasSessionCookie =
    isMounted &&
    !isAuthPage &&
    (document.cookie.includes("clou_logged_in=1") || document.cookie.includes("session_token"));

  const isEligible =
    isMounted &&
    Boolean(gClientId) &&
    !isLoggedIn &&
    !hasSessionCookie &&
    !path.startsWith("/profile");

  useEffect(() => {
    if (isAuthPage && document.cookie.includes("clou_logged_in=1")) {
      document.cookie =
        "clou_logged_in=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }, [isAuthPage]);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = typeof reason?.message === "string" ? reason.message : "";
      if (
        reason?.name === "AbortError" ||
        reason?.name === "NotAllowedError" ||
        msg.includes("signal is aborted") ||
        msg.includes("AbortError") ||
        msg.includes("navigator.credentials.get")
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  const redirectToTempAuth = useCallback(
    (tempSessionId: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set("tid", tempSessionId);
      const url = `${prefix}/signin?${params.toString()}`;
      if (path === "/signin") {
        window.history.replaceState(null, "", url);
      } else {
        router.push(url);
      }
    },
    [router, prefix, path]
  );

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response?.credential) {
        toast.error("Google Sign-In failed", {
          description: "No credential received from Google.",
        });
        return;
      }

      const isSigninPage = path === "/signin";

      dispatch("clou_auth_start", { provider: "google", message: "Signing in with Google..." });
      const toastId = isSigninPage ? undefined : toast.loading("Signing in with Google...");

      try {
        const result = await signInWithGoogleOneTap(response.credential);
        dispatch("clou_auth_action", result);

        switch (result.action) {
          case "LOGIN_SUCCESS": {
            if (isSigninPage) return; // SigninClient orchestrates the transition
            if (toastId) toast.success("Signed in successfully!", { id: toastId });

            const params = new URLSearchParams(window.location.search);
            const clientId = params.get("client_id");
            const redirectUri = params.get("redirect_uri");
            const returnTo = params.get("return_to");

            if (clientId && redirectUri) {
              router.refresh();
            } else {
              // returnTo is expected to include the locale (e.g. "/en/profile")
              const safe =
                returnTo &&
                returnTo.startsWith("/") &&
                !returnTo.startsWith("//") &&
                !returnTo.startsWith("/\\") &&
                !returnTo.startsWith(`${prefix}/signin`);
              router.refresh();
              router.push(safe ? returnTo : `${prefix}/profile`);
            }
            return;
          }

          case "ACCOUNT_DISABLED": {
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
            return;
          }

          case "METHOD_SELECTION": {
            if (isSigninPage) return;
            if (toastId) toast.dismiss(toastId);
            redirectToTempAuth(result.tempSessionId);
            return;
          }

          case "ERROR": {
            if (!isSigninPage) {
              toast.error("Authentication Error", {
                id: toastId,
                description: result.error || "Failed to sign in with Google.",
              });
            }
            return;
          }
        }
      } catch (err: unknown) {
        const errorDetail = handleError(err, true);
        dispatch("clou_auth_action", { action: "ERROR", error: errorDetail });
        if (!isSigninPage) {
          toast.error("Sign-In Error", { id: toastId, description: errorDetail });
        }
      }
    },
    [router, prefix, path, redirectToTempAuth]
  );

  // Always call the latest handler from the long-lived GSI callback
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
    if (!isEligible || !window.google?.accounts?.id) return;

    // Don't prompt while a temporary verification session is active
    if (new URLSearchParams(window.location.search).get("tid")) return;

    cleanupPromptTimer();

    const sinceLast = Date.now() - lastFedCMActionTime;
    const cooldown = sinceLast < 1000 ? 1000 - sinceLast : 0;
    const totalDelay = Math.max(450, cooldown);

    promptTimerRef.current = setTimeout(() => {
      const gsi = window.google?.accounts?.id;
      if (!gsi || isFedCMPromptActive) return;
      if (new URLSearchParams(window.location.search).get("tid")) return;

      const context = path === "/signup" ? "signup" : path === "/signin" ? "signin" : "use";
      const configKey = `${gClientId}_${context}`;

      try {
        // Avoid GSI warning: initialize() called multiple times
        if (initializedConfigKeyRef.current !== configKey) {
          gsi.initialize({
            client_id: gClientId,
            callback: (response: { credential?: string }) => {
              void credentialResponseRef.current(response);
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

        gsi.prompt((notification) => {
          const notDisplayed = notification.isNotDisplayed();
          const skipped = notification.isSkippedMoment();
          const dismissed = notification.isDismissedMoment();
          if (!(notDisplayed || skipped || dismissed)) return;

          isFedCMPromptActive = false;
          // Longer cooldown after an explicit dismissal
          lastFedCMActionTime = Date.now() + (dismissed ? 4000 : 0);

          if (notDisplayed) {
            console.debug("[Google One Tap] Not displayed:", notification.getNotDisplayedReason?.());
          }
          if (skipped) {
            console.debug("[Google One Tap] Skipped:", notification.getSkippedReason?.());
          }
        });
      } catch (e) {
        isFedCMPromptActive = false;
        console.debug("Google One Tap prompt initialization failed:", e);
      }
    }, totalDelay);
  }, [isEligible, gClientId, path, cleanupPromptTimer]);

  useEffect(() => {
    const onAuthStart = () => {
      cleanupPromptTimer();
      cancelActivePrompt();
    };
    window.addEventListener("clou_auth_start", onAuthStart);
    return () => window.removeEventListener("clou_auth_start", onAuthStart);
  }, [cleanupPromptTimer]);

  useEffect(() => {
    initializeGoogleOneTap();
    return () => {
      cleanupPromptTimer();
      cancelActivePrompt();
    };
  }, [scriptLoaded, initializeGoogleOneTap, cleanupPromptTimer]);

  if (!isEligible) return null;

  return (
    <>
      <div id="google-one-tap-container" className="fixed top-4 right-4 z-50 pointer-events-auto" />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
    </>
  );
}