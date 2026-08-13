# clouburstlab Auth — SEO & Metadata Strategy

> **Domain:** `https://auth.clouburstlab.com`  
> **Brand:** clouburstlab *(strictly lowercase, no "d" in "clou")*  
> **Author:** Shawkat Hossain Maruf &lt;https://shawkath646.dev&gt;

---

## 1. SEO & Performance Audit

### 1.1 Brand Name Is Incorrect Everywhere

**Location:** [`src/app/layout.tsx` L19–L70](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx#L19-L70)

**Issue:** Every metadata string uses `"CloudburstLab"` with capital letters. The brand mandate is **strictly lowercase** `"clouburstlab"` with no "d" in "clou". Search engines, AI crawlers, and Knowledge Graph treat casing as signal — inconsistent casing fragments brand entity recognition.

```
title.default: "CloudburstLab"        ← wrong
title.template: "%s | CloudburstLab"  ← wrong
applicationName: "CloudburstLab Auth" ← wrong
authors: "CloudburstLab Team"         ← wrong
creator / publisher: "CloudburstLab"  ← wrong
openGraph.siteName: "CloudburstLab Auth" ← wrong
```

**Fix:** Replace every occurrence of `"CloudburstLab"` with `"clouburstlab"` across all metadata. The title template should become `"%s | clouburstlab"`.

---

### 1.2 No `robots.txt` File

**Location:** Missing from `public/` and no `src/app/robots.ts` file exists.

**Issue:** Without a `robots.txt`, crawlers have zero guidance on which paths to crawl and which to skip. Protected routes like `/profile/*` and API routes like `/api/*` are being freely crawled, wasting crawl budget and potentially exposing error pages to Google's index.

**Fix:** Create `src/app/robots.ts` using the Next.js App Router convention:

```typescript
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signin", "/signup"],
        disallow: [
          "/profile/",
          "/api/",
          "/.well-known/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

---

### 1.3 No `sitemap.xml`

**Location:** Missing entirely.

**Issue:** Sitemaps are the primary mechanism for search engines to discover and prioritize URLs. Without one, crawlers must rely on link discovery alone. For a single-purpose auth site, a sitemap ensures the homepage, sign-in, and sign-up pages are indexed quickly and correctly.

**Fix:** Create `src/app/sitemap.ts`:

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/signin`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
```

---

### 1.4 Protected Pages (`/profile/*`) Are Indexable

**Location:**  
- [`src/app/profile/layout.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/profile/layout.tsx) — no metadata export  
- [`src/app/profile/page.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/profile/page.tsx) — has `title` only, no `robots`

**Issue:** Neither the profile layout nor any profile sub-page exports `robots: { index: false, follow: false }`. The root layout sets `index: true, follow: true`, which is inherited by all pages including profile. This means Google can potentially index these pages (they'll just see the redirect to `/signin`, but the 302 redirect still consumes crawl budget and creates soft-404 signals).

All 15+ profile sub-routes (`/profile/edit`, `/profile/security`, `/profile/password`, etc.) lack any metadata exports whatsoever.

**Fix:** Add a `metadata` export to `src/app/profile/layout.tsx`:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — My Account | clouburstlab",
    default: "My Account | clouburstlab",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};
```

---

### 1.5 Missing OpenGraph Image File

**Location:** [`src/app/layout.tsx` L46](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx#L46)

**Issue:** The metadata references `/og-image.jpg` but no such file exists in `public/`. The `public/` directory contains only default Next.js SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`). When shared on social media or in AI-generated link previews, the card will have a broken image.

**Fix:** Either:
1. Create an `og-image.jpg` (1200×630px) in the `public/` directory, or  
2. Use the Next.js App Router convention by creating `src/app/opengraph-image.tsx` for a dynamically generated OG image (recommended for consistency).

---

### 1.6 `<head>` Block with Inline Script — Render-Blocking Concern

**Location:** [`src/app/layout.tsx` L93–L107](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx#L93-L107)

**Issue:** The root layout has a manual `<head>` block containing an inline script for theme detection via `dangerouslySetInnerHTML`. While this is a common pattern for avoiding FOUC (Flash of Unstyled Content), two concerns arise:

1. **CSP Violation Risk:** `dangerouslySetInnerHTML` injects an inline script without a nonce. If a Content-Security-Policy header is added later, this script will be blocked.
2. **Minor CWV Impact:** The inline script blocks the initial HTML parse until the `<head>` is fully processed. However, since it's tiny, the real-world impact is negligible.

**Fix (low priority):** Consider moving to the Next.js `Script` component with `strategy="beforeInteractive"`:

```typescript
import Script from "next/script";

// In the <body>, not <head>:
<Script id="theme-init" strategy="beforeInteractive">
  {`try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(_){}`}
</Script>
```

---

### 1.7 Sign-in / Sign-up Pages Reference Incorrect Brand Name

**Location:**  
- [`src/app/(auth)/signin/page.tsx` L8](file:///c:/Users/shawk/Projects/clou-auth/src/app/%28auth%29/signin/page.tsx#L8)  
- [`src/app/(auth)/signup/page.tsx` L8](file:///c:/Users/shawk/Projects/clou-auth/src/app/%28auth%29/signup/page.tsx#L8)

**Issue:** The sign-in page description reads *"Sign in to your CloudburstLab account…"* (wrong casing) and the sign-up description reads *"Join CloudburstLab today."* (wrong casing). Neither page includes OpenGraph or Twitter card overrides, meaning they inherit the root layout's broken OG image reference and generic description.

---

### 1.8 `not-found.tsx` Throws at Build Time If ENV Missing

**Location:** [`src/app/not-found.tsx` L5–L8](file:///c:/Users/shawk/Projects/clou-auth/src/app/not-found.tsx#L5-L8)

**Issue:**
```typescript
const DEV_URL = process.env.NEXT_PUBLIC_DEV_URL as string;
if (!DEV_URL) {
  throw Error("DEV_URL not configured!");
}
```
This runs at module-level, meaning it will throw during `next build` if `NEXT_PUBLIC_DEV_URL` is not set. This is a build-breaking error that can prevent deployment. Additionally, the 404 page has no `metadata` export, so it uses the root layout's default metadata — a 404 page appearing in search results with the title "clouburstlab" and a generic description is confusing.

---

### 1.9 Server-Rendering Architecture Is Correct ✓

**Good News:** The `page.tsx` files for `/signin` and `/signup` are **Server Components** (no `'use client'` directive). The `'use client'` is correctly applied only to the interactive form sub-components (`signin-form.tsx`, `signup-form.tsx`, etc.). This means:
- Crawlers receive fully rendered HTML with headings, labels, links, and semantic structure.
- The interactive portions hydrate on the client without blocking initial crawlability.
- The `<Suspense>` boundary on the sign-in page (L22) is also correct — it provides a fallback for the `useSearchParams()` hook.

No changes needed here.

---

### 1.10 `.well-known/openid-configuration` Is an SEO Asset

**Location:** [`src/app/.well-known/openid-configuration/route.ts`](file:///c:/Users/shawk/Projects/clou-auth/src/app/.well-known/openid-configuration/route.ts)

**Opportunity:** The OIDC discovery endpoint is a machine-readable API — it should NOT be crawled by search engines (adds noise), but it's a powerful signal for AI crawlers (ChatGPT, Perplexity, Google AI Overviews) that understand OIDC. The `robots.txt` should disallow `/.well-known/` for traditional crawlers, but the JSON-LD schema (§4) can reference it to signal OIDC capability.

---

## 2. Root Layout Metadata (Global)

Replace the entire `metadata` and `viewport` exports in [`src/app/layout.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx) with:

```typescript
import type { Metadata, Viewport } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "clouburstlab — Secure Authentication & Identity Provider",
    template: "%s | clouburstlab",
  },

  description:
    "clouburstlab is a centralized authentication platform and OIDC 2.0 / OAuth 2.0 Identity Provider. " +
    "Sign in, manage your account, passkeys, and connected applications — all in one place.",

  applicationName: "clouburstlab auth",
  authors: [
    {
      name: "Shawkat Hossain Maruf",
      url: "https://shawkath646.dev",
    },
  ],
  creator: "Shawkat Hossain Maruf",
  publisher: "clouburstlab",
  generator: "Next.js",

  keywords: [
    "clouburstlab",
    "identity provider",
    "OIDC",
    "OAuth 2.0",
    "OpenID Connect",
    "SSO",
    "single sign-on",
    "authentication",
    "user management",
    "passkeys",
    "two-factor authentication",
    "2FA",
    "IdP",
  ],

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "clouburstlab",
    title: "clouburstlab — Secure Authentication & Identity Provider",
    description:
      "Centralized authentication, user management, and OIDC 2.0 Identity Provider by clouburstlab. " +
      "Manage passkeys, OAuth apps, and account security.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "clouburstlab — Secure Authentication & Identity Provider",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "clouburstlab — Secure Auth & Identity Provider",
    description:
      "OIDC 2.0 and OAuth 2.0 compliant Identity Provider. " +
      "Secure sign-in, passkeys, 2FA, and developer-friendly OAuth application management.",
    creator: "@shawkath646",
    site: "@clouburstlab",
    images: ["/opengraph-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: BASE_URL,
  },

  category: "Technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};
```

### Key Changes from Current:
| Field | Before | After |
|-------|--------|-------|
| `title.default` | `"CloudburstLab"` | `"clouburstlab — Secure Authentication & Identity Provider"` |
| `title.template` | `"%s \| CloudburstLab"` | `"%s \| clouburstlab"` |
| `description` | Generic 10-word blurb | 30-word keyword-rich OIDC/OAuth description |
| `authors` | `"CloudburstLab Team"` | Shawkat Hossain Maruf with URL |
| `keywords` | 5 generic terms | 13 targeted OIDC/IdP terms |
| `openGraph.images` | `/og-image.jpg` (missing) | `/opengraph-image.png` (to be created) |
| `twitter.creator` | `@cloudburstlab` | `@shawkath646` (author's handle) |
| `twitter.site` | *(missing)* | `@clouburstlab` |
| `alternates.canonical` | *(missing)* | Base URL |
| `category` | *(missing)* | `"Technology"` |

---

## 3. Page-Level Metadata (Overrides)

### 3.1 Sign-In Page — `src/app/(auth)/signin/page.tsx`

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your clouburstlab account. Access your dashboard, manage security settings, " +
    "passkeys, and connected OAuth applications with our secure OIDC-compliant login.",
  alternates: {
    canonical: "/signin",
  },
  openGraph: {
    title: "Sign In | clouburstlab",
    description:
      "Securely sign in to clouburstlab — your centralized identity provider. " +
      "Supports passkeys, 2FA, and social login via Google, GitHub, and Microsoft.",
    url: "/signin",
  },
};
```

### 3.2 Sign-Up Page — `src/app/(auth)/signup/page.tsx`

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account",
  description:
    "Create your free clouburstlab account. Get a unified identity for OIDC and OAuth 2.0 " +
    "applications, manage passkeys, and secure your account with two-factor authentication.",
  alternates: {
    canonical: "/signup",
  },
  openGraph: {
    title: "Create an Account | clouburstlab",
    description:
      "Join clouburstlab — create a unified identity for all your applications. " +
      "Free, secure, and OIDC 2.0 compliant.",
    url: "/signup",
  },
};
```

### 3.3 Profile Layout — `src/app/profile/layout.tsx`

Add this metadata export to the profile layout to block all profile routes from indexing:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — My Account | clouburstlab",
    default: "My Account",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  // Strip inherited OG data — no social previews for authenticated pages
  openGraph: null,
  twitter: null,
};
```

### 3.4 Not-Found Page — `src/app/not-found.tsx`

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist or has been moved.",
  robots: {
    index: false,
    follow: true,
  },
};
```

### 3.5 Auth Layout — `src/app/(auth)/layout.tsx` *(optional — route group)*

Since `(auth)` is a route group (parenthesized), it doesn't create a URL segment. Metadata here applies to all auth pages but is overridden by individual page exports. No override is strictly needed, but adding one improves the fallback:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
  },
};
```

---

## 4. JSON-LD Structured Data

### 4.1 Integration Pattern

Next.js App Router supports JSON-LD via a `<script type="application/ld+json">` tag rendered inside a Server Component. The recommended pattern is:

```typescript
// Helper component — src/components/json-ld.tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

### 4.2 Organization + WebSite Schema — Root Layout or Homepage

Place this in `src/app/layout.tsx` inside the `<body>` tag (before `{children}`):

```typescript
import { JsonLd } from "@/components/json-ld";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

// Inside RootLayout's return, before {children}:
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "clouburstlab",
        url: "https://clouburstlab.com",
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/opengraph-image.png`,
          width: 1200,
          height: 630,
        },
        founder: {
          "@type": "Person",
          name: "Shawkat Hossain Maruf",
          url: "https://shawkath646.dev",
        },
        sameAs: [
          "https://github.com/shawkath646",
          "https://shawkath646.dev",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "clouburstlab auth",
        description:
          "Centralized authentication platform and OIDC 2.0 / OAuth 2.0 Identity Provider by clouburstlab.",
        publisher: {
          "@id": `${BASE_URL}/#organization`,
        },
        inLanguage: "en-US",
      },
    ],
  }}
/>
```

### 4.3 SoftwareApplication Schema — Homepage (`src/app/page.tsx`)

Place this in the homepage `page.tsx` (which is excluded from this audit scope but is the ideal location for discoverability). If you prefer it in the root layout, that works too:

```typescript
import { JsonLd } from "@/components/json-ld";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

// Inside the page's return JSX:
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}/#application`,
    name: "clouburstlab auth",
    description:
      "A centralized authentication and user management system that serves as a fully compliant " +
      "OIDC 2.0 and OAuth 2.0 Identity Provider (IdP). Features include passkey-based " +
      "passwordless login, two-factor authentication (2FA), social login (Google, GitHub, Microsoft), " +
      "developer OAuth application management, and account security controls.",
    url: BASE_URL,
    applicationCategory: "SecurityApplication",
    applicationSubCategory: "Identity Provider",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    author: {
      "@type": "Person",
      name: "Shawkat Hossain Maruf",
      url: "https://shawkath646.dev",
    },
    provider: {
      "@id": `${BASE_URL}/#organization`,
    },
    featureList: [
      "OIDC 2.0 / OpenID Connect compliant Identity Provider",
      "OAuth 2.0 Authorization Code Flow with PKCE",
      "Passkey / WebAuthn passwordless authentication",
      "Two-Factor Authentication (2FA) — TOTP, Email, SMS",
      "Social login — Google, GitHub, Microsoft",
      "Developer OAuth application management with client credentials",
      "Session management with refresh token rotation and replay detection",
      "Backup/recovery codes",
      "Account security controls — lockout, disable, connected devices",
      "Internationalization (i18n) support",
    ],
    screenshot: {
      "@type": "ImageObject",
      url: `${BASE_URL}/opengraph-image.png`,
      caption: "clouburstlab auth — sign-in screen",
    },
    softwareVersion: "0.1.0",
    releaseNotes: "Initial release of the clouburstlab identity platform.",
  }}
/>
```

### 4.4 WebPage Schema — Sign-In Page

Place in `src/app/(auth)/signin/page.tsx`:

```typescript
import { JsonLd } from "@/components/json-ld";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

// Inside the SignInPage return JSX, before the I18nProvider:
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}/signin#webpage`,
    name: "Sign In — clouburstlab",
    description:
      "Secure sign-in portal for clouburstlab accounts. " +
      "Supports username/password, passkeys, social login, and two-factor authentication.",
    url: `${BASE_URL}/signin`,
    isPartOf: {
      "@id": `${BASE_URL}/#website`,
    },
    about: {
      "@id": `${BASE_URL}/#application`,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Sign In",
          item: `${BASE_URL}/signin`,
        },
      ],
    },
  }}
/>
```

### 4.5 WebPage Schema — Sign-Up Page

Same pattern as above, placed in `src/app/(auth)/signup/page.tsx`:

```typescript
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}/signup#webpage`,
    name: "Create an Account — clouburstlab",
    description:
      "Create your free clouburstlab account for a unified identity across all OIDC and OAuth 2.0 applications.",
    url: `${BASE_URL}/signup`,
    isPartOf: {
      "@id": `${BASE_URL}/#website`,
    },
    about: {
      "@id": `${BASE_URL}/#application`,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Create Account",
          item: `${BASE_URL}/signup`,
        },
      ],
    },
    potentialAction: {
      "@type": "RegisterAction",
      target: `${BASE_URL}/signup`,
      name: "Create a clouburstlab account",
    },
  }}
/>
```

---

## Summary Checklist

| # | Item | Status | Priority |
|---|------|--------|----------|
| 1 | Fix brand name casing (`CloudburstLab` → `clouburstlab`) everywhere | ❌ Missing | **Critical** |
| 2 | Create `src/app/robots.ts` | ❌ Missing | **High** |
| 3 | Create `src/app/sitemap.ts` | ❌ Missing | **High** |
| 4 | Add `noindex, nofollow` to profile layout | ❌ Missing | **High** |
| 5 | Create OG image (`public/opengraph-image.png`, 1200×630) | ❌ Missing | **High** |
| 6 | Update root layout metadata (keywords, author, descriptions) | ❌ Outdated | **High** |
| 7 | Add JSON-LD Organization + WebSite schema to root layout | ❌ Missing | **Medium** |
| 8 | Add JSON-LD SoftwareApplication schema to homepage | ❌ Missing | **Medium** |
| 9 | Update sign-in / sign-up page metadata with OIDC keywords | ❌ Minimal | **Medium** |
| 10 | Create `src/components/json-ld.tsx` helper | ❌ Missing | **Medium** |
| 11 | Add JSON-LD WebPage + BreadcrumbList to sign-in / sign-up | ❌ Missing | **Low** |
| 12 | Add `metadata` to 404 page with `noindex` | ❌ Missing | **Low** |
| 13 | Fix 404 page build-time crash when `DEV_URL` unset | ❌ Bug | **Low** |
| 14 | Move theme script to Next.js `Script` component | ❌ Minor | **Low** |

---

*End of SEO draft.*
