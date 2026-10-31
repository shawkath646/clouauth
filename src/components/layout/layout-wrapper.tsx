'use cache';

import { Suspense } from "react";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { Locale } from "@/lib/i18n/config";
import { getEnv } from "@/utils/utils";
import JsonLd from "@/components/json-ld";
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
const gClientId = getEnv("GOOGLE_CLIENT_ID");
const recaptchaSiteKey = getEnv("RECAPTCHA_SITE_KEY");

export default async function LayoutWrapper({ children, locale = "en" }: { children: Readonly<React.ReactNode>; locale?: Locale }) {
    return (
        <html
            lang={locale}
            dir={locale === "ar" ? "rtl" : "ltr"}
            className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
            suppressHydrationWarning
        >
            <body className="min-h-full bg-white text-black dark:bg-black dark:text-white">
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