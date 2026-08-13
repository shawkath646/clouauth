"use client";

import { useState } from "react";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { disableAccount } from "@/actions/profile/danger-zone.actions";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/hooks";

export function DangerZoneSection() {
  const { t } = useTranslations("profile_security");
  const [disableStep, setDisableStep] = useState<1 | 2>(1);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      const res = await disableAccount();
      if (res.success) {
        toast.success("Account disabled successfully");
        window.location.href = "/signin";
      } else {
        toast.error(res.error || "Failed to disable account");
      }
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard variant="danger" title={t("dangerZone.title")} description={t("dangerZone.desc")} noPadding>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl shrink-0 mt-1 sm:mt-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold">{t("dangerZone.deleteTitle")}</h4>
              <p className="text-sm font-normal text-muted-foreground mt-1">{t("dangerZone.deleteDesc")}</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="rounded-full shrink-0 self-start sm:self-center" />}>
              {t("dangerZone.deleteBtn")}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border-destructive/20 bg-background/95 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("dangerZone.modalWarning")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("dangerZone.deleteDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">{t("dangerZone.modalCancel")}</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full">{t("dangerZone.deleteBtn")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl shrink-0 mt-1 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold">{t("dangerZone.disableTitle")}</h4>
              <p className="text-sm font-normal text-muted-foreground mt-1">{t("dangerZone.disableDesc")}</p>
            </div>
          </div>
          <AlertDialog onOpenChange={(open) => { if (!open) setDisableStep(1); }}>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" className="rounded-full shrink-0 self-start sm:self-center text-orange-500 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-600" />}>
              {t("dangerZone.disableBtn")}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border-orange-500/20 bg-background/95 backdrop-blur-xl">
              {disableStep === 1 ? (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("dangerZone.disableTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("dangerZone.modalDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">{t("dangerZone.modalCancel")}</AlertDialogCancel>
                    <Button 
                      variant="default" 
                      className="rounded-full bg-orange-500 hover:bg-orange-600 text-white" 
                      onClick={() => setDisableStep(2)}
                    >
                      Continue
                    </Button>
                  </AlertDialogFooter>
                </>
              ) : (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("dangerZone.modalWarning")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      This is your final confirmation. Your account will be disabled immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full" disabled={isDisabling}>{t("dangerZone.modalCancel")}</AlertDialogCancel>
                    <Button 
                      variant="destructive" 
                      className="rounded-full" 
                      disabled={isDisabling}
                      onClick={handleDisable}
                    >
                      {isDisabling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t("dangerZone.modalConfirm")}
                    </Button>
                  </AlertDialogFooter>
                </>
              )}
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SectionCard>
    </div>
  );
}
