import { Suspense } from "react";
import { NotificationsSection } from "@/components/profile/notifications-section";
import { PreferencesSkeleton } from "@/components/profile/profile-skeletons";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Notifications - Account Settings",
};

async function NotificationsContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_personal", locale);

  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return <NotificationsSection profile={result.data} dict={dict.notificationsSection} />;
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={<PreferencesSkeleton />}>
      <NotificationsContent lang={lang} />
    </Suspense>
  );
}
