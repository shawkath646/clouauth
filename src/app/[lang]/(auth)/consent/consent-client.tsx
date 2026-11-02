"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Check, Lock, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { confirmConsentAction, denyConsentAction } from "@/actions/oauth/oauth.actions";

interface ConsentClientProps {
  appName: string;
  appDescription?: string | null;
  appIcon?: string | null;
  appWebsite?: string | null;
  userEmail: string;
  userName?: string | null;
  userAvatar?: string | null;
  scope: string;
  authRequestToken: string;
}

const scopeDescriptions: Record<string, { title: string; desc: string }> = {
  openid: {
    title: "Verify your identity",
    desc: "Confirm your unique identity via OpenID Connect",
  },
  profile: {
    title: "Access your profile information",
    desc: "View your display name, username, avatar, and account preferences",
  },
  email: {
    title: "View your email address",
    desc: "Read your primary verified email address",
  },
  phone: {
    title: "View your phone number",
    desc: "Read your verified phone number on file",
  },
  offline_access: {
    title: "Continuous access (Refresh Token)",
    desc: "Allow this app to refresh its access token without prompting you to log in again",
  },
};

export function ConsentClient({
  appName,
  appDescription,
  appIcon,
  appWebsite,
  userEmail,
  userName,
  userAvatar,
  scope,
  authRequestToken,
}: ConsentClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const parsedScopes = scope
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleAuthorize = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmConsentAction(authRequestToken);
      if (result && !result.success) {
        setError(result.error || "Failed to authorize application.");
      }
    });
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      await denyConsentAction(authRequestToken);
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-background/80 dark:bg-card/60 backdrop-blur-2xl border border-primary/20 shadow-2xl rounded-3xl">
      {/* App & User Identity Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          {appIcon ? (
            <Image
              src={appIcon}
              alt={appName}
              width={48}
              height={48}
              className="rounded-2xl border border-primary/20 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border border-primary/20">
              {appName[0]?.toUpperCase() || "A"}
            </div>
          )}
          <div className="h-0.5 w-6 bg-border" />
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Authorize <span className="text-primary">{appName}</span>
        </h1>
        {appDescription && (
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {appDescription}
          </p>
        )}
        {appWebsite && (
          <a
            href={appWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
          >
            <span>{appWebsite.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Account Info Pill */}
      <div className="flex items-center justify-between p-3 mb-6 rounded-2xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-3">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName || userEmail}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">
              {(userName || userEmail)[0]?.toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground leading-tight">
              {userName || userEmail}
            </p>
            <p className="text-[11px] text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Check className="w-3 h-3" />
          <span>Active</span>
        </div>
      </div>

      {/* Permissions List */}
      <div className="mb-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This application will be able to:
        </p>
        <div className="space-y-2">
          {parsedScopes.map((scopeItem) => {
            const meta = scopeDescriptions[scopeItem] || {
              title: `Access ${scopeItem}`,
              desc: `Permission to access the '${scopeItem}' resource`,
            };
            return (
              <div
                key={scopeItem}
                className="flex items-start gap-3 p-3 rounded-xl bg-card/40 border border-border/40 text-left"
              >
                <div className="mt-0.5 text-primary">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{meta.title}</p>
                  <p className="text-xs text-muted-foreground">{meta.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Guarantee */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-6 justify-center">
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        <span>ClouAuth never shares your password or security keys with applications.</span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
          className="flex-1 rounded-xl h-11 border-border/60 hover:bg-muted cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          onClick={handleAuthorize}
          disabled={isPending}
          className="flex-1 rounded-xl h-11 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Authorizing...
            </>
          ) : (
            "Authorize Application"
          )}
        </Button>
      </div>
    </div>
  );
}
