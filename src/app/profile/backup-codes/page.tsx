import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { BackupCodesManagementPage } from "@/components/profile/views/backup-codes-management-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backup Codes - clouburstlab",
  description: "Manage your account backup codes.",
};

export default async function BackupCodesPage() {
  const profileRes = await getFullProfile();
  const profile = (profileRes.success && "profile" in profileRes ? profileRes.profile : null) as import("@/types/profile.types").FullProfile | null;

  const hasCodes = !!profile?.recovery_codes && profile.recovery_codes.length > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <BackupCodesManagementPage hasCodes={hasCodes} />
    </div>
  );
}
