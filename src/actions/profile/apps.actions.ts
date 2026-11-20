"use server";

import {
  getAppById,
  createApp,
  updateApp,
  deleteApp,
} from "@/lib/oauth/clients";
import { getUserSession } from "@/lib/session";
import { handleError } from "@/utils/error";
import { revalidatePath, revalidateTag } from "next/cache";
import crypto from "crypto";
import { hashClientSecret } from "@/lib/security/hash";
import { type DeveloperApp, formatDeveloperApp } from "./apps";
import { checkSudoAction } from "@/actions/auth/sudo";
import { z } from "zod";

export type { DeveloperApp };

const DISALLOWED_REDIRECT_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
]);

const redirectUriSchema = z.string().refine((val) => {
  if (!val || val.includes("*") || val.includes("#")) return false;
  try {
    const u = new URL(val);
    const protocol = u.protocol.toLowerCase();
    if (DISALLOWED_REDIRECT_SCHEMES.has(protocol)) {
      return false;
    }
    if (protocol === "http:") {
      return (
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname === "[::1]"
      );
    }
    if (protocol === "https:") {
      return Boolean(u.hostname);
    }
    // RFC 8252 Section 7.1 private-use URI scheme for native apps (must contain a dot or valid reverse-domain/app identifier)
    return /^[a-z][a-z0-9+.-]*:$/.test(protocol);
  } catch {
    return false;
  }
}, "Each redirect URI must be a valid exact URI without wildcards or fragments (HTTPS, HTTP on localhost, or RFC 8252 native app scheme)");

const createAppSchema = z.object({
  name: z.string().trim().min(2, "Application name must be at least 2 characters").max(50, "Application name must be at most 50 characters"),
  description: z.string().trim().max(200, "Description must be at most 200 characters").optional().nullable(),
  website: z.string().url("Website must be a valid URL").optional().nullable().or(z.literal("")),
  redirect_uris: z.array(redirectUriSchema).min(1, "At least one redirect URI is required"),
  scopes: z.array(z.string()).optional(),
  client_type: z.enum(["confidential", "public"]).default("confidential"),
  is_first_party: z.boolean().default(false),
});

const updateAppSchema = z.object({
  name: z.string().trim().min(2, "Application name must be at least 2 characters").max(50, "Application name must be at most 50 characters").optional(),
  description: z.string().trim().max(200, "Description must be at most 200 characters").optional().nullable(),
  website: z.string().url("Website must be a valid URL").optional().nullable().or(z.literal("")),
  redirect_uris: z.array(redirectUriSchema).min(1, "At least one redirect URI is required").optional(),
  scopes: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  client_type: z.enum(["confidential", "public"]).optional(),
  is_first_party: z.boolean().optional(),
});

/** Ensures the user owns the specified app, throwing or returning not found otherwise */
async function requireUserApp(appId: string, userId: string) {
  const app = await getAppById(appId);
  if (!app || app.author_id !== userId) {
    return null;
  }
  return app;
}

export async function createAppAction(data: {
  name: string;
  description?: string;
  website?: string;
  redirect_uris: string[];
  scopes?: string[];
  client_type?: "confidential" | "public";
  is_first_party?: boolean;
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

    const isPublic = parsed.data.client_type === "public";
    const clientId = `cbl_${crypto.randomBytes(12).toString("hex")}`;
    const clientSecret = isPublic ? undefined : `cbl_sec_${crypto.randomBytes(24).toString("hex")}`;
    const clientSecretHash = clientSecret ? await hashClientSecret(clientSecret) : null;

    const { app: newApp, oauth } = await createApp(
      sessionData.user.id,
      {
        name: parsed.data.name,
        description: parsed.data.description || null,
        website: parsed.data.website || null,
      },
      {
        client_id: clientId,
        client_secret_hash: clientSecretHash,
        client_type: parsed.data.client_type,
        redirect_uris: JSON.stringify(parsed.data.redirect_uris),
        scopes: JSON.stringify(parsed.data.scopes || ["openid", "profile", "email"]),
        pkce_required: true,
        token_endpoint_auth_method: isPublic ? "none" : "client_secret_post",
        is_first_party: parsed.data.is_first_party ?? false,
      }
    );

    revalidatePath("/profile");
    revalidateTag("oauth-clients", "default");

    const formattedApp = formatDeveloperApp({ ...newApp, oauth });

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
    client_type?: "confidential" | "public";
    is_first_party?: boolean;
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

    const app = await requireUserApp(appId, sessionData.user.id);
    if (!app) {
      return { success: false, error: "Application not found or unauthorized." };
    }

    const targetClientType = parsed.data.client_type;
    const targetTokenAuthMethod =
      targetClientType !== undefined
        ? targetClientType === "public"
          ? "none"
          : "client_secret_post"
        : undefined;

    const appUpdates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) appUpdates.name = parsed.data.name;
    if (parsed.data.description !== undefined) appUpdates.description = parsed.data.description;
    if (parsed.data.website !== undefined) appUpdates.website = parsed.data.website;

    const clientUpdates: Record<string, unknown> = {};
    if (parsed.data.enabled !== undefined) clientUpdates.enabled = parsed.data.enabled;
    if (targetClientType !== undefined) clientUpdates.client_type = targetClientType;
    if (targetTokenAuthMethod !== undefined) clientUpdates.token_endpoint_auth_method = targetTokenAuthMethod;
    if (parsed.data.is_first_party !== undefined) clientUpdates.is_first_party = parsed.data.is_first_party;
    if (parsed.data.redirect_uris !== undefined) clientUpdates.redirect_uris = JSON.stringify(parsed.data.redirect_uris);
    if (parsed.data.scopes !== undefined) clientUpdates.scopes = JSON.stringify(parsed.data.scopes);

    await updateApp(appId, appUpdates, clientUpdates);

    revalidatePath("/profile");
    revalidateTag("oauth-clients", "default");
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

    const app = await requireUserApp(appId, sessionData.user.id);
    if (!app) {
      return { success: false, error: "Application not found or unauthorized." };
    }

    await deleteApp(appId);

    revalidatePath("/profile");
    revalidateTag("oauth-clients", "default");
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

    const app = await requireUserApp(appId, sessionData.user.id);
    if (!app) {
      return { success: false, error: "Application not found or unauthorized." };
    }

    if (app.oauth?.client_type === "public") {
      return {
        success: false,
        error: "Public clients (native/mobile/desktop) do not utilize client secrets.",
      };
    }

    const newSecret = `cbl_sec_${crypto.randomBytes(24).toString("hex")}`;
    const clientSecretHash = await hashClientSecret(newSecret);

    await updateApp(appId, {}, {
      client_secret_hash: clientSecretHash,
    });

    revalidatePath("/profile");
    revalidateTag("oauth-clients", "default");
    return { success: true, newSecret };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute rotateAppSecretAction");
    return { success: false, error: em };
  }
}
