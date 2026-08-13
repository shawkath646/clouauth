import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { PasswordManagementPage } from "@/components/profile/views/password-management-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Password - clouburstlab",
  description: "Manage your account password.",
};

export default async function PasswordPage() {
  const profileRes = await getFullProfile();
  const profile = (profileRes.success && "profile" in profileRes ? profileRes.profile : null) as import("@/types/profile.types").FullProfile | null;

  const hasPassword = !!profile?.password;
  const lastChangedOn = profile?.password?.last_changed_on
    ? new Date(profile.password.last_changed_on).toLocaleDateString()
    : undefined;

  return (
    <div className="space-y-6 max-w-3xl">
      <PasswordManagementPage
        hasPassword={hasPassword}
        lastChangedOn={lastChangedOn}
      />
    </div>
  );
}
