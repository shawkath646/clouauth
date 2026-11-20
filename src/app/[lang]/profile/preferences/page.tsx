import { Suspense } from "react";
import { PreferencesSection } from "@/components/profile/preferences-section";
import { PreferencesSkeleton } from "@/components/profile/profile-skeletons";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Preferences - Account Settings",
};

async function PreferencesContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_personal", locale);

  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return (
    <PreferencesSection
      profile={result.data}
      locale={locale}
      dict={dict.preferencesSection}
    />
  );
}

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={<PreferencesSkeleton />}>
      <PreferencesContent lang={lang} />
    </Suspense>
  );
}
