import { Suspense } from "react";
import { connection } from "next/server";
import { ApplicationForm } from "@/components/profile/applications/application-form";
import { getUserSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatDeveloperApp } from "@/actions/profile/apps";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";

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

  await connection();
  const session = await getUserSession();

  if (!session) {
    redirect(`/${locale}/signin`);
  }

  const app = await prisma.userApp.findUnique({
    where: { id },
    include: { oauth: true },
  });

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
      <main className="w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm">
        <Suspense
          fallback={
            <div className="h-96 w-full animate-pulse rounded-xl bg-muted/20" />
          }
        >
          <EditApplicationDynamicContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
