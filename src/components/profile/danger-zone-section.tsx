"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { disableAccount, deleteAccount } from "@/actions/profile/danger-zone.actions";
import { toast } from "sonner";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

interface DangerZoneSectionProps {
  username?: string;
  hasPassword?: boolean;
  locale?: Locale;
  dict: Dictionary<"profile_security">["dangerZone"];
}

export function DangerZoneSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  username = "",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasPassword = true,
  locale = defaultLocale,
  dict,
}: DangerZoneSectionProps) {
  const router = useRouter();

  // Disable account dialog state
  const [disableStep, setDisableStep] = useState<1 | 2>(1);
  const [isDisabling, setIsDisabling] = useState(false);

  // Delete account dialog state
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedReasonKey, setSelectedReasonKey] = useState<string>("reasonNoLongerNeed");
  const [customReason, setCustomReason] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const resetDeleteState = () => {
    setDeleteError(null);
    setCustomReason("");
    setSelectedReasonKey("reasonNoLongerNeed");
  };

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      const res = await disableAccount();
      if (res.sudoRequired && res.redirectUrl) {
        router.push(res.redirectUrl);
        return;
      }
      if (res.success) {
        toast.success(dict.disableSuccess);
        router.push(`/${locale}/signin`);
      } else {
        toast.error(res.error || dict.disableError);
      }
    } finally {
      setIsDisabling(false);
    }
  };

  const reasonMap: Record<string, string> = {
    reasonNoLongerNeed: dict.reasonNoLongerNeed,
    reasonPrivacyConcerns: dict.reasonPrivacyConcerns,
    reasonSwitchingAccount: dict.reasonSwitchingAccount,
    reasonTooComplex: dict.reasonTooComplex,
    reasonOther: dict.reasonOther,
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);

    const reason =
      selectedReasonKey === "reasonOther" && customReason.trim()
        ? customReason.trim()
        : reasonMap[selectedReasonKey] || dict.reasonOther;

    try {
      const res = await deleteAccount({ reason });

      if (res.sudoRequired && res.redirectUrl) {
        router.push(res.redirectUrl);
        return;
      }

      if (res.success) {
        toast.success(dict.deleteSuccess);
        router.push(`/${locale}/signin`);
      } else {
        const errorMsg = res.error || dict.deleteError;
        setDeleteError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : dict.deleteError;
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const reasonOptions = [
    { key: "reasonNoLongerNeed", label: dict.reasonNoLongerNeed },
    { key: "reasonPrivacyConcerns", label: dict.reasonPrivacyConcerns },
    { key: "reasonSwitchingAccount", label: dict.reasonSwitchingAccount },
    { key: "reasonTooComplex", label: dict.reasonTooComplex },
    { key: "reasonOther", label: dict.reasonOther },
  ];

  return (
    <div className="space-y-6">
      <SectionCard variant="danger" title={dict.title} description={dict.desc} noPadding>
        {/* Permanent Account Deletion */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl shrink-0 mt-1 sm:mt-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold">{dict.deleteTitle}</h4>
              <p className="text-sm font-normal text-muted-foreground mt-1">{dict.deleteDesc}</p>
            </div>
          </div>

          <AlertDialog onOpenChange={(open) => { if (!open) resetDeleteState(); }}>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="rounded-full shrink-0 self-start sm:self-center" />}>
              {dict.deleteBtn}
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-2xl border-destructive/30 bg-background/95 backdrop-blur-xl max-w-md w-full p-6">
              <AlertDialogHeader className="space-y-2 text-left">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-1">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <AlertDialogTitle className="text-xl font-bold text-destructive">
                  {dict.deleteModalTitle}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  {dict.deleteModalDesc}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="my-4 space-y-3 rounded-xl bg-destructive/5 border border-destructive/15 p-4 text-xs text-muted-foreground">
                <p className="font-semibold text-destructive flex items-center gap-1.5 text-sm">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {dict.whatWillHappen}
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>{dict.happenSessions}</li>
                  <li>{dict.happenCredentials}</li>
                  <li>{dict.happenOAuth}</li>
                  <li>{dict.happenCompliance}</li>
                </ul>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="space-y-2 mb-4 text-left">
                <Label htmlFor="delete-reason" className="text-xs font-medium text-foreground">
                  {dict.reasonLabel}
                </Label>
                <select
                  id="delete-reason"
                  value={selectedReasonKey}
                  onChange={(e) => setSelectedReasonKey(e.target.value)}
                  className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {reasonOptions.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>

                {selectedReasonKey === "reasonOther" && (
                  <Input
                    placeholder={dict.reasonPlaceholder}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="mt-2 text-sm"
                    maxLength={200}
                  />
                )}
              </div>

              <AlertDialogFooter className="flex-row justify-end gap-2">
                <AlertDialogCancel className="rounded-full mt-0" disabled={isDeleting}>
                  {dict.modalCancel}
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  className="rounded-full"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {dict.deleting}
                    </>
                  ) : (
                    dict.confirmDelete
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator className="opacity-50" />

        {/* Temporary Account Disabling */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl shrink-0 mt-1 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold">{dict.disableTitle}</h4>
              <p className="text-sm font-normal text-muted-foreground mt-1">{dict.disableDesc}</p>
            </div>
          </div>
          <AlertDialog onOpenChange={(open) => { if (!open) setDisableStep(1); }}>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" className="rounded-full shrink-0 self-start sm:self-center text-orange-500 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-600" />}>
              {dict.disableBtn}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl border-orange-500/20 bg-background/95 backdrop-blur-xl">
              {disableStep === 1 ? (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{dict.disableTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {dict.modalDesc}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">{dict.modalCancel}</AlertDialogCancel>
                    <Button
                      variant="default"
                      className="rounded-full bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => setDisableStep(2)}
                    >
                      {dict.continue}
                    </Button>
                  </AlertDialogFooter>
                </>
              ) : (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{dict.modalWarning}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {dict.disableFinalConfirm}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full" disabled={isDisabling}>{dict.modalCancel}</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      disabled={isDisabling}
                      onClick={handleDisable}
                    >
                      {isDisabling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {dict.modalConfirm}
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
