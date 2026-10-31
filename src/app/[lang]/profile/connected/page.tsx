import { Suspense } from "react";
import { connection } from "next/server";
import { ConnectedAccountsSection } from "@/components/profile/connected-accounts-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Connected Accounts - Account Settings",
};

async function ConnectedAccountsContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

  await connection();
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return (
    <ConnectedAccountsSection
      profile={result.data}
      dict={{
        sso: dict.sso,
        cloudDrives: dict.cloudDrives,
      }}
    />
  );
}

export default async function ConnectedAccountsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <ConnectedAccountsContent lang={lang} />
    </Suspense>
  );
}
