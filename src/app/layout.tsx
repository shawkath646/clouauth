import type { Metadata, Viewport } from "next";
import { getEnv } from "@/utils/utils";
import { getLocalizedAlternates } from "@/utils/seo";
import "./globals.css";

const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "ClouAuth — Secure Authentication & Identity Provider",
    template: "%s — clouburstlab",
  },

  description:
    "Centralized OIDC & OAuth 2.0 Identity Provider for clouburstlab. Sign in, manage passkeys, 2FA, and connected apps securely in one place.",

  applicationName: "ClouAuth by clouburstlab",
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
    "ClouAuth",
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
    title: "ClouAuth — Secure Authentication & Identity Provider",
    description:
      "Centralized authentication, user management, and OIDC 2.0 Identity Provider for clouburstlab ecosystem. " +
      "Manage passkeys, OAuth apps, and account security.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ClouAuth — Secure Authentication & Identity Provider",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "ClouAuth — Secure Authentication & Identity Provider",
    description:
      "OIDC & OAuth 2.0 Identity Provider for clouburstlab. Secure sign-in, passkeys, 2FA, and developer OAuth app management.",
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

  alternates: getLocalizedAlternates(),

  category: "Technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) { return children; }
