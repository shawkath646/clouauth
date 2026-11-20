# 📁 Project & Codebase Layout

ClouAuth is architected as a modern **Next.js 16 (React 19)** full-stack application leveraging the App Router, Cache Components, Partial Prefetching (PPR), TypeScript 7, Tailwind CSS v4, and Google Cloud Firestore.

Below is an exhaustive breakdown of the project hierarchy, design patterns, and file organization.

---

## 🌳 Directory Tree Overview

```plaintext
clou-auth/
├── .env.local                    # Local environment variables & secrets (untracked)
├── next.config.ts                # Next.js 16 configuration (cacheComponents, PPR, CSP)
├── package.json                  # Dependencies, scripts, and engine metadata
├── postcss.config.mjs            # PostCSS configuration with Tailwind v4 plugin
├── tsconfig.json                 # TypeScript strict configuration
│
├── docs/                         # Project & architecture documentation
│   ├── architecture.md           # System design & security architecture
│   ├── project-layout.md         # Detailed codebase organization (this file)
│   ├── env-configuration.md      # Complete environment variables guide
│   ├── setup.md                  # Local installation & development guide
│   ├── api.md                    # OIDC & OAuth 2.0 API specifications
│   └── openapi.yaml              # OpenAPI 3.1 machine-readable specification
│
├── public/                       # Static public assets, icons, and logos
│
└── src/                          # Application source code
    ├── actions/                  # Server Actions (Mutations & Data Access)
    │   ├── auth/                 # Authentication, passkeys, 2FA, sudo step-up
    │   ├── oauth/                # Social OAuth handlers (Google, GitHub, Microsoft)
    │   └── profile/              # Account settings, user apps, avatar uploads
    │
    ├── app/                      # Next.js App Router (Routes & Route Handlers)
    │   ├── [lang]/               # Localized UI Routes (en, bn, ko, es, ar, zh)
    │   │   ├── (auth)/           # Progressive auth flows (signin, signup, consent, recovery)
    │   │   ├── developers/       # Developer OAuth application portal
    │   │   ├── docs/             # In-app interactive API & OIDC explorer
    │   │   ├── p/[username]/     # Public profile viewer with dynamic SEO
    │   │   ├── profile/          # User security dashboard, apps, sessions, preferences
    │   │   ├── privacy/          # Localized privacy policy with Google compliance
    │   │   ├── terms/            # Localized terms of service
    │   │   ├── layout.tsx        # Localized layout wrapper with i18n static params
    │   │   └── page.tsx          # Localized landing page with streaming Hero & CTA
    │   ├── .well-known/          # OpenID Connect standard discovery
    │   ├── api/                  # Headless REST APIs & OAuth Server
    │   │   ├── auth/v1/          # Session cleanup and profile helpers
    │   │   ├── inter-services/v1/# Ecosystem service bridge (user-session, drives)
    │   │   └── oauth/            # OIDC endpoints (token, userinfo, jwks, revoke, introspect)
    │   ├── opengraph-image.png   # Edge-rendered Open Graph visual card
    │   ├── robots.ts             # Robots.txt metadata generator
    │   ├── sitemap.ts            # Sitemap.xml multi-locale generator
    │   └── layout.tsx            # Global root layout with theme providers & viewport
    │
    ├── components/               # React UI Components
    │   ├── landing/              # Landing page sections (Hero, Trust, FeatureGrid, Navigation)
    │   ├── layout/               # Global shell, navigation, and localized footer
    │   ├── profile/              # Dashboard components, Sudo modal, Passkey manager
    │   │   └── profile-skeletons.tsx # Pixel-perfect responsive loading skeletons
    │   └── ui/                   # Design primitives (Base UI, Radix UI, Button, Card, Badge)
    │
    ├── constants/                # System constants, OAuth scopes, and session TTLs
    ├── lib/                      # Core business logic, cloud clients & services
    │   ├── firebase.ts           # Google Cloud Firestore & Firebase Storage singleton
    │   ├── session.ts            # Opaque token management & session rotation engine
    │   ├── email.ts              # Transactional email dispatcher (Resend)
    │   ├── encryption.ts         # AES-256-GCM symmetric encryption utilities
    │   ├── i18n/                 # Localization configuration, server loaders, and dictionaries
    │   │   ├── config.ts         # Locales (en, bn, ko, es, ar, zh) and namespaces
    │   │   ├── server.ts         # Cached getDictionary and static getStaticTranslations
    │   │   └── locales/          # 6 language directories with 16 namespace JSONs each
    │   ├── oauth/                # OAuth client lookup, PKCE verification, and tokens
    │   ├── recaptcha/            # Google reCAPTCHA v3 verification
    │   ├── security-activity.ts  # Security event logging
    │   └── sso/                  # RS256 RSA keypair rotation & JWKS caching
    │
    ├── proxy.ts                  # Reverse proxy & middleware (session guard, i18n, CSP)
    ├── schema/                   # Zod validation schemas shared across boundaries
    ├── types/                    # TypeScript interfaces, database entities, and i18n types
    └── utils/                    # Utility functions partitioned by client/server boundary
        ├── utils.ts              # General polymorphic utilities (cn, clsx)
        ├── utils.server.ts       # Server-only utilities
        ├── utils.client.ts       # Client-only DOM & browser utilities
        ├── env.server.ts         # Server-side environment variable getter
        ├── seo.ts                # Canonical & multi-locale hreflang generator
        └── error.ts              # Centralized error handler with Next.js signal passthrough
```

