"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { type DeveloperApp, formatDeveloperApp } from "./apps";
import { checkSudoAction } from "@/actions/auth/sudo";
import { z } from "zod";

export type { DeveloperApp };

const redirectUriSchema = z.string().refine((val) => {
  try {
    const u = new URL(val);
    if (u.protocol === "http:") {
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    }
    return u.protocol === "https:" || (u.protocol.endsWith(":") && u.protocol !== "javascript:" && u.protocol !== "data:");
  } catch {
    return false;
  }
}, "Each redirect URI must be a valid absolute URI (HTTPS, HTTP on localhost, or private-use scheme)");

const createAppSchema = z.object({
  name: z.string().trim().min(2, "Application name must be at least 2 characters").max(50, "Application name must be at most 50 characters"),
  description: z.string().trim().max(200, "Description must be at most 200 characters").optional().nullable(),
  website: z.string().url("Website must be a valid URL").optional().nullable().or(z.literal("")),
  redirect_uris: z.array(redirectUriSchema).min(1, "At least one redirect URI is required"),
  scopes: z.array(z.string()).optional(),
});

const updateAppSchema = z.object({
  name: z.string().trim().min(2, "Application name must be at least 2 characters").max(50, "Application name must be at most 50 characters").optional(),
  description: z.string().trim().max(200, "Description must be at most 200 characters").optional().nullable(),
  website: z.string().url("Website must be a valid URL").optional().nullable().or(z.literal("")),
  redirect_uris: z.array(redirectUriSchema).min(1, "At least one redirect URI is required").optional(),
  scopes: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

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

    const parsed = createAppSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
    }

    const clientId = `cbl_${crypto.randomBytes(12).toString("hex")}`;
    const clientSecret = `cbl_sec_${crypto.randomBytes(24).toString("hex")}`;
    const clientSecretHash = await bcrypt.hash(clientSecret, 12);

    const newApp = await prisma.userApp.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        website: parsed.data.website || null,
        author_id: sessionData.user.id,
        oauth: {
          create: {
            client_id: clientId,
            client_secret_hash: clientSecretHash,
            client_type: "confidential",
            redirect_uris: JSON.stringify(parsed.data.redirect_uris),
            scopes: JSON.stringify(parsed.data.scopes || ["openid", "profile", "email"]),
            pkce_required: true,
            token_endpoint_auth_method: "client_secret_post",
          },
        },
      },
      include: { oauth: true },
    });

    revalidatePath("/profile");

    const formattedApp = formatDeveloperApp(newApp);

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

    const parsed = updateAppSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
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
        name: parsed.data.name,
        description: parsed.data.description !== undefined ? parsed.data.description : undefined,
        website: parsed.data.website !== undefined ? parsed.data.website : undefined,
        oauth: {
          update: {
            enabled: parsed.data.enabled,
            redirect_uris: parsed.data.redirect_uris ? JSON.stringify(parsed.data.redirect_uris) : undefined,
            scopes: parsed.data.scopes ? JSON.stringify(parsed.data.scopes) : undefined,
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
  sudoRequired?: boolean;
  redirectUrl?: string;
}> {
  try {
    const sudoCheck = await checkSudoAction("/profile/applications");
    if (!sudoCheck.authorized) {
      return {
        success: false,
        error: sudoCheck.error,
        sudoRequired: true,
        redirectUrl: sudoCheck.redirectUrl,
      };
    }

    const sessionData = sudoCheck.sessionData;

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
