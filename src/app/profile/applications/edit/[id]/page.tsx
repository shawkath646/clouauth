import { ApplicationForm } from "@/components/profile/applications/application-form";
import { getUserSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { DeveloperApp } from "@/actions/profile/apps.actions";

interface EditApplicationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditApplicationPage({ params }: EditApplicationPageProps) {
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

  const formattedApp: DeveloperApp = {
    id: app.id,
    name: app.name,
    description: app.description,
    icon: app.icon,
    website: app.website,
    created_at: app.created_at,
    updated_at: app.updated_at,
    oauth: app.oauth
      ? {
          app_id: app.oauth.app_id,
          enabled: app.oauth.enabled,
          client_id: app.oauth.client_id,
          client_type: app.oauth.client_type,
          redirect_uris: JSON.parse(app.oauth.redirect_uris || "[]"),
          scopes: JSON.parse(app.oauth.scopes || '["openid","profile","email"]'),
          pkce_required: app.oauth.pkce_required,
          token_endpoint_auth_method: app.oauth.token_endpoint_auth_method,
        }
      : null,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <main className="w-full rounded-2xl p-6 sm:p-8 bg-background/70 dark:bg-card/80 backdrop-blur-xl border border-border/50 shadow-sm">
        <ApplicationForm initialData={formattedApp} />
      </main>
    </div>
  );
}
