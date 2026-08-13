"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { KeyRound, Plus, CheckCircle2, Loader2, Copy, Check } from "lucide-react";
import { generateBackupCodesAction } from "@/actions/profile/security-info.actions";
import { toast } from "sonner";

interface BackupCodesManagementPageProps {
  hasCodes?: boolean;
}

export function BackupCodesManagementPage({ hasCodes }: BackupCodesManagementPageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateBackupCodesAction();
      if (res.success && res.codes) {
        setGeneratedCodes(res.codes);
        toast.success("Backup codes generated successfully");
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCodes) return;
    await navigator.clipboard.writeText(generatedCodes.join("\n"));
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (generatedCodes) {
    return (
      <SectionCard
        title="Your New Backup Codes"
        description="Store these codes in a secure place. Each code can only be used once."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 p-4 bg-muted/20 rounded-xl border border-border/60 font-mono text-sm text-center">
            {generatedCodes.map((code, index) => (
              <div key={index} className="p-2 bg-background rounded border border-border/40 font-semibold tracking-wider">
                {code}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              These codes replace any previously generated backup codes.
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy Codes"}</span>
              </Button>
              <Button
                onClick={() => setGeneratedCodes(null)}
                size="sm"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Backup Codes"
      description="One-time security codes used if you lose your phone or security keys."
      noPadding
      headerAction={
        hasCodes ? (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="sm"
            variant="outline"
          >
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Regenerate
          </Button>
        ) : undefined
      }
    >
      {!hasCodes ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <h4 className="text-base font-semibold mb-1">No backup codes generated</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Generate backup codes to sign in if you lose access to your authentication devices or phone.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Generate Backup Codes</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-6 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="text-base font-semibold">10 Backup Codes Available</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Keep your codes stored in a secure location
              </p>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerate"}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
