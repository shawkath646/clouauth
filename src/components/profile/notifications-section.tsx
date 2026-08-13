"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { FullProfile } from "@/types/profile.types";
import { BrandName } from "@/components/ui/brand-name";
import { useTranslations } from "@/lib/i18n/hooks";

export function NotificationsSection({ profile }: { profile: FullProfile }) {
  const { t } = useTranslations("profile_personal");
  const [securityAlerts, setSecurityAlerts] = useState(profile.notifications?.email_security ?? true);
  const [loginNotifications, setLoginNotifications] = useState(profile.notifications?.login_alerts ?? true);
  const [productUpdates, setProductUpdates] = useState(profile.notifications?.product_updates ?? false);
  const [marketingEmails, setMarketingEmails] = useState(profile.notifications?.email_marketing ?? false);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard 
        title={t("notificationsSection.title")} 
        description={t("notificationsSection.desc")}
        noPadding
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{t("notificationsSection.securityAlerts")}</Label>
            <p className="text-sm text-muted-foreground">{t("notificationsSection.securityAlertsDesc")}</p>
          </div>
          <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{t("notificationsSection.loginAlerts")}</Label>
            <p className="text-sm text-muted-foreground">{t("notificationsSection.loginAlertsDesc")}</p>
          </div>
          <Switch checked={loginNotifications} onCheckedChange={setLoginNotifications} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{t("notificationsSection.productUpdates")}</Label>
            <p className="text-sm text-muted-foreground">{t("notificationsSection.productUpdatesDesc")} <BrandName />.</p>
          </div>
          <Switch checked={productUpdates} onCheckedChange={setProductUpdates} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{t("notificationsSection.marketing")}</Label>
            <p className="text-sm text-muted-foreground">{t("notificationsSection.marketingDesc")}</p>
          </div>
          <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{t("notificationsSection.newsletter")}</Label>
            <p className="text-sm text-muted-foreground">{t("notificationsSection.newsletterDesc")}</p>
          </div>
          <Switch checked={newsletter} onCheckedChange={setNewsletter} />
        </div>
      </SectionCard>
    </div>
  );
}
