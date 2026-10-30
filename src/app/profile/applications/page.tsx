import { Suspense } from "react";
import { ApplicationsSection } from "@/components/profile/applications-section";
import { getUserAppsAction } from "@/actions/profile/apps";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Applications - Account Settings",
};

export const instant = false;

async function ApplicationsContent() {
  const result = await getUserAppsAction();

  if (!result.success) {
    redirect("/signin");
  }

  return <ApplicationsSection initialApps={result.apps || []} />;
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}
