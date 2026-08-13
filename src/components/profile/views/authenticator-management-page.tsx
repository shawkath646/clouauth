"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Plus, Loader2, QrCode } from "lucide-react";
import { generateTotpSecretAction, verifyAndEnableTotpAction } from "@/actions/auth/totp.actions";
import { removeTwoFactorMethodAction } from "@/actions/profile/security-info.actions";
import { toast } from "sonner";
import Image from "next/image";
import { useTranslations } from "@/lib/i18n/hooks";

interface AuthenticatorMethod {
  id: string;
  enabled: boolean;
  added_on: Date | string;
}

interface AuthenticatorManagementPageProps {
  authenticator: AuthenticatorMethod | null;
}

export function AuthenticatorManagementPage({ authenticator }: AuthenticatorManagementPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { t: tUI } = useTranslations("profile_security");

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
      toast.error(tUI("authenticator.error"));
      setIsAdding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!secret || code.length < 6) return;
    setIsVerifying(true);
    try {
      const res = await verifyAndEnableTotpAction(secret, code);
      if (res.success) {
        toast.success(tUI("authenticator.verifySuccess"));
        setIsAdding(false);
        setQrCodeUrl(null);
        setSecret(null);
        setCode("");
      } else {
        toast.error(tUI("authenticator.verifyFailed"), { description: res.error });
      }
    } catch {
      toast.error(tUI("authenticator.error"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await removeTwoFactorMethodAction(id);
      if (res.success) {
        toast.success(tUI("authenticator.removed"));
      } else {
        toast.error("Error", { description: res.error });
      }
    } catch {
      toast.error(tUI("authenticator.error"));
    } finally {
      setRemovingId(null);
    }
  };

  if (isAdding) {
    return (
      <SectionCard
        title={tUI("authenticator.setupTitle")}
        description={tUI("authenticator.setupDesc")}
      >
        <div className="flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">{tUI("authenticator.generating")}</p>
            </div>
          ) : qrCodeUrl ? (
            <>
              <div className="bg-white p-4 rounded-xl">
                <Image src={qrCodeUrl} alt="QR Code" width={200} height={200} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1">{tUI("authenticator.manualCode")}</p>
                <code className="text-sm bg-muted/50 px-2 py-1 rounded tracking-widest">{secret}</code>
              </div>
              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-center">{tUI("authenticator.enterCode")}</p>
                <Input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg tracking-[0.5em] font-mono h-12"
                />
              </div>
              <div className="flex w-full gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/2"
                  onClick={() => {
                    setIsAdding(false);
                    setQrCodeUrl(null);
                    setSecret(null);
                    setCode("");
                  }}
                >
                  {tUI("authenticator.cancel")}
                </Button>
                <Button 
                  className="w-1/2" 
                  onClick={handleVerify} 
                  disabled={isVerifying || code.length < 6}
                >
                  {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {tUI("authenticator.verify")}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={tUI("authenticator.title")}
      description={tUI("authenticator.desc")}
      noPadding
    >
      {!authenticator ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <QrCode className="w-7 h-7 text-primary" />
          </div>
          <h4 className="text-base font-semibold mb-1">{tUI("authenticator.noAppTitle")}</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {tUI("authenticator.noAppDesc")}
          </p>
          <Button
            onClick={handleStartSetup}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{tUI("authenticator.setupBtn")}</span>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          <div
            key={authenticator.id}
            className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-base font-semibold">{tUI("authenticator.connectedTitle")}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tUI("authenticator.addedOn").replace("{date}", new Date(authenticator.added_on).toLocaleDateString())}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleRemove(authenticator.id)}
              disabled={removingId === authenticator.id}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {removingId === authenticator.id ? <Loader2 className="w-4 h-4 animate-spin" /> : tUI("authenticator.removeBtn")}
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
