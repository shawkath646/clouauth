import { Suspense } from "react";
import { connection } from "next/server";
import { PasskeysManagement } from "@/components/profile/views/passkeys-management";
import { getUserPasskeys } from "@/actions/auth/passkey.actions";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Passkeys & Security Keys - clouburstlab",
  description:
    "Manage your passkeys and security keys for passwordless authentication.",
};

async function PasskeysContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  await connection();
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
      <Suspense
        fallback={
          <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
        }
      >
        <PasskeysContent lang={lang} />
      </Suspense>
    </div>
  );
}
