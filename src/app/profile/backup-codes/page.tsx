import { Suspense } from "react";
import { getFullProfile } from "@/actions/profile/get-profile";
import { BackupCodesManagementPage } from "@/components/profile/views/backup-codes-management-page";
import { requireSudoPage } from "@/actions/auth/sudo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backup Codes - clouburstlab",
  description: "Manage your account backup codes.",
};

export const instant = false;

async function BackupCodesContent() {
  await requireSudoPage("/profile/backup-codes");
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;

  const hasCodes = Boolean(
    profile?.recovery_codes && profile.recovery_codes.length > 0
  );

  return <BackupCodesManagementPage hasCodes={hasCodes} />;
}

export default function BackupCodesPage() {
  return (
    <div className="space-y-6 w-full">
      <Suspense
        fallback={
          <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
        }
      >
        <BackupCodesContent />
      </Suspense>
    </div>
  );
}
