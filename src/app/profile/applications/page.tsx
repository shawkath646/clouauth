import { ApplicationsSection } from "@/components/profile/applications-section";
import { getUserAppsAction } from "@/actions/profile/apps.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Applications - Account Settings",
};

export default async function ApplicationsPage() {
  const result = await getUserAppsAction();
  
  if (!result.success) {
    redirect("/signin");
  }

  return <ApplicationsSection initialApps={result.apps || []} />;
}
