# ClouAuth — Deep Codebase Security & Architecture Audit

> **Auditor**: AI Security Architect  
> **Date**: 2026-08-13  
> **Scope**: Auth flows, API routes, middleware, OIDC 2.0, session management, profile routes  
> **Excluded**: Homepage (`/`), marketing components

---

## Table of Contents

1. [Critical / High Severity](#critical--high-severity)
2. [Medium Severity](#medium-severity)
3. [Low Severity](#low-severity)

---

## Critical / High Severity

---

### **[High] — Hardcoded Verification Code `"12345678"` in Production Path**

**Location:** [`src/actions/auth/verification.actions.ts` L56](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/verification.actions.ts#L56)

**Issue Description:**  
The `sendVerificationCode` function generates a hardcoded `"12345678"` string instead of a cryptographically random code. This completely bypasses 2FA — any attacker who knows the hardcoded value can pass verification for any account. The destination email is also hardcoded to `"user@example.com"` (L78), meaning the actual user never receives a code.

**Suggested Solution:**  
1. Generate a cryptographically random numeric code using `crypto.randomInt`.
2. Retrieve the user's actual email/phone from the database.
3. Send the code via a real email/SMS service.

**Code Fix:**
```typescript
import crypto from "crypto";
import { sendEmail } from "@/lib/email"; // your email service

async function sendVerificationCode(userId: string) {
  try {
    // 1. Generate a cryptographically random 8-digit code
    const rawCode = Array.from({ length: 8 }, () => crypto.randomInt(0, 10)).join("");
    const codeHash = await bcrypt.hash(rawCode, 10);

    // 2. Retrieve the user's primary email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emails: { where: { is_primary: true }, select: { address: true } },
      },
    });
    const destination = user?.emails[0]?.address;
    if (!destination) {
      return { success: false, error: "No email address found for this user." };
    }

    // 3. Invalidate any previous codes
    const previousCode = await prisma.verificationCode.findFirst({
      where: { user_id: userId, type: "2fa", consumed_on: null },
      orderBy: { created_on: "desc" },
    });
    const failedAttempts = previousCode?.failed_attempts || 0;
    const lockedUntil = previousCode?.locked_until || null;

    if (previousCode) {
      await prisma.verificationCode.updateMany({
        where: { user_id: userId, type: "2fa", consumed_on: null },
        data: { consumed_on: new Date() },
      });
    }

    // 4. Store the new code
    await prisma.verificationCode.create({
      data: {
        user_id: userId,
        type: "2fa",
        destination,
        code_hash: codeHash,
        expires_on: new Date(Date.now() + 10 * 60 * 1000),
        failed_attempts: failedAttempts,
        locked_until: lockedUntil,
      },
    });

    // 5. Send the code via email
    await sendEmail({
      to: destination,
      subject: "Your verification code",
      body: `Your verification code is: ${rawCode}`,
    });

    return { success: true };
  } catch (e: unknown) {
    const em = handleError(e, "Failed to execute sendVerificationCode");
    return { success: false, error: em };
  }
}
```

---

### **[High] — Token Endpoint Does Not Verify `client_secret`**

**Location:** [`src/app/api/sso/v1/token/route.ts` L11–L24, L69–L75](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/token/route.ts#L11-L75)

**Issue Description:**  
The token endpoint extracts `_clientSecret` from the Authorization header or body, then *never uses it*. The variable is prefixed with `_` (explicitly ignored). This means **any party with a valid authorization code can exchange it for tokens without proving they are the legitimate client**. This completely defeats the purpose of `client_secret_post` and `client_secret_basic` auth methods. The `OAuthClientConfig` model stores `client_secret_hash`, but it's never consulted.

**Suggested Solution:**  
1. After extracting `clientId` and the authorization code, look up the `OAuthClientConfig` from the database.
2. If the client's `token_endpoint_auth_method` requires a secret (e.g., `client_secret_post`, `client_secret_basic`), verify the presented `client_secret` against the stored `client_secret_hash` using `bcrypt.compare`.
3. If PKCE is required (`pkce_required === true`), verify the `code_verifier` against the `code_challenge` stored in the authorization code JWT (see next finding).

**Code Fix:**
```typescript
import bcrypt from "bcryptjs";

// ... inside POST handler, after finding clientApp:

if (!clientApp || !clientApp.enabled) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
}

// Verify client authentication based on the registered method
const authMethod = clientApp.token_endpoint_auth_method;
if (authMethod === "client_secret_post" || authMethod === "client_secret_basic") {
    if (!_clientSecret) {
        return NextResponse.json(
            { error: "invalid_client", error_description: "Client secret is required." },
            { status: 401 }
        );
    }
    const isSecretValid = await bcrypt.compare(_clientSecret, clientApp.client_secret_hash);
    if (!isSecretValid) {
        return NextResponse.json(
            { error: "invalid_client", error_description: "Invalid client credentials." },
            { status: 401 }
        );
    }
}
```

---

### **[High] — PKCE `code_verifier` Is Never Validated**

**Location:** [`src/app/api/sso/v1/token/route.ts`](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/token/route.ts) (entire file)

**Issue Description:**  
The authorize endpoint accepts `code_challenge` and `code_challenge_method` and stores them in the authorization code JWT. However, the token endpoint never reads `code_verifier` from the request and never validates it against the stored `code_challenge`. The `OAuthClientConfig` model has `pkce_required: true` by default, but this flag is never enforced. This is a **direct violation of OAuth 2.0 RFC 7636** and renders PKCE useless.

**Suggested Solution:**  
1. Extract `code_verifier` from the token request body.
2. If `code_challenge` exists in the authorization code payload (or `clientApp.pkce_required` is true), require `code_verifier`.
3. Hash the `code_verifier` with SHA-256, base64url-encode it, and compare to the stored `code_challenge`.

**Code Fix:**
```typescript
// Add after line 66 (redirect URI check), before line 69 (clientApp lookup):

// PKCE Verification
const codeChallenge = payload.code_challenge as string | undefined;
const codeChallengeMethod = payload.code_challenge_method as string | undefined;

let codeVerifier: string | null = null;
if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    // formData was already parsed above — need to restructure to capture it
    codeVerifier = formData?.get("code_verifier") as string;
} else {
    codeVerifier = json?.code_verifier;
}

if (codeChallenge) {
    if (!codeVerifier) {
        return NextResponse.json(
            { error: "invalid_request", error_description: "code_verifier is required for PKCE." },
            { status: 400 }
        );
    }

    if (codeChallengeMethod === "S256") {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest("SHA-256", data);
        const computedChallenge = Buffer.from(digest)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        if (computedChallenge !== codeChallenge) {
            return NextResponse.json(
                { error: "invalid_grant", error_description: "PKCE code_verifier does not match." },
                { status: 400 }
            );
        }
    } else {
        // plain method (discouraged but valid)
        if (codeVerifier !== codeChallenge) {
            return NextResponse.json(
                { error: "invalid_grant", error_description: "PKCE code_verifier does not match." },
                { status: 400 }
            );
        }
    }
}
```

---

### **[High] — ID Token Signed with HS256 (Symmetric Secret) Instead of Asymmetric Key**

**Location:** [`src/app/api/sso/v1/token/route.ts` L84–L94](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/token/route.ts#L84-L94)

**Issue Description:**  
The OIDC discovery document at `/.well-known/openid-configuration` advertises `id_token_signing_alg_values_supported: ["RS256", "ES256", "EdDSA"]`, but the ID token is actually signed with `HS256` using a shared symmetric secret. This is a critical compliance mismatch:

1. **OIDC clients cannot verify the ID token** using the published JWKS (which contains RSA public keys). The symmetric key is the server's `JWT_SECRET` which clients don't have.
2. The JWKS endpoint serves RSA keys, but they are never used for signing.
3. The `JWT_SECRET` fallback is `"default_development_secret_only"` — if this leaks or is unchanged in production, all tokens can be forged.

**Suggested Solution:**  
1. Use the stored RSA private key from `SigningKey` to sign ID tokens with RS256.
2. Include the `kid` claim in the JWT header so clients can look up the correct key from the JWKS endpoint.
3. Add the `nonce` claim if the client sent one in the authorization request.

**Code Fix:**
```typescript
import { importJWK, SignJWT } from "jose";

// Fetch the active signing key
const signingKey = await prisma.signingKey.findFirst({
    where: { active: true, revokedAt: null },
});

if (!signingKey) {
    return NextResponse.json(
        { error: "server_error", error_description: "No active signing key found." },
        { status: 500 }
    );
}

const privateJwk = JSON.parse(signingKey.privateKey);
const privateKey = await importJWK(privateJwk, "RS256");

const idToken = await new SignJWT({
    sub: userId,
    aud: clientId,
    iss: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    auth_time: Math.floor(Date.now() / 1000),
    scope,
    nonce: payload.nonce as string | undefined, // Pass through from auth request
})
    .setProtectedHeader({ alg: "RS256", kid: signingKey.kid, typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
```

---

### **[High] — `redirect_uri` Validation Disabled in Non-Production**

**Location:** [`src/app/api/sso/v1/authorize/route.ts` L39](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/authorize/route.ts#L39)

**Issue Description:**  
The redirect URI validation is gated behind `process.env.NODE_ENV === "production"`:
```typescript
if (!allowedUris.includes(redirect_uri) && process.env.NODE_ENV === "production") {
```
In development, staging, or any environment where `NODE_ENV` is not exactly `"production"`, an attacker can supply any `redirect_uri`, including one they control. This enables authorization code interception — a critical OAuth attack vector. Additionally, this same guard is absent when the authorization code is exchanged at the token endpoint (L65), where `redirect_uri` matching is optional.

**Suggested Solution:**  
Always validate the `redirect_uri`. If special local-development URIs are needed, configure them as registered redirect URIs in the database.

**Code Fix:**
```typescript
const allowedUris: string[] = JSON.parse(clientApp.redirect_uris || "[]");
if (!allowedUris.includes(redirect_uri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
}
```

---

### **[High] — `signOutAll` Uses `deleteMany` Instead of Revoking Sessions**

**Location:** [`src/actions/auth/auth.actions.ts` L157–L161](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/auth.actions.ts#L157-L161)

**Issue Description:**  
`signOutAll` hard-deletes all sessions from the database:
```typescript
await prisma.userSession.deleteMany({ where: { user_id: userId } });
```
This destroys the audit trail. When sessions are deleted rather than revoked (setting `revoked_on`), it becomes impossible to detect replay attacks. The `refreshSession` function's replay attack detection (L107–109 in `session.ts`) relies on finding the session record to compare hashes. If the session is deleted, a stolen refresh token returns `"invalid_grant"` instead of `"replay_attack_detected"`, and the system cannot distinguish between normal expiry and an active attack.

**Suggested Solution:**  
Revoke sessions (set `revoked_on`) instead of deleting them.

**Code Fix:**
```typescript
export async function signOutAll(userId: string) {
    await prisma.userSession.updateMany({
        where: { user_id: userId, revoked_on: null },
        data: { revoked_on: new Date() },
    });
}
```

---

### **[High] — Open Redirect via `redirect_to` Cookie**

**Location:** [`src/actions/auth/auth.actions.ts` L21–L25](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/auth.actions.ts#L21-L25)

**Issue Description:**  
The `getLoginRedirectAction` reads a `redirect_to` cookie and returns its raw value as a redirect URL without any validation. Since `SameSite=lax` cookies can be set by sibling subdomains or via MITM on insecure connections, an attacker who can plant this cookie can redirect users to a phishing site after login.

**Suggested Solution:**  
Validate the redirect URL is a relative path or a trusted domain.

**Code Fix:**
```typescript
// Priority 2: Redirect Cookie
const redirectCookie = cookieStore.get("redirect_to");
if (redirectCookie && redirectCookie.value) {
    cookieStore.delete("redirect_to");
    
    // Validate: only allow relative paths, block absolute URLs and protocol-relative URLs
    const redirectUrl = redirectCookie.value;
    if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
        return { action: "REDIRECT" as const, redirectUrl };
    }
    // Fall through to default if invalid
}
```

---

### **[High] — Refresh Token Sent in JSON Body (Middleware → API)**

**Location:** [`src/proxy.ts` L45–L49](file:///c:/Users/shawk/Projects/clou-auth/src/proxy.ts#L45-L49)

**Issue Description:**  
The middleware sends the refresh token in a plain JSON body to the refresh endpoint:
```typescript
body: JSON.stringify({ refreshToken })
```
This is consumed by the `POST /api/auth/v1/refresh` route handler. This endpoint is **publicly accessible** with no authentication — anyone who obtains a refresh token can use it to get new session tokens. While the endpoint does validate the token hash, the issue is that the endpoint is not rate-limited and there is no CORS restriction, making it a target for brute-force attacks. More importantly, the same endpoint also has a GET handler that reads the refresh token from cookies and performs an **open redirect** via the `redirect` query parameter (L39).

**Suggested Solution:**  
1. Add rate limiting to the refresh endpoint.
2. Validate the `redirect` parameter in the GET handler against a whitelist.
3. Add CORS headers to the API route.

**Code Fix (GET handler redirect validation):**
```typescript
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const redirectUrl = searchParams.get("redirect") || "/";

    // Validate redirect URL - only allow relative paths
    if (!redirectUrl.startsWith("/") || redirectUrl.startsWith("//")) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // ... rest of the handler
}
```

---

### **[High] — Fallback JWT Secret `"default_development_secret_only"`**

**Location:**  
- [`src/actions/oauth/oauth.actions.ts` L10](file:///c:/Users/shawk/Projects/clou-auth/src/actions/oauth/oauth.actions.ts#L10)  
- [`src/app/api/sso/v1/authorize/route.ts` L6](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/authorize/route.ts#L6)  
- [`src/app/api/sso/v1/token/route.ts` L7](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/token/route.ts#L7)

**Issue Description:**  
All three files duplicate the same fallback:
```typescript
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || "default_development_secret_only");
```
If `JWT_SECRET` is unset in production, all JWTs (authorization codes, ID tokens, OAuth request sessions) are signed with a well-known secret. An attacker can forge any authorization code or ID token. Additionally, the `getSecret` function is duplicated across three files — a maintenance risk.

**Suggested Solution:**  
1. Throw a fatal error on application startup if `JWT_SECRET` is not set.
2. Centralize the secret into a single module.

**Code Fix:**
```typescript
// src/lib/jwt-secret.ts
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error(
        "FATAL: JWT_SECRET environment variable is not set. " +
        "The application cannot start without a secure signing key."
    );
}

export const jwtSecret = new TextEncoder().encode(JWT_SECRET);
```

---

## Medium Severity

---

### **[Medium] — Session Token TTL Comment Mismatch / Logic Bug**

**Location:** [`src/lib/session.ts` L47](file:///c:/Users/shawk/Projects/clou-auth/src/lib/session.ts#L47)

**Issue Description:**  
The comment says "15 mins with rememberMe" but the code is:
```typescript
const sessionTtl = rememberMe ? SESSION_TOKEN_TTL : 30 * 60; // 15 mins with rememberMe, 30 mins without
```
`SESSION_TOKEN_TTL` is `15 * 60` (15 minutes). This means the session lives for 15 minutes when `rememberMe` is true and 30 minutes when it's false. This is backwards — "remember me" should extend the session, not shorten it. More critically, when `rememberMe` is false, `refreshToken` is not set (L67–68), but the session TTL is 30 minutes with no way to refresh, meaning sessions silently expire.

**Suggested Solution:**  
Clarify the intended behavior. If "remember me" is meant to keep users logged in longer via refresh tokens, the session TTL should be consistent (e.g., always 15 minutes), and only the refresh token presence/TTL should differ.

**Code Fix:**
```typescript
// Session token is always short-lived (15 minutes)
const sessionTtl = SESSION_TOKEN_TTL; // Always 15 min
const sessionExpiresOn = new Date(now.getTime() + sessionTtl * 1000);

// Refresh token only exists if rememberMe is true
const rtTtl = rememberMe ? REFRESH_TOKEN_TTL_REMEMBER_ME : 0;
const refreshExpiresOn = rememberMe
    ? new Date(now.getTime() + rtTtl * 1000)
    : sessionExpiresOn; // match session if no refresh
```

---

### **[Medium] — `disableAccount` Deletes Wrong Cookie Name**

**Location:** [`src/actions/profile/danger-zone.actions.ts` L37](file:///c:/Users/shawk/Projects/clou-auth/src/actions/profile/danger-zone.actions.ts#L37)

**Issue Description:**  
The function deletes a cookie named `"session"`, but the actual session cookie is named `"session_token"` (defined in `session.constants.ts`). This means after disabling the account, the user's session cookie is **not cleared**, and they remain authenticated until the session expires naturally.

**Suggested Solution:**  
Use the constant `COOKIE_SESSION_TOKEN_NAME` and also clear the refresh token cookie.

**Code Fix:**
```typescript
import { COOKIE_SESSION_TOKEN_NAME, COOKIE_REFRESH_TOKEN_NAME } from "@/constant/session.constants";

// ...

// Clear local cookies
const cookieStore = await cookies();
cookieStore.delete(COOKIE_SESSION_TOKEN_NAME);
cookieStore.delete(COOKIE_REFRESH_TOKEN_NAME);
```

---

### **[Medium] — Weak Password Requirements**

**Location:** [`src/schema/auth.schema.ts` L33–L35](file:///c:/Users/shawk/Projects/clou-auth/src/schema/auth.schema.ts#L33-L35)

**Issue Description:**  
The sign-up password schema only requires `min(6)`:
```typescript
password: z.string().min(6, t("signUp.passwordMin")).max(100),
```
There is no requirement for uppercase, lowercase, digits, or special characters. A password like `"aaaaaa"` would pass validation. For an authentication service, this is insufficient.

**Suggested Solution:**  
Add regex-based complexity requirements:

**Code Fix:**
```typescript
password: z.string()
    .min(8, t("signUp.passwordMin"))
    .max(100)
    .regex(/[A-Z]/, t("signUp.passwordUppercase"))
    .regex(/[a-z]/, t("signUp.passwordLowercase"))
    .regex(/[0-9]/, t("signUp.passwordNumber")),
```

---

### **[Medium] — Low Bcrypt Cost Factor (10)**

**Location:**  
- [`src/actions/auth/signup.actions.ts` L27](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/signup.actions.ts#L27)
- [`src/actions/profile/security-info.actions.ts` L47](file:///c:/Users/shawk/Projects/clou-auth/src/actions/profile/security-info.actions.ts#L47)
- [`src/actions/auth/verification.actions.ts` L57](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/verification.actions.ts#L57)
- [`src/actions/profile/apps.actions.ts` L101, L256](file:///c:/Users/shawk/Projects/clou-auth/src/actions/profile/apps.actions.ts#L101)

**Issue Description:**  
All bcrypt hashing uses a cost factor of 10:
```typescript
await bcrypt.hash(password, 10);
```
While 10 was acceptable years ago, current OWASP recommendations are a minimum of 12 (ideally 13+). Using 10 means hash cracking is approximately 8× faster than with 12.

**Suggested Solution:**  
Use `bcrypt.hash(password, 12)` at minimum. Consider using Argon2id for new deployments.

---

### **[Medium] — Backup Code Generation Uses Bcrypt in a Loop (DoS Vector)**

**Location:** [`src/actions/profile/security-info.actions.ts` L193–L203](file:///c:/Users/shawk/Projects/clou-auth/src/actions/profile/security-info.actions.ts#L193-L203)

**Issue Description:**  
The `generateBackupCodesAction` runs `bcrypt.hash()` 10 times sequentially in a `for` loop. With a cost factor of 10, each hash takes ~100ms, totaling ~1 second. If increased to 12, this becomes ~4 seconds per request. Since server actions run on the Node.js server thread, a user spamming this endpoint can cause significant CPU load.

**Suggested Solution:**  
1. Hash codes in parallel using `Promise.all`.
2. Add rate limiting to the endpoint.

**Code Fix:**
```typescript
const codes: string[] = [];
const hashPromises: Promise<{ user_id: string; code_hash: string; used: boolean }>[] = [];

for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formatted);
    hashPromises.push(
        bcrypt.hash(formatted, 12).then((hash) => ({
            user_id: sessionData.user.id,
            code_hash: hash,
            used: false,
        }))
    );
}

const createData = await Promise.all(hashPromises);
```

---

### **[Medium] — OAuth Callback Account Takeover via Upsert**

**Location:** [`src/app/api/oauth/callback/[provider]/route.ts` L45–L66](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/oauth/callback/%5Bprovider%5D/route.ts#L45-L66)

**Issue Description:**  
When a logged-in user links an OAuth account, the code uses `upsert`:
```typescript
await prisma.oAuthAccount.upsert({
    where: {
        provider_provider_user_id: { provider: provider.toLowerCase(), provider_user_id: profile.id }
    },
    update: { user_id: session.user.id, ... },
    create: { user_id: session.user.id, ... }
});
```
The `update` clause reassigns the OAuth account's `user_id` to the currently logged-in user. If that OAuth account was previously linked to *another* user, this silently steals it. An attacker who controls an OAuth account that another user has linked can steal that link, potentially gaining access to the victim's account if they log in via that provider.

**Suggested Solution:**  
Before upserting, check if the OAuth account already belongs to a different user. If so, deny the operation.

**Code Fix:**
```typescript
// Check if this OAuth identity is already linked to a different user
const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
        provider_provider_user_id: {
            provider: provider.toLowerCase(),
            provider_user_id: profile.id,
        },
    },
});

if (existingLink && existingLink.user_id !== session.user.id) {
    redirectUrl.searchParams.set("error", "account_already_linked");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(`oauth_state_${provider}`);
    return response;
}

// Safe to upsert — it's either new or belongs to the current user
await prisma.oAuthAccount.upsert({ /* ... */ });
```

---

### **[Medium] — OIDC Discovery Mismatches**

**Location:** [`src/app/.well-known/openid-configuration/route.ts`](file:///c:/Users/shawk/Projects/clou-auth/src/app/.well-known/openid-configuration/route.ts)

**Issue Description:**  
Multiple claims in the discovery document are incorrect or misleading:

1. **L26–29**: `id_token_signing_alg_values_supported: ["RS256", "ES256", "EdDSA"]` — but ID tokens are signed with HS256.
2. **L22–25**: `subject_types_supported: ["public", "pairwise"]` — pairwise subjects are not implemented (the `sub` claim always contains the raw `user.id`).
3. **L65–68**: `grant_types_supported: ["authorization_code", "refresh_token", "client_credentials"]` — refresh_token and client_credentials grants are not implemented in the token endpoint.
4. **L59**: `nonce` is listed in `claims_supported` but is never included in the ID token.

**Suggested Solution:**  
Align the discovery document with the actual implementation. Only advertise what is actually supported.

**Code Fix:**
```typescript
id_token_signing_alg_values_supported: ["RS256"], // After fixing to RS256
subject_types_supported: ["public"],
grant_types_supported: ["authorization_code"],
// Remove "nonce" from claims_supported until implemented
```

---

### **[Medium] — `nonce` Parameter Not Passed Through to ID Token**

**Location:**  
- [`src/app/api/sso/v1/authorize/route.ts`](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/authorize/route.ts) — does not capture `nonce`  
- [`src/app/api/sso/v1/token/route.ts` L84–L94](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/token/route.ts#L84-L94) — does not include `nonce`

**Issue Description:**  
Per OIDC Core §3.1.2.1, when a `nonce` is sent in the authorization request, it MUST be included in the ID token. The authorize endpoint never captures the `nonce` query parameter, so it's never stored in the auth request JWT, and never included in the ID token. This breaks OIDC replay attack protection.

**Suggested Solution:**  
1. Capture `nonce` in the authorize endpoint and include it in the auth request JWT.
2. Pass it through to the ID token in the token endpoint.

**Code Fix (authorize/route.ts):**
```typescript
const nonce = searchParams.get("nonce"); // Add after L18

// Include in the JWT payload:
const authRequestToken = await new SignJWT({
    client_id, redirect_uri, state,
    code_challenge, code_challenge_method,
    scope, nonce, // <-- Add nonce
    type: "oauth_auth_request"
})
```

---

### **[Medium] — Revoke Endpoint Double-Parses Request Body**

**Location:** [`src/app/api/sso/v1/revoke/route.ts` L7–L8](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/revoke/route.ts#L7-L8)

**Issue Description:**  
The code attempts to parse the body twice:
```typescript
const formData = await request.formData().catch(() => null);
const json = await request.json().catch(() => null);
```
A `Request` body can only be consumed once. The second call will always fail. If the body is `application/json`, the `formData()` call will fail first, consuming the stream, and `json()` will also fail — resulting in `token` always being `undefined` for JSON bodies.

**Suggested Solution:**  
Check `Content-Type` first and parse accordingly.

**Code Fix:**
```typescript
export async function POST(request: NextRequest) {
    try {
        let token: string | null = null;

        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = await request.formData();
            token = formData.get("token") as string;
        } else {
            const json = await request.json().catch(() => ({}));
            token = json?.token || null;
        }

        if (!token) {
            return NextResponse.json(
                { error: "invalid_request", error_description: "Token is required." },
                { status: 400 }
            );
        }

        await revokeOAuthSession(token);

        // RFC 7009: Revoke endpoint MUST respond with 200 even if token is invalid
        return new NextResponse(null, { status: 200 });
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute POST");
        return NextResponse.json(
            { error: "server_error", error_description: em },
            { status: 500 }
        );
    }
}
```

---

### **[Medium] — `signOutAction` Does Not Clear Cookies Properly on Client**

**Location:** [`src/actions/auth/auth.actions.ts` L147–L155](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/auth.actions.ts#L147-L155)

**Issue Description:**  
`signOutAction` calls `signOut()` (which clears cookies) and then returns `{ success: true, redirectUrl: "/signin" }`. The client-side redirect is done via `window.location.href` (in `sign-out-button.tsx`). Between `signOut()` setting the cookie deletion headers and the client-side redirect, there's a race: the browser might cache the page and not honor the `Set-Cookie` delete headers if the navigation happens before the response completes.

More importantly, the actual `SignOutButton` component uses `router.push` (Next.js client-side navigation), which doesn't perform a full page reload and may not clear the cookies from the browser's perspective.

**Suggested Solution:**  
Use `window.location.href = "/signin"` (full navigation) or use a form-based approach with `redirect()` in the server action.

---

### **[Medium] — Profile Layout Waterfall Data Fetching**

**Location:** [`src/app/profile/layout.tsx` L21–L38](file:///c:/Users/shawk/Projects/clou-auth/src/app/profile/layout.tsx#L21-L38)

**Issue Description:**  
The profile layout sequentially awaits 6 dictionary calls and then 1 profile data call:
```typescript
const locale = await getLocale();
const schemaProfile = await getDictionary(locale, "schema_profile");
const schemaSecurity = await getDictionary(locale, "schema_security");
const schemaApp = await getDictionary(locale, "schema_app");
const profilePersonal = await getDictionary(locale, "profile_personal");
const profileSecurity = await getDictionary(locale, "profile_security");
const profileApps = await getDictionary(locale, "profile_apps");
const result = await getFullProfile();
```
Each `await` blocks the next one. Since `getDictionary` calls are independent and likely involve file I/O, they should be parallelized.

**Suggested Solution:**  
Use `Promise.all` for independent data fetching.

**Code Fix:**
```typescript
const locale = await getLocale();

const [schemaProfile, schemaSecurity, schemaApp, profilePersonal, profileSecurity, profileApps, result] = 
    await Promise.all([
        getDictionary(locale, "schema_profile"),
        getDictionary(locale, "schema_security"),
        getDictionary(locale, "schema_app"),
        getDictionary(locale, "profile_personal"),
        getDictionary(locale, "profile_security"),
        getDictionary(locale, "profile_apps"),
        getFullProfile(),
    ]);
```

---

### **[Medium] — `tempSessionId` Exposed in URL Query Parameters**

**Location:** [`src/app/api/oauth/callback/[provider]/route.ts` L149](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/oauth/callback/%5Bprovider%5D/route.ts#L149)

**Issue Description:**  
The OAuth callback redirects to the signin page with `tempSessionId` as a query parameter:
```typescript
loginRedirectUrl.searchParams.set("tempSessionId", result.tempSessionId);
```
This `tempSessionId` is a database ID that grants access to the temp session and can be used to bypass 2FA. Placing it in the URL means it will appear in:
- Browser history
- Server access logs
- Referrer headers

**Suggested Solution:**  
Pass the `tempSessionId` via an httpOnly cookie instead of a URL parameter.

**Code Fix:**
```typescript
if (result.success && "require2FA" in result && result.require2FA) {
    loginRedirectUrl.pathname = "/signin";
    loginRedirectUrl.searchParams.set("require2FA", "true");
    const response = NextResponse.redirect(loginRedirectUrl);
    if (result.tempSessionId) {
        response.cookies.set("temp_session_id", result.tempSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60, // 15 minutes
        });
    }
    response.cookies.delete(`oauth_state_${provider}`);
    return response;
}
```

---

### **[Medium] — `getFullProfile` Fetches Password and All Sensitive Data**

**Location:** [`src/actions/profile/get-profile.actions.ts` L165–L278](file:///c:/Users/shawk/Projects/clou-auth/src/actions/profile/get-profile.actions.ts#L165-L278)

**Issue Description:**  
`getFullProfile()` queries **everything** including `password`, `recovery_codes`, and `sessions`, then manually redacts hashes with `"[REDACTED]"`. While the redaction is correct, this approach is fragile:
1. Any new sensitive field added to the schema won't be auto-redacted.
2. The `password.failed_attempts` and `password.locked_until` are exposed — an attacker can enumerate lockout state.
3. All session metadata (IP addresses, user agents) is returned, which could be a privacy concern.

This function is called from the Profile layout (`layout.tsx` L38), meaning this heavy query runs on every profile page load.

**Suggested Solution:**  
Use `select` clauses instead of `include` to only fetch needed fields. Create separate, purpose-built queries for security settings and session management pages.

---

### **[Medium] — No Rate Limiting on Any Server Actions**

**Location:** All files in `src/actions/` — every exported server action.

**Issue Description:**  
None of the server actions implement rate limiting. While Next.js server actions have CSRF protection (automatic `__next_action_header` check), they are still vulnerable to:
1. **Credential stuffing** on `signIn`
2. **Account enumeration** on `signUp` (unique constraint errors reveal existing emails)
3. **Brute-force** on `resolveCodeVerification`
4. **Resource exhaustion** on `generateBackupCodesAction` (heavy bcrypt)

The application has account-level lockout (5 failed attempts → 15 min lockout), but no IP-level rate limiting.

**Suggested Solution:**  
Implement rate limiting using an in-memory store (for single instances) or Redis (for distributed deployments). Consider using `next-safe-action` with built-in rate limiting or a middleware-based approach.

---

### **[Medium] — `updateProfilePreferences` Uses `any` Type Without Validation**

**Location:** [`src/actions/profile/personal-info.actions.ts` L209–L236](file:///c:/Users/shawk/Projects/clou-auth/src/actions/profile/personal-info.actions.ts#L209-L236)

**Issue Description:**  
```typescript
export async function updateProfilePreferences(data: { theme?: string, language?: string, timezone?: string }) {
    const updateData: any = {};
    if (data.theme) updateData.theme = data.theme;
    // ...
}
```
The function accepts arbitrary strings for `theme`, `language`, and `timezone` without schema validation. An attacker could pass `theme: "<script>alert(1)</script>"` or other injection payloads that would be stored in the database and potentially rendered in the UI.

**Suggested Solution:**  
Use Zod to validate the input:

**Code Fix:**
```typescript
import { z } from "zod";

const preferencesSchema = z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    language: z.string().min(2).max(10).regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
    timezone: z.string().max(50).optional(),
});

export async function updateProfilePreferences(data: z.infer<typeof preferencesSchema>) {
    const parsed = preferencesSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Invalid preferences data." };
    }
    // ... use parsed.data
}
```

---

### **[Medium] — OAuth Access Tokens Stored in Plaintext**

**Location:**  
- [`prisma/schema/auth.prisma` L80–L81](file:///c:/Users/shawk/Projects/clou-auth/prisma/schema/auth.prisma#L80-L81)
- [`src/app/api/oauth/callback/[provider]/route.ts` L54–L55](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/oauth/callback/%5Bprovider%5D/route.ts#L54-L55)

**Issue Description:**  
Provider OAuth tokens (Google, GitHub, Microsoft `access_token` and `refresh_token`) are stored as plaintext in the `OAuthAccount` table. If the database is compromised, an attacker gains access to every user's Google/GitHub/Microsoft accounts.

**Suggested Solution:**  
Encrypt provider tokens at rest using AES-256-GCM with a server-managed key.

---

### **[Medium] — Username Generation Collision Risk**

**Location:** [`src/actions/auth/signup.actions.ts` L23–L25](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/signup.actions.ts#L23-L25)

**Issue Description:**  
```typescript
let username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
username = `${username}_${Math.floor(Math.random() * 10000)}`;
```
`Math.random()` with a range of 0–9999 gives only 10,000 possibilities. With ~1000 users sharing the same email prefix, there's a ~5% collision chance (birthday problem). The catch block handles `P2002` unique constraint errors, but it just throws instead of retrying.

**Suggested Solution:**  
Use `crypto.randomBytes` for better entropy and implement a retry loop.

**Code Fix:**
```typescript
import crypto from "crypto";

let username: string;
let retries = 0;
const maxRetries = 5;
const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";

while (retries < maxRetries) {
    const suffix = crypto.randomBytes(4).toString("hex");
    username = `${prefix}_${suffix}`;
    try {
        user = await prisma.user.create({
            data: { username, /* ... */ },
        });
        break;
    } catch (e: unknown) {
        if (getErrorCode(e) === "P2002" && retries < maxRetries - 1) {
            retries++;
            continue;
        }
        throw e;
    }
}
```

---

## Low Severity

---

### **[Low] — Missing CORS Headers on SSO API Routes**

**Location:** All files in `src/app/api/sso/v1/`

**Issue Description:**  
The SSO endpoints (`/api/sso/v1/token`, `/api/sso/v1/userinfo`, `/api/sso/v1/revoke`) do not set `Access-Control-Allow-Origin` headers. While the token endpoint is typically called from a backend (not a browser), the userinfo endpoint might be called from a client-side SPA, and the lack of CORS headers would cause those requests to fail.

**Suggested Solution:**  
Add CORS headers to the SSO routes, or implement a centralized CORS middleware for the `/api/sso/` prefix. Per OIDC spec, the userinfo endpoint should support CORS.

---

### **[Low] — `noHtmlRegex` Is Stateless but Defined at Module Level**

**Location:** [`src/schema/auth.schema.ts` L4](file:///c:/Users/shawk/Projects/clou-auth/src/schema/auth.schema.ts#L4)

**Issue Description:**  
```typescript
const noHtmlRegex = /\<[a-z\/][^>]*>/i;
```
This regex does **not** use the `g` flag, so it doesn't have the stateful `lastIndex` issue. However, it's only applied to `firstName` and `lastName` in the sign-up schema — not to `username` in sign-in, not to `bio` or `address` fields in the profile schema. Inconsistent HTML sanitization creates XSS surface area if any of these values are rendered with `dangerouslySetInnerHTML` (not currently the case, but a future risk).

**Suggested Solution:**  
Apply the HTML check consistently across all user-input text fields, or use a centralized sanitization utility.

---

### **[Low] — `dev/create-jwks` Endpoint Only Checks `NODE_ENV`**

**Location:** [`src/app/api/dev/create-jwks/route.ts` L8](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/dev/create-jwks/route.ts#L8)

**Issue Description:**  
The JWKS generation endpoint is protected only by `process.env.NODE_ENV !== "development"`. In some deployment configurations (e.g., preview deployments, Docker containers), `NODE_ENV` may not be `"production"`. Additionally, the route responds to both GET and POST, making it trivially accessible.

**Suggested Solution:**  
Add an additional secret-based authentication check (similar to `cleanup-sessions`), or remove this route entirely and generate keys via a CLI script.

---

### **[Low] — JWKS Endpoint Not Cached**

**Location:** [`src/app/api/sso/v1/jwks.json/route.ts`](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/sso/v1/jwks.json/route.ts)

**Issue Description:**  
The JWKS endpoint queries the database on every request with no caching. OIDC clients may poll this endpoint frequently to verify ID tokens. Without caching, this creates unnecessary database load.

**Suggested Solution:**  
Add `Cache-Control` headers and/or use Next.js `unstable_cache`.

**Code Fix:**
```typescript
export async function GET() {
    try {
        const keys = await prisma.signingKey.findMany({
            where: { revokedAt: null },
            select: { jwk: true },
        });

        const jwks = keys.map((k) => JSON.parse(k.jwk));

        return NextResponse.json(
            { keys: jwks },
            {
                headers: {
                    "Cache-Control": "public, max-age=3600, s-maxage=3600",
                },
            }
        );
    } catch (e: unknown) {
        const em = handleError(e, "Failed to execute GET");
        return NextResponse.json({ error: em }, { status: 500 });
    }
}
```

---

### **[Low] — `handleError` Returns Raw Error Messages When Called With `true`**

**Location:** [`src/misc/utils.ts` L41–L42](file:///c:/Users/shawk/Projects/clou-auth/src/misc/utils.ts#L41-L42)

**Issue Description:**  
When `handleError(e, true)` is called, it returns the raw error message to the client. This is used in several places:
- `auth.actions.ts` L142
- `security-info.actions.ts` L70

Raw error messages from Prisma, bcrypt, or other libraries may contain internal details (table names, connection strings, stack traces) that should not be exposed to clients.

**Suggested Solution:**  
Create an explicit allowlist of user-safe error messages, and map everything else to a generic message.

---

### **[Low] — Missing `Suspense` Boundary on Profile Page**

**Location:** [`src/app/profile/page.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/profile/page.tsx)

**Issue Description:**  
The profile page and its sub-pages (edit, security, password, etc.) do not use `Suspense` boundaries. If any data fetch in a profile sub-page is slow, the entire layout blocks because the data is fetched in the layout.

**Suggested Solution:**  
Stream individual sections by wrapping data-dependent components in `<Suspense fallback={<ProfileSkeleton />}>` boundaries.

---

### **[Low] — `refreshSession` Extends Refresh Token Lifetime Indefinitely**

**Location:** [`src/lib/session.ts` L121–L122](file:///c:/Users/shawk/Projects/clou-auth/src/lib/session.ts#L121-L122)

**Issue Description:**  
```typescript
const originalTtl = (session.expires_on.getTime() - session.created_on.getTime()) / 1000;
const refreshExpiresOn = new Date(now.getTime() + originalTtl * 1000);
```
On each refresh, the new `expires_on` is set to `now + originalTtl`. For a 30-day remember-me session, this means the refresh token effectively never expires as long as the user refreshes at least once every 30 days. This is a "rolling session" design, which may be intentional — but it means a stolen refresh token has an unlimited lifetime if refreshed periodically.

**Suggested Solution:**  
Add an absolute maximum session lifetime (e.g., 90 days from original creation). Track the `created_on` of the original session and enforce it.

---

### **[Low] — Timing-Safe Token Comparison Not Used**

**Location:** [`src/lib/session.ts` L107, L170](file:///c:/Users/shawk/Projects/clou-auth/src/lib/session.ts#L107)

**Issue Description:**  
Token hash comparison uses JavaScript's `!==` operator:
```typescript
if (session.refresh_token_hash !== presentedHash) {
```
While the tokens are already hashed (mitigating the practical impact), OWASP best practices recommend using `crypto.timingSafeEqual` for all secret comparisons to prevent timing side-channel attacks.

**Suggested Solution:**
```typescript
import crypto from "crypto";

function timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Usage:
if (!timingSafeCompare(session.refresh_token_hash, presentedHash)) {
```

---

### **[Low] — `SignInForm` Stores `tempSessionId` in React State from URL**

**Location:** [`src/app/(auth)/signin/signin-form.tsx` L32–L42](file:///c:/Users/shawk/Projects/clou-auth/src/app/%28auth%29/signin/signin-form.tsx#L32-L42)

**Issue Description:**  
The `tempSessionId` is read from URL search params:
```typescript
const sessionId = searchParams.get("tempSessionId");
setTempSessionId(sessionId);
```
This value is visible in the browser's address bar, shareable via copy-paste, and persists in browser history. Combined with the URL being bookmarkable, this creates a risk of temp session reuse.

**Suggested Solution:**  
Clear the search params after reading them, or pass the value via cookies (see related Medium finding above).

**Code Fix:**
```typescript
useEffect(() => {
    const require2FA = searchParams.get("require2FA");
    const sessionId = searchParams.get("tempSessionId");
    
    if (require2FA || sessionId) {
        // Clean up the URL without causing a re-render
        const url = new URL(window.location.href);
        url.searchParams.delete("require2FA");
        url.searchParams.delete("tempSessionId");
        window.history.replaceState({}, "", url.toString());
    }
    // ... rest of the logic
}, [searchParams]);
```

---

### **[Low] — Session Cleanup Cron Secret Uses Simple String Comparison**

**Location:** [`src/app/api/auth/v1/cleanup-sessions/route.ts` L11](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/auth/v1/cleanup-sessions/route.ts#L11)

**Issue Description:**  
```typescript
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
```
This uses `!==` for secret comparison, which is vulnerable to timing attacks. An attacker can measure response times to progressively guess the `CRON_SECRET` character by character.

**Suggested Solution:**  
Use `crypto.timingSafeEqual`:

**Code Fix:**
```typescript
const expectedHeader = `Bearer ${cronSecret}`;
if (
    !cronSecret ||
    !authHeader ||
    authHeader.length !== expectedHeader.length ||
    !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedHeader))
) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

### **[Low] — `getOAuthSession` Uses `findFirst` Instead of `findUnique`**

**Location:** [`src/lib/session.ts` L296](file:///c:/Users/shawk/Projects/clou-auth/src/lib/session.ts#L296)

**Issue Description:**  
```typescript
const session = await prisma.oAuthSession.findFirst({
    where: { id: parts[0], access_token_hash: accessHash },
    // ...
});
```
`id` is the primary key and `access_token_hash` has a `@unique` constraint. Using `findFirst` instead of `findUnique` bypasses Prisma's primary key optimization and may result in a full table scan on some databases.

**Suggested Solution:**  
Use `findUnique` on the `id` field, then manually verify the `access_token_hash`:

```typescript
const session = await prisma.oAuthSession.findUnique({
    where: { id: parts[0] },
    include: { user: { include: { emails: true } } },
});
if (!session || session.access_token_hash !== accessHash) return null;
```

---

### **[Low] — Missing Security Headers on API Responses**

**Location:** All API routes under `src/app/api/`

**Issue Description:**  
None of the API route handlers set security headers such as:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy`

While these are typically set at the reverse proxy/CDN level, Next.js can also set them via `next.config.ts` headers configuration.

**Suggested Solution:**  
Add a `headers` configuration to `next.config.ts`:

**Code Fix:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
    // ... existing config
    headers: async () => [
        {
            source: "/:path*",
            headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            ],
        },
    ],
};
```

---

### **[Low] — Unused Import in `refresh/route.ts`**

**Location:** [`src/app/api/auth/v1/refresh/route.ts` L3](file:///c:/Users/shawk/Projects/clou-auth/src/app/api/auth/v1/refresh/route.ts#L3)

**Issue Description:**  
The imports `REFRESH_TOKEN_TTL` and `REFRESH_TOKEN_TTL_REMEMBER_ME` are imported but never used:
```typescript
import { ..., REFRESH_TOKEN_TTL, REFRESH_TOKEN_TTL_REMEMBER_ME } from "@/constant/session.constants";
```

**Suggested Solution:**  
Remove unused imports.

---

*End of audit report.*
