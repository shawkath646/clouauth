import { cookies, headers } from "next/headers";
import crypto from "crypto";
import prisma from "./prisma";
import { COOKIE_SESSION_TOKEN_NAME, COOKIE_REFRESH_TOKEN_NAME, SESSION_TOKEN_TTL, REFRESH_TOKEN_TTL_REMEMBER_ME } from "@/constants/session.constants";
import type { SessionData, SafeDBUserSession, DBTempSession, DBUserSession } from "@/types/session.types";
import { handleError } from "@/utils/utils";

const generateRandomValue = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

function sanitizeSession(session: DBUserSession): SafeDBUserSession {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { session_token_hash, refresh_token_hash, ...safeSession } = session;
    return safeSession as SafeDBUserSession;
}

async function setSessionCookies(sessionToken: string, refreshToken: string | null, maxAgeSession: number, maxAgeRefresh: number) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_SESSION_TOKEN_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: maxAgeSession
    });
    if (refreshToken && maxAgeRefresh > 0) {
        cookieStore.set(COOKIE_REFRESH_TOKEN_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: maxAgeRefresh
        });
    } else {
        cookieStore.delete(COOKIE_REFRESH_TOKEN_NAME);
    }
}

export async function createSession(userId: string, rememberMe: boolean = false): Promise<SessionData> {
    const rawSessionToken = generateRandomValue();
    const rawRefreshToken = generateRandomValue();

    const sessionHash = hashToken(rawSessionToken);
    const refreshHash = hashToken(rawRefreshToken);

    const now = new Date();
    const sessionTtl = rememberMe ? SESSION_TOKEN_TTL : 30 * 60; // 15 mins with rememberMe, 30 mins without
    const sessionExpiresOn = new Date(now.getTime() + sessionTtl * 1000);
    
    const rtTtl = rememberMe ? REFRESH_TOKEN_TTL_REMEMBER_ME : sessionTtl;
    const refreshExpiresOn = new Date(now.getTime() + rtTtl * 1000);
    
    const headersList = await headers();
    const userAgentRaw = headersList.get("user-agent") || "";
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
    
    let deviceName = null;
    let browserName = null;
    
    if (userAgentRaw) {
        if (userAgentRaw.includes("Windows")) deviceName = "Windows PC";
        else if (userAgentRaw.includes("Macintosh")) deviceName = "Mac";
        else if (userAgentRaw.includes("iPhone")) deviceName = "iPhone";
        else if (userAgentRaw.includes("iPad")) deviceName = "iPad";
        else if (userAgentRaw.includes("Android")) deviceName = "Android Device";
        else if (userAgentRaw.includes("Linux")) deviceName = "Linux PC";
        
        if (userAgentRaw.includes("Edg")) browserName = "Edge";
        else if (userAgentRaw.includes("OPR") || userAgentRaw.includes("Opera")) browserName = "Opera";
        else if (userAgentRaw.includes("Chrome")) browserName = "Chrome";
        else if (userAgentRaw.includes("Firefox")) browserName = "Firefox";
        else if (userAgentRaw.includes("Safari")) browserName = "Safari";
    }

    const session = await prisma.userSession.create({
        data: {
            user_id: userId,
            session_token_hash: sessionHash,
            refresh_token_hash: refreshHash,
            session_expires_on: sessionExpiresOn,
            expires_on: refreshExpiresOn,
            device_name: deviceName,
            user_agent: browserName || userAgentRaw || null,
            ip_address: ipAddress,
        }
    });

    const sessionToken = `${session.id}.${rawSessionToken}`;
    const refreshToken = `${session.id}.${rawRefreshToken}`;

    await setSessionCookies(
        sessionToken,
        rememberMe ? refreshToken : null,
        sessionTtl,
        rememberMe ? rtTtl : 0
    );

    return {
        sessionToken,
        refreshToken,
        sessionExpiresOn,
        refreshExpiresOn,
    };
}

export async function refreshSession(presentedRefreshToken: string): Promise<SessionData> {
    if (!presentedRefreshToken || typeof presentedRefreshToken !== "string") {
        throw new Error("invalid_token_format");
    }
    const parts = presentedRefreshToken.split('.');
    if (parts.length !== 2) throw new Error("invalid_token_format");
    
    const [sessionId, tokenValue] = parts;
    const presentedHash = hashToken(tokenValue);
    
    const session = await prisma.userSession.findUnique({
        where: { id: sessionId }
    });

    if (!session) {
        throw new Error("invalid_grant");
    }
    if (session.revoked_on) {
        throw new Error("session_revoked");
    }
    if (session.expires_on < new Date()) {
        throw new Error("session_expired");
    }

    // Replay Attack Detection: If the presented token doesn't match the active token, 
    // it means an old token was reused. We immediately revoke the session to kick out the attacker.
    if (session.refresh_token_hash !== presentedHash) {
        // Allow 1-minute grace period for the previous refresh token in case of network failure
        const isPrevious = session.previous_refresh_token_hash === presentedHash;
        const gracePeriodValid = session.updated_on.getTime() + 60 * 1000 > Date.now();

        if (!(isPrevious && gracePeriodValid)) {
            await revokeSession(session.id);
            throw new Error("replay_attack_detected");
        }
    }

    const rawSessionToken = generateRandomValue();
    const rawRefreshToken = generateRandomValue();
    const newSessionHash = hashToken(rawSessionToken);
    const newRefreshHash = hashToken(rawRefreshToken);

    const now = new Date();
    const sessionExpiresOn = new Date(now.getTime() + SESSION_TOKEN_TTL * 1000);
    
    // Maintain the original expiration length by checking the distance from creation
    const originalTtl = (session.expires_on.getTime() - session.created_on.getTime()) / 1000;
    const refreshExpiresOn = new Date(now.getTime() + originalTtl * 1000);

    await prisma.userSession.update({
        where: { id: session.id },
        data: {
            session_token_hash: newSessionHash,
            refresh_token_hash: newRefreshHash,
            previous_refresh_token_hash: session.refresh_token_hash,
            session_expires_on: sessionExpiresOn,
            expires_on: refreshExpiresOn,
        }
    });

    const newSessionToken = `${session.id}.${rawSessionToken}`;
    const newRefreshToken = `${session.id}.${rawRefreshToken}`;

    await setSessionCookies(newSessionToken, newRefreshToken, SESSION_TOKEN_TTL, originalTtl);

    return {
        sessionToken: newSessionToken,
        refreshToken: newRefreshToken,
        sessionExpiresOn,
        refreshExpiresOn,
    };
}

