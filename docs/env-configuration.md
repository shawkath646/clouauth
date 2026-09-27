# ⚙️ Environment Variables & Configuration Guide

ClouAuth requires specific environment configuration to operate securely across local development, staging, and production environments.

Configuration is loaded from `.env.local` (local overrides) or your hosting provider's secret management (e.g. Vercel, Docker, Kubernetes).

---

## 📋 Comprehensive Environment Reference

| Variable Name | Required | Default / Example (Development) | Production Example | Description |
| :--- | :---: | :--- | :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | **Yes** | `http://localhost:3000` | `https://auth.clouburstlab.com` | Base origin of the ClouAuth app. Used for OIDC issuer, redirection URLs, and CORS. |
| `NEXT_PUBLIC_APP_NAME` | **Yes** | `ClouAuth` | `ClouAuth` | Display name used in emails, UI branding, and WebAuthn RP metadata. |
| `NEXT_PUBLIC_RP_ID` | **Yes** | `localhost` | `auth.clouburstlab.com` | WebAuthn Relying Party ID. Must be the domain or parent registrable domain of your app. |
| `NEXT_PUBLIC_DEV_URL` | No | `https://shawkath646.dev` | `https://shawkath646.dev` | Author portfolio/link displayed in footer and metadata. |
| `API_URL` | No | `http://localhost:3001` | `https://api.clouburstlab.com` | Upstream or auxiliary API service URL. |
| `DATABASE_URL` | **Yes** | `sqlserver://localhost:1433;database=ClouAuth;...` | `sqlserver://prod-server.database.windows.net:1433;...` | Primary Microsoft SQL Server / Azure SQL database connection string. |
| `P_DATABASE_URL` | No | *(optional)* | `sqlserver://...` | Secondary or production database connection string for migration targets. |
| `JWT_SECRET` | **Yes** | `[32+ byte high-entropy secret]` | `[32+ byte high-entropy secret]` | Master HMAC secret for internal tokens and symmetric session protection. |
| `INTERNAL_SERVICE_SECRET` | No | *(optional)* | `[32+ byte random secret]` | Dedicated secret for machine-to-machine internal ecosystem calls. |
| `R2_ENDPOINT_URL` | No | `https://<id>.r2.cloudflarestorage.com` | `https://<id>.r2.cloudflarestorage.com` | S3-compatible API endpoint for Cloudflare R2 bucket. |
| `R2_PUBLIC_URL` | No | `https://assets.clouburstlab.com` | `https://assets.clouburstlab.com` | Public CDN URL for serving uploaded avatars and client application icons. |
| `R2_BUCKET_NAME` | No | `clouburstlab` | `clouburstlab` | Cloudflare R2 bucket name. |
| `R2_ACCESS_KEY_ID` | No | `[R2 Access Key ID]` | `[R2 Access Key ID]` | S3-compatible API access key ID. |
| `R2_SECRET_ACCESS_KEY` | No | `[R2 Secret Access Key]` | `[R2 Secret Access Key]` | S3-compatible API secret access key. |
| `GOOGLE_CLIENT_ID` | No | `79438...apps.googleusercontent.com` | `79438...apps.googleusercontent.com` | Google OAuth 2.0 & Google One Tap Client ID. |
| `GOOGLE_CLIENT_SECRET` | No | `GOCSPX-...` | `GOCSPX-...` | Google OAuth 2.0 Client Secret. |
| `GITHUB_CLIENT_ID` | No | `Ov23li...` | `Ov23li...` | GitHub OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET` | No | `2528a...` | `2528a...` | GitHub OAuth App Client Secret. |
| `MICROSOFT_TENANT_ID` | No | `common` or `[UUID]` | `common` or `[UUID]` | Microsoft Entra ID (Azure AD) Directory / Tenant ID. |
| `MICROSOFT_CLIENT_ID` | No | `[Application UUID]` | `[Application UUID]` | Microsoft Entra ID Application (client) ID. |
| `MICROSOFT_CLIENT_SECRET` | No | `[Secret Value]` | `[Secret Value]` | Microsoft Entra ID client secret value. |
| `RECAPTCHA_SITE_KEY` | No | `6LerD9AtAAAA...` | `6LerD9AtAAAA...` | Google reCAPTCHA v3 client site key. |
| `RECAPTCHA_SECRET_KEY` | No | `6LerD9AtAAAA...` | `6LerD9AtAAAA...` | Google reCAPTCHA v3 server verification secret key. |

---

## 🔑 Key Configuration Details

### 1. Generating a Secure `JWT_SECRET`
You can generate a cryptographically secure 256-bit secret key using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. WebAuthn Relying Party ID (`NEXT_PUBLIC_RP_ID`)
> [!IMPORTANT]
> The WebAuthn specification strictly requires the `RP_ID` to be the domain or a registrable domain suffix of the current origin:
> - For **local development**: set to `localhost`.
> - For **production** (`https://auth.clouburstlab.com`): set to `auth.clouburstlab.com` or `clouburstlab.com`.
> Passkey registration and login **will fail** if the `RP_ID` does not match the active browser domain.

### 3. Database Connection (`DATABASE_URL`)
ClouAuth uses **Microsoft SQL Server / Azure SQL Database** via `@prisma/adapter-mssql` and the Prisma ORM.

Local Docker connection string format:
```env
DATABASE_URL="sqlserver://localhost:1433;database=ClouAuth;user=sa;password=YourStrongPassword123!;encrypt=false;trustServerCertificate=true;"
```

Azure SQL connection string format:
```env
DATABASE_URL="sqlserver://<server-name>.database.windows.net:1433;database=<db-name>;user=<username>;password=<password>;encrypt=true;trustServerCertificate=false;"
```

### 4. Cloudflare R2 / Object Storage Setup
To enable avatar uploads and app icon hosting:
1. In Cloudflare Dashboard, navigate to **R2 > Create Bucket** (`clouburstlab`).
2. Create an **API Token** with `Object Read & Write` permissions.
3. Configure custom domain or public bucket access (e.g. `https://assets.clouburstlab.com`).
4. Set `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`.
*(Note: If R2 is not configured, avatar generation falls back automatically to DiceBear SVGs).*

---

## 📄 Example `.env.local` File

```env
# Application URLs & Metadata
API_URL="http://localhost:3001"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_DEV_URL="https://shawkath646.dev"
NEXT_PUBLIC_APP_NAME="ClouAuth"
NEXT_PUBLIC_RP_ID="localhost"

# Cryptographic Master Secret
JWT_SECRET="your-32-byte-base64-or-hex-secret-key"

# Microsoft SQL Server Database
DATABASE_URL="sqlserver://localhost:1433;database=ClouAuth;user=sa;password=YourPassword@2026;encrypt=false;trustServerCertificate=true;"

# Cloudflare R2 Object Storage (Optional for avatars)
R2_ENDPOINT_URL="https://your-account-id.r2.cloudflarestorage.com"
R2_PUBLIC_URL="https://assets.clouburstlab.com"
R2_BUCKET_NAME="clouburstlab"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"

# Social Authentication: Google OAuth 2.0 & One Tap
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Social Authentication: GitHub OAuth App
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Social Authentication: Microsoft Entra ID
MICROSOFT_TENANT_ID="common"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# Bot Protection: Google reCAPTCHA v3
RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
RECAPTCHA_SECRET_KEY="your-recaptcha-secret-key"
```
