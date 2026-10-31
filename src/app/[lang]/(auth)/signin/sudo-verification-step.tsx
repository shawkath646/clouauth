"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReCaptcha } from "@/lib/recaptcha/client";
import {
  resolveSudoPassword,
  getSudoPasskeyOptions,
  resolveSudoPasskey,
  sendSudoEmailCode,
  resolveSudoEmailCode,
  resolveSudoTotp,
} from "@/actions/auth/sudo.actions";
import { continueWithProvider } from "@/actions/oauth/oauth.actions";
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import { toast } from "sonner";
import {
  KeyRound,
  Fingerprint,
  Mail,
  ShieldAlert,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Smartphone,
} from "lucide-react";
import type { SudoMeta } from "@/actions/auth/verification";

interface SudoVerificationStepProps {
  tempSessionId: string;
  sudoMeta: SudoMeta;
  onSuccess: (redirectUrl: string) => void;
}

type SudoActiveTab = "password" | "passkey" | "oauth" | "email" | "totp";

export default function SudoVerificationStep({
  tempSessionId,
  sudoMeta,
  onSuccess,
}: SudoVerificationStepProps) {
  const { user, availableMethods, returnTo } = sudoMeta;
  const { executeRecaptcha } = useReCaptcha();

  // Determine initial active method
  const determineInitialTab = (): SudoActiveTab => {
    if (availableMethods.hasPassword) return "password";
    if (availableMethods.hasPasskey) return "passkey";
    if (availableMethods.connectedProviders.length > 0) return "oauth";
    if (availableMethods.hasTotp) return "totp";
    return "email";
  };

  const [activeTab, setActiveTab] = useState<SudoActiveTab>(determineInitialTab());
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Total methods count for showing "Verify another way"
  const methodCount =
    (availableMethods.hasPassword ? 1 : 0) +
    (availableMethods.hasPasskey ? 1 : 0) +
    (availableMethods.connectedProviders.length > 0 ? 1 : 0) +
    (availableMethods.hasTotp ? 1 : 0) +
    (availableMethods.hasEmailOtp ? 1 : 0);

  // 1. Password Verification Handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const recaptchaToken = await executeRecaptcha("sudo_password");
      const res = await resolveSudoPassword(
        tempSessionId,
        password,
        recaptchaToken ?? undefined
      );

      if (res.success && res.redirectUrl) {
        toast.success("Identity confirmed");
        onSuccess(res.redirectUrl);
      } else {
        setErrorMsg(res.error || "Incorrect password. Please try again.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Passkey Verification Handler
  const handlePasskeyVerify = async () => {
    if (!browserSupportsWebAuthn()) {
      setErrorMsg("Your browser does not support passkeys / WebAuthn.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const optionsRes = await getSudoPasskeyOptions(tempSessionId);
      if (!optionsRes.success || !optionsRes.options) {
        setErrorMsg(optionsRes.error || "Could not retrieve passkey challenge.");
        setIsLoading(false);
        return;
      }

      const assertion = await startAuthentication({
        optionsJSON: optionsRes.options as Parameters<typeof startAuthentication>[0]["optionsJSON"],
      });

      const res = await resolveSudoPasskey(tempSessionId, assertion);
      if (res.success && res.redirectUrl) {
        toast.success("Identity confirmed via passkey");
        onSuccess(res.redirectUrl);
      } else {
        setErrorMsg(res.error || "Passkey verification failed.");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setErrorMsg("Passkey prompt was cancelled.");
      } else {
        setErrorMsg("Failed to authenticate with passkey.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. OAuth Verification Trigger
  const handleOAuthClick = async (provider: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await continueWithProvider(provider, returnTo, {
        sudoTempSessionId: tempSessionId,
      });
    } catch {
      setIsLoading(false);
      setErrorMsg("Failed to start third-party verification.");
    }
  };

  // 4. Send Email OTP Code
  const handleSendEmailCode = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const recaptchaToken = await executeRecaptcha("send_sudo_code");
      const res = await sendSudoEmailCode(tempSessionId, recaptchaToken ?? undefined);
      if (res.success) {
        setEmailCodeSent(true);
        toast.success("Verification code sent to your email!");
      } else {
        setErrorMsg(res.error || "Failed to send code.");
      }
    } catch {
      setErrorMsg("Could not send code.");
    } finally {
      setIsLoading(false);
    }
  };

  const lastSubmittedEmailRef = useRef("");
  const lastSubmittedTotpRef = useRef("");

  // 5. Submit Email OTP Code
  const handleEmailCodeSubmit = async (e?: React.FormEvent, codeVal?: string) => {
    if (e) e.preventDefault();
    const targetCode = (codeVal !== undefined ? codeVal : otpCode).trim();
    if (!targetCode || targetCode.length !== 6 || isLoading) {
      if (!targetCode || targetCode.length !== 6) {
        setErrorMsg("Please enter the 6-digit code.");
      }
      return;
    }

    if (lastSubmittedEmailRef.current === targetCode) return;
    lastSubmittedEmailRef.current = targetCode;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const recaptchaToken = await executeRecaptcha("verify_sudo_code");
      const res = await resolveSudoEmailCode(
        tempSessionId,
        targetCode,
        recaptchaToken ?? undefined
      );

      if (res.success && res.redirectUrl) {
        toast.success("Identity confirmed");
        onSuccess(res.redirectUrl);
      } else {
        setErrorMsg(res.error || "Incorrect verification code.");
      }
    } catch {
      setErrorMsg("Failed to verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Submit TOTP Code
  const handleTotpSubmit = async (e?: React.FormEvent, codeVal?: string) => {
    if (e) e.preventDefault();
    const targetCode = (codeVal !== undefined ? codeVal : totpCode).trim();
    if (!targetCode || targetCode.length !== 6 || isLoading) {
      if (!targetCode || targetCode.length !== 6) {
        setErrorMsg("Please enter your 6-digit authenticator code.");
      }
      return;
    }

    if (lastSubmittedTotpRef.current === targetCode) return;
    lastSubmittedTotpRef.current = targetCode;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const recaptchaToken = await executeRecaptcha("verify_sudo_totp");
      const res = await resolveSudoTotp(
        tempSessionId,
        targetCode,
        recaptchaToken ?? undefined
      );

      if (res.success && res.redirectUrl) {
        toast.success("Identity confirmed");
        onSuccess(res.redirectUrl);
      } else {
        setErrorMsg(res.error || "Incorrect authenticator code.");
      }
    } catch {
      setErrorMsg("Failed to verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md p-6 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      {/* Header with User Persona */}
      <div className="text-center mb-6">
        <div className="relative inline-block mb-3">
          <Avatar className="w-16 h-16 border-2 border-primary/30 shadow-md mx-auto">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.displayName} />}
            <AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 p-1 bg-background dark:bg-card rounded-full border border-primary/20 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {user.displayName}
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">@{user.username}</p>

        <p className="text-xs sm:text-sm text-muted-foreground mt-3 px-2">
          Confirm your identity to proceed to sensitive security settings.
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm text-center font-medium"
        >
          {errorMsg}
        </motion.div>
      )}

      {/* Dynamic Method Form */}
      <div className="space-y-4">
        {/* Method 1: Password Form */}
        {activeTab === "password" && availableMethods.hasPassword && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  autoFocus
                  disabled={isLoading}
                  className="pr-10 h-10 rounded-xl bg-background/50 border-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !password}
              className="w-full h-10 rounded-xl gap-2 font-medium"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Confirm Password</span>
            </Button>
          </form>
        )}

        {/* Method 2: Passkey Trigger */}
        {activeTab === "passkey" && availableMethods.hasPasskey && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              Use your device&apos;s fingerprint, face recognition, or screen lock to verify.
            </div>

            <Button
              type="button"
              onClick={handlePasskeyVerify}
              disabled={isLoading}
              className="w-full h-10 rounded-xl gap-2 font-medium"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              <span>Verify with Passkey</span>
            </Button>
          </div>
        )}

        {/* Method 3: Connected OAuth Provider(s) */}
        {activeTab === "oauth" && availableMethods.connectedProviders.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-center text-muted-foreground mb-1">
              Verify using your connected identity provider:
            </p>

            {availableMethods.connectedProviders.map((provider) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleOAuthClick(provider)}
                className="w-full h-11 rounded-xl border-primary/20 hover:border-primary/40 bg-background/50 hover:bg-background/80 font-medium capitalize gap-2 text-sm justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Continue with {provider}</span>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* Method 4: Authenticator App (TOTP) */}
        {activeTab === "totp" && availableMethods.hasTotp && (
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">6-Digit Authenticator Code</label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setTotpCode(val);
                  if (val.length === 6) {
                    handleTotpSubmit(undefined, val);
                  }
                }}
                placeholder="123456"
                autoFocus
                disabled={isLoading}
                className="h-10 text-center tracking-widest font-mono text-base rounded-xl bg-background/50 border-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || totpCode.length !== 6}
              className="w-full h-10 rounded-xl gap-2 font-medium cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              <span>Verify Code</span>
            </Button>
          </form>
        )}

        {/* Method 5: Email OTP Code */}
        {activeTab === "email" && availableMethods.hasEmailOtp && (
          <div className="space-y-4">
            {!emailCodeSent ? (
              <div className="text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Send a 6-digit confirmation code to your primary email{" "}
                  <strong className="text-foreground">{user.email}</strong>.
                </p>
                <Button
                  type="button"
                  onClick={handleSendEmailCode}
                  disabled={isLoading}
                  className="w-full h-10 rounded-xl gap-2 font-medium cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Send Security Code</span>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailCodeSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Enter 6-Digit Email Code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpCode(val);
                      if (val.length === 6) {
                        handleEmailCodeSubmit(undefined, val);
                      }
                    }}
                    placeholder="123456"
                    autoFocus
                    disabled={isLoading}
                    className="h-10 text-center tracking-widest font-mono text-base rounded-xl bg-background/50 border-primary/20"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-full h-10 rounded-xl gap-2 font-medium cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Verify Email Code</span>
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Didn&apos;t receive code?{" "}
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={isLoading}
                    className="text-primary font-medium hover:underline"
                  >
                    Resend
                  </button>
                </p>
              </form>
            )}
          </div>
        )}

        {/* "Verify Another Way" Method Selector (when user has multiple connected methods) */}
        {methodCount > 1 && (
          <div className="pt-3 border-t border-border/40 text-center">
            <p className="text-xs text-muted-foreground mb-2">Or verify another way:</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {availableMethods.hasPassword && activeTab !== "password" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("password");
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-primary/20 bg-background/40 hover:bg-background/80 text-foreground transition-all flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3 text-primary" />
                  <span>Password</span>
                </button>
              )}

              {availableMethods.hasPasskey && activeTab !== "passkey" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("passkey");
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-primary/20 bg-background/40 hover:bg-background/80 text-foreground transition-all flex items-center gap-1"
                >
                  <Fingerprint className="w-3 h-3 text-primary" />
                  <span>Passkey</span>
                </button>
              )}

              {availableMethods.connectedProviders.length > 0 && activeTab !== "oauth" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("oauth");
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-primary/20 bg-background/40 hover:bg-background/80 text-foreground transition-all capitalize"
                >
                  <span>{availableMethods.connectedProviders[0]}</span>
                </button>
              )}

              {availableMethods.hasTotp && activeTab !== "totp" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("totp");
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-primary/20 bg-background/40 hover:bg-background/80 text-foreground transition-all flex items-center gap-1"
                >
                  <Smartphone className="w-3 h-3 text-primary" />
                  <span>Authenticator</span>
                </button>
              )}

              {availableMethods.hasEmailOtp && activeTab !== "email" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("email");
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-primary/20 bg-background/40 hover:bg-background/80 text-foreground transition-all flex items-center gap-1"
                >
                  <Mail className="w-3 h-3 text-primary" />
                  <span>Email OTP</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cancel / Abort Link */}
        <div className="text-center pt-2">
          <Link
            href={returnTo || "/profile"}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Cancel and return</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
