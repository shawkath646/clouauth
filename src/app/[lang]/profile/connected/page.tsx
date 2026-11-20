import { Suspense } from "react";
import { ConnectedAccountsSection } from "@/components/profile/connected-accounts-section";
import { ConnectedAccountsSkeleton } from "@/components/profile/profile-skeletons";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Connected Accounts - Account Settings",
};

async function ConnectedAccountsContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

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
    <Suspense fallback={<ConnectedAccountsSkeleton />}>
      <ConnectedAccountsContent lang={lang} />
    </Suspense>
  );
}
