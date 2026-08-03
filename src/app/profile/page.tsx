import { ProfileShell } from "@/components/profile/profile-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your CloudburstLab account settings, privacy, and security.",
  alternates: {
    canonical: "/profile",
  },
  robots: {
    index: false, // Do not index private authenticated pages
    follow: false,
  },
};

import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <ProfileShell profile={result.data} />;
}
