import { PrivacySection } from "@/components/profile/privacy-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Data - Account Settings",
};

export default async function PrivacyPage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <PrivacySection profile={result.data} />;
}
