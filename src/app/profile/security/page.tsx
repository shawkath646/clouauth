import { SecuritySection } from "@/components/profile/security-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security - Account Settings",
};

export default async function SecurityPage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <SecuritySection profile={result.data} />;
}
