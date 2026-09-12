import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";

export interface DeveloperApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  website: string | null;
  created_at: Date;
  updated_at: Date;
  oauth: {
    app_id: string;
    enabled: boolean;
    client_id: string;
    client_type: string;
    redirect_uris: string[];
    scopes: string[];
    pkce_required: boolean;
    token_endpoint_auth_method: string;
  } | null;
}

export async function getUserApps(): Promise<{
  success: boolean;
  apps?: DeveloperApp[];
  error?: string;
}> {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const apps = await prisma.userApp.findMany({
      where: { author_id: sessionData.user.id },
      include: { oauth: true },
      orderBy: { created_at: "desc" },
    });

    const formattedApps: DeveloperApp[] = apps.map((app) => ({
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
    }));

    return { success: true, apps: formattedApps };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute getUserApps");
    return { success: false, error: em };
  }
}

// Alias for backwards compatibility with server component imports
export const getUserAppsAction = getUserApps;
