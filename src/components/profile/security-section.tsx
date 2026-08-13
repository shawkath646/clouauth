"use client";

import Link from "next/link";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Key, 
  ShieldCheck, 
  Fingerprint, 
  Smartphone, 
  Mail, 
  KeyRound, 
  MonitorSmartphone, 
  ChevronRight 
} from "lucide-react";
import type { FullProfile } from "@/types/profile.types";
import { useTranslations } from "@/lib/i18n/hooks";

export function SecuritySection({ profile }: { profile: FullProfile }) {
  const { t } = useTranslations("profile_security");
  const hasPassword = !!profile.password;
  const lastChanged = profile.password?.last_changed_on 
    ? new Date(profile.password.last_changed_on).toLocaleDateString()
    : "Never";
    
  const twoFactorCount = profile.two_factor_methods?.length || 0;
  const has2FA = twoFactorCount > 0;

  const passkeysCount = profile.passkeys?.length || 0;
  const hasPasskeys = passkeysCount > 0;

  const phoneMethods = profile.two_factor_methods?.filter(m => m.type === "phone" || (m.type as string) === "sms") || [];
  const phoneCount = phoneMethods.length;

  const recoveryEmailObj = profile.emails?.find(e => !e.is_primary);
  const recoveryEmail = recoveryEmailObj ? recoveryEmailObj.address : "";

  return (
    <div className="space-y-6">
      <SectionCard 
        title={t('signInSecurity.title')} 
        description={t('signInSecurity.desc')} 
        noPadding
      >
        <div role="region" aria-label="Sign in methods" className="divide-y divide-border/50">
          {/* Password Row */}
          <Link
            href="/profile/password"
            className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold truncate">{t('signInSecurity.password')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('signInSecurity.passwordDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-4">
              <span>{hasPassword ? t('signInSecurity.changedOn').replace('{date}', lastChanged) : t('signInSecurity.notSet')}</span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>

          {/* 2-Step Verification Row */}
          <Link
            href="/profile/authenticator"
            className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold truncate">{t('signInSecurity.twoStep')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('signInSecurity.twoStepDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-4">
              <span>
                {has2FA 
                  ? `${twoFactorCount} ${twoFactorCount === 1 ? t('signInSecurity.method') : t('signInSecurity.methods')}` 
                  : t('signInSecurity.disabled')}
              </span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>

          {/* Passkeys Row */}
          <Link
            href="/profile/passkeys"
            className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold truncate">{t('signInSecurity.passkeys')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('signInSecurity.passkeysDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-4">
              <span>
                {hasPasskeys 
                  ? `${passkeysCount} ${passkeysCount === 1 ? t('signInSecurity.device') : t('signInSecurity.devices')}` 
                  : t('signInSecurity.disabled')}
              </span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>

          {/* Phone Numbers Row */}
          <Link
            href="/profile/phone"
            className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold truncate">{t('signInSecurity.phoneNumbers')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('signInSecurity.phoneDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-4">
              <span>{phoneCount > 0 ? phoneCount : t('signInSecurity.notSet')}</span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>

          {/* Recovery Email Row */}
          <Link
            href="/profile/recovery-email"
            className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold truncate">{t('signInSecurity.recoveryEmail')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('signInSecurity.recoveryEmailDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-4">
              <span>{recoveryEmail || t('signInSecurity.notSet')}</span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>

          {/* Backup Codes Row */}
          <Link
            href="/profile/backup-codes"
            className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold truncate">{t('signInSecurity.backupCodes')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('signInSecurity.backupCodesDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-4">
              <span>{profile.recovery_codes && profile.recovery_codes.length > 0 ? t('signInSecurity.codesCount').replace('{count}', profile.recovery_codes.length.toString()) : t('signInSecurity.notGenerated')}</span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>
        </div>
      </SectionCard>

      <SectionCard title={t('recentActivity.title')} description={t('recentActivity.desc')} noPadding>
        <div className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MonitorSmartphone className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-base font-semibold">New sign-in on Windows</h4>
            <p className="text-sm text-muted-foreground mt-1">Today at 10:30 AM • Seattle, WA</p>
          </div>
        </div>
        <Separator className="opacity-50" />
        <div className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-base font-semibold">New sign-in on iPhone</h4>
            <p className="text-sm text-muted-foreground mt-1">Yesterday at 2:15 PM • Seattle, WA</p>
          </div>
        </div>
        <Separator className="opacity-50" />
        <div className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-base font-semibold">Password changed</h4>
            <p className="text-sm text-muted-foreground mt-1">2 months ago</p>
          </div>
        </div>
        <Separator className="opacity-50" />
        <div className="p-4 sm:p-6 bg-muted/5 text-center border-t border-border/50">
          <Button variant="ghost" className="w-full text-primary hover:text-primary/80">
            {t('recentActivity.reviewAll')}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
