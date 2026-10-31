"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SectionCard } from "@/components/profile/section-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy,
  Check,
  RotateCw,
  Trash2,
  Edit,
  ExternalLink,
  Plus,
  Box,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { rotateAppSecretAction, deleteAppAction, type DeveloperApp } from "@/actions/profile/apps.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BrandName } from "@/components/ui/brand-name";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

export interface ApplicationsSectionProps {
  initialApps: DeveloperApp[];
  locale?: Locale;
  dict: Dictionary<"profile_apps">["developerApps"];
}

export function ApplicationsSection({
  initialApps,
  locale = defaultLocale,
  dict,
}: ApplicationsSectionProps) {
  const router = useRouter();

  // Modals state
  const [isSecretOpen, setIsSecretOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedApp, setSelectedApp] = useState<DeveloperApp | null>(null);

  // For Secret Modal
  const [createdSecret, setCreatedSecret] = useState<{
    clientId: string;
    clientSecret: string;
    appName: string;
  } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (text: string, appId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(appId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleRotateSecret = async (app: DeveloperApp) => {
    if (!confirm(`Are you sure you want to regenerate the client secret for "${app.name}"? The existing secret will stop working immediately.`)) {
      return;
    }

    setIsSubmitting(true);
    const res = await rotateAppSecretAction(app.id);
    setIsSubmitting(false);

    if (res.success && res.newSecret) {
      toast.success(dict.rotateSuccess);
      setCreatedSecret({
        clientId: app.oauth?.client_id || "",
        clientSecret: res.newSecret,
        appName: app.name,
      });
      setIsSecretOpen(true);
    } else {
      toast.error("Error", { description: res.error || dict.rotateError });
    }
  };

  const handleDeleteApp = async () => {
    if (!selectedApp) return;

    setIsSubmitting(true);
    const res = await deleteAppAction(selectedApp.id);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(dict.deleteSuccess);
      setIsDeleteOpen(false);
      setSelectedApp(null);
      router.refresh();
    } else {
      toast.error("Error", { description: res.error || "Failed to delete application" });
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={dict.title}
        description={<span>{dict.desc1} <BrandName /> {dict.desc2}</span>}
        headerAction={
          <Link
            href={`/${locale}/profile/applications/new`}
            className={buttonVariants({ size: "sm", className: "rounded-full gap-1.5 shadow-sm" })}
          >
            <Plus className="w-4 h-4" />
            <span>{dict.register}</span>
          </Link>
        }
        noPadding
      >
        {initialApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Box className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{dict.noApps}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              {dict.noAppsDesc1} <BrandName /> {dict.noAppsDesc2}
            </p>
            <Link
              href={`/${locale}/profile/applications/new`}
              className={buttonVariants({ className: "rounded-full gap-2" })}
            >
              <Plus className="w-4 h-4" />
              <span>{dict.registerFirst}</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {initialApps.map((app) => (
              <div
                key={app.id}
                className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden border border-primary/20">
                    {app.icon ? (
                      <Image
                        src={app.icon}
                        alt={app.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Box className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-base text-foreground truncate">
                        {app.name}
                      </h4>
                      {app.oauth && (
                        <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider">
                          {app.oauth.client_type}
                        </Badge>
                      )}
                    </div>
                    {app.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {app.description}
                      </p>
                    )}
                    {app.oauth && (
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-mono text-muted-foreground pt-1">
                        <span>{dict.clientId}: {app.oauth.client_id}</span>
                        <button
                          onClick={() => handleCopyId(app.oauth!.client_id, app.id)}
                          className="hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Copy Client ID"
                        >
                          {copiedId === app.id ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                  {app.website && (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                        className: "h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground",
                      })}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Website</span>
                    </a>
                  )}

                  <Link
                    href={`/${locale}/profile/applications/${app.id}/edit`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "h-8 gap-1.5 text-xs rounded-full",
                    })}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{dict.edit}</span>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRotateSecret(app)}
                    disabled={isSubmitting}
                    className="h-8 gap-1.5 text-xs rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{dict.rotateSecret}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedApp(app);
                      setIsDeleteOpen(true);
                    }}
                    disabled={isSubmitting}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                    title="Delete App"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Secret Rotation Modal */}
      <Dialog open={isSecretOpen} onOpenChange={setIsSecretOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <DialogTitle>{dict.secretModalTitle}</DialogTitle>
            <DialogDescription>
              {dict.secretModalDesc}
            </DialogDescription>
          </DialogHeader>

          {createdSecret && (
            <div className="space-y-4 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {dict.clientId}
                </label>
                <div className="p-2.5 rounded-xl border border-border bg-muted/40 font-mono text-sm break-all">
                  {createdSecret.clientId}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {dict.clientSecret}
                </label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    readOnly
                    value={createdSecret.clientSecret}
                    className="pr-20 font-mono text-sm bg-muted/40"
                  />
                  <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => handleCopySecret(createdSecret.clientSecret)}
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSecret ? dict.copied : dict.copy}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsSecretOpen(false)}>{dict.savedSecret}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle>{dict.deleteModalTitle}</DialogTitle>
            <DialogDescription>
              {dict.deleteModalDesc1}{" "}
              <span className="font-semibold text-foreground">{selectedApp?.name}</span>{dict.deleteModalDesc2}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              {dict.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApp}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? dict.deleting : dict.deleteApp}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
