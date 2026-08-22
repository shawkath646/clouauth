import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { BrandName } from "@/components/ui/brand-name";
import Link from "next/link";

interface OAuthErrorStepProps {
  errorTitle?: string;
  errorMessage: string;
}

export default function OAuthErrorStep({
  errorTitle = "Authorization Error",
  errorMessage
}: OAuthErrorStepProps) {
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

        <div className="text-sm text-muted-foreground text-center mb-8 px-2">
          You can still sign in to your <BrandName className="font-semibold" /> account directly, but you will not be redirected back to the requesting application.
        </div>

        <div className="flex flex-col space-y-3">
          <Link href="/signin">
            <Button 
              variant="outline"
              className="w-full rounded-xl h-11 border-primary/20 hover:bg-primary/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue to Standard Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
