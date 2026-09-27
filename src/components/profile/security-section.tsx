"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Key, 
  ShieldCheck, 
  Fingerprint, 
  Smartphone, 
  Mail, 
  KeyRound, 
  MonitorSmartphone, 
  ChevronRight,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Globe,
  ShieldAlert,
  Shield,
  RefreshCw,
  Loader2
} from "lucide-react";
import type { FullProfile, DBSecurityActivity } from "@/types/profile.types";
import { useTranslations } from "@/lib/i18n/hooks";
import { getRecentSecurityActivitiesAction } from "@/actions/profile/security-activity.actions";
import { cn } from "@/utils/utils";

function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) {
    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `Yesterday at ${time}`;
  }
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatFullDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActivityIcon(event: string, device?: string | null) {
  const isMobile =
    device &&
    (device.includes("iPhone") || device.includes("Android") || device.includes("iPad"));

  switch (event) {
    case "LOGIN_PASSWORD":
    case "LOGIN_OAUTH":
    case "LOGIN_GOOGLE_ONE_TAP":
      return isMobile ? (
        <Smartphone className="w-5 h-5 text-primary" />
      ) : (
        <MonitorSmartphone className="w-5 h-5 text-primary" />
      );
    case "LOGIN_PASSKEY":
    case "PASSKEY_ADDED":
    case "PASSKEY_REMOVED":
      return <Fingerprint className="w-5 h-5 text-primary" />;
    case "LOGIN_2FA":
      return <ShieldCheck className="w-5 h-5 text-primary" />;
    case "PASSWORD_CHANGED":
    case "PASSWORD_SET":
      return <Key className="w-5 h-5 text-amber-500" />;
    case "TOTP_ENABLED":
      return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
    case "TOTP_DISABLED":
      return <ShieldAlert className="w-5 h-5 text-destructive" />;
    case "RECOVERY_CODES_GENERATED":
      return <KeyRound className="w-5 h-5 text-primary" />;
    case "RECOVERY_EMAIL_VERIFIED":
      return <Mail className="w-5 h-5 text-primary" />;
    case "SESSION_REVOKED":
    case "ALL_SESSIONS_REVOKED":
      return <LogOut className="w-5 h-5 text-muted-foreground" />;
    case "ACCOUNT_DISABLED":
      return <AlertTriangle className="w-5 h-5 text-destructive" />;
    case "ACCOUNT_REENABLED":
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case "OAUTH_CONNECTED":
    case "OAUTH_DISCONNECTED":
      return <Globe className="w-5 h-5 text-primary" />;
    case "SUDO_VERIFIED":
      return <ShieldCheck className="w-5 h-5 text-primary" />;
    default:
      return <Shield className="w-5 h-5 text-primary" />;
  }
}

