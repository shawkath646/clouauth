import { Suspense } from "react";
import { PrivacySection } from "@/components/profile/privacy-section";
import { PrivacySkeleton } from "@/components/profile/profile-skeletons";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Privacy & Data - Account Settings",
};

async function PrivacyContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_personal", locale);

  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return <PrivacySection profile={result.data} locale={locale} dict={dict.privacySection} />;
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={<PrivacySkeleton />}>
      <PrivacyContent lang={lang} />
    </Suspense>
  );
}
