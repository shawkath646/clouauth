"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Tablet, LogOut, Laptop, Loader2 } from "lucide-react";
import type { FullProfile } from "@/types/profile.types";
import { revokeUserSessionAction, revokeAllUserSessionsAction } from "@/actions/profile/sessions-management.actions";
import { toast } from "sonner";
import { BrandName } from "@/components/ui/brand-name";

import { useTranslations } from "@/lib/i18n/hooks";

export function DevicesSection({ profile }: { profile: FullProfile }) {
  const { t } = useTranslations("profile_security");
  const sessions = profile.sessions || [];
  const [signingOutId, setSigningOutId] = useState<string | null>(null);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const router = useRouter();

  const handleSignOutIndividual = async (sessionId: string) => {
    setSigningOutId(sessionId);
    try {
      const res = await revokeUserSessionAction(sessionId);
      if (res.success) {
        toast.success(t("signedOutSuccess"));
        if (res.isCurrent) {
          router.push("/signin");
        } else {
          router.refresh();
        }
      } else {
        toast.error(t("signedOutError"), { description: res.error });
      }
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setSigningOutId(null);
    }
  };

  const handleSignOutAll = async () => {
    setIsSigningOutAll(true);
    try {
      const res = await revokeAllUserSessionsAction(true);
      if (res.success) {
        toast.success(t("signedOutAllSuccess"));
        router.push("/signin");
      } else {
        toast.error(t("signedOutAllError"), { description: res.error });
      }
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsSigningOutAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard 
        title={t("activeSessions.title")} 
        description={<span>{t("activeSessions.desc1")} <BrandName /> {t("activeSessions.desc2")}</span>}
        noPadding
        headerAction={
          sessions.length > 0 ? (
            <Button
              onClick={handleSignOutAll}
              disabled={isSigningOutAll}
              variant="destructive"
              size="sm"
              className="rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 hidden sm:flex items-center gap-1.5"
            >
              {isSigningOutAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>{t("activeSessions.signOutAll")}</span>
            </Button>
          ) : undefined
        }
      >
        {sessions.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            {t("activeSessions.noSessions")}
          </div>
        ) : (
          sessions.map((session, index) => {
            const isCurrent = index === 0;
            const isMobile = session.user_agent?.toLowerCase().includes("mobile");
            const isTablet = session.user_agent?.toLowerCase().includes("tablet");
            const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;
            const isLoading = signingOutId === session.id;

            return (
              <div key={session.id}>
                <div className="flex items-start justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`p-3 rounded-xl shrink-0 mt-1 ${isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <DeviceIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="text-base font-semibold flex items-center gap-2 flex-wrap">
                        <span className="truncate">{session.device_name || t("activeSessions.unknownDevice")}</span>
                        {isCurrent && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-bold py-0 h-5">{t("activeSessions.currentSession")}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.user_agent || t("activeSessions.unknownBrowser")} • {session.ip_address || t("activeSessions.unknownIP")}
                      </p>
                      <p className={`text-sm font-medium ${isCurrent ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {isCurrent ? t("activeSessions.activeNow") : t("activeSessions.lastActive").replace("{date}", new Date(session.updated_on).toLocaleString())}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSignOutIndividual(session.id)}
                    disabled={isLoading || isSigningOutAll}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                    <span>{t("activeSessions.signOut")}</span>
                  </Button>
                </div>
                {index < sessions.length - 1 && <Separator className="opacity-50" />}
              </div>
            );
          })
        )}
        
        {sessions.length > 0 && (
          <div className="p-4 sm:p-6 bg-muted/5 text-center border-t border-border/50 sm:hidden">
            <Button
              onClick={handleSignOutAll}
              disabled={isSigningOutAll}
              variant="ghost"
              className="w-full text-destructive hover:text-destructive/80 hover:bg-destructive/10 items-center justify-center gap-2"
            >
              {isSigningOutAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>{t("activeSessions.signOutAll")}</span>
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
