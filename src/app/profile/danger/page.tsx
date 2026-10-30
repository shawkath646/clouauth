import { Suspense } from "react";
import { DangerZoneSection } from "@/components/profile/danger-zone-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { requireSudoPage } from "@/actions/auth/sudo";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danger Zone - Account Settings",
};

export const instant = false;

async function DangerZoneContent() {
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

export default function DangerZonePage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <DangerZoneContent />
    </Suspense>
  );
}
