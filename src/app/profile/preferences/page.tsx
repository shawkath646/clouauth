import { Suspense } from "react";
import { PreferencesSection } from "@/components/profile/preferences-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preferences - Account Settings",
};

export const instant = false;

async function PreferencesContent() {
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <PreferencesSection profile={result.data} />;
}

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <PreferencesContent />
    </Suspense>
  );
}
