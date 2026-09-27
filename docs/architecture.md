# 🏛️ ClouAuth Architecture & System Design

ClouAuth is a centralized, enterprise-grade **Authentication and OpenID Connect (OIDC 1.0) / OAuth 2.0 Identity Provider (IdP)** designed as the backbone authentication authority for the **clouburstlab** ecosystem and third-party developer applications.

---

## 📐 High-Level System Architecture

ClouAuth combines an edge-capable **Next.js 16 (React 19)** App Router architecture with a secure **Microsoft SQL Server / Azure SQL** persistence layer, **Cloudflare R2** object storage, and modular cryptographic microservices.

```mermaid
flowchart TD
    subgraph Clients["Clients & Relying Parties"]
        SPA["Single Page Apps / SPAs\n(PKCE Public Clients)"]
        WebApps["Confidential Web Apps\n(OAuth / OIDC Clients)"]
        InternalApps["clouburstlab Ecosystem Apps\n(Drive, Docs, Internal Services)"]
        Users["End Users\n(Browser / Passkeys / Mobile)"]
    end

    subgraph EdgeLayer["Edge / Reverse Proxy Layer"]
        Proxy["Proxy & Middleware\n(src/proxy.ts)\n• Session Guard & Token Refresh\n• i18n Locale Resolution\n• Strict Security Headers"]
    end

    subgraph CoreEngine["ClouAuth Core Engine"]
        AuthServer["Auth & Server Actions\n• Passkeys / WebAuthn (SimpleWebAuthn)\n• TOTP Authenticator (RFC 6238)\n• Sudo Mode Step-Up Engine\n• Google / GitHub / Microsoft OAuth\n• Google reCAPTCHA v3 Verification"]
        
        OIDCServer["OAuth 2.0 & OIDC Server\n• Discovery: /.well-known/openid-configuration\n• Auth Endpoint: /signin\n• Token Endpoint: /api/sso/v1/token\n• UserInfo: /api/sso/v1/userinfo\n• JWKS: /api/sso/v1/jwks.json\n• Revocation: /api/sso/v1/revoke"]

        InterServices["Inter-Services Bridge\n• /api/inter-services/v1/user-session\n• /api/inter-services/v1/connected-drives\n• /api/inter-services/v1/email-queue"]
        
        KeyManager["Cryptographic Key Engine\n• Dynamic 2048-bit RSA Keypair Rotation\n• RS256 ID Token Signing\n• SHA-256 Session Hashing"]
    end

    subgraph Storage["Storage & Persistence"]
        SQLDB[("Microsoft SQL Server / Azure SQL\nPrisma Multi-File Schema\nUsers, Credentials, Sessions, Apps, Audit")]
        R2[("Cloudflare R2 Object Storage\nAvatars & App Icons (S3 SDK)")]
        EmailWorker["Transactional Email Queue\nRetry Queue & Dispatcher"]
    end

    Users --> Proxy
    SPA --> OIDCServer
    WebApps --> OIDCServer
    InternalApps --> InterServices
    Proxy --> AuthServer
    AuthServer --> SQLDB
    AuthServer --> R2
    AuthServer --> EmailWorker
    OIDCServer --> KeyManager
    OIDCServer --> SQLDB
    KeyManager --> SQLDB
    InterServices --> SQLDB
```

---

## 🔐 Authentication & Security Model

### 1. Multi-Factor Authentication (MFA / 2FA)
ClouAuth enforces a defense-in-depth model with multiple verification methods:
- **Passkeys (FIDO2 / WebAuthn):** Native passwordless and multi-factor biometric authentication implemented via `@simplewebauthn/server` and `@simplewebauthn/browser`. Includes authenticator signature counter tracking to detect authenticator cloning.
- **Time-Based One-Time Password (TOTP):** Fully compliant with RFC 6238 (Google Authenticator, Authy, 1Password) with AES-encrypted shared secrets and clock drift tolerance.
- **SMS & Email 6-Digit OTP:** High-entropy verification codes hashed with SHA-256 before storage, accompanied by exponential lockout backoff to mitigate brute-force attempts.
- **Emergency Recovery Codes:** 10 single-use cryptographically random recovery codes hashed in the database, enabling emergency account recovery if primary 2FA devices are lost.

### 2. Sudo Mode (Step-Up Authentication)
Sensitive actions (such as generating recovery codes, updating passwords, modifying OAuth developer client secrets, and account deletion) require the user to enter **Sudo Mode**. 
- A temporary, time-bounded challenge token (TTL: 15 minutes) is generated after re-verifying credentials or passkeys.
- The state is cryptographically bound to the current session and verified before executing privileged server actions (`src/actions/auth/sudo.actions.ts`).

