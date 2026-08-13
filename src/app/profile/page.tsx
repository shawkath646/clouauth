import { PersonalInfoSection } from "@/components/profile/personal-info-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal Info - Account Settings",
};

export default async function ProfilePage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <PersonalInfoSection profile={result.data} />;
}
