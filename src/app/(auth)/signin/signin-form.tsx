"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import CredentialsStep from "./credentials-step";
import VerificationMethodStep from "./verification-method-step";
import CodeVerification from "./code-verification";
import PasskeyVerification from "./passkey-verification";
import PhoneVerification from "./phone-verification";
import AgreementStep from "./agreement-step";
import ReenableAccountStep from "./reenable-account-step";
import { VerificationMethod } from "@/types/auth.types";
import { triggerVerificationMethod } from "@/actions/auth/verification.actions";
import { grantOAuthAccess } from "@/actions/oauth/oauth.actions";
import { getAvailableMethods } from "@/actions/auth/auth.actions";
import { toast } from "sonner";
import { handleError } from "@/utils/error";

type Step = "CREDENTIALS" | "METHOD_SELECTION" | "VERIFICATION" | "AGREEMENT" | "REENABLE_ACCOUNT";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>("CREDENTIALS");
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<VerificationMethod[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [passkeyOptions, setPasskeyOptions] = useState<any>(null);

  useEffect(() => {
    const require2FA = searchParams.get("require2FA");
    const sessionId = searchParams.get("tempSessionId");
    const consent = searchParams.get("consent");
    const error = searchParams.get("error");

    if (require2FA || sessionId || consent || error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("require2FA");
      url.searchParams.delete("tempSessionId");
      url.searchParams.delete("consent");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }

    if (error) {
      toast.error("Error", { description: error });
    } else if (require2FA === "true" && sessionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTempSessionId(sessionId);
      getAvailableMethods(sessionId).then(res => {
        if (res.success && res.methods) {
          setAvailableMethods(res.methods);
          setCurrentStep("METHOD_SELECTION");
        } else {
          toast.error("Error", { description: res.error || "Failed to load verification methods" });
        }
      });
    } else if (consent === "true") {
      setCurrentStep("AGREEMENT");
    }
  }, [searchParams]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCredentialsSuccess = (result: any) => {
    if (result.require2FA) {
      setTempSessionId(result.tempSessionId || null);
      setAvailableMethods(result.methods || []);
      setCurrentStep("METHOD_SELECTION");
    } else if (result.requireReenable) {
      setTempSessionId(result.tempSessionId || null);
      setCurrentStep("REENABLE_ACCOUNT");
    } else {
      // If 2FA is not required, check if we need consent or redirect
      if (result.action === "CONSENT_SCREEN") {
        setCurrentStep("AGREEMENT");
      } else {
        window.location.href = result.redirectUrl || "/profile";
      }
    }
  };

  const handleMethodSelect = async (method: VerificationMethod) => {
    setSelectedMethod(method);
    
    if (method.type === "code" || method.type === "totp") {
      if (tempSessionId) {
        await triggerVerificationMethod(tempSessionId, method.type === "totp" ? "totp" : "email");
      }
    } else if (method.type === "passkey") {
      if (tempSessionId) {
        const res = await triggerVerificationMethod(tempSessionId, "passkey");
        if (res.success && "payload" in res) {
          setPasskeyOptions(res.payload);
        } else {
          toast.error("Error", { description: res.error || "Failed to trigger passkey verification" });
          return;
        }
      }
    }
    
    setCurrentStep("VERIFICATION");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleVerificationComplete = (result: any) => {
    if (result.requireReenable) {
      setCurrentStep("REENABLE_ACCOUNT");
    } else if (result.action === "CONSENT_SCREEN") {
      setCurrentStep("AGREEMENT");
    } else {
      window.location.href = result.redirectUrl || "/profile";
    }
  };

  const [isGranting, setIsGranting] = useState(false);

  const handleAgreementComplete = async () => {
    setIsGranting(true);
    try {
      const result = await grantOAuthAccess();
      if (result.success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        toast.error("Error", { description: result.error || "Failed to grant access" });
        setCurrentStep("CREDENTIALS");
      }
    } catch (e: unknown) {
        const em = handleError(e, true);
        toast.error("Error", { description: em });
        setCurrentStep("CREDENTIALS");
      } finally {
      setIsGranting(false);
    }
  };

  const handleAgreementCancel = () => {
    setCurrentStep("CREDENTIALS");
  };

  return (
    <div className="w-full flex items-center justify-center min-h-100">
      <AnimatePresence mode="wait">
        {currentStep === "CREDENTIALS" && (
          <CredentialsStep onNext={handleCredentialsSuccess} />
        )}
        {currentStep === "METHOD_SELECTION" && (
          <VerificationMethodStep
            onSelectMethod={handleMethodSelect}
            availableMethods={availableMethods}
          />
        )}
        {currentStep === "VERIFICATION" && (selectedMethod?.type === "code" || selectedMethod?.type === "totp") && (
          <CodeVerification 
            onComplete={handleVerificationComplete} 
            tempSessionId={tempSessionId}
            methodType={selectedMethod.type}
          />
        )}
        {currentStep === "VERIFICATION" && selectedMethod?.type === "passkey" && (
          <PasskeyVerification 
            onComplete={handleVerificationComplete} 
            tempSessionId={tempSessionId}
            options={passkeyOptions}
          />
        )}
        {currentStep === "VERIFICATION" && selectedMethod?.type === "phone" && (
          <PhoneVerification 
            onComplete={handleVerificationComplete} 
            tempSessionId={tempSessionId}
          />
        )}
        {currentStep === "AGREEMENT" && (
          <AgreementStep 
            onAgree={handleAgreementComplete}
            onCancel={handleAgreementCancel}
            isLoading={isGranting}
          />
        )}
        {currentStep === "REENABLE_ACCOUNT" && (
          <ReenableAccountStep tempSessionId={tempSessionId} />
        )}
      </AnimatePresence>
    </div>
  );
}
