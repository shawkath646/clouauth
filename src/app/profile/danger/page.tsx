import { DangerZoneSection } from "@/components/profile/danger-zone-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { requireSudoPage } from "@/actions/auth/sudo";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danger Zone - Account Settings",
};

export default async function DangerZonePage() {
  await requireSudoPage("/profile/danger");
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return (
    <DangerZoneSection
      username={result.data.user.username}
      hasPassword={Boolean(result.data.password)}
    />
  );
}
