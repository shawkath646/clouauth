"use client";

import { SectionCard } from "@/components/profile/section-card";
import { EditableField } from "@/components/profile/editable-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Key, ShieldCheck, Mail, KeyRound, MonitorSmartphone, Smartphone, ShieldAlert } from "lucide-react";
import type { FullProfile } from "@/types/profile.types";

export function SecuritySection({ profile }: { profile: FullProfile }) {
  const hasPassword = !!profile.password;
  const lastChanged = profile.password?.last_changed_on 
    ? new Date(profile.password.last_changed_on).toLocaleDateString()
    : "Never";
    
  const has2FA = profile.two_factor_methods && profile.two_factor_methods.length > 0;

  return (
    <div className="space-y-6">
      <SectionCard title="Password" description="Manage your password to keep your account secure." noPadding>
        <EditableField 
          label="Password" 
          value={<span className="text-sm font-normal text-muted-foreground mt-0.5">{hasPassword ? `Last changed on ${lastChanged}` : "No password set"}</span>} 
          icon={<Key className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel={hasPassword ? "Change Password" : "Set Password"}
          showSeparator={false}
        />
      </SectionCard>

      <SectionCard title="Two-Factor Authentication" description="Add an extra layer of security to your account." noPadding>
        <EditableField 
          label="2-Step Verification" 
          value={
            <div className="flex items-center gap-2">
              {has2FA ? (
                <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10 gap-1.5 px-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 gap-1.5 px-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" />
                  Disabled
                </Badge>
              )}
            </div>
          } 
          icon={
            <div className={has2FA ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
              {has2FA ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
          }
          onEdit={() => {}} 
          editLabel="Manage"
          showSeparator={false}
        />
      </SectionCard>

      <SectionCard title="Recovery Options" description="Make sure you can always access your account." noPadding>
        <EditableField 
          label="Recovery Email" 
          value="Not set" 
          icon={<Mail className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel="Add"
        />
        <EditableField 
          label="Backup Codes" 
          value="Not generated" 
          icon={<KeyRound className="w-5 h-5" />}
          onEdit={() => {}} 
          editLabel="Generate"
          showSeparator={false}
        />
      </SectionCard>

      <SectionCard title="Recent Security Activity" description="Review recent security events on your account." noPadding>
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
            Review all security events
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
