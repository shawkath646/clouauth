import { DevicesSection } from "@/components/profile/devices-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devices - Account Settings",
};

export default async function DevicesPage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <DevicesSection profile={result.data} />;
}
