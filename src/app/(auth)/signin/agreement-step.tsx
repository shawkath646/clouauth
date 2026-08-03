"use client";

import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import { motion } from "framer-motion";

interface AgreementStepProps {
  onAgree: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AgreementStep({ onAgree, onCancel, isLoading = false }: AgreementStepProps) {
  const appName = "CloudburstLab";

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Authorization Request</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          <span className="font-semibold text-primary">{appName}</span> wants to access your information
        </p>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border/50">
        <div className="flex items-center gap-2 mb-4 text-sm font-medium text-foreground">
          <Info className="w-4 h-4 text-primary" />
          <span>The application will receive access to:</span>
        </div>
        <ul className="space-y-3">
          {["Username", "Full name", "Email address", "Phone number"].map((scope, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </div>
              {scope}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onAgree} className="w-full" disabled={isLoading}>
          {isLoading ? "Granting Access..." : "Agree and Continue"}
        </Button>
        <Button onClick={onCancel} variant="outline" className="w-full" disabled={isLoading}>
          Cancel
        </Button>
      </div>
      
      <p className="mt-6 text-xs text-center text-muted-foreground leading-relaxed">
        By clicking Agree, you allow this app to use your information in accordance with its terms of service and privacy policies.
      </p>
    </motion.div>
  );
}
