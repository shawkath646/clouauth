import { Suspense } from "react";
import { connection } from "next/server";
import { SecuritySection } from "@/components/profile/security-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Security - Account Settings",
};

async function SecurityContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

  await connection();
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return (
    <SecuritySection
      profile={result.data}
      locale={locale}
      dict={{
        signInSecurity: dict.signInSecurity,
        recoveryMethods: dict.recoveryMethods,
        recentActivity: dict.recentActivity,
      }}
    />
  );
}

export default async function SecurityPage({
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
      <SecurityContent lang={lang} />
    </Suspense>
  );
}
