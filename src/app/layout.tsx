import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { getEnv } from "@/utils/env";
import JsonLd from "@/components/json-ld";
import { getLocalizedAlternates } from "@/utils/seo";
import "./globals.css";
import GoogleOneTap from "@/components/google-one-tap";
import { ReCaptchaProvider } from "@/lib/recaptcha/client";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gClientId = getEnv("GOOGLE_CLIENT_ID");
  const recaptchaSiteKey = getEnv("RECAPTCHA_SITE_KEY");

  return (
    <html
      lang="en"
      dir="ltr"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <head>
        <JsonLd
          schema={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://clouburstlab.com/#organization",
                name: "clouburstlab",
                url: "https://clouburstlab.com",
                founder: {
                  "@id": "https://shawkath646.dev/#person",
                },
              },
              {
                "@type": "WebSite",
                "@id": `${BASE_URL}/#website`,
                url: BASE_URL,
                name: "ClouAuth",
                description:
                  "Centralized authentication platform and OIDC 2.0 / OAuth 2.0 Identity Provider by clouburstlab.",
                publisher: {
                  "@id": "https://clouburstlab.com/#organization",
                },
                about: {
                  "@id": `${BASE_URL}/#software`,
                },
                inLanguage: "en-US",
              },
              {
                "@type": "SoftwareApplication",
                "@id": `${BASE_URL}/#software`,
                name: "ClouAuth",
                url: BASE_URL,
                description:
                  "Centralized authentication platform and OIDC 2.0 / OAuth 2.0 Identity Provider by clouburstlab.",
                applicationCategory: "SecurityApplication",
                creator: {
                  "@id": "https://clouburstlab.com/#organization",
                },
                sameAs: [
                  "https://github.com/shawkath646/clouauth",
                ],
              },
            ],
          }}
        />
      </head>
      <body className="min-h-full bg-white text-black dark:bg-black dark:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <ReCaptchaProvider siteKey={recaptchaSiteKey}>
            {children}
            <Suspense fallback={null}>
              <GoogleOneTap gClientId={gClientId} />
            </Suspense>
            <Toaster />
          </ReCaptchaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
