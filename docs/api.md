# 📡 API Reference & OpenID Connect Specifications

ClouAuth implements standard **OpenID Connect Core 1.0** and **OAuth 2.0 (RFC 6749 / RFC 7636 / RFC 7009 / RFC 7662 / RFC 9207 / BCP 212)** protocols, in addition to dedicated ecosystem inter-service endpoints.

The architecture enforces a strict physical bifurcation:
- **Localized Human UI Routes (`/{lang}/...`)**: User-facing authentication, authorization, consent, and account recovery screens. Dictionaries are passed strictly from Server Components to Client Components; static shells are preserved with `generateStaticParams` and Suspense boundaries.
- **Headless Machine APIs (`/api/...`)**: Zero locale redirects, headless JSON/form payloads, strict machine-to-machine and token exchange boundaries.

For the machine-readable OpenAPI 3.1 specification, see [`docs/openapi.yaml`](openapi.yaml).

---

## 🔍 OpenID Connect Discovery

### Discovery Document
Retrieves OpenID Provider metadata. Bypasses all locale redirects.

```http
GET /.well-known/openid-configuration HTTP/1.1
Host: auth.clouburstlab.com
Accept: application/json
```

**Response (`200 OK`):**
```json
{
  "issuer": "https://auth.clouburstlab.com",
  "authorization_endpoint": "https://auth.clouburstlab.com/en/authorize",
  "token_endpoint": "https://auth.clouburstlab.com/api/oauth/token",
  "userinfo_endpoint": "https://auth.clouburstlab.com/api/oauth/userinfo",
  "revocation_endpoint": "https://auth.clouburstlab.com/api/oauth/revoke",
  "introspection_endpoint": "https://auth.clouburstlab.com/api/oauth/introspect",
  "jwks_uri": "https://auth.clouburstlab.com/api/oauth/jwks.json",
  "response_types_supported": ["code"],
  "response_modes_supported": ["query", "form_post"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email", "phone", "offline_access"],
  "token_endpoint_auth_methods_supported": [
    "client_secret_post",
    "client_secret_basic",
    "none"
  ],
  "claims_supported": [
    "sub", "iss", "aud", "exp", "iat", "name", "given_name",
    "family_name", "preferred_username", "email", "email_verified",
    "picture", "phone_number", "nonce", "auth_time"
  ],
  "code_challenge_methods_supported": ["S256"],
  "grant_types_supported": [
    "authorization_code",
    "refresh_token",
    "client_credentials"
  ]
}
```

---

## 🔑 Human Interaction Routes (`/{lang}/...`)

### 1. Authorization Endpoint (`/{lang}/authorize`)
Entry point for OAuth 2.0 / OIDC Authorization Code Flow with PKCE. Clients can initiate authorization in any supported locale (`en`, `bn`, `ko`, `es`, `zh`, `ar`).

```http
GET /{lang}/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=openid%20profile%20email&state={STATE}&code_challenge={CHALLENGE}&code_challenge_method=S256 HTTP/1.1
Host: auth.clouburstlab.com
```

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `client_id` | `string` | **Yes** | Client ID registered in developer settings |
| `redirect_uri` | `string` | **Yes** | Exact-match whitelisted callback URL (no wildcards or fragments) |
| `response_type` | `string` | **Yes** | Must be `code` |
| `scope` | `string` | No | Space-delimited scopes registered to the client (e.g. `openid profile email offline_access`) |
| `state` | `string` | **Yes** | Cryptographic CSRF state token |
| `code_challenge` | `string` | **Yes** | Base64URL-encoded SHA-256 hash of `code_verifier` (RFC 7636) |
| `code_challenge_method`| `string` | **Yes** | Strictly `S256` (`plain` is rejected per OAuth 2.0 Security BCP 212) |
| `nonce` | `string` | No | Replay prevention nonce bound to the issued ID token |

#### Flow Progression
1. **Unauthenticated User**: Redirected to `/{lang}/signin` with all OAuth query parameters preserved.
2. **Authenticated User**: Redirected to `/{lang}/consent` with all OAuth query parameters preserved.
3. **Consent Granted**: Issues an authorization code and redirects back to the client callback:
   ```http
   HTTP/1.1 302 Found
   Location: https://yourapp.com/callback?code={AUTHORIZATION_CODE}&state={STATE}&iss=https%3A%2F%2Fauth.clouburstlab.com
   ```
   *(Includes RFC 9207 `iss` parameter to prevent mix-up attacks)*

---

## ⚡ Raw Machine OAuth APIs (`/api/oauth/...`)

All raw machine endpoints reside under `/api/oauth/` and are explicitly excluded from `proxy.ts` i18n redirect rules.

### 1. Token Endpoint (`POST /api/oauth/token`)
Exchanges an authorization code, refresh token, or client credentials for access and ID tokens. Validates client credentials and PKCE `code_verifier` prior to atomic single-use JTI code redemption.

```http
POST /api/oauth/token HTTP/1.1
Host: auth.clouburstlab.com
Content-Type: application/x-www-form-urlencoded
```

