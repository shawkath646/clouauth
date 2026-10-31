import { Suspense } from "react";
import { connection } from "next/server";
import { PersonalInfoSection } from "@/components/profile/personal-info-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Personal Info - Account Settings",
};

async function ProfilePersonalContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_personal", locale);

  await connection();
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return (
    <PersonalInfoSection
      profile={result.data}
      locale={locale}
      dict={dict.infoSection}
    />
  );
}

export default async function ProfilePage({
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
      <ProfilePersonalContent lang={lang} />
    </Suspense>
  );
}
