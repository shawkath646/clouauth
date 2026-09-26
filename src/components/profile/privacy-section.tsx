"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/profile/section-card";
import {
  Download,
  FileText,
  Globe,
  Link2,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { EditableField } from "@/components/profile/editable-field";
import type { FullProfile } from "@/types/profile.types";
import type { ProfileVisibility } from "@/types/preferences.types";
import { BrandName } from "@/components/ui/brand-name";
import { useTranslations } from "@/lib/i18n/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateProfileVisibility } from "@/actions/profile/personal-info.actions";
import { toast } from "sonner";
import { cn } from "@/utils/utils";

interface PrivacySectionProps {
  profile?: FullProfile;
}

export function PrivacySection({ profile }: PrivacySectionProps) {
  const { t } = useTranslations("profile_personal");

  const initialVisibility: ProfileVisibility =
    profile?.preferences?.profile_visibility || "public";

  const [visibility, setVisibility] = useState<ProfileVisibility>(initialVisibility);
  const [isUpdating, setIsUpdating] = useState<ProfileVisibility | null>(null);
  const [copied, setCopied] = useState(false);

  const username = profile?.user?.username || "";
  const profilePath = `/p/${username}`;

  const handleVisibilityChange = async (newVisibility: ProfileVisibility) => {
    if (newVisibility === visibility || isUpdating) return;

    setIsUpdating(newVisibility);
    const previous = visibility;
    setVisibility(newVisibility);

    try {
      const res = await updateProfileVisibility(newVisibility);
      if (!res.success) {
        setVisibility(previous);
        toast.error("Failed to update profile visibility", {
          description: res.error,
        });
      } else {
        const labels: Record<ProfileVisibility, string> = {
          public: t("privacySection.public"),
          link_only: t("privacySection.viewWithLinks"),
          private: t("privacySection.private"),
        };
        toast.success(`Profile transparency set to ${labels[newVisibility]}`);
      }
    } catch {
      setVisibility(previous);
      toast.error("An error occurred while updating visibility.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${profilePath}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success(t("privacySection.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const options: {
    id: ProfileVisibility;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
    badgeVariant: "emerald" | "blue" | "amber";
  }[] = [
    {
      id: "public",
      title: t("privacySection.public"),
      description: t("privacySection.publicDesc"),
      icon: Globe,
      badge: "Indexed",
      badgeVariant: "emerald",
    },
    {
      id: "link_only",
      title: t("privacySection.viewWithLinks"),
      description: t("privacySection.viewWithLinksDesc"),
      icon: Link2,
      badge: "Unlisted",
      badgeVariant: "blue",
    },
    {
      id: "private",
      title: t("privacySection.private"),
      description: t("privacySection.privateDesc"),
      icon: Lock,
      badge: "Hidden",
      badgeVariant: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Shell 1: Profile Transparency Shell */}
      <SectionCard
        title={t("privacySection.profileTransparency")}
        description={t("privacySection.profileTransparencyDesc")}
      >
        <div className="space-y-4">
          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = visibility === opt.id;
              const isLoadingCurrent = isUpdating === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVisibilityChange(opt.id)}
                  disabled={isUpdating !== null}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-xl border transition-all relative overflow-hidden group",
                    isSelected
                      ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                      : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {isLoadingCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/50" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm tracking-tight text-foreground">
                        {opt.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Profile Link Showcase Box */}
          {username && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                  {visibility === "public" && <Globe className="w-4 h-4 text-emerald-500" />}
                  {visibility === "link_only" && <Link2 className="w-4 h-4 text-blue-500" />}
                  {visibility === "private" && <Lock className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Public Profile URL
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 border",
                        visibility === "public" && "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
                        visibility === "link_only" && "text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/10",
                        visibility === "private" && "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10"
                      )}
                    >
                      {visibility === "public" && "Public"}
                      {visibility === "link_only" && "Link Only"}
                      {visibility === "private" && "Private"}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                    /p/{username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8 gap-1.5 text-xs flex-1 sm:flex-initial"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t("privacySection.copyLink")}</span>
                    </>
                  )}
                </Button>

                <Link
                  href={profilePath}
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "h-8 gap-1.5 text-xs flex-1 sm:flex-initial"
                  )}
                >
                  <span>{t("privacySection.viewPublicProfile")}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Shell 2: Privacy & Data Management (Activity Visibility removed) */}
      <SectionCard
        title={t("privacySection.title")}
        description={t("privacySection.desc")}
        noPadding
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-semibold truncate">
                {t("privacySection.downloadData")}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("privacySection.downloadDataDesc")} <BrandName />{" "}
                {t("privacySection.downloadDataDesc2")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-4 shrink-0"
            onClick={() =>
              toast.info("Data export requested", {
                description:
                  "An archive of your account information will be prepared.",
              })
            }
          >
            {t("privacySection.requestDownload")}
          </Button>
        </div>

        <EditableField
          label={t("privacySection.privacyPolicy")}
          value={t("privacySection.privacyPolicyDesc")}
          icon={<FileText className="w-5 h-5" />}
          onEdit={() => window.open("/privacy", "_blank")}
          editLabel={t("privacySection.viewPolicy")}
          showSeparator={false}
        />
      </SectionCard>
    </div>
  );
}
