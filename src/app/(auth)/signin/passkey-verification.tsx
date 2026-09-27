"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/hooks";
import { Loader2, Fingerprint, AlertCircle } from "lucide-react";
import { startAuthentication, browserSupportsWebAuthn, WebAuthnAbortService } from "@simplewebauthn/browser";
import { resolvePasskeyVerification, triggerVerificationMethod } from "@/actions/auth/verification.actions";
import { toast } from "sonner";
import { handleError } from "@/utils/error";
import { SignInReturn } from "@/actions/auth/auth.actions";

export type PasskeyAuthOptions = Parameters<typeof startAuthentication>[0]["optionsJSON"];

interface PasskeyVerificationProps {
  onComplete: (result: SignInReturn) => void;
  tempSessionId: string | null;
  options?: PasskeyAuthOptions | null;
}

export default function PasskeyVerification({ onComplete, tempSessionId, options }: PasskeyVerificationProps) {
  const { t } = useTranslations("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(() => (typeof window !== "undefined" ? browserSupportsWebAuthn() : true));
  const isVerifyingRef = useRef(false);
  const hasTriggeredRef = useRef(false);
  const mountedRef = useRef(true);
  const initialOptionsUsedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        WebAuthnAbortService.cancelCeremony();
      } catch {}
    };
  }, []);

  const handleVerify = useCallback(async (isRetry = false) => {
    if (isVerifyingRef.current) return;

    if (!browserSupportsWebAuthn()) {
      setIsSupported(false);
      toast.error("Browser Unsupported", {
        description: "Your browser does not support passkeys. Please choose another verification method.",
      });
      return;
    }

    if (!tempSessionId) {
      toast.error("Error", { description: "No active verification session" });
      return;
    }

    hasTriggeredRef.current = true;
    isVerifyingRef.current = true;
    setIsLoading(true);

    try {
      let authOptions: PasskeyAuthOptions | null = null;

      // Use initial options only on the very first auto-trigger; on retry, always fetch fresh challenge
      if (!isRetry && !initialOptionsUsedRef.current && options) {
        authOptions = options;
        initialOptionsUsedRef.current = true;
      } else {
        const res = await triggerVerificationMethod(tempSessionId, "passkey");
        if (!res.success || !res.payload) {
          toast.error("Error", { description: res.error || "Failed to generate passkey challenge" });
          return;
        }
        authOptions = res.payload as PasskeyAuthOptions;
      }

      if (!authOptions) {
        toast.error("Error", { description: "Passkey options missing" });
        return;
      }

      const assertionResponse = await startAuthentication({ optionsJSON: authOptions });

      const result = await resolvePasskeyVerification(tempSessionId, assertionResponse);
      if (!mountedRef.current) return;

      if (result && result.action === "ERROR") {
        toast.error("Verification Error", { description: result.error || "Passkey verification failed" });
      } else {
        onComplete(result);
      }
    } catch (e: unknown) {
      if (!mountedRef.current) return;

      if (e instanceof Error) {
        if (e.name === "NotAllowedError") {
          // User canceled or timed out; do not display noisy red toast
          toast.info("Passkey prompt canceled", { description: "Click Verify below to try again." });
          return;
        }
        if (e.name === "SecurityError") {
          toast.error("Security Error", {
            description: "Passkey origin/RP ID mismatch. Please ensure you are accessing via HTTPS or localhost.",
          });
          return;
        }
      }

      const em = handleError(e, "Passkey verification failed");
      toast.error("Verification failed", { description: em });
    } finally {
      isVerifyingRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [onComplete, options, tempSessionId]);

  useEffect(() => {
    if (hasTriggeredRef.current) return;

    const timer = setTimeout(() => {
      if (mountedRef.current && !hasTriggeredRef.current) {
        handleVerify(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [handleVerify]);

  return (
    <motion.div
      key="verification-passkey"
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full max-w-[420px] p-5 sm:p-6 bg-card/80 dark:bg-card/45 backdrop-blur-2xl border border-border/70 dark:border-white/[0.08] shadow-2xl rounded-2xl sm:rounded-3xl flex flex-col mx-auto"
    >
      <div className="flex flex-col items-center text-center mb-5">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
          <Fingerprint className="h-7 w-7 stroke-[2]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t("passkey")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-[320px] leading-relaxed">
          {t("passkeyDesc")}
        </p>
      </div>

      <div className="space-y-4 flex flex-col items-center w-full">
        {!isSupported && (
          <div className="flex items-center gap-2.5 p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20 w-full">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This browser does not support WebAuthn passkeys. Please use another sign-in method.</span>
          </div>
        )}

        <Button
          className="w-full h-7 sm:h-8 text-sm sm:text-base font-semibold rounded-xl cursor-pointer"
          onClick={() => handleVerify(true)}
          disabled={isLoading || !isSupported}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("verify")}
        </Button>
      </div>
    </motion.div>
  );
}