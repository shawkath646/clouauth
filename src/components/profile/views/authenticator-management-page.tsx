"use client";

import { useState, useRef } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Plus, Loader2, QrCode } from "lucide-react";
import { generateTotpSecretAction, verifyAndEnableTotpAction } from "@/actions/auth/totp.actions";
import { removeTwoFactorMethodAction } from "@/actions/profile/security-info.actions";
import { toast } from "sonner";
import Image from "next/image";
import type { Dictionary } from "@/types/i18n.types";

interface AuthenticatorMethod {
  id: string;
  enabled: boolean;
  added_on: Date | string;
}

export interface AuthenticatorManagementPageProps {
  authenticator: AuthenticatorMethod | null;
  dict: Dictionary<"profile_security">["authenticator"];
}

export function AuthenticatorManagementPage({
  authenticator,
  dict,
}: AuthenticatorManagementPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const lastSubmittedCodeRef = useRef("");

  const handleStartSetup = async () => {
    setIsAdding(true);
    setIsLoading(true);
    try {
      const res = await generateTotpSecretAction();
      if (res.success && res.qrCodeUrl && res.secret) {
        setQrCodeUrl(res.qrCodeUrl);
        setSecret(res.secret);
      } else {
        toast.error("Error", { description: res.error });
        setIsAdding(false);
      }
    } catch {
      toast.error(dict.error);
      setIsAdding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (valToVerify?: string) => {
    const targetCode = valToVerify || code;
    if (targetCode.length !== 6 || isVerifying || lastSubmittedCodeRef.current === targetCode || !secret) return;
    
    lastSubmittedCodeRef.current = targetCode;
    setIsVerifying(true);
    try {
      const res = await verifyAndEnableTotpAction(secret, targetCode);
      if (res.success) {
        toast.success(dict.verifySuccess);
        setIsAdding(false);
        setQrCodeUrl(null);
        setSecret(null);
        setCode("");
        window.location.reload();
      } else {
        toast.error(dict.verifyFailed, { description: res.error });
      }
    } catch {
      toast.error(dict.error);
    } finally {
      setIsVerifying(false);
      lastSubmittedCodeRef.current = "";
    }
  };

  const handleRemove = async (methodId: string) => {
    setRemovingId(methodId);
    try {
      const res = await removeTwoFactorMethodAction(methodId);
      if (res.success) {
        toast.success(dict.removed);
        window.location.reload();
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch {
      toast.error(dict.error);
    } finally {
      setRemovingId(null);
    }
  };

  if (isAdding) {
    return (
      <SectionCard
        title={dict.setupTitle}
        description={dict.setupDesc}
      >
        <div className="flex flex-col items-center justify-center p-6 border rounded-2xl bg-muted/20">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">{dict.generating}</p>
            </div>
          ) : qrCodeUrl ? (
            <div className="space-y-6 w-full max-w-sm flex flex-col items-center">
              <div className="p-4 bg-white rounded-xl shadow-xs">
                <Image src={qrCodeUrl} alt="QR Code" width={200} height={200} priority />
              </div>
              {secret && (
                <div className="text-center w-full">
                  <p className="text-sm font-medium mb-1">{dict.manualCode}</p>
                  <code className="px-3 py-1.5 bg-muted rounded-md text-xs font-mono select-all block break-all">{secret}</code>
                </div>
              )}
              <div className="space-y-3 w-full">
                <p className="text-sm font-medium text-center">{dict.enterCode}</p>
                <div className="flex justify-center">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setCode(val);
                      if (val.length === 6) {
                        handleVerify(val);
                      }
                    }}
                    placeholder="000000"
                    className="text-center font-mono tracking-widest text-lg h-12 w-48"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setIsAdding(false);
                    setQrCodeUrl(null);
                    setSecret(null);
                  }}
                >
                  {dict.cancel}
                </Button>
                <Button 
                  className="flex-1" 
                  disabled={code.length !== 6 || isVerifying}
                  onClick={() => handleVerify()}
                >
                  {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {dict.verify}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={dict.title}
      description={dict.desc}
      noPadding
    >
      {!authenticator ? (
        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <QrCode className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold mb-1">{dict.noAppTitle}</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {dict.noAppDesc}
          </p>
          <Button 
            onClick={handleStartSetup} 
            className="rounded-full gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{dict.setupBtn}</span>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold">{dict.connectedTitle}</h4>
                <p className="text-xs text-muted-foreground">
                  {dict.addedOn.replace("{date}", new Date(authenticator.added_on).toLocaleDateString())}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={removingId === authenticator.id}
              onClick={() => handleRemove(authenticator.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {removingId === authenticator.id ? <Loader2 className="w-4 h-4 animate-spin" /> : dict.removeBtn}
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
