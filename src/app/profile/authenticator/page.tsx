import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { AuthenticatorManagementPage } from "@/components/profile/views/authenticator-management-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authenticator - clouburstlab",
  description: "Manage authenticator app for your account.",
};

export default async function AuthenticatorPage() {
  const profileRes = await getFullProfile();
  const profile = (profileRes.success && "profile" in profileRes ? profileRes.profile : profileRes.success && "data" in profileRes ? (profileRes as any).data : null) as import("@/types/profile.types").FullProfile | null;

  const hasTotp = !!profile?.has_totp;

  const authenticator = hasTotp ? { id: "totp", enabled: true, added_on: new Date() } : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <AuthenticatorManagementPage authenticator={authenticator} />
    </div>
  );
}
