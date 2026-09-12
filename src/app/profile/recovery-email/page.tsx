import { getFullProfile } from "@/actions/profile/get-profile";
import { RecoveryEmailManagementPage } from "@/components/profile/views/recovery-email-management-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recovery Email - clouburstlab",
  description: "Manage your recovery email address.",
};

export default async function RecoveryEmailPage() {
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;
  const recoveryEmailObj = profile?.emails?.find((e) => !e.is_primary);
  const recoveryEmail = recoveryEmailObj ? recoveryEmailObj.address : undefined;
  const isVerified = recoveryEmailObj ? recoveryEmailObj.verified : false;

  return (
    <div className="space-y-6 max-w-3xl">
      <RecoveryEmailManagementPage email={recoveryEmail} isVerified={isVerified} />
    </div>
  );
}
