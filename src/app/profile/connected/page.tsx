import { Suspense } from "react";
import { ConnectedAccountsSection } from "@/components/profile/connected-accounts-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connected Accounts - Account Settings",
};

export const instant = false;

async function ConnectedAccountsContent() {
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect("/signin");
  }

  return <ConnectedAccountsSection profile={result.data} />;
}

export default function ConnectedAccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <ConnectedAccountsContent />
    </Suspense>
  );
}
