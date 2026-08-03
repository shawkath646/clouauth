"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/hooks";
import { Loader2, Fingerprint } from "lucide-react";

interface PasskeyVerificationProps {
  onComplete: (result: any) => void;
  tempSessionId: string | null;
}

export default function PasskeyVerification({ onComplete, tempSessionId }: PasskeyVerificationProps) {
  const { t } = useTranslations("signin");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    setIsLoading(true);
    // Simulate API call
    const response = await new Promise((resolve) => setTimeout(() => resolve({ success: true, data: "token" }), 1500));
    setIsLoading(false);
    onComplete(response);
  };

  return (
    <motion.div
      key="verification-passkey"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md p-5 sm:p-6 md:p-8 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="flex items-center justify-center mb-5 relative">
        <div className="text-center w-full">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("passkey")}
          </h1>
        </div>
      </div>

      <div className="space-y-6 flex flex-col items-center">
        <div className="bg-primary/10 p-6 rounded-full">
        <Fingerprint className="h-12 w-12 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        {t("passkeyDesc")}
      </p>
      <Button className="w-full" onClick={handleVerify} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {t("verify")}
        </Button>
      </div>
    </motion.div>
  );
}
