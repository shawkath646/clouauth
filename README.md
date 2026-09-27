<!-- HEADER SECTION -->
<div align="center">

# ClouAuth

**Centralized, enterprise-grade OIDC 1.0 & OAuth 2.0 Identity Provider with Passkeys, Multi-Factor Authentication, and zero-trust session management for the clouburstlab ecosystem.**

<!-- BADGES -->
[![Platform](https://img.shields.io/badge/Platform-Full--Stack%20Web%20%7C%20Identity%20Provider-0A66C2?style=flat-square)](#)
[![Author](https://img.shields.io/badge/Author-Shawkat%20Hossain%20Maruf-black?style=flat-square)](https://shawkath646.dev)
[![Ecosystem](https://img.shields.io/badge/Ecosystem-clouburstlab-2563EB?style=flat-square)](https://clouburstlab.com)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square)](#-license)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-auth.clouburstlab.com-10B981?style=flat-square)](https://auth.clouburstlab.com/)

</div>

---

### 📋 Project Overview

| Property | Details |
| :--- | :--- |
| **Author** | [Shawkat Hossain Maruf](https://shawkath646.dev) |
| **Platform** | Full-Stack Web & Identity Provider (IdP) |
| **Period / Timeline** | 2026 – Present |
| **Status** | Production Ready / Active Development |
| **Primary Stack** | Next.js 16 (React 19), TypeScript, Tailwind CSS v4, Prisma, SQL Server |
| **Live URL** | [ClouAuth — Secure Authentication & Identity Provider](https://auth.clouburstlab.com/) |

---

<!-- UI / DEMO SECTION -->
## 📱 Preview & Demo

<div align="center">
  <a href="https://auth.clouburstlab.com/" target="_blank" rel="noopener noreferrer">
    <img src="docs/{861A2480-8A69-4040-88E9-B378F954BD1C}.png" alt="ClouAuth Homepage Preview" width="90%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
  </a>
  <p><em>Experience the live identity platform at <a href="https://auth.clouburstlab.com/">auth.clouburstlab.com</a></em></p>
</div>

---

## 🎯 Purpose & Problem Statement

### Why It Exists
Modern web platforms demand unified authentication, seamless Single Sign-On (SSO), and zero-trust security without locking users into expensive proprietary identity silos. **ClouAuth** was engineered as the central identity fabric for the **clouburstlab** digital ecosystem, unifying user authentication across apps, providing compliant OpenID Connect and OAuth 2.0 authorization services for developer applications, and giving users complete control over their security posture.

### What It Solves
- **Credential Stuffing & Phishing Vulnerabilities:** Implements native FIDO2/WebAuthn Passkey authentication and RFC 6238 TOTP authenticator app support, eliminating the risks inherent in static passwords.
- **Session Hijacking & Token Replay:** Employs an opaque compound token model (`sessionId.secret`) with SHA-256 server-side hashing and automatic Refresh Token Rotation (RTR) with a 2-minute concurrent grace period to detect and instantly revoke replayed token families.
- **Fragmented User Identity Across Microservices:** Delivers an OpenID Connect (OIDC 1.0) provider with discovery (`/.well-known/openid-configuration`), RS256 cryptographic signing keys published over JWKS, and unified inter-service token verification.
- **Unverified Sensitive Modifications:** Introduces **Sudo Mode** (step-up authentication) requiring fresh biometric or password verification before allowing changes to credentials, developer API secrets, or account deletion.

---

## 💡 Key Insights & Architecture

ClouAuth is built on Next.js 16 with Server Actions, Edge proxying, and a modular Microsoft SQL Server database schema managed through Prisma:

```mermaid
flowchart LR
    Client["Client / Relying Party\n(Browser / SPA / Mobile)"] 
    Proxy["ClouAuth Proxy\n(src/proxy.ts)"]
    AuthCore["Auth & Session Engine\n(Passkeys / TOTP / Sudo)"]
    SSO["OIDC / OAuth 2.0 Server\n(Token, JWKS, UserInfo)"]
    DB[("SQL Server\n(Prisma Multi-Schema)")]
    R2[("Cloudflare R2\nObject Storage")]

    Client -->|Protected Request| Proxy
    Client -->|OIDC / OAuth 2.0 Flow| SSO
    Proxy -->|Session Validation & Refresh| AuthCore
    AuthCore --> DB
    AuthCore --> R2
    SSO --> DB
```

- **Standards-Compliant OIDC & OAuth 2.0:** Supports Authorization Code Grant with Proof Key for Code Exchange (PKCE S256), Refresh Token Grant, Client Credentials Grant, and RFC 7009 Token Revocation.
- **Dynamic Asymmetric Key Management:** Automatically provisions 2048-bit RSA key pairs (`RS256`), signs ID tokens, and serves active public keys dynamically at `/api/sso/v1/jwks.json`.
- **Ecosystem Inter-Services Bridge:** Exposes protected inter-service endpoints (`/api/inter-services/v1/`) for cross-subdomain session verification, encrypted cloud storage drive integrations, and queued transactional email delivery.
- **Multi-Factor Verification:** Passkeys (WebAuthn), TOTP (Google Authenticator / Authy), SMS/Email OTP with brute-force lockout, and hashed emergency backup codes.

---

## 🛠️ Tech Stack & Dependencies

- **Languages:** TypeScript (Strict mode)
- **Framework & Runtime:** Next.js 16.3 (App Router, Server Actions, React Compiler), React 19, Node.js 20+
- **Styling & UI:** Tailwind CSS v4, Lucide React, Framer Motion, Radix UI Primitives, Base UI, Sonner
- **Authentication & Security:** SimpleWebAuthn (FIDO2 / Passkeys), Jose (JWT / JWK / RS256), OTPLib (TOTP RFC 6238), Bcrypt.js, Google reCAPTCHA v3
- **Database & ORM:** Prisma 7 (Multi-File Schemas), Microsoft SQL Server / Azure SQL Database (`@prisma/adapter-mssql`)
- **Cloud & Object Storage:** Cloudflare R2 / AWS S3 SDK (`@aws-sdk/client-s3`), DiceBear Avatars
- **Internationalization (i18n):** Cookie-persisted locale detection with server-side dictionary rendering

---

## 🚀 Getting Started

### Prerequisites
Ensure the following tools are installed locally:
- **Node.js:** `>= 20.x` (`v22+` recommended)
- **Package Manager:** `npm` (default), `pnpm`, or `yarn`
- **Database:** Microsoft SQL Server 2019+ or Docker

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/shawkath646/clouauth.git
cd clouauth

# Install dependencies (automatically runs prisma generate)
npm install
```

### 2. Environment Configuration
Create a `.env.local` file from the sample configuration:

```bash
cp .env.example .env.local
```

Define the minimal required variables:
```env
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ClouAuth"
NEXT_PUBLIC_RP_ID="localhost"
JWT_SECRET="generate-a-secure-32-byte-secret-key"
DATABASE_URL="sqlserver://localhost:1433;database=ClouAuth;user=sa;password=YourPassword@2026;encrypt=false;trustServerCertificate=true;"
```
*(For complete variable reference, see the [Environment Configuration Guide](docs/env-configuration.md)).*

### 3. Database Sync & Running

```bash
# Push Prisma multi-file schemas to your database
npx prisma db push

# Start development server
npm run dev

# Build and start production bundle
npm run build && npm run start
```

Open [http://localhost:3000](http://localhost:3000) to view ClouAuth locally.

---

## 📚 Deep-Dive Documentation

For detailed blueprints, architectural contracts, and endpoint specifications:

- [🏛️ System Architecture & Security Model](docs/architecture.md)
- [📁 Project & Codebase Layout](docs/project-layout.md)
- [⚙️ Environment Configuration Reference](docs/env-configuration.md)
- [🛠️ Local Setup & Development Guide](docs/setup.md)
- [📡 API Reference & OIDC Specifications](docs/api.md)

---

## 🤝 Contributing & Support

Contributions, feedback, and security disclosures are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

For bug reports or feature requests, visit the [Issue Tracker](https://github.com/shawkath646/clouauth/issues).

---

## 📄 License

Distributed under the [All Rights Reserved License](LICENSE). See `LICENSE` for full terms, conditions, and copyright details.

---

<!-- BRANDING FOOTER -->
<div align="center">
  <sub>Engineered by</sub><br/>
  <strong><a href="https://shawkath646.dev">Shawkat Hossain Maruf</a></strong>
  <br/><br/>
  <sub>A product of</sub><br/>
  <a href="https://clouburstlab.com" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://assets.clouburstlab.com/branding/icon_dark.png">
      <source media="(prefers-color-scheme: light)" srcset="https://assets.clouburstlab.com/branding/icon_light.png">
      <img alt="clouburstlab" src="https://assets.clouburstlab.com/branding/icon_light.png" width="230">
    </picture>
  </a>
</div>
