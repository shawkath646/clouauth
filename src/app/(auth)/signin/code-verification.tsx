"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent, ChangeEvent, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useTranslations } from "@/lib/i18n/hooks";
import { Loader2 } from "lucide-react";

import { triggerVerificationMethod, resolveCodeVerification, resolveTotpVerification } from "@/actions/auth/verification.actions";
import { handleError } from "@/utils/utils";

interface CodeVerificationProps {
  onComplete: (result: unknown) => void;
  tempSessionId: string | null;
  methodType?: "code" | "totp" | string;
}

export default function CodeVerification({ onComplete, tempSessionId, methodType = "code" }: CodeVerificationProps) {
  const codeLength = methodType === "totp" ? 6 : 8;
  const { t } = useTranslations("signin");
  const [code, setCode] = useState<string[]>(Array(codeLength).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleResend = async () => {
    if (!tempSessionId) return;
    setIsResending(true);
    setErrorMsg(null);
    try {
      const result = await triggerVerificationMethod(tempSessionId, "email");
      if (!result.success) {
        setErrorMsg('error' in result && result.error ? result.error : "Failed to resend code.");
      } else {
        setCountdown(60); // 60 seconds countdown
        setCode(Array(codeLength).fill(""));
        focusInput(0);
      }
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute CodeVerification");
        setErrorMsg(em);
      } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (!tempSessionId) {
      setErrorMsg("No active session. Please sign in again.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = methodType === "totp" 
        ? await resolveTotpVerification(tempSessionId, code.join(""))
        : await resolveCodeVerification(tempSessionId, code.join(""));
      if (response.success) {
        onComplete(response);
      } else {
        setErrorMsg(response.error || "Invalid code");
      }
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute CodeVerification");
        setErrorMsg(em);
      } finally {
      setIsLoading(false);
    }
  };

  const focusInput = (index: number) => {
    if (index >= 0 && index < codeLength) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        e.preventDefault();
        const newCode = [...code];
        newCode[index - 1] = "";
        setCode(newCode);
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const processPastedData = (pastedData: string) => {
    const pastedNumbers = pastedData.replace(/\D/g, "").slice(0, codeLength);
    if (!pastedNumbers) return;

    const newCode = [...code];
    for (let i = 0; i < pastedNumbers.length; i++) {
      newCode[i] = pastedNumbers[i];
    }
    setCode(newCode);

    const nextFocusIndex = Math.min(pastedNumbers.length, codeLength - 1);
    focusInput(nextFocusIndex);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    processPastedData(pastedData);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;

    if (value.length > 2) {
      processPastedData(value);
      return;
    }

    let newValue = value;
    if (value.length === 2) {
      newValue = value.endsWith(code[index]) ? value.charAt(0) : value.charAt(1);
    }

    if (newValue === "") {
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
      return;
    }

    if (!/^\d$/.test(newValue)) return;

    const newCode = [...code];
    newCode[index] = newValue;
    setCode(newCode);

    if (index < codeLength - 1) {
      focusInput(index + 1);
    }
  };

  const isComplete = code.join("").length === codeLength;

  return (
    <motion.div
      key="verification-code"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-xl p-4 sm:p-6 md:p-8 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="flex items-center justify-center mb-5 relative">
        <div className="text-center w-full">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("enterCode")}
          </h1>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-12">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("verificationCodeDesc")}
          </p>
        </div>

        <fieldset className="border-0 p-0 m-0">
          <legend className="sr-only">{t("codePlaceholder")}</legend>
          <div className="flex gap-1.5 sm:gap-3 justify-center">
            {code.map((digit, index) => (
              <Input
                key={`slot-${index}`}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={2}
                value={digit}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                aria-label={`Digit ${index + 1} of ${codeLength}`}
                className="w-9 h-11 sm:w-12 sm:h-14 px-1 text-center text-lg sm:text-xl font-semibold shadow-sm focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-4">
          <Button
            className="w-full h-12 text-base"
            onClick={handleVerify}
            disabled={isLoading || !isComplete}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("verify")}
          </Button>

          {methodType !== "totp" && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("didntReceiveCode")}{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isResending}
                  className="text-primary font-medium hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {isResending
                    ? t("resending")
                    : countdown > 0
                    ? `${t("resendCode")} (${countdown}s)`
                    : t("resendCode")}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}