export function SecuritySection({ profile }: { profile: FullProfile }) {
  const { t } = useTranslations("profile_security");
  const hasPassword = !!profile.password;
  const lastChanged = profile.password?.last_changed_on 
    ? new Date(profile.password.last_changed_on).toLocaleDateString()
    : "Never";
    
  const passkeysCount = profile.passkeys?.length || 0;
  const hasPasskeys = passkeysCount > 0;

  const hasTotp = !!profile.has_totp;
  const phoneCount = 0;

  const recoveryEmailObj = profile.emails?.find(e => !e.is_primary);
  const recoveryEmail = recoveryEmailObj ? recoveryEmailObj.address : "";

  const [activities, setActivities] = useState<DBSecurityActivity[]>(profile.security_activities || []);
  const [allActivities, setAllActivities] = useState<DBSecurityActivity[]>(profile.security_activities || []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpenReview = () => {
    setIsDialogOpen(true);
    startTransition(async () => {
      const res = await getRecentSecurityActivitiesAction(50);
      if (res.success && res.activities) {
        setAllActivities(res.activities);
        setActivities(res.activities.slice(0, 5));
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getRecentSecurityActivitiesAction(50);
      if (res.success && res.activities) {
        setAllActivities(res.activities);
        setActivities(res.activities.slice(0, 5));
      }
    });
  };

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
                {(hasPasskeys || hasTotp) ? t('signInSecurity.enabled') : t('signInSecurity.disabled')}
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
        </div>
      </SectionCard>

      {/* Recovery Methods Shell */}
      <SectionCard 
        title={t('recoveryMethods.title')} 
        description={t('recoveryMethods.desc')} 
        noPadding
      >
        <div role="region" aria-label="Recovery methods" className="divide-y divide-border/50">
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
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground mb-3">
              <ShieldCheck className="w-6 h-6 opacity-60 text-primary" />
            </div>
            <h5 className="text-sm font-semibold text-foreground">{t('recentActivity.noActivity')}</h5>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Logins, password changes, and other sensitive security events will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {activities.slice(0, 4).map((activity) => {
              const relativeTime = formatRelativeTime(activity.created_on);
              const fullDateTime = formatFullDateTime(activity.created_on);
              const locationParts = [activity.city, activity.country].filter(Boolean);
              const locationStr = locationParts.join(", ");

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    {getActivityIcon(activity.event, activity.device)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm sm:text-base font-semibold truncate text-foreground">
                        {activity.title}
                      </h4>
                      <span
                        className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
                        title={fullDateTime}
                      >
                        {relativeTime}
                      </span>
                    </div>

                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                      {activity.device && <span>{activity.device}</span>}
                      {locationStr && (
                        <>
                          <span>•</span>
                          <span>{locationStr}</span>
                        </>
                      )}
                      {activity.ip_address && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{activity.ip_address}</span>
                        </>
                      )}
                      {activity.status && activity.status !== "success" && (
                        <Badge
                          variant={activity.status === "failure" ? "destructive" : "secondary"}
                          className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider ml-1"
                        >
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3 sm:p-4 bg-muted/5 text-center border-t border-border/50">
          <Button
            variant="ghost"
            onClick={handleOpenReview}
            className="w-full text-primary hover:text-primary/80 font-medium text-sm"
          >
            {t('recentActivity.reviewAll')}
          </Button>
        </div>
      </SectionCard>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
            <div>
              <DialogTitle className="text-lg font-bold">{t('recentActivity.dialogTitle')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t('recentActivity.dialogDesc')}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={isPending}
              title={t('recentActivity.refresh')}
              className="shrink-0 mr-6"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isPending && "animate-spin")} />
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 divide-y divide-border/40 py-2">
            {isPending && allActivities.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">Loading activity logs...</span>
              </div>
            ) : allActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <ShieldCheck className="w-8 h-8 opacity-50 mb-2 text-primary" />
                <p className="text-sm">{t('recentActivity.noActivity')}</p>
              </div>
            ) : (
              allActivities.map((act) => {
                const relativeTime = formatRelativeTime(act.created_on);
                const fullDateTime = formatFullDateTime(act.created_on);
                const locationParts = [act.city, act.country].filter(Boolean);
                const locationStr = locationParts.join(", ");

                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3.5 sm:gap-4 px-2 py-3.5 hover:bg-muted/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {getActivityIcon(act.event, act.device)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold truncate text-foreground">
                          {act.title}
                        </h4>
                        <span
                          className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
                          title={fullDateTime}
                        >
                          {relativeTime}
                        </span>
                      </div>

                      {act.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {act.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                        {act.device && <span>{act.device}</span>}
                        {locationStr && (
                          <>
                            <span>•</span>
                            <span>{locationStr}</span>
                          </>
                        )}
                        {act.ip_address && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{act.ip_address}</span>
                          </>
                        )}
                        {act.status && act.status !== "success" && (
                          <Badge
                            variant={act.status === "failure" ? "destructive" : "secondary"}
                            className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider ml-1"
                          >
                            {act.status}
                          </Badge>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground/75 mt-1 font-mono">
                        {fullDateTime}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/50 -mx-6 -mb-6 px-6 py-3 bg-muted/10">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
              {t('recentActivity.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
