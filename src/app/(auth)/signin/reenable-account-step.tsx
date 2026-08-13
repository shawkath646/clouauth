"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { enableAccount } from "@/actions/auth/auth.actions";
import { toast } from "sonner";

interface ReenableAccountStepProps {
  tempSessionId: string | null;
}

export default function ReenableAccountStep({ tempSessionId }: ReenableAccountStepProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = async () => {
    if (!tempSessionId) {
      toast.error("Session expired");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await enableAccount(tempSessionId);
      if (res.success && "redirectUrl" in res && res.redirectUrl) {
        toast.success("Account re-enabled successfully!");
        window.location.href = res.redirectUrl as string;
      } else if (res.success) {
        toast.success("Account re-enabled successfully!");
        window.location.href = "/profile";
      } else {
        toast.error(res.error || "Failed to re-enable account.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Account Disabled</h1>
        <p className="text-muted-foreground text-sm">
          Your account is currently disabled. You can re-enable it to regain full access to your profile and services.
        </p>
      </div>

      <div className="border border-orange-500/20 bg-orange-500/5 rounded-lg p-4">
        <h5 className="font-medium text-orange-500 mb-1">Action Required</h5>
        <p className="text-orange-500/80 text-sm">
          Clicking the button below will immediately re-activate your account and sign you in.
        </p>
      </div>

      <div className="pt-2">
        <Button 
          className="w-full h-11 text-base bg-orange-500 hover:bg-orange-600 text-white transition-all" 
          onClick={handleEnable}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
          Re-enable My Account
        </Button>
        <Button 
          variant="ghost" 
          className="w-full mt-4" 
          onClick={() => window.location.href = "/"}
          disabled={isLoading}
        >
          Back to Home
        </Button>
      </div>
    </motion.div>
  );
}
