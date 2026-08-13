import { NotificationsSection } from "@/components/profile/notifications-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications - Account Settings",
};

export default async function NotificationsPage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <NotificationsSection profile={result.data} />;
}
