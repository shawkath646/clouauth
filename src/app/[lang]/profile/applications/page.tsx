import { Suspense } from "react";
import { connection } from "next/server";
import { ApplicationsSection } from "@/components/profile/applications-section";
import { getUserAppsAction } from "@/actions/profile/apps";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Applications - Account Settings",
};

async function ApplicationsContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_apps", locale);

  await connection();
  const result = await getUserAppsAction();

  if (!result.success) {
    redirect(`/${locale}/signin`);
  }

  return (
    <ApplicationsSection
      initialApps={result.apps || []}
      locale={locale}
      dict={dict.developerApps}
    />
  );
}

export default async function ApplicationsPage({
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
      <ApplicationsContent lang={lang} />
    </Suspense>
  );
}
