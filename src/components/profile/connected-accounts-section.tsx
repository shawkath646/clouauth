"use client";

import Link from "next/link";
import Image from "next/image";
import { SectionCard } from "@/components/profile/section-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { FullProfile } from "@/types/profile.types";
import { SOCIAL_PROVIDERS, DRIVE_PROVIDERS } from "@/constant/providers.constant";
import { HardDrive } from "lucide-react";
import { initializeOAuthProvider } from "@/actions/oauth/oauth.actions";

export function ConnectedAccountsSection({ profile }: { profile: FullProfile }) {
  const connectedAccounts = profile.oauth_accounts || [];

  const isConnected = (providerId: string) => {
    return connectedAccounts.some(acc => acc.provider === providerId);
  };

  return (
    <div className="space-y-6">
      <SectionCard 
        title="Authentication (SSO)" 
        description="Connect your social accounts to log in faster." 
        noPadding
      >
        {SOCIAL_PROVIDERS.map((provider, index) => {
          const connected = isConnected(provider.id);
          return (
            <div key={provider.id}>
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden p-2">
                    {provider.icon ? (
                      <Image 
                        src={provider.icon} 
                        alt={provider.name} 
                        width={24} 
                        height={24} 
                        className={provider.invertDark ? "dark:invert" : ""} 
                      />
                    ) : (
                      <span className="text-primary font-bold text-lg capitalize">{provider.name[0]}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold">
                      {provider.name}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                {connected ? (
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                    Disconnect
                  </Button>
                ) : (
                  <form action={initializeOAuthProvider.bind(null, provider.id)}>
                    <Button type="submit" variant="outline" size="sm" className="shrink-0">
                      Connect
                    </Button>
                  </form>
                )}
              </div>
              {index < SOCIAL_PROVIDERS.length - 1 && <Separator className="opacity-50" />}
            </div>
          );
        })}
      </SectionCard>

      <SectionCard 
        title="Cloud Drives" 
        description="Link your cloud storage to sync files and backups seamlessly." 
        noPadding
      >
        {DRIVE_PROVIDERS.map((provider, index) => {
          const connected = isConnected(provider.id);
          return (
            <div key={provider.id}>
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold">
                      {provider.name}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                {connected ? (
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                    Disconnect
                  </Button>
                ) : (
                  <form action={initializeOAuthProvider.bind(null, provider.id)}>
                    <Button type="submit" variant="outline" size="sm" className="shrink-0">
                      Connect
                    </Button>
                  </form>
                )}
              </div>
              {index < DRIVE_PROVIDERS.length - 1 && <Separator className="opacity-50" />}
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}
