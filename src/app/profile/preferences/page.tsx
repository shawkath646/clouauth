import { PreferencesSection } from "@/components/profile/preferences-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preferences - Account Settings",
};

export default async function PreferencesPage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <PreferencesSection profile={result.data} />;
}
