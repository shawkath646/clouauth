"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/session";
import { SignJWT } from "jose";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { handleError } from "@/utils/error";
import { getSecret } from "@/lib/jwt-secret";

export async function grantOAuthAccess(
    client_id: string,
    redirect_uri: string,
    state?: string | null,
    code_challenge?: string | null,
    code_challenge_method?: string | null,
    scope?: string | null,
    nonce?: string | null
) {
    try {
        const session = await getUserSession();
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        if (!client_id || !redirect_uri) {
             return { success: false, error: "Invalid OAuth request. Missing required parameters." };
        }

        // Generate the Authorization Code (Stateless JWT)
        const authCode = await new SignJWT({
            client_id,
            redirect_uri,
            user_id: session.user.id,
            code_challenge,
            code_challenge_method,
            scope,
            nonce,
            type: "authorization_code"
        })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m") // Code is valid for 5 minutes
        .sign(getSecret());

        // Build the redirect URL
        const url = new URL(redirect_uri);
        url.searchParams.set("code", authCode);
        if (state) {
            url.searchParams.set("state", state);
        }

        return { success: true, redirectUrl: url.toString() };
    } catch (e: unknown) {
    const em = handleError(e, true);
        return { success: false, error: em };
    }
}

export async function initializeOAuthProvider(provider: string) {
    const session = await getUserSession();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    
    cookieStore.set(`oauth_state_${provider}`, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 10,
        path: "/",
        sameSite: "lax",
    });

    const oauthProvider = OAuthProviderFactory.getProvider(provider);
    const authUrl = oauthProvider.getAuthorizationUrl(state);

    redirect(authUrl);
}

export async function continueWithProvider(provider: string) {
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    
    cookieStore.set(`oauth_state_${provider}`, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 10,
        path: "/",
        sameSite: "lax",
    });

    const oauthProvider = OAuthProviderFactory.getProvider(provider);
    const authUrl = oauthProvider.getAuthorizationUrl(state);

    redirect(authUrl);
}
