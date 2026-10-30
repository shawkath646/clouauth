"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, MailCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/hooks";
import { BrandName } from "@/components/ui/brand-name";

export default function ForgotPasswordClient() {
  const { t } = useTranslations("signin");
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("Please enter your email or username.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Simulate/trigger password recovery flow placeholder
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSubmitted(true);
    } catch {
      setErrorMsg("Failed to process request. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md p-6 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col mx-auto"
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Reset Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email or username to recover your <BrandName className="text-primary font-semibold" /> account.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isSubmitted ? (
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
            <MailCheck className="w-7 h-7 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Check your inbox</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              If an account exists for <span className="font-medium text-foreground">{identifier}</span>, password recovery instructions have been sent.
            </p>
          </div>
          <Link href="/signin" className="w-full pt-2">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Username</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="name@example.com or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              required
            />
          </div>

          <Button type="submit" className="w-full h-10 text-base" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending instructions...
              </>
            ) : (
              "Send Recovery Email"
            )}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/signin"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </motion.div>
  );
}
