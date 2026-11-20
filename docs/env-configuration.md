# ⚙️ Environment Variables & Configuration Guide

ClouAuth requires specific environment configuration to operate securely across staging and production environments.

Configuration is loaded from `.env.local` or your hosting provider's secret management (e.g. Vercel, Docker, Kubernetes). The persistence layer connects directly to Google Cloud Firestore and Firebase Storage.

---

## 📋 Comprehensive Environment Reference

| Variable Name | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | **Yes** | `https://auth.clouburstlab.com` | Base origin of the ClouAuth app. Used for OIDC issuer, redirection URLs, and CORS. |
| `NEXT_PUBLIC_APP_NAME` | **Yes** | `ClouAuth` | Display name used in emails, UI branding, and WebAuthn RP metadata. |
| `NEXT_PUBLIC_RP_ID` | **Yes** | `auth.clouburstlab.com` | WebAuthn Relying Party ID. Must be the domain or parent registrable domain of your app. |
| `NEXT_PUBLIC_DEV_URL` | No | `https://shawkath646.dev` | Author portfolio/link displayed in footer and metadata. |
| `JWT_SECRET` | **Yes** | `[32+ byte high-entropy secret]` | Master HMAC secret for session verification and token signing. |
| `ENCRYPTION_KEY` | **Yes** | `[32+ byte random hex secret]` | Symmetric key used to encrypt TOTP secrets and sensitive tokens. |
| `INTERNAL_SERVICE_SECRET` | No | `[32+ byte random secret]` | Dedicated secret for machine-to-machine internal ecosystem calls (`/api/inter-services/v1/*`). |
| `CRON_SECRET` | No | `[32+ byte random secret]` | Bearer secret for authenticating `/api/auth/v1/cleanup-sessions`. |
| `COOKIE_DOMAIN` | No | `.clouburstlab.com` | Scope session cookies across parent and subdomains for unified ecosystem SSO. |
| `FIREBASE_PROJECT_ID` | **Yes** | `clou-auth-prod` | Firebase / Google Cloud project identifier. |
| `FIREBASE_PRIVATE_KEY_ID` | **Yes** | `4b18...` | Service account private key identifier. |
| `FIREBASE_PRIVATE_KEY` | **Yes** | `-----BEGIN PRIVATE KEY-----\n...` | Service account RSA private key (newlines escaped as `\n`). |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | `firebase-adminsdk-...@...iam.gserviceaccount.com` | Service account client email address. |
| `FIREBASE_CLIENT_ID` | **Yes** | `118...` | Service account numerical client identifier. |
| `FIREBASE_AUTH_URI` | **Yes** | `https://accounts.google.com/o/oauth2/auth` | Google OAuth 2.0 authorization endpoint URI. |
| `FIREBASE_TOKEN_URI` | **Yes** | `https://oauth2.googleapis.com/token` | Google OAuth 2.0 token endpoint URI. |
| `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`| **Yes** | `https://www.googleapis.com/oauth2/v1/certs` | Google OAuth public certificates URL. |
| `FIREBASE_CLIENT_X509_CERT_URL` | **Yes** | `https://www.googleapis.com/robot/v1/metadata/x509/...` | Service account public x509 certificate URL. |
| `FIREBASE_UNIVERSE_DOMAIN` | **Yes** | `googleapis.com` | Google Cloud universe domain. |
| `FIREBASE_STORAGE_BUCKET` | **Yes** | `clou-auth-prod.firebasestorage.app` | Cloud Storage bucket name for custom user avatars and developer icons. |
| `GOOGLE_CLIENT_ID` | No | `79438...apps.googleusercontent.com` | Google OAuth 2.0 & Google One Tap Client ID. |
| `GOOGLE_CLIENT_SECRET` | No | `GOCSPX-...` | Google OAuth 2.0 Client Secret. |
| `GITHUB_CLIENT_ID` | No | `Ov23li...` | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | No | `2528a...` | GitHub OAuth App Client Secret. |
| `MICROSOFT_TENANT_ID` | No | `common` or `[UUID]` | Microsoft Entra ID Directory / Tenant ID. |
| `MICROSOFT_CLIENT_ID` | No | `[Application UUID]` | Microsoft Entra ID Application (client) ID. |
| `MICROSOFT_CLIENT_SECRET` | No | `[Secret Value]` | Microsoft Entra ID client secret value. |
| `DROPBOX_CLIENT_ID` | No | `[App Key]` | Dropbox developer application key for connected cloud storage. |
| `DROPBOX_CLIENT_SECRET` | No | `[App Secret]` | Dropbox developer application secret. |
| `RECAPTCHA_SITE_KEY` | No | `6LerD9AtAAAA...` | Google reCAPTCHA v3 client site key. |
| `RECAPTCHA_SECRET_KEY` | No | `6LerD9AtAAAA...` | Google reCAPTCHA v3 server verification secret key. |
| `RESEND_API_KEY` | No | `re_...` | Resend API key for transactional email delivery. |
| `EMAIL_FROM_ADDRESS` | No | `ClouAuth <auth@clouburstlab.com>` | Verified sender address for transactional authentication emails. |

---

## 🔑 Key Configuration Details

### 1. Generating Cryptographic Secrets
Generate a cryptographically secure 256-bit secret key using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. WebAuthn Relying Party ID (`NEXT_PUBLIC_RP_ID`)
> [!IMPORTANT]
> The WebAuthn specification strictly requires the `RP_ID` to be the domain or a registrable domain suffix of the current origin:
> - For **local development**: set to `localhost`.
> - For **production** (`https://auth.clouburstlab.com`): set to `auth.clouburstlab.com` or `clouburstlab.com`.
> - Raw IP addresses (e.g. `127.0.0.1`) are invalid WebAuthn Relying Party IDs.

### 3. Firebase Private Key Formatting
In `.env.local`, ensure line breaks in `FIREBASE_PRIVATE_KEY` are represented by `\n`:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```
The application automatically normalizes `\n` escape sequences into true line breaks during initialization in `src/lib/firebase.ts`.
