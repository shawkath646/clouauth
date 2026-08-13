import { DangerZoneSection } from "@/components/profile/danger-zone-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danger Zone - Account Settings",
};

export default async function DangerZonePage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <DangerZoneSection profile={result.data} />;
}
