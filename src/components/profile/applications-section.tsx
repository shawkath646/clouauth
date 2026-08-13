"use client";

import { useState } from "react";
import { SectionCard } from "./section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AppWindow,
  Plus,
  Trash2,
  Copy,
  Check,
  KeyRound,
  Globe,
  Edit2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAppAction,
  rotateAppSecretAction,
  type DeveloperApp,
} from "@/actions/profile/apps.actions";

import { useRouter } from "next/navigation";
import { BrandName } from "@/components/ui/brand-name";
import { useTranslations } from "@/lib/i18n/hooks";

export function ApplicationsSection({ initialApps }: { initialApps: DeveloperApp[] }) {
  const { t } = useTranslations("profile_apps");
  const router = useRouter();

  // Modals state
  const [isSecretOpen, setIsSecretOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected app for delete / secret display
  const [selectedApp, setSelectedApp] = useState<DeveloperApp | null>(null);
  const [createdSecret, setCreatedSecret] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };


  const handleRotateSecret = async (app: DeveloperApp) => {
    const res = await rotateAppSecretAction(app.id);
    if (res.success && res.newSecret) {
      toast.success(t("developerApps.rotateSuccess"));
      setCreatedSecret({
        clientId: app.oauth?.client_id || "",
        clientSecret: res.newSecret,
      });
      setIsSecretOpen(true);
    } else {
      toast.error(t("developerApps.error"), { description: res.error || t("developerApps.rotateError") });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    const res = await deleteAppAction(selectedApp.id);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(t("developerApps.deleteSuccess"));
      setIsDeleteOpen(false);
      setSelectedApp(null);
      router.refresh();
    } else {
      toast.error(t("developerApps.error"), { description: res.error || t("developerApps.deleteError") });
    }
  };

  return (
    <SectionCard
      title={t("developerApps.title")}
      description={<span>{t("developerApps.desc1")} <BrandName /> {t("developerApps.desc2")}</span>}
      headerAction={(!!initialApps.length ? (
        <Link href="/profile/applications/add">
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            {t("developerApps.register")}
          </Button>
        </Link>
      ) : null)}
    >
      {initialApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-xl bg-card/50 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <AppWindow className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">{t("developerApps.noApps")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {t("developerApps.noAppsDesc1")} <BrandName /> {t("developerApps.noAppsDesc2")}
          </p>
          <Link href="/profile/applications/add">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              {t("developerApps.registerFirst")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {initialApps.map((app) => (
            <div
              key={app.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-all gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 font-bold text-primary">
                  {app.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base truncate">{app.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      OIDC / OAuth 2.0
                    </Badge>
                  </div>
                  {app.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {app.description}
                    </p>
                  )}
                  {app.oauth && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground font-mono">
                      <span>{t("developerApps.clientId")}: {app.oauth.client_id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(app.oauth?.client_id || "", app.id)}
                        className="text-primary hover:text-primary/80 transition-colors p-0.5"
                        aria-label="Copy Client ID"
                      >
                        {copiedId === app.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  {app.website && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                      <Globe className="w-3.5 h-3.5" />
                      <a
                        href={app.website}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        {app.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Link href={`/profile/applications/edit/${app.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {t("developerApps.edit")}
                  </Button>
                </Link>
                <Button
                  onClick={() => handleRotateSecret(app)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {t("developerApps.rotateSecret")}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedApp(app);
                    setIsDeleteOpen(true);
                  }}
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                  aria-label="Delete Application"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Secret Display Modal (One-time) */}
      <Dialog open={isSecretOpen} onOpenChange={setIsSecretOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("developerApps.secretModalTitle")}</DialogTitle>
            <DialogDescription className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {t("developerApps.secretModalDesc")}
            </DialogDescription>
          </DialogHeader>
          {createdSecret && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("developerApps.clientId")}
                </label>
                <div className="p-2.5 rounded-lg border bg-muted/40 font-mono text-sm break-all">
                  {createdSecret.clientId}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("developerApps.clientSecret")}
                </label>
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-lg border bg-muted/40 font-mono text-sm break-all flex-1">
                    {createdSecret.clientSecret}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopySecret(createdSecret.clientSecret)}
                    className="shrink-0 gap-1"
                  >
                    {copiedSecret ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedSecret ? t("developerApps.copied") : t("developerApps.copy")}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsSecretOpen(false)}>{t("developerApps.savedSecret")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("developerApps.deleteModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("developerApps.deleteModalDesc1")}{" "}
              <span className="font-semibold text-foreground">{selectedApp?.name}</span>{t("developerApps.deleteModalDesc2")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t("developerApps.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("developerApps.deleting") : t("developerApps.deleteApp")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