---

## 🧩 Architectural Breakdown of Key Modules

### 1. `src/proxy.ts` (Proxy & Route Guard)
The application proxy runs before requests reach page components or routes:
- **Session Validation:** Inspects `session_token` and validates it against the active Firestore session.
- **Transparent Refresh:** If `session_token` has expired but `refresh_token` is present, it transparently executes a rotation via `refreshSession()`, queues updated cookies onto the response, and injects updated cookies into downstream Server Components.
- **Prefetch Safety:** Bypasses token rotation for prefetch requests to prevent single-use refresh tokens from being consumed during navigation prefetching.
- **Protected Route Enforcement:** Intercepts unauthenticated navigation to `/profile/*` and issues a redirect with a sanitized `return_to` parameter.
- **i18n Locale Resolution:** URL dynamic segment `/[lang]` based routing with SSG support (`generateStaticParams`). Explicit proxy bypass for `/api` and `/.well-known` endpoints.

### 2. `src/lib/session.ts` (Session Engine)
Houses the core session and token lifecycle logic:
- Creates compound cryptographically random tokens (`sessionId.randomHex`).
- Hashes secrets using SHA-256 before storing in Firestore.
- Enforces token rotation with a 2-minute grace period to prevent race-condition invalidations while detecting replay attacks.

### 3. `src/components/profile/profile-skeletons.tsx` (Loading Skeleton Architecture)
Under Next.js 16 Partial Prefetching (PPR), instant navigation shells rely on accurate fallbacks:
- Pixel-perfect, zero-layout-shift skeletons matching the exact geometry, flex layouts, and card dimensions of every dynamic component.
- Skeletons include `ProfileHeaderSkeleton`, `ProfileSidebarSkeleton`, `SectionCardSkeleton`, `PersonalInfoSkeleton`, `SecuritySectionSkeleton`, `ConnectedAccountsSkeleton`, `ApplicationsSkeleton`, `DevicesSkeleton`, `PreferencesSkeleton`, `PrivacySkeleton`, `DangerZoneSkeleton`, `ManagementFormSkeleton`, `PublicProfileCardSkeleton`, `AuthCardSkeleton`, and `ConsentCardSkeleton`.

### 4. `src/utils/seo.ts` (Multi-Locale SEO & Google Compliance)
- Generates canonical URLs and multi-locale `hreflang` alternates (`languages: { en, bn, ko, es, ar, zh, 'x-default' }`) for Google SERP compliance.
- Guarantees self-referencing canonicals on all pages.
- Enforces strict character limits: meta titles (15–40 chars in child pages -> 31–56 chars with template) and meta descriptions (120–160 chars).
