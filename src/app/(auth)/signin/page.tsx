import { getLocale, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import SignInForm from "@/app/(auth)/signin/signin-form";
import { Metadata } from "next";

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

import { Suspense } from "react";
import JsonLd from "@/components/json-ld";

export default async function SignInPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale, 'signin');

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

  return (
    <>
      <JsonLd
        schema={{
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
      <I18nProvider locale={locale} messages={dict}>
        <Suspense fallback={<div className="flex items-center justify-center min-h-100">Loading...</div>}>
          <SignInForm />
        </Suspense>
      </I18nProvider>
    </>
  );
}

