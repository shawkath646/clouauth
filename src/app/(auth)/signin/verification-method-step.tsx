"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/lib/i18n/hooks";
import { ShieldCheck, Fingerprint, Smartphone, Mail, ChevronRight } from "lucide-react";
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
      case "passkey":
        return {
          icon: Fingerprint,
          title: method.name || t("passkey"),
          description: t("passkeyDesc"),
        };
      case "totp":
        return {
          icon: ShieldCheck,
          title: method.name || t("authenticatorApp"),
          description: t("authenticatorAppDesc"),
        };
      case "phone":
        return {
          icon: Smartphone,
          title: method.name || t("approveFromPhone"),
          description: t("approveFromPhoneDesc"),
        };
      case "code":
      default: {
        return {
          icon: Mail,
          title: method.name || t("emailCode"),
          description: t("emailCodeDesc"),
        };
      }
    }
  };

  return (
    <motion.div
      key="method-selection"
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full max-w-[420px] p-5 sm:p-6 bg-card/80 dark:bg-card/45 backdrop-blur-2xl border border-border/70 dark:border-white/[0.08] shadow-2xl rounded-2xl sm:rounded-3xl flex flex-col mx-auto"
    >
      {/* Header with security icon badge */}
      <div className="flex flex-col items-center text-center mb-5">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
          <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t("chooseVerificationMethod")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-[320px] leading-relaxed">
          {t("verificationMethodSubtitle")}
        </p>
      </div>

      {/* Methods List */}
      <div className="space-y-2.5">
        {availableMethods.map((method) => {
          const ui = getMethodUI(method);
          const Icon = ui.icon;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelectMethod(method)}
              className="group relative flex w-full items-center gap-3.5 rounded-xl sm:rounded-2xl border border-border/60 bg-background/50 dark:bg-background/20 p-3 sm:p-3.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/[0.03] dark:hover:bg-white/[0.04] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15 transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {ui.title}
                </span>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                  {ui.description}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary shrink-0" />
            </button>
          );
        })}

        {availableMethods.length === 0 && (
          <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
            <p className="text-xs sm:text-sm text-muted-foreground">
              No verification methods configured for this account.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}