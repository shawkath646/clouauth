import { ConnectedAccountsSection } from "@/components/profile/connected-accounts-section";
import { getFullProfile } from "@/actions/profile/get-profile.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connected Accounts - Account Settings",
};

export default async function ConnectedAccountsPage() {
  const result = await getFullProfile();
  
  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <ConnectedAccountsSection profile={result.data} />;
}
