"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { toast } from "sonner";
import { handleError } from "@/utils/error";
import { SignInReturn } from "@/actions/auth/auth.actions";

type Step = "CREDENTIALS" | "METHOD_SELECTION" | "VERIFICATION" | "AGREEMENT" | "REENABLE_ACCOUNT";

interface SigninClientProps {
  initialStep?: Step;
  appData?: {
    name: string;
    icon: string | null;
  } | null;
}

export default function SigninClient({ initialStep = "CREDENTIALS", appData }: SigninClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<VerificationMethod[]>([]);
  const [passkeyOptions, setPasskeyOptions] = useState<Record<string, unknown> | null>(null);
  const [isGranting, setIsGranting] = useState(false);

  const processAction = (result: SignInReturn) => {
    switch (result.action) {
      case "ERROR":
        toast.error("Authentication Error", { description: result.error });
        break;
      case "METHOD_SELECTION":
        setTempSessionId(result.tempSessionId);
        setAvailableMethods(result.methods);
        setCurrentStep("METHOD_SELECTION");
        break;
      case "ACCOUNT_DISABLED":
        if ("tempSessionId" in result && result.tempSessionId) {
          setTempSessionId(result.tempSessionId);
        }
        setCurrentStep("REENABLE_ACCOUNT");
        break;
      case "LOGIN_SUCCESS":
        router.refresh();
        break;
    }
  };

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
        
        if (res.success && "payload" in res) {
          setPasskeyOptions(res.payload as Record<string, unknown>);
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
        return <CredentialsStep onNext={processAction} />;
      
      case "METHOD_SELECTION":
        return <VerificationMethodStep onSelectMethod={handleMethodSelect} availableMethods={availableMethods} />;
      
      case "VERIFICATION":
        switch (selectedMethod?.type) {
          case "code":
          case "totp":
            return <CodeVerification onComplete={processAction} tempSessionId={tempSessionId} methodType={selectedMethod.type} />;
          case "passkey":
            return <PasskeyVerification onComplete={processAction} tempSessionId={tempSessionId} options={passkeyOptions} />;
          default:
            return null;
        }
      
      case "AGREEMENT":
        return <AgreementStep onAgree={handleAgreementComplete} onCancel={() => setCurrentStep("CREDENTIALS")} isLoading={isGranting} appData={appData} />;
      
      case "REENABLE_ACCOUNT":
        return <ReenableAccountStep tempSessionId={tempSessionId} onComplete={processAction} />;
        
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex items-center justify-center min-h-100">
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </div>
  );
}