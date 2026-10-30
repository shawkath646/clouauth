import { Suspense } from "react";
import { getFullProfile } from "@/actions/profile/get-profile";
import { RecoveryEmailManagementPage } from "@/components/profile/views/recovery-email-management-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recovery Email - clouburstlab",
  description: "Manage your recovery email address.",
};

export const instant = false;

async function RecoveryEmailContent() {
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;
  const recoveryEmailObj = profile?.emails?.find((e) => !e.is_primary);
  const recoveryEmail = recoveryEmailObj ? recoveryEmailObj.address : undefined;
  const isVerified = recoveryEmailObj ? recoveryEmailObj.verified : false;

  return (
    <RecoveryEmailManagementPage email={recoveryEmail} isVerified={isVerified} />
  );
}

export default function RecoveryEmailPage() {
  return (
    <div className="space-y-6 w-full">
      <Suspense
        fallback={
          <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
        }
      >
        <RecoveryEmailContent />
      </Suspense>
    </div>
  );
}
