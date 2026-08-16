import { getLocale, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import SignUpForm from "@/app/(auth)/signup/signup-form";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";

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

export default async function SignUpPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale, 'signup');

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://auth.clouburstlab.com";

  return (
    <>
      <JsonLd
        schema={{
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
      <I18nProvider locale={locale} messages={dict}>
      <SignUpForm />
    </I18nProvider>
    </>
  );
}

