"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { type DeveloperApp } from "./apps";

export type { DeveloperApp };

export async function createAppAction(data: {
  name: string;
  description?: string;
  website?: string;
  redirect_uris: string[];
  scopes?: string[];
}): Promise<{
  success: boolean;
  app?: DeveloperApp;
  clientId?: string;
  clientSecret?: string;
  error?: string;
}> {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "Application name is required." };
    }

    const clientId = `cbl_${crypto.randomBytes(12).toString("hex")}`;
    const clientSecret = `cbl_sec_${crypto.randomBytes(24).toString("hex")}`;
    const clientSecretHash = await bcrypt.hash(clientSecret, 12);

    const newApp = await prisma.userApp.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        website: data.website?.trim() || null,
        author_id: sessionData.user.id,
        oauth: {
          create: {
            client_id: clientId,
            client_secret_hash: clientSecretHash,
            client_type: "confidential",
            redirect_uris: JSON.stringify(data.redirect_uris || []),
            scopes: JSON.stringify(data.scopes || ["openid", "profile", "email"]),
            pkce_required: true,
            token_endpoint_auth_method: "client_secret_post",
          },
        },
      },
      include: { oauth: true },
    });

    revalidatePath("/profile");

    const formattedApp: DeveloperApp = {
      id: newApp.id,
      name: newApp.name,
      description: newApp.description,
      icon: newApp.icon,
      website: newApp.website,
      created_at: newApp.created_at,
      updated_at: newApp.updated_at,
      oauth: newApp.oauth
        ? {
            app_id: newApp.oauth.app_id,
            enabled: newApp.oauth.enabled,
            client_id: newApp.oauth.client_id,
            client_type: newApp.oauth.client_type,
            redirect_uris: JSON.parse(newApp.oauth.redirect_uris || "[]"),
            scopes: JSON.parse(newApp.oauth.scopes || '["openid","profile","email"]'),
            pkce_required: newApp.oauth.pkce_required,
            token_endpoint_auth_method: newApp.oauth.token_endpoint_auth_method,
          }
        : null,
    };

    return {
      success: true,
      app: formattedApp,
      clientId,
      clientSecret,
    };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute createAppAction");
    return { success: false, error: em };
  }
}

export async function updateAppAction(
  appId: string,
  data: {
    name?: string;
    description?: string;
    website?: string;
    redirect_uris?: string[];
    scopes?: string[];
    enabled?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const app = await prisma.userApp.findUnique({
      where: { id: appId },
    });

    if (!app || app.author_id !== sessionData.user.id) {
      return { success: false, error: "Application not found or unauthorized." };
    }

    await prisma.userApp.update({
      where: { id: appId },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        website: data.website !== undefined ? data.website.trim() || null : undefined,
        oauth: {
          update: {
            enabled: data.enabled !== undefined ? data.enabled : undefined,
            redirect_uris: data.redirect_uris ? JSON.stringify(data.redirect_uris) : undefined,
            scopes: data.scopes ? JSON.stringify(data.scopes) : undefined,
          },
        },
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute updateAppAction");
    return { success: false, error: em };
  }
}

export async function deleteAppAction(appId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const app = await prisma.userApp.findUnique({
      where: { id: appId },
    });

    if (!app || app.author_id !== sessionData.user.id) {
      return { success: false, error: "Application not found or unauthorized." };
    }

    await prisma.userApp.delete({
      where: { id: appId },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute deleteAppAction");
    return { success: false, error: em };
  }
}

export async function rotateAppSecretAction(appId: string): Promise<{
  success: boolean;
  newSecret?: string;
  error?: string;
}> {
  try {
    const sessionData = await getUserSession();
    if (!sessionData) {
      return { success: false, error: "Unauthorized" };
    }

    const app = await prisma.userApp.findUnique({
      where: { id: appId },
    });

    if (!app || app.author_id !== sessionData.user.id) {
      return { success: false, error: "Application not found or unauthorized." };
    }

    const newSecret = `cbl_sec_${crypto.randomBytes(24).toString("hex")}`;
    const clientSecretHash = await bcrypt.hash(newSecret, 12);

    await prisma.oAuthClientConfig.update({
      where: { app_id: appId },
      data: {
        client_secret_hash: clientSecretHash,
      },
    });

    revalidatePath("/profile");
    return { success: true, newSecret };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute rotateAppSecretAction");
    return { success: false, error: em };
  }
}