#### Flow A: Authorization Code Exchange (with PKCE)
> [!IMPORTANT]
> `redirect_uri` is **mandatory** during `authorization_code` exchange and must strictly match the `redirect_uri` used at `/{lang}/authorize`.

```bash
curl -X POST "https://auth.clouburstlab.com/api/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=https://yourapp.com/callback" \
  -d "code_verifier=YOUR_PKCE_CODE_VERIFIER"
```

#### Flow B: Refresh Token Grant (Atomic Single-Use Rotation)
> [!NOTE]
> If `scope` is passed during refresh, it must be an equal or narrower subset of the originally granted scopes. Escalating scopes returns `400 invalid_scope`.

```bash
curl -X POST "https://auth.clouburstlab.com/api/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "refresh_token=YOUR_REFRESH_TOKEN"
```

#### Flow C: Client Credentials Grant (M2M)
```bash
curl -X POST "https://auth.clouburstlab.com/api/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "scope=openid profile email"
```

**Token Response (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email"
}
```

---

### 2. UserInfo Endpoint (`GET, POST /api/oauth/userinfo`)
Returns identity claims for the authenticated subject based on granted scopes.

```http
GET /api/oauth/userinfo HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (`200 OK`):**
```json
{
  "sub": "cm0a1b2c3d4e5f6g7h8i9j0k",
  "name": "Shawkat Hossain Maruf",
  "given_name": "Shawkat",
  "family_name": "Maruf",
  "preferred_username": "shawkath646",
  "email": "contact@shawkath646.dev",
  "email_verified": true,
  "picture": "https://assets.clouburstlab.com/avatars/user_123.webp",
  "updated_at": 1727400000
}
```

---

### 3. Token Introspection (`POST /api/oauth/introspect`)
RFC 7662 compliant token introspection for resource servers and API gateways.

```http
POST /api/oauth/introspect HTTP/1.1
Host: auth.clouburstlab.com
Content-Type: application/x-www-form-urlencoded

token=YOUR_ACCESS_OR_REFRESH_TOKEN&client_id=your_client_id&client_secret=your_client_secret
```

**Active Token Response (`200 OK`):**
```json
{
  "active": true,
  "scope": "openid profile email",
  "client_id": "cbl_client_123",
  "sub": "cm0a1b2c3d4e5f6g7h8i9j0k",
  "exp": 1727403600,
  "iat": 1727400000,
  "iss": "https://auth.clouburstlab.com",
  "token_type": "Bearer"
}
```

**Inactive / Revoked Token Response (`200 OK`):**
```json
{
  "active": false
}
```

---

### 4. JSON Web Key Set (`GET /api/oauth/jwks.json` / `GET /api/oauth/jwks`)
Returns public RSA keys used by ClouAuth to sign RS256 ID tokens. Private keys are encrypted at rest with AES-256-GCM.

```http
GET /api/oauth/jwks.json HTTP/1.1
Host: auth.clouburstlab.com
```

**Response (`200 OK`):**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "key_2026_09_active",
      "n": "u1b7Y9...",
      "e": "AQAB"
    }
  ]
}
```

---

### 5. Token Revocation (`POST /api/oauth/revoke`)
RFC 7009 compliant token revocation. Revokes active access or refresh tokens. Guaranteed HTTP 200 response per RFC specification.

```http
POST /api/oauth/revoke HTTP/1.1
Host: auth.clouburstlab.com
Content-Type: application/x-www-form-urlencoded

token=YOUR_TOKEN_STRING&token_type_hint=refresh_token&client_id=your_client_id&client_secret=your_client_secret
```

---

## 🌉 Inter-Services Bridge Endpoints (`/api/inter-services/...`)

Dedicated endpoints for **clouburstlab** internal microservices and authorized ecosystem applications:

### 1. User Session Resolution
Resolves the active user from the cross-subdomain `session_token` cookie. Passing `?user_id=` or `x-user-id` without a browser cookie is strictly restricted to internal service tokens (`isInternalService: true`).

```http
GET /api/inter-services/v1/user-session?scope=id,firstname,lastname,email,avatar HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_SERVICE_OR_APP_TOKEN
Cookie: session_token=...
```

### 2. Connected Drives Bridge
Retrieves refreshed, decrypted OAuth tokens for third-party cloud drives.

```http
GET /api/inter-services/v1/connected-drives?provider=google_drive&refresh=true HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_SERVICE_TOKEN
Cookie: session_token=...
```

### 3. Asynchronous Email Queue (Internal Services Only)
Dispatches and manages transactional system emails through the queued retry pipeline. Strictly requires an internal service token (`isInternalService: true`).

```http
POST /api/inter-services/v1/email-queue HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_INTERNAL_SERVICE_TOKEN
Content-Type: application/json

{
  "user_id": "user_cuid_123",
  "to": "recipient@example.com",
  "subject": "Security Alert: New Sign-in",
  "template_id": "login_alert",
  "data": { "browser": "Edge", "ip": "192.168.1.1" }
}
```
