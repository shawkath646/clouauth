"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent, ChangeEvent, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useTranslations } from "@/lib/i18n/hooks";
import { Loader2, Mail, ShieldCheck, AlertCircle } from "lucide-react";

import { triggerVerificationMethod, resolveCodeVerification, resolveTotpVerification } from "@/actions/auth/verification.actions";
import { handleError } from "@/utils/error";
import { SignInReturn } from "@/actions/auth/auth.actions";
import { useReCaptcha } from "@/lib/recaptcha/client";

interface CodeVerificationProps {
  onComplete: (result: SignInReturn) => void;
  tempSessionId: string | null;
  methodType?: "code" | "totp" | string;
}

export default function CodeVerification({
  onComplete,
  tempSessionId,
  methodType = "code",
}: CodeVerificationProps) {
  const isTotp = methodType === "totp";
  const codeLength = isTotp ? 6 : 8;
  const { t } = useTranslations("signin");
  const { executeRecaptcha } = useReCaptcha();
  const [code, setCode] = useState<string[]>(Array(codeLength).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastSubmittedRef = useRef<string>("");

  const handleResend = async () => {
    if (!tempSessionId) return;
    setIsResending(true);
    setErrorMsg(null);
    try {
      const recaptchaToken = await executeRecaptcha("resend_code");
      const result = await triggerVerificationMethod(
        tempSessionId,
        "email",
        recaptchaToken ?? undefined
      );
      if (!result.success) {
        setErrorMsg('error' in result && result.error ? result.error : "Failed to resend code.");
      } else {
        setCountdown(60);
        setCode(Array(codeLength).fill(""));
        lastSubmittedRef.current = "";
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

  const triggerVerification = useCallback(
    async (codeToVerify?: string[]) => {
      const targetCode = (codeToVerify || code).join("");
      if (targetCode.length !== codeLength || isLoading) return;

      if (lastSubmittedRef.current === targetCode) return;
      lastSubmittedRef.current = targetCode;

      if (!tempSessionId) {
        setErrorMsg("No active session. Please sign in again.");
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const actionName = isTotp ? "verify_totp" : "verify_code";
        const recaptchaToken = await executeRecaptcha(actionName);
        const response = isTotp
          ? await resolveTotpVerification(tempSessionId, targetCode, recaptchaToken ?? undefined)
          : await resolveCodeVerification(tempSessionId, targetCode, recaptchaToken ?? undefined);

        if (response && response.action === "ERROR") {
          setErrorMsg(response.error || "Invalid verification code");
        } else {
          onComplete(response);
        }
      } catch (e: unknown) {
        const em = handleError(e, "Failed to execute CodeVerification");
        setErrorMsg(em);
      } finally {
        setIsLoading(false);
      }
    },
    [code, codeLength, isLoading, tempSessionId, isTotp, executeRecaptcha, onComplete]
  );

  // Auto-submit when all digits are filled
  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === codeLength && fullCode !== lastSubmittedRef.current && !isLoading) {
      triggerVerification(code);
    }
  }, [code, codeLength, isLoading, triggerVerification]);

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

    if (pastedNumbers.length === codeLength) {
      triggerVerification(newCode);
    }
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
    } else if (newCode.join("").length === codeLength) {
      triggerVerification(newCode);
    }
  };

  const isComplete = code.join("").length === codeLength;

  return (
    <motion.div
      key="verification-code"
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full max-w-[420px] p-5 sm:p-6 bg-card/80 dark:bg-card/45 backdrop-blur-2xl border border-border/70 dark:border-white/[0.08] shadow-2xl rounded-2xl sm:rounded-3xl flex flex-col mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-5">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
          {isTotp ? <ShieldCheck className="h-6 w-6 stroke-[2.2]" /> : <Mail className="h-6 w-6 stroke-[2]" />}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {isTotp
            ? t("authenticatorApp")
            : t("enterCode")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-[320px] leading-relaxed">
          {isTotp
            ? t("authenticatorAppDesc")
            : t("emailCodeDesc")}
        </p>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-left">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {/* Code Input Form */}
      <div className="flex flex-col gap-5">
        <fieldset className="border-0 p-0 m-0">
          <legend className="sr-only">{t("codePlaceholder")}</legend>

          {isTotp ? (
            /* 6-digit layout for TOTP */
            <div className="flex gap-2 sm:gap-2.5 justify-center">
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
                  className="w-10 sm:w-11 h-12 px-0 text-center font-mono text-lg sm:text-xl font-bold rounded-xl border border-border/70 bg-background/80 dark:bg-background/40 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                />
              ))}
            </div>
          ) : (
            /* 8-digit split layout (4 + 4) for Email OTP */
            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
              {code.slice(0, 4).map((digit, idx) => {
                const index = idx;
                return (
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
                    className="w-8 sm:w-9.5 h-11 sm:h-12 px-0 text-center font-mono text-base sm:text-lg font-bold rounded-lg sm:rounded-xl border border-border/70 bg-background/80 dark:bg-background/40 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                  />
                );
              })}

              <span className="text-muted-foreground/40 font-bold px-0.5 select-none text-sm">—</span>

              {code.slice(4, 8).map((digit, idx) => {
                const index = idx + 4;
                return (
                  <Input
                    key={`slot-${index}`}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="off"
                    maxLength={2}
                    value={digit}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    aria-label={`Digit ${index + 1} of ${codeLength}`}
                    className="w-8 sm:w-9.5 h-11 sm:h-12 px-0 text-center font-mono text-base sm:text-lg font-bold rounded-lg sm:rounded-xl border border-border/70 bg-background/80 dark:bg-background/40 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                  />
                );
              })}
            </div>
          )}
        </fieldset>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl cursor-pointer"
            onClick={() => triggerVerification(code)}
            disabled={isLoading || !isComplete}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("verify")}
          </Button>

          {!isTotp && (
            <div className="text-center pt-0.5">
              <p className="text-xs text-muted-foreground">
                {t("didntReceiveCode")}{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isResending}
                  className="text-primary font-medium hover:underline focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
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