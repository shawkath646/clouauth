import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { PhoneManagementPage } from "@/components/profile/views/phone-management-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phone Numbers - clouburstlab",
  description: "Manage phone numbers for your account.",
};

export default async function PhonePage() {
  const profileRes = await getFullProfile();
  const profile = (profileRes.success && "profile" in profileRes ? profileRes.profile : null) as import("@/types/profile.types").FullProfile | null;
  const phones = profile?.two_factor_methods?.filter((m: import("@/types/auth.types").DBTwoFactorMethod) => m.type === "phone") || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <PhoneManagementPage phones={phones} />
    </div>
  );
}
