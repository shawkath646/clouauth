import { Suspense } from "react";
import { PersonalInfoSection } from "@/components/profile/personal-info-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal Info - Account Settings",
};

export const instant = false;

async function ProfilePersonalContent() {
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <PersonalInfoSection profile={result.data} />;
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <ProfilePersonalContent />
    </Suspense>
  );
}
