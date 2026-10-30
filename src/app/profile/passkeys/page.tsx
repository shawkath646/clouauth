import { Suspense } from "react";
import { PasskeysManagement } from "@/components/profile/views/passkeys-management";
import { getUserPasskeys } from "@/actions/auth/passkey.actions";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passkeys & Security Keys - clouburstlab",
  description:
    "Manage your passkeys and security keys for passwordless authentication.",
};

export const instant = false;

async function PasskeysContent() {
  const result = await getUserPasskeys();

  if (!result.success) {
    redirect("/signin");
  }

  return <PasskeysManagement initialPasskeys={result.passkeys || []} />;
}

export default function PasskeysPage() {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
        }
      >
        <PasskeysContent />
      </Suspense>
    </div>
  );
}
