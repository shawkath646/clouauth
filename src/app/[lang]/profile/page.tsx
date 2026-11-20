import { Suspense } from "react";
import { connection } from "next/server";
import { PersonalInfoSection } from "@/components/profile/personal-info-section";
import { PersonalInfoSkeleton } from "@/components/profile/profile-skeletons";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Personal Info - Account Settings",
};

async function ProfilePersonalContent({ lang }: { lang: string }) {
  await connection();
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_personal", locale);

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
    <Suspense fallback={<PersonalInfoSkeleton />}>
      <ProfilePersonalContent lang={lang} />
    </Suspense>
  );
}
