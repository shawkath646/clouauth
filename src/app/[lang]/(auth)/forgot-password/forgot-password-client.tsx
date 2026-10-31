"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, MailCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

export interface ForgotPasswordClientProps {
  locale?: Locale;
  dict: Dictionary<"signin">;
}

export default function ForgotPasswordClient({
  locale = defaultLocale,
  dict,
}: ForgotPasswordClientProps) {
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
          {dict.forgotPassword}
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your registered email address or username to receive password reset instructions.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isSubmitted ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Check your inbox
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If an account exists with <span className="font-medium text-foreground">{identifier}</span>, instructions to reset your password have been sent.
          </p>
          <div className="pt-4">
            <Link
              href={`/${locale}/signin`}
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
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
              required
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full h-10 mt-2" disabled={isLoading}>
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
              href={`/${locale}/signin`}
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
