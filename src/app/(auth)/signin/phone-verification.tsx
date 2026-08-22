"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/hooks";
import { Loader2, Smartphone } from "lucide-react";
import { SignInReturn } from "@/actions/auth/auth.actions";

interface PhoneVerificationProps {
  onComplete: (result: SignInReturn) => void;
  tempSessionId: string | null;
}

export default function PhoneVerification({ onComplete }: PhoneVerificationProps) {
  const { t } = useTranslations("signin");
  const [isLoading] = useState(false);

  const handleVerify = async () => {
    onComplete({ action: "ERROR", error: "Phone verification not yet implemented" });
  };

  return (
    <motion.div
      key="verification-phone"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md p-5 sm:p-6 md:p-8 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="flex items-center justify-center mb-5 relative">
        <div className="text-center w-full">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("approveFromPhone")}
          </h1>
        </div>
      </div>

      <div className="space-y-5 flex flex-col items-center py-2">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative bg-background border border-primary/20 p-5 rounded-full">
            <Smartphone className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {t("approveFromPhoneDesc")}
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Simulate Approval
        </Button>
      </div>
    </motion.div>
  );
}
