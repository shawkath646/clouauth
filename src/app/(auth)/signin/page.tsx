import { getEnv } from "@/utils/env";
import { Metadata } from "next";
import { Suspense } from "react";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import JsonLd from "@/components/json-ld";
import SigninClient from "./signin-client";
import { getUserSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import OAuthErrorStep from "./oauth-error-step";

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

const getStringParam = (param: string | string[] | undefined) =>
  typeof param === 'string' ? param : null;

export default async function SignInPage(props: PageProps<'/signin'>) {
  const [searchParams, locale, session] = await Promise.all([
    props.searchParams,
    getLocale(),
    getUserSession(),
  ]);

  const dict = await getDictionary(locale, 'signin');
  const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");

  const clientId = getStringParam(searchParams?.client_id);
  const redirectUri = getStringParam(searchParams?.redirect_uri);
  const responseType = getStringParam(searchParams?.response_type);
  const returnTo = getStringParam(searchParams?.return_to);

  const isOAuthRequest = Boolean(clientId && responseType === 'code');

  let appData: { name: string; icon: string | null } | null = null;

  let oauthError: { title?: string; message: string } | null = null;

  if (isOAuthRequest && clientId) {
    const clientApp = await prisma.oAuthClientConfig.findUnique({
      where: { client_id: clientId },
      include: { app: true },
    });

    if (!clientApp) {
      oauthError = { message: "The requesting application could not be found." };
    } else if (!clientApp.enabled) {
      oauthError = { message: "The requesting application is currently disabled." };
    } else {
      let isValidRedirectUri = false;
      try {
        const allowedUris = typeof clientApp.redirect_uris === 'string'
          ? JSON.parse(clientApp.redirect_uris)
          : clientApp.redirect_uris;

        if (Array.isArray(allowedUris) && allowedUris.includes(redirectUri)) {
          isValidRedirectUri = true;
        }
      } catch {
        // malformed
      }

      if (isValidRedirectUri) {
        appData = {
          name: clientApp.app.name,
          icon: clientApp.app.icon,
        };
      } else {
        oauthError = { message: "The provided redirect URI is invalid or unauthorized for this application." };
      }
    }
  }

  if (session) {
    if (!(isOAuthRequest && (appData || oauthError))) {
      const isSafeRedirect = returnTo?.startsWith('/') && !returnTo.startsWith('//');
      redirect(isSafeRedirect && returnTo ? returnTo : '/profile');
    }
  }

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${BASE_URL}/signin#webpage`,
          name: "Sign In — ClouAuth",
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
              { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
              { "@type": "ListItem", position: 2, name: "Sign In", item: `${BASE_URL}/signin` },
            ],
          },
        }}
      />

      <I18nProvider locale={locale} messages={dict}>
        <Suspense fallback={<div className="flex items-center justify-center min-h-100">Loading...</div>}>
          {isOAuthRequest && oauthError ? (
            <OAuthErrorStep 
              errorTitle={oauthError.title}
              errorMessage={oauthError.message}
            />
          ) : (
            <SigninClient
              initialStep={session && isOAuthRequest && appData ? 'AGREEMENT' : 'CREDENTIALS'}
              appData={appData}
            />
          )}
        </Suspense>
      </I18nProvider>
    </>
  );
}