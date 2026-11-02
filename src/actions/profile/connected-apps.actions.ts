"use server";

import prisma from "@/lib/prisma";
import { requireUserSession } from "@/actions/auth/helpers";
import { handleError } from "@/utils/error";
import { revalidatePath } from "next/cache";
import { recordSecurityActivity } from "@/lib/security-activity";

export interface ConnectedApp {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  icon: string | null;
  website: string | null;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getConnectedAppsAction(): Promise<{
  success: boolean;
  apps?: ConnectedApp[];
  error?: string;
}> {
  try {
    const session = await requireUserSession();

    const consents = await prisma.oAuthConsent.findMany({
      where: {
        user_id: session.user.id,
        revoked_at: null,
      },
      include: {
        client: {
          include: {
            app: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const apps: ConnectedApp[] = consents.map((c) => ({
      id: c.id,
      clientId: c.client_id,
      name: c.client?.app?.name || "Unknown Application",
      description: c.client?.app?.description || null,
      icon: c.client?.app?.icon || null,
      website: c.client?.app?.website || null,
      scopes: c.scopes ? c.scopes.split(/\s+/).filter(Boolean) : [],
      createdAt: c.created_at.toISOString(),
      updatedAt: c.updated_at.toISOString(),
    }));

    return { success: true, apps };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}

export async function revokeConnectedAppAction(clientId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireUserSession();

    if (!clientId || typeof clientId !== "string") {
      return { success: false, error: "Invalid client identifier." };
    }

    const consent = await prisma.oAuthConsent.findUnique({
      where: {
        user_id_client_id: {
          user_id: session.user.id,
          client_id: clientId,
        },
      },
      include: {
        client: {
          include: {
            app: true,
          },
        },
      },
    });

    if (!consent) {
      return { success: false, error: "Connected application not found." };
    }

    // Mark consent as revoked
    await prisma.oAuthConsent.update({
      where: {
        user_id_client_id: {
          user_id: session.user.id,
          client_id: clientId,
        },
      },
      data: {
        revoked_at: new Date(),
      },
    });

    const appName = consent.client?.app?.name || "Application";

    await recordSecurityActivity({
      userId: session.user.id,
      event: "OAUTH_ACCESS_REVOKED",
      title: `Revoked ${appName}`,
      description: `Removed access and revoked tokens for ${appName}`,
    });

    revalidatePath("/[lang]/profile/applications", "page");

    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, true);
    return { success: false, error: em };
  }
}
