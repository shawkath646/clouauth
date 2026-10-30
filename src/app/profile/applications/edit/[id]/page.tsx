import { Suspense } from "react";
import { ApplicationForm } from "@/components/profile/applications/application-form";
import { getUserSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatDeveloperApp } from "@/actions/profile/apps";

export const instant = false;

interface EditApplicationPageProps {
  params: Promise<{ id: string }>;
}

async function EditApplicationDynamicContent({
  params,
}: EditApplicationPageProps) {
  const session = await getUserSession();

  if (!session) {
    redirect("/signin");
  }

  const { id } = await params;

  const app = await prisma.userApp.findUnique({
    where: { id },
    include: { oauth: true },
  });

  if (!app || app.author_id !== session.user.id) {
    notFound();
  }

  const formattedApp = formatDeveloperApp(app);

  return <ApplicationForm initialData={formattedApp} />;
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
