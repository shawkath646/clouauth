"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { FullProfile } from "@/types/profile.types";

export function NotificationsSection({ profile }: { profile: FullProfile }) {
  const [securityAlerts, setSecurityAlerts] = useState(profile.notifications?.email_security ?? true);
  const [loginNotifications, setLoginNotifications] = useState(profile.notifications?.login_alerts ?? true);
  const [productUpdates, setProductUpdates] = useState(profile.notifications?.product_updates ?? false);
  const [marketingEmails, setMarketingEmails] = useState(profile.notifications?.email_marketing ?? false);
  const [newsletter, setNewsletter] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard 
        title="Notification Preferences" 
        description="Choose how you want to be notified about activity on your account."
        noPadding
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">Security Alerts</Label>
            <p className="text-sm text-muted-foreground">Get notified about suspicious logins and compromised passwords.</p>
          </div>
          <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} />
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">Login Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive an email when a new device signs in.</p>
          </div>
          <Switch checked={loginNotifications} onCheckedChange={setLoginNotifications} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">Product Updates</Label>
            <p className="text-sm text-muted-foreground">Hear about new features and tools from CloudburstLab.</p>
          </div>
          <Switch checked={productUpdates} onCheckedChange={setProductUpdates} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">Marketing Emails</Label>
            <p className="text-sm text-muted-foreground">Receive promotional emails and special offers.</p>
          </div>
          <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
        </div>
        <Separator className="opacity-50" />

        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1 mr-4">
            <Label className="text-base font-semibold">Newsletter</Label>
            <p className="text-sm text-muted-foreground">Weekly digest of tips, news, and product updates.</p>
          </div>
          <Switch checked={newsletter} onCheckedChange={setNewsletter} />
        </div>
      </SectionCard>
    </div>
  );
}
