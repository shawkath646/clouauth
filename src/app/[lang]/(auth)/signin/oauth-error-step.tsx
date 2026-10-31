import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

interface SignInErrorStepProps {
  errorTitle?: string;
  errorMessage: string;
  note?: React.ReactNode;
  actionText?: string;
  actionHref?: string;
}

export default function SignInErrorStep({
  errorTitle = "Authentication Error",
  errorMessage,
  note,
  actionText = "Continue to Standard Sign In",
  actionHref = "/signin",
}: SignInErrorStepProps) {
  return (
    <div className="w-full flex items-center justify-center min-h-100">
      <div className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-destructive/20 shadow-2xl rounded-3xl flex flex-col mx-auto">
        <div className="text-center mb-6">
          <div className="mx-auto bg-destructive/10 text-destructive h-16 w-16 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-destructive">{errorTitle}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            {errorMessage}
          </p>
        </div>

        {note && (
          <div className="text-sm text-muted-foreground text-center mb-8 px-2 border border-destructive/15 bg-destructive/5 rounded-2xl p-4">
            {note}
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <Link href={actionHref}>
            <Button 
              variant="outline"
              className="w-full rounded-xl h-11 border-primary/20 hover:bg-primary/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {actionText}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export { SignInErrorStep as OAuthErrorStep };

