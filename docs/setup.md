# 🛠️ Local Setup & Development Guide

Follow this guide to set up, run, and develop ClouAuth on your local machine.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: `v20.x` or higher (`v22+` recommended)
- **Package Manager**: `npm` (default), `pnpm`, or `yarn`
- **Database**: **Microsoft SQL Server** (2019, 2022) or **Azure SQL Database**. The quickest local setup is via Docker.
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
> [!NOTE]
> `package.json` includes a `postinstall` hook that automatically executes `prisma generate` to compile the Prisma client into `src/generated/prisma`.

### 3. Spin Up Local Microsoft SQL Server (Docker)
If you don't already have a local SQL Server running, start one instantly using Docker:

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=ClouAuth@2026" \
   -p 1433:1433 --name clou-auth-sql \
   -d mcr.microsoft.com/mssql/server:2022-latest
```

*Create the `ClouAuth` database if needed using `sqlcmd` or Azure Data Studio:*
```bash
docker exec -it clou-auth-sql /opt/mssql-tools18/bin/sqlcmd \
   -S localhost -U sa -P "ClouAuth@2026" -C -Q "CREATE DATABASE ClouAuth;"
```

### 4. Configure Environment Variables
Copy or create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Ensure the following minimal variables are set for local development:
```env
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ClouAuth"
NEXT_PUBLIC_RP_ID="localhost"
JWT_SECRET="c8e6b18991a03ef3542cfb417be1f07f59846b0d91d84877549646bfe3be9851"
DATABASE_URL="sqlserver://localhost:1433;database=ClouAuth;user=sa;password=ClouAuth@2026;encrypt=false;trustServerCertificate=true;"
```
*(For complete variable details, refer to the [Environment Configuration Guide](env-configuration.md)).*

### 5. Synchronize Database Schema
Push the multi-file Prisma schemas in `prisma/schema/` to your database:

```bash
npx prisma db push
```

Regenerate the Prisma client types:
```bash
npx prisma generate
```

### 6. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔑 Testing WebAuthn / Passkeys Locally

WebAuthn requires a secure origin:
- In local development, the browser considers `http://localhost:3000` a secure context.
- **Do not** use `http://127.0.0.1:3000` or raw IP addresses, as WebAuthn implementations require a named origin.
- Ensure `NEXT_PUBLIC_RP_ID="localhost"` in your `.env.local`.
- Use Chrome DevTools > **Application > WebAuthn** tab to create virtual authenticators if your machine lacks a physical biometric sensor (Touch ID / Windows Hello / YubiKey).

---

## 🏗️ Production Build & Verification

To verify that the application compiles and passes type checking and linting for production:

```bash
# Generate Prisma Client & Build Next.js application
npm run build

# Start the optimized production server
npm run start
```

---

## ❓ Troubleshooting

### SQL Server Connection Refused
- Ensure the Docker container or SQL Server service is running and listening on port `1433`.
- Verify `trustServerCertificate=true` is present in your local `DATABASE_URL` if you are using self-signed development certificates.

### WebAuthn RP ID Mismatch
- Error: `The Relying Party ID is not valid for this origin`.
- Solution: Ensure `NEXT_PUBLIC_RP_ID` exactly matches your current hostname (e.g. `localhost` on dev, `auth.clouburstlab.com` on prod).

### Dynamic RSA Signing Keys
- On the first OIDC token issuance, ClouAuth generates a resilient 2048-bit RSA key pair and persists it into the `SigningKey` table. Ensure your database user has table read/write permissions.
