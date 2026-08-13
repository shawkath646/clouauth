"use client";

import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import { motion } from "framer-motion";
import { BrandName } from "@/components/ui/brand-name";

import { useTranslations } from "@/lib/i18n/hooks";

interface AgreementStepProps {
  onAgree: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  requestedScopes?: string[];
  clientName?: string;
}

export default function AgreementStep({ 
  onAgree, 
  onCancel, 
  isLoading = false,
  requestedScopes = ["openid"],
  clientName = "clouburstlab"
}: AgreementStepProps) {
  const { t } = useTranslations("signin");

  const scopeLabels: Record<string, string> = {
    openid: t("scopeOpenid"),
    profile: t("scopeProfile"),
    email: t("scopeEmail"),
    phone: t("scopePhone")
  };

  return (
    <motion.div
      key="agreement"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{t("oauthConsentTitle")}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          <span className="font-semibold text-primary">{clientName}</span> {t("oauthConsentSubtitle")}
        </p>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border/50">
        <div className="flex items-center gap-2 mb-4 text-sm font-medium text-foreground">
          <Info className="w-4 h-4 text-primary" />
          <span>{t("oauthConsentAccess")}</span>
        </div>
        <ul className="space-y-3">
          {requestedScopes.map((scope, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </div>
              {scopeLabels[scope] || scope}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onAgree} className="w-full" disabled={isLoading}>
          {isLoading ? t("oauthConsentGranting") : t("oauthConsentAgree")}
        </Button>
        <Button onClick={onCancel} variant="outline" className="w-full" disabled={isLoading}>
          {t("oauthConsentCancel")}
        </Button>
      </div>
      
      <p className="mt-6 text-xs text-center text-muted-foreground leading-relaxed">
        {t("oauthConsentTerms")}
      </p>
    </motion.div>
  );
}
