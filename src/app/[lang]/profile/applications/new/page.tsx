import { Suspense } from "react";
import { ApplicationForm } from "@/components/profile/applications/application-form";
import { ManagementFormSkeleton } from "@/components/profile/profile-skeletons";
import { getUserSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

export const instant = false;

async function AddApplicationContent({ lang }: { lang: string }) {
  const locale = resolveLocale(lang);
  const [schemaDict, appsDict] = await Promise.all([
    getDictionary("schema_app", locale),
    getDictionary("profile_apps", locale),
  ]);

  const session = await getUserSession();

  if (!session) {
    redirect(`/${locale}/signin`);
  }

  return (
    <main className="w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm">
      <ApplicationForm
        locale={locale}
        schemaDict={schemaDict}
        appsDict={appsDict.form}
      />
    </main>
  );
}

export default async function AddApplicationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <div className="space-y-6 w-full">
      <Suspense fallback={<ManagementFormSkeleton />}>
        <AddApplicationContent lang={lang} />
      </Suspense>
    </div>
  );
}
