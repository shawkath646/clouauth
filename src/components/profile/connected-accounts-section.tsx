"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { FullProfile } from "@/types/profile.types";
import { SOCIAL_PROVIDERS, DRIVE_PROVIDERS } from "@/constants/providers.constant";
import { HardDrive, Cloud, Box, Loader2 } from "lucide-react";
import { initializeOAuthProvider, disconnectOAuthAccount } from "@/actions/oauth/oauth.actions";
import { useTranslations } from "@/lib/i18n/hooks";
import { toast } from "sonner";

export function ConnectedAccountsSection({ profile }: { profile: FullProfile }) {
  const { t } = useTranslations("profile_security");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectedAccounts = profile.oauth_accounts || [];

  const isConnected = (providerId: string) => {
    return connectedAccounts.some((acc) => acc.provider.toLowerCase() === providerId.toLowerCase());
  };

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      toast.success("Account connected successfully!");
      router.replace(pathname);
    } else if (error) {
      toast.error("Connection failed", {
        description: decodeURIComponent(error).replace(/_/g, " "),
      });
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  const handleDisconnect = (providerId: string) => {
    setDisconnectingProvider(providerId);
    startTransition(async () => {
      const res = await disconnectOAuthAccount(providerId);
      setDisconnectingProvider(null);
      if (res.success) {
        toast.success("Account disconnected successfully");
        router.refresh();
      } else {
        toast.error("Failed to disconnect", { description: res.error });
      }
    });
  };

  const getDriveIcon = (id: string) => {
    switch (id) {
      case "onedrive":
        return <Cloud className="w-5 h-5 text-blue-500" />;
      case "dropbox":
        return <Box className="w-5 h-5 text-indigo-500" />;
      case "google_drive":
      default:
        return <HardDrive className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title={t("sso.title")} description={t("sso.desc")} noPadding>
        {SOCIAL_PROVIDERS.map((provider, index) => {
          const connected = isConnected(provider.id);
          const isDisconnecting = disconnectingProvider === provider.id;
          const isConnecting = connectingProvider === provider.id;

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
                    <div className="text-base font-semibold">{provider.name}</div>
                    <p className="text-sm text-muted-foreground">
                      {connected ? t("sso.connected") : t("sso.notConnected")}
                    </p>
                  </div>
                </div>

                {connected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending || isDisconnecting}
                    onClick={() => handleDisconnect(provider.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sso.disconnect")}
                  </Button>
                ) : (
                  <form
                    action={async () => {
                      setConnectingProvider(provider.id);
                      await initializeOAuthProvider(provider.id);
                    }}
                  >
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isConnecting}
                      className="shrink-0 gap-2"
                    >
                      {isConnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{t("sso.connect")}</span>
                    </Button>
                  </form>
                )}
              </div>
              {index < SOCIAL_PROVIDERS.length - 1 && <Separator className="opacity-50" />}
            </div>
          );
        })}
      </SectionCard>

      <SectionCard title={t("cloudDrives.title")} description={t("cloudDrives.desc")} noPadding>
        {DRIVE_PROVIDERS.map((provider, index) => {
          const connected = isConnected(provider.id);
          const isDisconnecting = disconnectingProvider === provider.id;
          const isConnecting = connectingProvider === provider.id;

          return (
            <div key={provider.id}>
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {getDriveIcon(provider.id)}
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold">{provider.name}</div>
                    <p className="text-sm text-muted-foreground">
                      {connected ? t("sso.connected") : t("sso.notConnected")}
                    </p>
                  </div>
                </div>

                {connected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending || isDisconnecting}
                    onClick={() => handleDisconnect(provider.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sso.disconnect")}
                  </Button>
                ) : (
                  <form
                    action={async () => {
                      setConnectingProvider(provider.id);
                      await initializeOAuthProvider(provider.id);
                    }}
                  >
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isConnecting}
                      className="shrink-0 gap-2"
                    >
                      {isConnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{t("sso.connect")}</span>
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
