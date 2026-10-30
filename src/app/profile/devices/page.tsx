import { Suspense } from "react";
import { DevicesSection } from "@/components/profile/devices-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devices - Account Settings",
};

export const instant = false;

async function DevicesContent() {
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <DevicesSection profile={result.data} />;
}

export default function DevicesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <DevicesContent />
    </Suspense>
  );
}
