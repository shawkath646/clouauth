# 🛠️ Setup & Development Guide

Follow this guide to configure, run, and build ClouAuth locally or in production.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: `v20.x` or higher (`v22+` / `v24+` recommended)
- **Package Manager**: `npm` (default), `pnpm`, or `yarn`
- **Cloud Persistence**: Firebase / Google Cloud Project with Cloud Firestore and Firebase Storage enabled
- **Git**

---

## 🚀 Step-by-Step Installation

### 1. Clone the Repository
```bash
git clone https://github.com/shawkath646/clouauth.git
cd clouauth
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create `.env.local` in the project root and provide your Firebase credentials, application secrets, and origin settings:

```env
# Origin & Identity Provider URLs
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ClouAuth"
NEXT_PUBLIC_RP_ID="localhost"
NEXT_PUBLIC_DEV_URL="https://shawkath646.dev"

# Master Cryptographic Secrets
JWT_SECRET="your-32-byte-cryptographically-secure-secret"
ENCRYPTION_KEY="your-32-byte-hex-encryption-key"

# Firebase Admin SDK & Cloud Firestore Configuration
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY_ID="your-private-key-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="your-client-id"
FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token"
FIREBASE_AUTH_PROVIDER_X509_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/..."
FIREBASE_UNIVERSE_DOMAIN="googleapis.com"
FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"

# Optional Social OAuth Providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""

# Optional Bot Mitigation & Email
RECAPTCHA_SITE_KEY=""
RECAPTCHA_SECRET_KEY=""
RESEND_API_KEY=""
```
*(For complete variable details and generation helpers, refer to the [Environment Configuration Guide](env-configuration.md)).*

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔑 Testing WebAuthn / Passkeys

WebAuthn requires a secure origin:
- In development, the browser considers `http://localhost:3000` a secure context.
- **Do not** use `http://127.0.0.1:3000` or raw IP addresses, as WebAuthn implementations require a named origin.
- Ensure `NEXT_PUBLIC_RP_ID` matches your active hostname (`localhost` on development, `auth.clouburstlab.com` on production).

---

## 🏗️ Production Build & Verification

To verify that the application compiles, validates Cache Components and Partial Prefetching, and passes TypeScript checking:

```bash
# Type check and build Next.js application
npm run build

# Start the optimized production server
npm run start
```
