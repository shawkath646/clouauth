import { PasskeysManagement } from "@/components/profile/views/passkeys-management";
import { getUserPasskeys } from "@/actions/auth/passkey.actions";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passkeys & Security Keys - clouburstlab",
  description: "Manage your passkeys and security keys for passwordless authentication.",
};

export default async function PasskeysPage() {
  const result = await getUserPasskeys();
  
  if (!result.success) {
    redirect("/signin");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PasskeysManagement initialPasskeys={result.passkeys || []} />
    </div>
  );
}
