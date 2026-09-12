"use client";

import { useState } from "react";
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
  Eye,
  EyeOff,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { disableAccount, deleteAccount } from "@/actions/profile/danger-zone.actions";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/hooks";
import { useRouter } from "next/navigation";

interface DangerZoneSectionProps {
  username?: string;
  hasPassword?: boolean;
}

const DELETION_REASONS = [
  "I no longer need this account",
  "Privacy or security concerns",
  "Switching to another account",
  "Too complex or hard to use",
  "Other reason",
];

export function DangerZoneSection({
  username = "",
  hasPassword = true,
}: DangerZoneSectionProps) {
  const { t } = useTranslations("profile_security");
  const router = useRouter();

  // Disable account dialog state
  const [disableStep, setDisableStep] = useState<1 | 2>(1);
  const [isDisabling, setIsDisabling] = useState(false);

  // Delete account dialog state
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(DELETION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const resetDeleteState = () => {
    setDeleteStep(1);
    setPassword("");
    setShowPassword(false);
    setConfirmUsername("");
    setDeleteError(null);
    setCustomReason("");
    setSelectedReason(DELETION_REASONS[0]);
  };

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      const res = await disableAccount();
      if (res.success) {
        toast.success("Account disabled successfully");
        router.push("/signin");
      } else {
        toast.error(res.error || "Failed to disable account");
      }
    } finally {
      setIsDisabling(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);

    const reason =
      selectedReason === "Other reason" && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    try {
      const res = await deleteAccount({
        password: hasPassword ? password : undefined,
        confirmUsername: !hasPassword ? confirmUsername : undefined,
        reason,
      });

      if (res.success) {
        toast.success("Your account has been permanently deleted.");
        router.push("/signin");
      } else {
        setDeleteError(res.error || "Failed to delete account");
        toast.error(res.error || "Failed to delete account");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An unexpected error occurred.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isDeleteReady = hasPassword
    ? password.trim().length > 0
    : confirmUsername.trim() === username.trim();

  return (
    <div className="space-y-6">
      <SectionCard variant="danger" title={t("dangerZone.title")} description={t("dangerZone.desc")} noPadding>
        {/* Permanent Account Deletion */}
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

          <AlertDialog onOpenChange={(open) => { if (!open) resetDeleteState(); }}>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="rounded-full shrink-0 self-start sm:self-center" />}>
              {t("dangerZone.deleteBtn")}
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-2xl border-destructive/30 bg-background/95 backdrop-blur-xl max-w-md w-full p-6">
              {deleteStep === 1 ? (
                <>
                  <AlertDialogHeader className="space-y-2 text-left">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-1">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-destructive">
                      Permanently Delete Account
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground">
                      This action is <strong className="text-foreground">permanent and cannot be reversed</strong>. Once confirmed, all your active sessions, passkeys, and account settings will be erased.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="my-4 space-y-3 rounded-xl bg-destructive/5 border border-destructive/15 p-4 text-xs text-muted-foreground">
                    <p className="font-semibold text-destructive flex items-center gap-1.5 text-sm">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      What will happen:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>All active logins and sessions will be instantly terminated.</li>
                      <li>Passwords, passkeys, TOTP, and recovery codes will be destroyed.</li>
                      <li>OAuth integrations and registered applications will be unlinked.</li>
                      <li>Essential compliance info will be archived in our graveyard record.</li>
                    </ul>
                  </div>

                  <div className="space-y-2 mb-4 text-left">
                    <Label htmlFor="delete-reason" className="text-xs font-medium text-foreground">
                      Reason for leaving (optional)
                    </Label>
                    <select
                      id="delete-reason"
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {DELETION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    {selectedReason === "Other reason" && (
                      <Input
                        placeholder="Please specify..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="mt-2 text-sm"
                        maxLength={200}
                      />
                    )}
                  </div>

                  <AlertDialogFooter className="flex-row justify-end gap-2">
                    <AlertDialogCancel className="rounded-full mt-0">
                      {t("dangerZone.modalCancel")}
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      onClick={() => setDeleteStep(2)}
                    >
                      Continue
                    </Button>
                  </AlertDialogFooter>
                </>
              ) : (
                <>
                  <AlertDialogHeader className="space-y-2 text-left">
                    <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-1">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-destructive">
                      Identity Verification
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground">
                      {hasPassword
                        ? "Please enter your current account password to confirm that this is your request."
                        : `To confirm deletion, please type your username below:`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {deleteError && (
                    <div className="my-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  <div className="my-4 space-y-2 text-left">
                    {hasPassword ? (
                      <div>
                        <Label htmlFor="delete-password" className="text-xs font-medium text-foreground mb-1 block">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="delete-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (deleteError) setDeleteError(null);
                            }}
                            className="pr-10 text-sm"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="confirm-username" className="text-xs font-medium text-foreground mb-1 block">
                          Type <code className="font-bold text-destructive px-1 py-0.5 rounded bg-muted font-mono">{username}</code> to confirm:
                        </Label>
                        <Input
                          id="confirm-username"
                          placeholder={username}
                          value={confirmUsername}
                          onChange={(e) => {
                            setConfirmUsername(e.target.value);
                            if (deleteError) setDeleteError(null);
                          }}
                          className="text-sm font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <AlertDialogFooter className="flex-row justify-end gap-2">
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={isDeleting}
                      onClick={() => {
                        setDeleteStep(1);
                        setDeleteError(null);
                      }}
                    >
                      Back
                    </Button>
                    <AlertDialogCancel
                      className="rounded-full mt-0"
                      disabled={isDeleting}
                      onClick={resetDeleteState}
                    >
                      {t("dangerZone.modalCancel")}
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      disabled={!isDeleteReady || isDeleting}
                      onClick={handleDelete}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Permanently Delete"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </>
              )}
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
