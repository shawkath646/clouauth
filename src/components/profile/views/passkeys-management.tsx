"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionCard } from "@/components/profile/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Fingerprint, Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  getUserPasskeys,
  triggerPasskeyRegistration,
  resolvePasskeyRegistration,
  updatePasskeyName,
  deletePasskey,
} from "@/actions/auth/passkey.actions";
import { toast } from "sonner";
import { handleError } from "@/utils/error";

interface PasskeyItem {
  id: string;
  credential_id: string;
  device_name: string | null;
  created_on: Date;
  last_used_on: Date | null;
}

import { useRouter } from "next/navigation";

export function PasskeysManagement({ initialPasskeys = [] }: { initialPasskeys?: PasskeyItem[] }) {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);

  // Add passkey modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("Windows Hello / Security Key");

  // Rename passkey modal state
  const [renamePasskeyId, setRenamePasskeyId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete passkey modal state
  const [deletePasskeyId, setDeletePasskeyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) {
      toast.error("Please enter a name for this passkey");
      return;
    }

    setIsRegistering(true);
    try {
      const res = await triggerPasskeyRegistration();
      if (!res.success || !res.options || !res.tempSessionId) {
        toast.error("Registration error", { description: res.error || "Failed to start registration" });
        setIsRegistering(false);
        return;
      }

      // Invoke browser WebAuthn registration
      const attestationResponse = await startRegistration({ optionsJSON: res.options });

      const resolveRes = await resolvePasskeyRegistration(
        res.tempSessionId,
        attestationResponse,
        newDeviceName.trim()
      );

      if (resolveRes.success) {
        toast.success("Passkey registered successfully!", {
          description: `"${newDeviceName.trim()}" has been added to your account.`,
        });
        setIsAddModalOpen(false);
        setNewDeviceName("Windows Hello / Security Key");
        router.refresh();
      } else {
        toast.error("Verification error", { description: resolveRes.error || "Failed to register passkey" });
      }
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute PasskeysManagement");
        if (!em.toLowerCase().includes("cancelled") && !em.toLowerCase().includes("not allowed")) {
          toast.error("Registration failed", { description: em });
        }
      } finally {
      setIsRegistering(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamePasskeyId || !renameValue.trim()) return;

    setIsRenaming(true);
    try {
      const res = await updatePasskeyName(renamePasskeyId, renameValue.trim());
      if (res.success) {
        toast.success("Passkey renamed");
        setRenamePasskeyId(null);
        setRenameValue("");
        router.refresh();
      } else {
        toast.error("Failed to rename passkey", { description: res.error });
      }
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute PasskeysManagement");
        toast.error("Error", { description: em });
      } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletePasskeyId) return;

    setIsDeleting(true);
    try {
      const res = await deletePasskey(deletePasskeyId);
      if (res.success) {
        toast.success("Passkey removed");
        setDeletePasskeyId(null);
        router.refresh();
      } else {
        toast.error("Failed to remove passkey", { description: res.error });
      }
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute PasskeysManagement");
        toast.error("Error", { description: em });
      } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Registered Devices"
        description="Devices authorized to sign in to your account with biometrics or security keys."
        noPadding
      >
        {initialPasskeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Fingerprint className="w-7 h-7 text-primary" />
            </div>
            <h4 className="text-base font-semibold mb-1">No passkeys registered</h4>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Add a passkey to sign in to your account with biometrics or a security key instead of a password.
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
              aria-label="Add a passkey"
            >
              <Plus className="w-4 h-4" />
              <span>Add Passkey</span>
            </Button>
          </div>
        ) : (
          <div role="region" aria-label="Registered passkeys list" className="divide-y divide-border/50">
            <AnimatePresence mode="popLayout">
              {initialPasskeys.map((passkey) => (
                <motion.div
                  key={passkey.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ willChange: "transform, opacity" }}
                  className="flex items-center justify-between px-5 py-4 sm:px-6 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Fingerprint className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold truncate">
                          {passkey.device_name || "Security Key"}
                        </h4>
                        <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Added {new Date(passkey.created_on).toLocaleDateString()} •{" "}
                        {passkey.last_used_on
                          ? `Last used ${new Date(passkey.last_used_on).toLocaleDateString()}`
                          : "Never used"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Rename passkey ${passkey.device_name || "Security Key"}`}
                      onClick={() => {
                        setRenamePasskeyId(passkey.id);
                        setRenameValue(passkey.device_name || "Security Key");
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete passkey ${passkey.device_name || "Security Key"}`}
                      onClick={() => setDeletePasskeyId(passkey.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </SectionCard>

      {/* Add Passkey Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              <span>Register New Passkey</span>
            </DialogTitle>
            <DialogDescription>
              Name your security key or biometric device so you can identify it later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartRegistration} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="passkey-name">Passkey Name</Label>
              <Input
                id="passkey-name"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="e.g., Windows Hello, MacBook Touch ID"
                autoComplete="off"
                disabled={isRegistering}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isRegistering}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  "Continue to Register"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Passkey Modal */}
      <Dialog open={!!renamePasskeyId} onOpenChange={(open) => !open && setRenamePasskeyId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Passkey</DialogTitle>
            <DialogDescription>
              Enter a new name for this passkey device.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-passkey">Device Name</Label>
              <Input
                id="rename-passkey"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Device name"
                autoComplete="off"
                disabled={isRenaming}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenamePasskeyId(null)}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Passkey Alert */}
      <AlertDialog open={!!deletePasskeyId} onOpenChange={(open) => !open && setDeletePasskeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke this passkey. You won&apos;t be able to use this device to sign in anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Removing..." : "Remove Passkey"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
