"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { FullProfile } from "@/types/profile.types";
import { BrandName } from "@/components/ui/brand-name";
import type { Dictionary } from "@/types/i18n.types";

export interface NotificationsSectionProps {
  profile: FullProfile;
  dict: Dictionary<"profile_personal">["notificationsSection"];
}

export function NotificationsSection({
  profile,
  dict,
}: NotificationsSectionProps) {
  const [securityAlerts, setSecurityAlerts] = useState(profile.notifications?.email_security ?? true);
  const [loginNotifications, setLoginNotifications] = useState(profile.notifications?.login_alerts ?? true);
  const [productUpdates, setProductUpdates] = useState(profile.notifications?.product_updates ?? false);
  const [marketingEmails, setMarketingEmails] = useState(profile.notifications?.email_marketing ?? false);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard 
        title={dict.title} 
        description={dict.desc}
        noPadding
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{dict.securityAlerts}</Label>
            <p className="text-sm text-muted-foreground">{dict.securityAlertsDesc}</p>
          </div>
          <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{dict.loginAlerts}</Label>
            <p className="text-sm text-muted-foreground">{dict.loginAlertsDesc}</p>
          </div>
          <Switch checked={loginNotifications} onCheckedChange={setLoginNotifications} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{dict.productUpdates}</Label>
            <p className="text-sm text-muted-foreground">{dict.productUpdatesDesc} <BrandName />.</p>
          </div>
          <Switch checked={productUpdates} onCheckedChange={setProductUpdates} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{dict.marketing}</Label>
            <p className="text-sm text-muted-foreground">{dict.marketingDesc}</p>
          </div>
          <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">{dict.newsletter}</Label>
            <p className="text-sm text-muted-foreground">{dict.newsletterDesc}</p>
          </div>
          <Switch checked={newsletter} onCheckedChange={setNewsletter} />
        </div>
      </SectionCard>
    </div>
  );
}
