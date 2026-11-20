import { Suspense } from "react";
import { ApplicationForm } from "@/components/profile/applications/application-form";
import { ManagementFormSkeleton } from "@/components/profile/profile-skeletons";
import { getUserSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { getAppById } from "@/lib/oauth/clients";
import { formatDeveloperApp } from "@/actions/profile/apps";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

interface EditApplicationPageProps {
  params: Promise<{ lang: string; id: string }>;
}

async function EditApplicationDynamicContent({
  params,
}: EditApplicationPageProps) {
  const { lang, id } = await params;
  const locale = resolveLocale(lang);

  const [schemaDict, appsDict] = await Promise.all([
    getDictionary("schema_app", locale),
    getDictionary("profile_apps", locale),
  ]);

  const session = await getUserSession();

  if (!session) {
    redirect(`/${locale}/signin`);
  }

  const app = await getAppById(id);

  if (!app || app.author_id !== session.user.id) {
    notFound();
  }

  const formattedApp = formatDeveloperApp(app);

  return (
    <ApplicationForm
      initialData={formattedApp}
      locale={locale}
      schemaDict={schemaDict}
      appsDict={appsDict.form}
    />
  );
}

export default function EditApplicationPage({
  params,
}: EditApplicationPageProps) {
  return (
    <div className="space-y-6 w-full">
      <Suspense fallback={<ManagementFormSkeleton />}>
        <EditApplicationDynamicContent params={params} />
      </Suspense>
    </div>
  );
}
