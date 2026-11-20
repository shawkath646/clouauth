import { Suspense } from "react";
import { ApplicationsSection } from "@/components/profile/applications-section";
import { ConnectedApplicationsSection } from "@/components/profile/connected-applications-section";
import { ApplicationsSkeleton } from "@/components/profile/profile-skeletons";
import { getUserAppsAction } from "@/actions/profile/apps";
import { getConnectedAppsAction } from "@/actions/profile/connected-apps.actions";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Applications - Account Settings",
};

async function ApplicationsContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const dict = await getDictionary("profile_apps", locale);

  const [developerAppsRes, connectedAppsRes] = await Promise.all([
    getUserAppsAction(),
    getConnectedAppsAction(),
  ]);

  if (!developerAppsRes.success) {
    redirect(`/${locale}/signin`);
  }

  return (
    <div className="space-y-8">
      <ConnectedApplicationsSection
        initialApps={connectedAppsRes.apps || []}
        dict={dict.connectedApps}
      />
      <ApplicationsSection
        initialApps={developerAppsRes.apps || []}
        locale={locale}
        dict={dict.developerApps}
      />
    </div>
  );
}

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={<ApplicationsSkeleton />}>
      <ApplicationsContent lang={lang} />
    </Suspense>
  );
}
