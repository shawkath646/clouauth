import { getFullProfile } from "@/actions/profile/get-profile";
import { PasswordManagementPage } from "@/components/profile/views/password-management-page";
import { requireSudoPage } from "@/actions/auth/sudo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Password - clouburstlab",
  description: "Manage your account password.",
};

export default async function PasswordPage() {
  await requireSudoPage("/profile/password");
  const profileRes = await getFullProfile();
  const profile = profileRes.success ? profileRes.data : null;

  const hasPassword = Boolean(profile?.password);
  const lastChangedOn = profile?.password?.last_changed_on
    ? new Date(profile.password.last_changed_on).toLocaleDateString()
    : undefined;

  return (
    <div className="space-y-6 w-full">
      <PasswordManagementPage
        hasPassword={hasPassword}
        lastChangedOn={lastChangedOn}
      />
    </div>
  );
}
