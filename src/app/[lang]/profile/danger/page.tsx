import { Suspense } from "react";
import { DangerZoneSection } from "@/components/profile/danger-zone-section";
import { DangerZoneSkeleton } from "@/components/profile/profile-skeletons";
import { getFullProfile } from "@/actions/profile/get-profile";
import { requireSudoPage } from "@/actions/auth/sudo";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Danger Zone - Account Settings",
};

async function DangerZoneContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

  await requireSudoPage(`/${locale}/profile/danger`, locale);
  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return (
    <DangerZoneSection
      username={result.data.user.username}
      hasPassword={Boolean(result.data.password)}
      locale={locale}
      dict={dict.dangerZone}
    />
  );
}

export default async function DangerZonePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={<DangerZoneSkeleton />}>
      <DangerZoneContent lang={lang} />
    </Suspense>
  );
}