### 3. Session Lifecycle & Token Rotation
ClouAuth utilizes an opaque, compound session token model rather than naive stateless JWTs for primary user sessions:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Proxy as ClouAuth Proxy (src/proxy.ts)
    participant Engine as Session Engine (src/lib/session.ts)
    participant DB as SQL Server Database

    User->>Proxy: Request with session_token cookie
    Proxy->>Engine: Validate session_token (sessionId.secret)
    alt Session Valid & Active
        Engine->>DB: Query UserSession by sessionId and sha256(secret)
        DB-->>Proxy: Valid Session & User Profile
        Proxy-->>User: Serve Protected Resource
    else Session Expired but Refresh Token Present
        Proxy->>Engine: refreshSession(refresh_token)
        Engine->>DB: Lookup session by sessionId
        alt Token Replay Detected (Out of 2-min Grace Period)
            Engine->>DB: Revoke entire session tree
            Engine-->>Proxy: Replay attack error
            Proxy-->>User: 302 Redirect to /signin
        else Token Valid (Active or 2-min Grace Period)
            Engine->>Engine: Generate new rawSessionToken & rawRefreshToken
            Engine->>DB: Update hashes, previous_refresh_token_hash, & TTL
            Engine-->>Proxy: New session_token & refresh_token
            Proxy->>User: Set-Cookie: new session_token & refresh_token
            Proxy-->>User: Serve Protected Resource
        end
    end
```

Key security mechanisms of the session architecture:
- **Compound Token Structure:** `sessionToken` = `${sessionId}.${randomHex}`. The database only stores `sha256(randomHex)`. Even full database read access does not leak usable session cookies.
- **Timing-Safe Comparison:** All token matching uses `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
- **Refresh Token Rotation & Replay Detection:** Every token refresh revokes the existing refresh token and generates a new pair. If an older refresh token is presented outside a **2-minute grace period** (designed to absorb network retries and race conditions), the entire session family is immediately revoked as a suspected replay attack.
- **Device & Geolocation Fingerprinting:** Sessions capture user-agent, operating system, browser, IP address, and a long-lived device identifier (`clou_device_id`) to alert users to unrecognized logins.

---

## 🌐 OpenID Connect (OIDC) & OAuth 2.0 Server

ClouAuth functions as a certified-compliant Identity Provider exposing standard discovery and endpoint contracts:

### Discovery Document
Available at `/.well-known/openid-configuration`:
- **Issuer:** `https://auth.clouburstlab.com`
- **Supported Response Types:** `code`
- **Supported Grant Types:** `authorization_code`, `refresh_token`, `client_credentials`
- **Signing Algorithm:** `RS256`
- **PKCE Code Challenge:** `S256` (RFC 7636 mandatory for public clients)
- **Token Endpoint Auth Methods:** `client_secret_basic`, `client_secret_post`, `none`

### Asymmetric Key Management (RS256 JWKS)
- ClouAuth manages 2048-bit RSA key pairs dynamically generated via `jose`.
- Private keys sign OIDC ID tokens; public keys are exported as JSON Web Keys (JWK) and published at `/api/sso/v1/jwks.json`.
- Automatic key rotation is supported with zero client downtime by preserving active and valid historical keys in the `SigningKey` table.

---

## 🗄️ Database Architecture (Prisma Multi-File Schema)

The database schema is partitioned into modular Prisma schemas located in `prisma/schema/`:

| Module Schema | Description | Key Models |
| :--- | :--- | :--- |
| `base.prisma` | Generator & SQL Server datasource configuration | Prisma Client generator, SQL Server datasource |
| `user.prisma` | Core user identity, contact points, profile data | `User`, `UserEmail`, `UserPhone`, `Address`, `AccountStatus` |
| `auth.prisma` | Credentials, passwords, passkeys, TOTP, signing keys | `PasswordCredential`, `PasswordHistory`, `RecoveryCode`, `TwoFactor`, `PasskeyCredential`, `TotpMethod`, `OAuthAccount`, `SigningKey` |
| `session.prisma` | User sessions, temporary flow state, token blocklist | `UserSession`, `TempSession`, `RevokedToken` |
| `app.prisma` | Developer OAuth applications & client configurations | `UserApp`, `OAuthClientConfig` |
| `security_activity.prisma` | Audit trail for security events and logins | `SecurityActivity` |
| `audit.prisma` | System-wide administrative audit logs | `AuditLog` |
| `preferences.prisma` | User UI themes, locales, and notification preferences | `UserPreference`, `NotificationPreference` |
| `queue.prisma` | Asynchronous transactional email delivery queue | `EmailQueue` |
| `graveyard.prisma` | Soft-deleted user tombstone records for compliance | `Graveyard` |

---

## 🔗 Inter-Services Bridge & Microservices

ClouAuth powers single sign-on across the entire **clouburstlab** portfolio (including Cloudburst Drive and Workspace):
- **`/api/inter-services/v1/user-session`:** Validates cross-subdomain sessions (`*.clouburstlab.com`) via cookies or machine-to-machine bearer tokens. Supports granular field scoping (`id`, `username`, `email`, `avatar`).
- **`/api/inter-services/v1/connected-drives`:** Securely stores and refreshes upstream OAuth tokens for third-party cloud drives (Google Drive, Microsoft OneDrive, Dropbox) on behalf of internal services.
- **`/api/inter-services/v1/email-queue`:** Decoupled asynchronous email delivery pipeline with exponential backoff and retry tracking.
