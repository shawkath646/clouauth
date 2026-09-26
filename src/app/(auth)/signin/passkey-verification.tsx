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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md p-5 sm:p-6 md:p-8 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="flex items-center justify-center mb-5 relative">
        <div className="text-center w-full">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("passkey")}
          </h1>
        </div>
      </div>

      <div className="space-y-6 flex flex-col items-center">
        <div className="bg-primary/10 p-6 rounded-full">
          <Fingerprint className="h-12 w-12 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {t("passkeyDesc")}
        </p>

        {!isSupported && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20 w-full">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This browser does not support WebAuthn passkeys. Please use another sign-in method.</span>
          </div>
        )}

        <Button className="w-full" onClick={() => handleVerify(true)} disabled={isLoading || !isSupported}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("verify")}
        </Button>
      </div>
    </motion.div>
  );
}