import { Suspense } from "react";
import { getFullProfile } from "@/actions/profile/get-profile";
import { PasswordManagementPage } from "@/components/profile/views/password-management-page";
import { requireSudoPage } from "@/actions/auth/sudo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Password - clouburstlab",
  description: "Manage your account password.",
};

export const instant = false;

async function PasswordContent() {
  await requireSudoPage("/profile/password");
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;

  const hasPassword = Boolean(profile?.password);
  const lastChangedOn = profile?.password?.last_changed_on
    ? String(profile.password.last_changed_on).split("T")[0]
    : undefined;

  return (
    <PasswordManagementPage
      hasPassword={hasPassword}
      lastChangedOn={lastChangedOn}
    />
  );
}

export default function PasswordPage() {
  return (
    <div className="space-y-6 w-full">
      <Suspense
        fallback={
          <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
        }
      >
        <PasswordContent />
      </Suspense>
    </div>
  );
}
