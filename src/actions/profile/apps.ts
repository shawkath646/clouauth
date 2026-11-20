import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { parseClientScopes, parseRedirectUris } from "@/lib/oauth/scope-utils";

export type OAuthClientType = "confidential" | "public";
export type TokenEndpointAuthMethod =
  | "none"
  | "client_secret_post"
  | "client_secret_basic";

export interface DeveloperAppOAuth {
  app_id: string;
  enabled: boolean;
  is_first_party: boolean;
  client_id: string;
  client_type: OAuthClientType;
  redirect_uris: string[];
  scopes: string[];
  pkce_required: boolean;
  token_endpoint_auth_method: TokenEndpointAuthMethod;
}

export interface DeveloperApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
  oauth: DeveloperAppOAuth;
}

export function formatDeveloperApp(app: {
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
    is_first_party: boolean;
    client_id: string;
    client_type: string;
    redirect_uris: string;
    scopes: string;
    pkce_required: boolean;
    token_endpoint_auth_method: string;
  } | null;
}): DeveloperApp {
  const oauth = app.oauth;
  if (!oauth) {
    throw new Error(`Application ${app.id} is missing OAuth client configuration.`);
  }

  return {
    id: app.id,
    name: app.name,
    description: app.description,
    icon: app.icon,
    website: app.website,
    created_at: app.created_at.toISOString(),
    updated_at: app.updated_at.toISOString(),
    oauth: {
      app_id: oauth.app_id,
      enabled: oauth.enabled,
      is_first_party: oauth.is_first_party,
      client_id: oauth.client_id,
      client_type: (oauth.client_type as OAuthClientType) || "confidential",
      redirect_uris: parseRedirectUris(oauth.redirect_uris),
      scopes: parseClientScopes(oauth.scopes),
      pkce_required: oauth.pkce_required,
      token_endpoint_auth_method:
        (oauth.token_endpoint_auth_method as TokenEndpointAuthMethod) || "client_secret_post",
    },
  };
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

    const formattedApps: DeveloperApp[] = apps.map(formatDeveloperApp);

    return { success: true, apps: formattedApps };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute getUserApps");
    return { success: false, error: em };
  }
}

// Alias for backwards compatibility with server component imports
export const getUserAppsAction = getUserApps;
