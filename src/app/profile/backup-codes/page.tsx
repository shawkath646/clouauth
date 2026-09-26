import { getFullProfile } from "@/actions/profile/get-profile";
import { BackupCodesManagementPage } from "@/components/profile/views/backup-codes-management-page";
import { requireSudoPage } from "@/actions/auth/sudo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backup Codes - clouburstlab",
  description: "Manage your account backup codes.",
};

export default async function BackupCodesPage() {
  await requireSudoPage("/profile/backup-codes");
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;

  const hasCodes = Boolean(profile?.recovery_codes && profile.recovery_codes.length > 0);

  return (
    <div className="space-y-6 w-full">
      <BackupCodesManagementPage hasCodes={hasCodes} />
    </div>
  );
}
