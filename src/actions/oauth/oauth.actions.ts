"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/session";
import { SignJWT, jwtVerify } from "jose";
import { OAuthProviderFactory } from "@/lib/oauth/factory";
import { handleError } from "@/utils/error";
import { getSecret } from "@/lib/jwt-secret";

export async function grantOAuthAccess() {
    try {
        const session = await getUserSession();
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        const cookieStore = await cookies();
        const oauthCookie = cookieStore.get("oauth_auth_req");
        
        if (!oauthCookie || !oauthCookie.value) {
            return { success: false, error: "No pending OAuth request found." };
        }

        // Verify the initial request
        const { payload } = await jwtVerify(oauthCookie.value, getSecret());
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { client_id, redirect_uri, state, code_challenge, code_challenge_method, scope, nonce } = payload as any;

        if (!redirect_uri) {
             return { success: false, error: "Invalid OAuth request. Missing redirect URI." };
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

        // Clear the temp cookie
        cookieStore.delete("oauth_auth_req");

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
