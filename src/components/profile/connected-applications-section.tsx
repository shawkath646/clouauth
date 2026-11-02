"use client";

import { useState } from "react";
import Image from "next/image";
import { SectionCard } from "@/components/profile/section-card";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Box,
  ExternalLink,
  ShieldCheck,
  Unlink,
  AlertTriangle,
  Loader2,
  Calendar,
} from "lucide-react";
import { revokeConnectedAppAction, type ConnectedApp } from "@/actions/profile/connected-apps.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BrandName } from "@/components/ui/brand-name";
import type { Dictionary } from "@/types/i18n.types";
import { formatTime } from "@/utils/utils";

export interface ConnectedApplicationsSectionProps {
  initialApps: ConnectedApp[];
  dict: Dictionary<"profile_apps">["connectedApps"];
}

export function ConnectedApplicationsSection({
  initialApps,
  dict,
}: ConnectedApplicationsSectionProps) {
  const router = useRouter();

  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ConnectedApp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemoveApp = async () => {
    if (!selectedApp) return;

    setIsSubmitting(true);
    const res = await revokeConnectedAppAction(selectedApp.clientId);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(dict.removeSuccess);
      setIsRemoveOpen(false);
      setSelectedApp(null);
      router.refresh();
    } else {
      toast.error("Error", {
        description: res.error || dict.removeError,
      });
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title={dict.title}
        description={
          <span>
            {dict.desc1} <BrandName /> {dict.desc2}
          </span>
        }
        noPadding
      >
        {initialApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{dict.noApps}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {dict.noAppsDesc}
            </p>
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
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-base text-foreground truncate">
                        {app.name}
                      </h4>
                      {app.website && (
                        <a
                          href={app.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            variant: "ghost",
                            size: "icon",
                            className: "w-6 h-6 text-muted-foreground hover:text-foreground",
                          })}
                          title="Visit Website"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {app.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {app.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {app.scopes.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-[11px] font-mono px-2 py-0.5"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {dict.connectedOn} {formatTime(app.createdAt, { format: "date" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedApp(app);
                      setIsRemoveOpen(true);
                    }}
                    disabled={isSubmitting}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-full h-8 gap-1.5 text-xs font-medium cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>{dict.remove}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Revocation Confirmation Dialog */}
      <Dialog
        open={isRemoveOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setIsRemoveOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle>{dict.removeModalTitle}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              {dict.removeModalDesc1} <strong>&ldquo;{selectedApp?.name}&rdquo;</strong>
              {dict.removeModalDesc2}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRemoveOpen(false)}
              disabled={isSubmitting}
              className="rounded-full"
            >
              {dict.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveApp}
              disabled={isSubmitting}
              className="rounded-full gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{dict.removing}</span>
                </>
              ) : (
                <span>{dict.remove}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
