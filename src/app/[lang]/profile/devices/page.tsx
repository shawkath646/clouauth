import { Suspense } from "react";
import { connection } from "next/server";
import { DevicesSection } from "@/components/profile/devices-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Devices - Account Settings",
};

async function DevicesContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

  await connection();
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
    <Suspense
      fallback={
        <div className="h-96 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <DevicesContent lang={lang} />
    </Suspense>
  );
}
