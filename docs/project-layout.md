# 📁 Project & Codebase Layout

ClouAuth is architected as a modern **Next.js 16 (React 19)** full-stack application using the App Router, TypeScript, Tailwind CSS v4, and Prisma Multi-File Schemas.

Below is an exhaustive breakdown of the project hierarchy, design patterns, and file organization.

---

## 🌳 Directory Tree Overview

```plaintext
clou-auth/
├── .env.local                    # Local environment variables & secrets (untracked)
├── next.config.ts                # Next.js compiler, CSP headers & image domains
├── package.json                  # Dependencies & scripts
├── postcss.config.mjs            # PostCSS configuration with Tailwind v4
├── tsconfig.json                 # TypeScript strict configuration
│
├── docs/                         # Project & architecture documentation
│   ├── architecture.md           # System design & security architecture
│   ├── project-layout.md         # Detailed codebase organization (this file)
│   ├── env-configuration.md      # Complete environment variables guide
│   ├── setup.md                  # Local installation & development guide
│   ├── api.md                    # OIDC & OAuth 2.0 API specifications
│   └── {861A2480-...}.png        # Homepage preview asset
│
├── prisma/                       # Database schema & migrations
│   └── schema/                   # Modular multi-file Prisma schemas
│       ├── base.prisma           # Datasource (SQL Server) & client generator
│       ├── user.prisma           # User identity, emails, phones, addresses
│       ├── auth.prisma           # Passwords, passkeys, TOTP, signing keys
│       ├── session.prisma        # UserSession, TempSession, RevokedToken
│       ├── app.prisma            # Developer OAuth applications & client configs
│       ├── security_activity.prisma # Security event logging & audit records
│       ├── audit.prisma          # System-wide administrative audit logs
│       ├── preferences.prisma    # User preferences & notification toggles
│       ├── queue.prisma          # Asynchronous transactional email queue
│       └── graveyard.prisma      # Tombstone records for soft-deleted accounts
│
├── public/                       # Static public assets, icons, and logos
│
└── src/                          # Application source code
    ├── actions/                  # Server Actions (Mutations & Data Access)
    │   ├── auth/                 # Authentication, credentials, passkeys, 2FA, sudo
    │   ├── oauth/                # Social OAuth flow handlers (Google, GitHub, MS)
    │   └── profile/              # Account settings, sessions, apps, avatar uploads
    │
    ├── app/                      # Next.js App Router (Routes & Route Handlers)
    │   ├── (auth)/               # Progressive auth screens (signin, signup)
    │   ├── .well-known/          # OpenID Connect standard discovery
    │   ├── api/                  # RESTful API endpoints & OAuth Server
    │   │   ├── auth/v1/          # Internal session & profile helpers
    │   │   ├── inter-services/v1/# Ecosystem service bridge (user-session, drives)
    │   │   ├── oauth/callback/   # Upstream social provider redirect callbacks
    │   │   └── sso/v1/           # OIDC / OAuth2 endpoints (jwks, token, userinfo, revoke)
    │   ├── developers/           # Developer OAuth application portal
    │   ├── docs/                 # In-app interactive API & OIDC explorer
    │   ├── p/[username]/         # Public profile viewer
    │   ├── profile/              # User settings & security dashboard
    │   ├── layout.tsx            # Global root layout with theme & font providers
    │   └── page.tsx              # Landing page with interactive feature showcase
    │
    ├── components/               # React UI Components
    │   ├── landing/              # Landing page sections (Hero, Trust, Features)
    │   ├── profile/              # Dashboard components, Sudo modal, Passkey manager
    │   └── ui/                   # Reusable Shadcn / Radix / Base UI design primitives
    │
    ├── constants/                # System-wide constants & session TTL configurations
    ├── lib/                      # Core business logic, services & third-party clients
    │   ├── avatar.ts             # Cloudflare R2 image upload & DiceBear fallback
    │   ├── email.ts              # Email templates & transactional queue processor
    │   ├── encryption.ts         # AES-256-GCM symmetric encryption utilities
    │   ├── i18n/                 # Localization dictionaries and server loaders
    │   ├── inter-services/       # Cross-service authorization guards
    │   ├── prisma.ts             # Global Prisma Client instance
    │   ├── recaptcha/            # Google reCAPTCHA v3 server-side validation
    │   ├── security-activity.ts  # Audit logging helpers
    │   ├── session.ts            # Opaque token management & session rotation engine
    │   └── sso/                  # RSA RS256 key pair management & CORS middleware
    │
    ├── proxy.ts                  # Edge session validation, refresh & i18n proxy
    ├── schema/                   # Zod schemas for validation across client & server
    ├── types/                    # TypeScript interfaces & database entity types
    └── utils/                    # Helper functions, error formatters, cookie options
```

---

## 🧩 Architectural Breakdown of Key Modules

### 1. `src/proxy.ts` (Proxy & Route Guard)
The application proxy runs before requests reach page components or routes:
- **Session Validation:** Inspects `session_token` and validates it against the active database session.
- **Transparent Refresh:** If `session_token` has expired but `refresh_token` is present, it transparently executes a rotation via `refreshSession()`, queues updated cookies onto the response, and injects updated cookies into downstream Server Components.
- **Protected Route Enforcement:** Intercepts unauthenticated navigation to `/profile/*` and issues a redirect with a sanitized `return_to` parameter.
- **i18n Locale Resolution:** Automatically inspects the `Accept-Language` header and persists the resolved language into the `NEXT_LOCALE` cookie.

### 2. `src/lib/session.ts` (Session Engine)
Houses the core session and token lifecycle logic:
- Creates compound cryptographically random tokens (`sessionId.randomHex`).
- Implements SHA-256 token hashing so raw secrets never touch the database.
- Manages **Refresh Token Rotation (RTR)** with replay attack mitigation and a 2-minute concurrent request grace period.
- Performs timing-safe equality comparisons via `crypto.timingSafeEqual`.
- Collects device fingerprinting (`clou_device_id`) and parses user-agent metadata.

### 3. `src/lib/sso/` (OAuth 2.0 & OIDC Server Engine)
Implements the OpenID Connect Identity Provider:
- **`signing-keys.ts`:** Lazily initializes 2048-bit RSA key pairs (`RS256`), stores them in the `SigningKey` table, and exposes public JWK sets via `/api/sso/v1/jwks.json`.
- **`cors.ts`:** Handles cross-origin preflight (`OPTIONS`) and applies permissive yet secure CORS headers (`Access-Control-Allow-Origin: *`) required by OAuth 2.0 token and discovery endpoints.

### 4. `src/actions/auth/` (Server Actions)
Encapsulates sensitive mutations executed securely on the server:
- `auth.actions.ts`: Primary credential verification, email/password validation, session dispatching.
- `passkey.actions.ts`: FIDO2 / WebAuthn registration and authentication challenge creation and assertion verification.
- `totp.actions.ts`: TOTP enrollment with QR code generation, secret encryption, and verification.
- `sudo.actions.ts`: Elevation check that requests fresh authentication before executing privileged settings changes.
- `google-one-tap.actions.ts`: Seamless Google Identity Services One Tap credential verification.

### 5. `src/lib/avatar.ts` (Storage Integration)
- Connects to **Cloudflare R2** (or any AWS S3-compatible object storage) via `@aws-sdk/client-s3`.
- Handles avatar uploads after client-side compression (`browser-image-compression`) and cropping (`react-easy-crop`).
- Provides deterministic SVG avatar fallbacks powered by `@dicebear/core` and `@dicebear/styles`.
