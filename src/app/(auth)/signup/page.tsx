import { Suspense } from "react";
import { getEnv } from "@/utils/env";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import SignUpForm from "@/app/(auth)/signup/signup-form";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "Create an Account",
  description:
    "Create your free clouburstlab account. Get a unified identity for OIDC and OAuth 2.0 " +
    "applications, manage passkeys, and secure your account with two-factor authentication.",
  alternates: {
    canonical: "/signup",
  },
  openGraph: {
    title: "Create an Account — clouburstlab",
    description:
      "Join clouburstlab — create a unified identity for all your applications. " +
      "Free, secure, and OIDC 2.0 compliant.",
    url: "/signup",
  },
};

async function SignUpDynamicContent() {
  const locale = await getLocale();
  const dict = await getDictionary(locale, "signup");

  return (
    <I18nProvider locale={locale} messages={dict}>
      <SignUpForm />
    </I18nProvider>
  );
}

export default function SignUpPage() {
  const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${BASE_URL}/signup#webpage`,
          name: "Create an Account — ClouAuth",
          description:
            "Create your free clouburstlab account for a unified identity across all OIDC and OAuth 2.0 applications.",
          url: `${BASE_URL}/signup`,
          isPartOf: {
            "@id": `${BASE_URL}/#website`,
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
      <Suspense
        fallback={
          <div className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col items-center justify-center min-h-[480px] mx-auto animate-pulse">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-48 bg-muted/60 rounded" />
          </div>
        }
      >
        <SignUpDynamicContent />
      </Suspense>
    </>
  );
}