export async function revokeSession(sessionId: string): Promise<void> {
    await prisma.userSession.update({
        where: { id: sessionId },
        data: { revoked_on: new Date() }
    });
}

export async function getSession(sessionToken: string): Promise<SafeDBUserSession | null> {
    if (!sessionToken || typeof sessionToken !== "string") return null;
    const parts = sessionToken.split('.');
    if (parts.length !== 2) return null;
    
    const [sessionId, tokenValue] = parts;
    const sessionHash = hashToken(tokenValue);
    
    const session = await prisma.userSession.findUnique({
        where: { id: sessionId }
    });

    if (!session || session.revoked_on || session.session_expires_on < new Date()) {
        return null;
    }

    if (session.session_token_hash !== sessionHash) {
        await revokeSession(session.id);
        return null;
    }

    return sanitizeSession(session);
}

export async function getUserSession() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(COOKIE_SESSION_TOKEN_NAME)?.value;
    
    if (!sessionToken) return null;
    
    const session = await getSession(sessionToken);
    if (!session) return null;
    
    const user = await prisma.user.findUnique({
        where: { id: session.user_id },
        select: {
            id: true,
            username: true,
            emails: {
                where: { is_primary: true },
                select: { address: true }
            },
            first_name: true,
            last_name: true,
            avatar: true,
        }
    });

    if (!user) return null;

    const { emails, ...restUser } = user;
    const transformedUser = {
        ...restUser,
        email: emails[0]?.address || null
    };

    return { session, user: transformedUser };
}

export async function signOut(sessionId?: string) {
    const cookieStore = await cookies();
    
    if (sessionId) {
        await revokeSession(sessionId);
    } else {
        const sessionToken = cookieStore.get(COOKIE_SESSION_TOKEN_NAME)?.value;
        if (sessionToken) {
            const parts = sessionToken.split('.');
            if (parts.length === 2) {
                await revokeSession(parts[0]);
            }
        }
    }

    cookieStore.delete(COOKIE_SESSION_TOKEN_NAME);
    cookieStore.delete(COOKIE_REFRESH_TOKEN_NAME);
}

export async function createTempSession(userId: string): Promise<DBTempSession> {
    const now = new Date();
    const expiresOn = new Date(now.getTime() + 15 * 60 * 1000);
    
    return await prisma.tempSession.create({
        data: {
            user_id: userId,
            expires_on: expiresOn,
        }
    });
}

export async function getTempSession(tempSessionId: string): Promise<DBTempSession | null> {
    return await prisma.tempSession.findUnique({
        where: { id: tempSessionId }
    });
}

export async function deleteTempSession(tempSessionId: string): Promise<void> {
    try {
        await prisma.tempSession.delete({
            where: { id: tempSessionId }
        });
    } catch (e: unknown) {
        handleError(e, "Failed to execute deleteTempSession");
    }
}

export async function createOAuthSession(userId: string, clientId: string, scope: string) {
    const rawAccessToken = generateRandomValue();
    const rawRefreshToken = generateRandomValue();

    const accessHash = hashToken(rawAccessToken);
    const refreshHash = hashToken(rawRefreshToken);

    const now = new Date();
    const accessExpiresOn = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour access token
    const refreshExpiresOn = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 day refresh token

    const session = await prisma.oAuthSession.create({
        data: {
            user_id: userId,
            client_id: clientId,
            scope: scope || "openid profile email",
            access_token_hash: accessHash,
            refresh_token_hash: refreshHash,
            access_expires_on: accessExpiresOn,
            refresh_expires_on: refreshExpiresOn
        }
    });

    return {
        accessToken: `${session.id}.${rawAccessToken}`,
        refreshToken: `${session.id}.${rawRefreshToken}`,
        expiresIn: 3600,
        scope: session.scope
    };
}

export async function getOAuthSession(token: string) {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const accessHash = hashToken(parts[1]);
    const session = await prisma.oAuthSession.findFirst({
        where: {
            id: parts[0],
            access_token_hash: accessHash
        },
        include: {
            user: {
                include: {
                    emails: true
                }
            }
        }
    });

    if (!session || session.revoked_on || session.access_expires_on < new Date()) {
        return null;
    }

    const scopes = session.scope.split(" ").filter(Boolean);
    return {
        session,
        user: session.user,
        scopes
    };
}

export async function revokeOAuthSession(token: string) {
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const accessHash = hashToken(parts[1]);
    try {
        await prisma.oAuthSession.updateMany({
            where: {
                id: parts[0],
                access_token_hash: accessHash
            },
            data: {
                revoked_on: new Date()
            }
        });
        return true;
    } catch {
        return false;
    }
}

