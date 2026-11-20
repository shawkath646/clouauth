import { Suspense } from "react";
import { PasskeysManagement } from "@/components/profile/views/passkeys-management";
import { ManagementFormSkeleton } from "@/components/profile/profile-skeletons";
import { getUserPasskeys } from "@/actions/auth/passkey.actions";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Passkeys & Security Keys - clouburstlab",
  description:
    "Manage your passkeys and security keys for passwordless authentication.",
};

async function PasskeysContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const result = await getUserPasskeys();

  if (!result.success) {
    redirect(`/${locale}/signin`);
  }

  return <PasskeysManagement initialPasskeys={result.passkeys || []} />;
}

export default async function PasskeysPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <div className="space-y-6">
      <Suspense fallback={<ManagementFormSkeleton />}>
        <PasskeysContent lang={lang} />
      </Suspense>
    </div>
  );
}
