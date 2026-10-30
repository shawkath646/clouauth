# ⚙️ Environment Variables & Configuration Guide

ClouAuth requires specific environment configuration to operate securely across staging and production environments.

Configuration is loaded from `.env.local` or your hosting provider's secret management (e.g. Vercel, Docker, Kubernetes). All local database configurations have been removed in favor of a direct production database connection (`DATABASE_URL`).

---

## 📋 Comprehensive Environment Reference

| Variable Name | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | **Yes** | `https://auth.clouburstlab.com` | Base origin of the ClouAuth app. Used for OIDC issuer, redirection URLs, and CORS. |
| `NEXT_PUBLIC_APP_NAME` | **Yes** | `ClouAuth` | Display name used in emails, UI branding, and WebAuthn RP metadata. |
| `NEXT_PUBLIC_RP_ID` | **Yes** | `auth.clouburstlab.com` | WebAuthn Relying Party ID. Must be the domain or parent registrable domain of your app. |
| `NEXT_PUBLIC_DEV_URL` | No | `https://shawkath646.dev` | Author portfolio/link displayed in footer and metadata. |
| `DATABASE_URL` | **Yes** | `sqlserver://cloudburstlab.database.windows.net:1433;...` | Production database connection string used by the global Prisma singleton pool. |
| `JWT_SECRET` | **Yes** | `[32+ byte high-entropy secret]` | Master HMAC secret for internal tokens and AES-256-GCM symmetric key encryption. |
| `INTERNAL_SERVICE_SECRET` | No | `[32+ byte random secret]` | Dedicated secret for machine-to-machine internal ecosystem calls (`/api/inter-services/v1/*`). |
| `CRON_SECRET` | No | `[32+ byte random secret]` | Bearer secret for authenticating `/api/auth/v1/cleanup-sessions`. |
| `R2_ENDPOINT_URL` | No | `https://<id>.r2.cloudflarestorage.com` | S3-compatible API endpoint for Cloudflare R2 bucket. |
| `R2_PUBLIC_URL` | No | `https://assets.clouburstlab.com` | Public CDN URL for serving uploaded avatars and client application icons. |
| `R2_BUCKET_NAME` | No | `clouburstlab` | Cloudflare R2 bucket name. |
| `R2_ACCESS_KEY_ID` | No | `[R2 Access Key ID]` | S3-compatible API access key ID. |
| `R2_SECRET_ACCESS_KEY` | No | `[R2 Secret Access Key]` | S3-compatible API secret access key. |
| `GOOGLE_CLIENT_ID` | No | `79438...apps.googleusercontent.com` | Google OAuth 2.0 & Google One Tap Client ID. |
| `GOOGLE_CLIENT_SECRET` | No | `GOCSPX-...` | Google OAuth 2.0 Client Secret. |
| `GITHUB_CLIENT_ID` | No | `Ov23li...` | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | No | `2528a...` | GitHub OAuth App Client Secret. |
| `MICROSOFT_TENANT_ID` | No | `common` or `[UUID]` | Microsoft Entra ID (Azure AD) Directory / Tenant ID. |
| `MICROSOFT_CLIENT_ID` | No | `[Application UUID]` | Microsoft Entra ID Application (client) ID. |
| `MICROSOFT_CLIENT_SECRET` | No | `[Secret Value]` | Microsoft Entra ID client secret value. |
| `RECAPTCHA_SITE_KEY` | No | `6LerD9AtAAAA...` | Google reCAPTCHA v3 client site key. |
| `RECAPTCHA_SECRET_KEY` | No | `6LerD9AtAAAA...` | Google reCAPTCHA v3 server verification secret key. |

---

## 🔑 Key Configuration Details

### 1. Generating a Secure `JWT_SECRET`
Generate a cryptographically secure 256-bit secret key using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. WebAuthn Relying Party ID (`NEXT_PUBLIC_RP_ID`)
> [!IMPORTANT]
> The WebAuthn specification strictly requires the `RP_ID` to be the domain or a registrable domain suffix of the current origin:
> - For **local development**: set to `localhost`.
> - For **production** (`https://auth.clouburstlab.com`): set to `auth.clouburstlab.com` or `clouburstlab.com`.

### 3. External Communication Placeholders (`src/lib/email.ts`)
Outbound Email and SMS dispatch routines (`dispatchEmailProvider` and `dispatchSmsProvider` in `src/lib/email.ts`) are implemented as strongly-typed asynchronous placeholders ready for provider SDK integration.
