import { Suspense } from "react";
import { getEnv } from "@/utils/env.server";
import { resolveLocale, getDictionary, getStaticTranslations } from "@/lib/i18n/server";
import SignUpForm from "@/app/[lang]/(auth)/signup/signup-form";
import { AuthCardSkeleton } from "@/components/profile/profile-skeletons";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";
import { locales } from "@/lib/i18n/config";
import { getLocalizedAlternates } from "@/utils/seo";
import { AUTH_REQUEST_PARAM } from "@/constants/oauth.constants";

export const instant = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const search = await searchParams;
  const hasAuthParams = Boolean(search?.[AUTH_REQUEST_PARAM] || search?.return_to);
  const { t } = await getStaticTranslations("signup", locale);

  const title = t("meta.title");
  const description = t("meta.description");

  return {
    title,
    description,
    alternates: getLocalizedAlternates("/signup", locale),
    robots: hasAuthParams ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${title} — clouburstlab`,
      description,
      url: `/${locale}/signup`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — clouburstlab`,
      description,
    },
  };
}

async function SignUpDynamicContent({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Promise<{ lang: string }>;
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lang }, searchParams] = await Promise.all([
    paramsPromise,
    searchParamsPromise,
  ]);
  const locale = resolveLocale(lang);
  const [signupDict, commonDict, schemaAuthDict] = await Promise.all([
    getDictionary("signup", locale),
    getDictionary("common", locale),
    getDictionary("schema_auth", locale),
  ]);

  const rawAuthRequest = searchParams?.[AUTH_REQUEST_PARAM];
  const authRequest = typeof rawAuthRequest === "string" ? rawAuthRequest : null;

  return (
    <SignUpForm
      authRequest={authRequest}
      locale={locale}
      dict={signupDict}
      commonDict={commonDict}
      schemaDict={schemaAuthDict}
    />
  );
}

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${BASE_URL}/${locale}/signup#webpage`,
          name: "Create an Account — ClouAuth",
          description:
            "Create your free clouburstlab account for a unified identity across all OIDC and OAuth 2.0 applications.",
          url: `${BASE_URL}/${locale}/signup`,
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
                item: `${BASE_URL}/${locale}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Create Account",
                item: `${BASE_URL}/${locale}/signup`,
              },
            ],
          },
          potentialAction: {
            "@type": "RegisterAction",
            target: `${BASE_URL}/${locale}/signup`,
            name: "Create a clouburstlab account",
          },
        }}
      />
      <Suspense fallback={<AuthCardSkeleton />}>
        <SignUpDynamicContent
          paramsPromise={params}
          searchParamsPromise={searchParams}
        />
      </Suspense>
    </>
  );
}
