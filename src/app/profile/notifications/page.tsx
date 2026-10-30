import { Suspense } from "react";
import { NotificationsSection } from "@/components/profile/notifications-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications - Account Settings",
};

export const instant = false;

async function NotificationsContent() {
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <NotificationsSection profile={result.data} />;
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
