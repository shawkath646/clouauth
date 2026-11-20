import { Suspense } from "react";
import { DevicesSection } from "@/components/profile/devices-section";
import { DevicesSkeleton } from "@/components/profile/profile-skeletons";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Devices - Account Settings",
};

async function DevicesContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

  const result = await getFullProfile();

  if (!result.success || !result.data) {
    redirect(`/${locale}/signin`);
  }

  return (
    <DevicesSection
      profile={result.data}
      locale={locale}
      dict={{
        activeSessions: dict.activeSessions,
        signedOutSuccess: dict.signedOutSuccess,
        signedOutError: dict.signedOutError,
        unexpectedError: dict.unexpectedError,
        signedOutAllSuccess: dict.signedOutAllSuccess,
        signedOutAllError: dict.signedOutAllError,
      }}
    />
  );
}

export default async function DevicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={<DevicesSkeleton />}>
      <DevicesContent lang={lang} />
    </Suspense>
  );
}
