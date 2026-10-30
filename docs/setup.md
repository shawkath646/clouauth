# 🛠️ Setup & Production Database Guide

Follow this guide to configure, run, and build ClouAuth connected directly to the production database.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: `v20.x` or higher (`v22+` recommended)
- **Package Manager**: `npm` (default), `pnpm`, or `yarn`
- **Database**: Production SQL Database configured via `DATABASE_URL` in `.env.local`
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

### 3. Configure Environment Variables
Configure `.env.local` in the project root with your production `DATABASE_URL` and application secrets:

```env
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ClouAuth"
NEXT_PUBLIC_RP_ID="localhost"
JWT_SECRET="your-32-byte-high-entropy-secret"
DATABASE_URL="sqlserver://cloudburstlab.database.windows.net:1433;database=free-sql-db-9538026;..."
```
*(For complete variable details, refer to the [Environment Configuration Guide](env-configuration.md)).*

### 4. Synchronize Database Schema
Push the multi-file Prisma schemas in `prisma/schema/` directly to your production database:

```bash
npx prisma db push
```

Regenerate the Prisma client types:
```bash
npx prisma generate
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔑 Testing WebAuthn / Passkeys

WebAuthn requires a secure origin:
- In development, the browser considers `http://localhost:3000` a secure context.
- **Do not** use `http://127.0.0.1:3000` or raw IP addresses, as WebAuthn implementations require a named origin.
- Ensure `NEXT_PUBLIC_RP_ID` matches your active hostname (`localhost` on dev, `auth.clouburstlab.com` on prod).

---

## 🏗️ Production Build & Verification

To verify that the application compiles and passes type checking and linting for production:

```bash
# Generate Prisma Client & Build Next.js application
npm run build

# Start the optimized production server
npm run start
```
