"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import CredentialsStep from "./credentials-step";
import VerificationMethodStep from "./verification-method-step";
import CodeVerification from "./code-verification";
import PasskeyVerification, { type PasskeyAuthOptions } from "./passkey-verification";
import AgreementStep from "./agreement-step";
import ReenableAccountStep from "./reenable-account-step";
import SudoVerificationStep from "./sudo-verification-step";
import { VerificationMethod } from "@/types/auth.types";
import type { SudoMeta } from "@/actions/auth/verification";
import { triggerVerificationMethod } from "@/actions/auth/verification.actions";
import { grantOAuthAccess } from "@/actions/oauth/oauth.actions";
import { toast } from "sonner";
import { handleError } from "@/utils/error";
import { SignInReturn } from "@/actions/auth/auth.actions";

type Step = "CREDENTIALS" | "METHOD_SELECTION" | "VERIFICATION" | "AGREEMENT" | "REENABLE_ACCOUNT" | "SUDO_VERIFICATION";

interface SigninClientProps {
  initialStep?: Step;
  initialTempSessionId?: string | null;
  initialMethods?: VerificationMethod[];
  sudoMeta?: SudoMeta | null;
  appData?: {
    name: string;
    icon: string | null;
  } | null;
}

export default function SigninClient({
  initialStep = "CREDENTIALS",
  initialTempSessionId = null,
  initialMethods = [],
  sudoMeta = null,
  appData,
}: SigninClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [tempSessionId, setTempSessionId] = useState<string | null>(initialTempSessionId);
  const [availableMethods, setAvailableMethods] = useState<VerificationMethod[]>(initialMethods);
  const [passkeyOptions, setPasskeyOptions] = useState<PasskeyAuthOptions | null>(null);
  const [isGranting, setIsGranting] = useState(false);

  // Smooth loading / authenticating overlay state
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMessage, setAuthMessage] = useState<string>("Signing you in...");
  const [isSuccess, setIsSuccess] = useState(false);

  // Adjust state when props change without triggering cascading effects
  const [prevInitialStep, setPrevInitialStep] = useState(initialStep);
  if (initialStep !== prevInitialStep) {
    setPrevInitialStep(initialStep);
    setCurrentStep(initialStep);
  }

  const [prevTid, setPrevTid] = useState(initialTempSessionId);
  if (initialTempSessionId !== prevTid) {
    setPrevTid(initialTempSessionId);
    setTempSessionId(initialTempSessionId);
  }

  const [prevMethods, setPrevMethods] = useState(initialMethods);
  if (initialMethods !== prevMethods && initialMethods.length > 0) {
    setPrevMethods(initialMethods);
    setAvailableMethods(initialMethods);
  }

  const processAction = useCallback(
    (result: SignInReturn) => {
      switch (result.action) {
        case "ERROR":
          setIsAuthenticating(false);
          setIsSuccess(false);
          toast.error("Authentication Error", { description: result.error });
          break;

        case "METHOD_SELECTION":
          setIsAuthenticating(false);
          setIsSuccess(false);
          setTempSessionId(result.tempSessionId);
          setAvailableMethods(result.methods);
          setCurrentStep("METHOD_SELECTION");
          break;

        case "ACCOUNT_DISABLED":
          setIsAuthenticating(false);
          setIsSuccess(false);
          if ("tempSessionId" in result && result.tempSessionId) {
            setTempSessionId(result.tempSessionId);
          }
          setCurrentStep("REENABLE_ACCOUNT");
          break;

        case "LOGIN_SUCCESS": {
          setIsAuthenticating(true);
          setIsSuccess(true);
          setAuthMessage("Signed in! Redirecting...");

          const clientId = searchParams.get("client_id");
          const redirectUri = searchParams.get("redirect_uri");
          const returnTo = searchParams.get("return_to");

          if (clientId && redirectUri) {
            router.refresh();
          } else {
            const target =
              returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
                ? returnTo
                : "/profile";
            router.replace(target);
          }
          break;
        }
      }
    },
    [router, searchParams]
  );

  useEffect(() => {
    const handleAuthStart = (event: Event) => {
      const customEvent = event as CustomEvent<{ provider?: string; message?: string }>;
      setIsAuthenticating(true);
      setIsSuccess(false);
      setAuthMessage(customEvent.detail?.message || "Signing you in...");
    };

    const handleAuthAction = (event: Event) => {
      const customEvent = event as CustomEvent<SignInReturn>;
      if (customEvent.detail) {
        processAction(customEvent.detail);
      }
    };

    window.addEventListener("clou_auth_start", handleAuthStart);
    window.addEventListener("clou_auth_action", handleAuthAction);
    return () => {
      window.removeEventListener("clou_auth_start", handleAuthStart);
      window.removeEventListener("clou_auth_action", handleAuthAction);
    };
  }, [processAction]);

  const handleMethodSelect = async (method: VerificationMethod) => {
    setSelectedMethod(method);

    if (!tempSessionId) {
      toast.error("Session Error", { description: "Verification session missing. Please try again." });
      return setCurrentStep("CREDENTIALS");
    }

    try {
      if (method.type === "code" || method.type === "totp") {
        await triggerVerificationMethod(tempSessionId, method.type === "totp" ? "totp" : "email");
      } else if (method.type === "passkey") {
        const res = await triggerVerificationMethod(tempSessionId, "passkey");

        if (res.success && res.payload) {
          setPasskeyOptions(res.payload as PasskeyAuthOptions);
        } else {
          toast.error("Passkey Error", { description: res.error || "Failed to trigger passkey verification" });
          return;
        }
      }

      setCurrentStep("VERIFICATION");
    } catch (e) {
      toast.error("Error", { description: handleError(e, true) });
    }
  };

  const handleAgreementComplete = async () => {
    setIsGranting(true);
    try {
      const clientId = searchParams.get("client_id");
      const redirectUri = searchParams.get("redirect_uri");

      if (!clientId || !redirectUri) {
        toast.error("Missing Parameters", { description: "Missing required OAuth parameters" });
        setCurrentStep("CREDENTIALS");
        return;
      }

      const result = await grantOAuthAccess(
        clientId,
        redirectUri,
        searchParams.get("state"),
        searchParams.get("code_challenge"),
        searchParams.get("code_challenge_method"),
        searchParams.get("scope"),
        searchParams.get("nonce")
      );

      if (result.success && result.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        toast.error("Authorization Failed", { description: result.error || "Failed to grant access" });
        setCurrentStep("CREDENTIALS");
      }
    } catch (e: unknown) {
      toast.error("Error", { description: handleError(e, true) });
      setCurrentStep("CREDENTIALS");
    } finally {
      setIsGranting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "CREDENTIALS":
        return <CredentialsStep key="credentials" onNext={processAction} />;

      case "METHOD_SELECTION":
        return <VerificationMethodStep key="method_selection" onSelectMethod={handleMethodSelect} availableMethods={availableMethods} />;

      case "VERIFICATION":
        switch (selectedMethod?.type) {
          case "code":
          case "totp":
            return <CodeVerification key={`verification-${selectedMethod.type}`} onComplete={processAction} tempSessionId={tempSessionId} methodType={selectedMethod.type} />;
          case "passkey":
            return <PasskeyVerification key="verification-passkey" onComplete={processAction} tempSessionId={tempSessionId} options={passkeyOptions} />;
          default:
            return null;
        }

      case "AGREEMENT":
        return <AgreementStep key="agreement" onAgree={handleAgreementComplete} onCancel={() => setCurrentStep("CREDENTIALS")} isLoading={isGranting} appData={appData} />;

      case "REENABLE_ACCOUNT":
        return <ReenableAccountStep key="reenable_account" tempSessionId={tempSessionId} onComplete={processAction} />;

      case "SUDO_VERIFICATION":
        if (!tempSessionId || !sudoMeta) return null;
        return (
          <SudoVerificationStep
            key="sudo_verification"
            tempSessionId={tempSessionId}
            sudoMeta={sudoMeta}
            onSuccess={(redirectUrl) => {
              setIsAuthenticating(true);
              setIsSuccess(true);
              setAuthMessage("Identity verified! Redirecting...");
              router.replace(redirectUrl);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full flex items-center justify-center min-h-100 relative">
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>

      <AnimatePresence>
        {isAuthenticating && (
          <motion.div
            key="auth-overlay"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 dark:bg-card/85 backdrop-blur-md rounded-3xl p-6 text-center max-w-md mx-auto shadow-2xl border border-primary/20 pointer-events-auto"
          >
            <div className="relative flex items-center justify-center mb-4">
              {isSuccess ? (
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-500 flex items-center justify-center animate-in zoom-in-75 duration-300">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              )}
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground mb-1.5">
              {authMessage}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isSuccess ? "Redirecting to your destination..." : "Please wait while we verify your identity"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}