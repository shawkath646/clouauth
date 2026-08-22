"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/lib/i18n/hooks";
import { Shield, Fingerprint, Smartphone, Mail } from "lucide-react";
import { VerificationMethod } from "@/types/auth.types";

interface VerificationMethodStepProps {
  onSelectMethod: (method: VerificationMethod) => void;
  availableMethods?: VerificationMethod[];
}

export default function VerificationMethodStep({
  onSelectMethod,
  availableMethods = [],
}: VerificationMethodStepProps) {
  const { t } = useTranslations("signin");
  
  const getMethodUI = (method: VerificationMethod) => {
    switch (method.type) {
      case "phone":
        return {
          icon: Smartphone,
          title: method.name || t("approveFromPhone"),
          description: t("approveFromPhoneDesc"),
        };
      case "passkey":
        return {
          icon: Fingerprint,
          title: method.name || t("passkey"),
          description: t("passkeyDesc"),
        };
      case "totp":
        return {
          icon: Shield,
          title: method.name || t("authenticatorApp"), 
          description: t("authenticatorAppDesc"),
        };
      case "code":
      default:
        return {
          icon: Mail,
          title: method.name || t("emailCode"), 
          description: t("emailCodeDesc"),
        };
    }
  };

  return (
    <motion.div
      key="method-selection"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-lg p-5 sm:p-6 md:p-8 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="flex items-center justify-center mb-10 relative">
        <div className="text-center w-full">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
            {t("chooseVerificationMethod")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("verificationMethodSubtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {availableMethods.map((method) => {
          const ui = getMethodUI(method);
          const Icon = ui.icon;
          return (
            <button
              key={method.id}
              onClick={() => onSelectMethod(method)}
              className="w-full flex items-center p-3 border border-border/50 hover:border-primary/50 bg-card/30 hover:bg-card/60 transition-all rounded-xl group text-left"
            >
              <div className="bg-primary/10 p-2 rounded-lg mr-3 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-0.5">{ui.title}</h3>
                <p className="text-sm text-muted-foreground leading-snug">
                  {ui.description}
                </p>
              </div>
            </button>
          );
        })}
        
        {availableMethods.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-4">
            No verification methods available.
          </p>
        )}
      </div>
    </motion.div>
  );
}