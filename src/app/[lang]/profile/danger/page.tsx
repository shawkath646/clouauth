import { Suspense } from "react";
import { connection } from "next/server";
import { DangerZoneSection } from "@/components/profile/danger-zone-section";
import { getFullProfile } from "@/actions/profile/get-profile";
import { requireSudoPage } from "@/actions/auth/sudo";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Danger Zone - Account Settings",
};

async function DangerZoneContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_security", locale);

  await connection();
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
    <Suspense
      fallback={
        <div className="h-64 w-full rounded-2xl bg-card/50 border border-border/40 animate-pulse" />
      }
    >
      <DangerZoneContent lang={lang} />
    </Suspense>
  );
}
