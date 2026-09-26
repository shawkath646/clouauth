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
import { VerificationMethod } from "@/types/auth.types";
import { resolveTempSessionStep } from "@/actions/auth/verification";
import { BrandName } from "@/components/ui/brand-name";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your clouburstlab account. Access your dashboard, manage security settings, " +
    "passkeys, and connected OAuth applications with our secure OIDC-compliant login.",
  alternates: {
    canonical: "/signin",
  },
  openGraph: {
    title: "Sign In — clouburstlab",
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
  const tid = getStringParam(searchParams?.tid);

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

  if (session && !tid) {
    if (!(isOAuthRequest && (appData || oauthError))) {
      const isSafeRedirect = returnTo?.startsWith('/') && !returnTo.startsWith('//');
      redirect(isSafeRedirect && returnTo ? returnTo : '/profile');
    }
  }

  let initialStep: 'CREDENTIALS' | 'METHOD_SELECTION' | 'AGREEMENT' | 'REENABLE_ACCOUNT' | 'SUDO_VERIFICATION' = 'CREDENTIALS';
  let initialMethods: VerificationMethod[] = [];
  let initialSudoMeta: import("@/actions/auth/verification").SudoMeta | null = null;

  let serverError: {
    title?: string;
    message: string;
    note?: React.ReactNode;
    actionText?: string;
    actionHref?: string;
  } | null = null;

  if (isOAuthRequest && oauthError) {
    serverError = {
      title: oauthError.title || "Authorization Error",
      message: oauthError.message,
      note: (
        <>
          You can still sign in to your <BrandName className="font-semibold" /> account directly, but you will not be redirected back to the requesting application.
        </>
      ),
      actionText: "Continue to Standard Sign In",
      actionHref: "/signin",
    };
  } else if (session && isOAuthRequest && appData) {
    initialStep = 'AGREEMENT';
  } else if (tid) {
    const resolved = await resolveTempSessionStep(tid);
    if (resolved.step === 'REENABLE_ACCOUNT') {
      initialStep = 'REENABLE_ACCOUNT';
    } else if (resolved.step === 'METHOD_SELECTION') {
      initialStep = 'METHOD_SELECTION';
      initialMethods = resolved.methods;
    } else if (resolved.step === 'SUDO_VERIFICATION') {
      initialStep = 'SUDO_VERIFICATION';
      initialSudoMeta = resolved.sudoMeta || null;
    } else if (resolved.error) {
      serverError = {
        title: "Verification Session Expired",
        message: resolved.error,
        note: "For your security, temporary verification sessions expire quickly and can only be used once. Please sign in again to continue.",
        actionText: "Return to Sign In",
        actionHref: "/signin",
      };
    }
  } else {
    const queryError = getStringParam(searchParams?.error);
    if (queryError) {
      serverError = {
        title: "Sign In Error",
        message:
          queryError === "invalid_state"
            ? "Security check failed (invalid state). Please try signing in again."
            : queryError === "missing_parameters"
            ? "Missing required authentication parameters. Please try again."
            : queryError === "connection_failed"
            ? "Failed to connect to the authentication provider. Please try again later."
            : queryError,
        actionText: "Return to Sign In",
        actionHref: "/signin",
      };
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
        <Suspense
          fallback={
            <div className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col items-center justify-center min-h-[480px] mx-auto animate-pulse">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted/60 rounded" />
            </div>
          }
        >
          {serverError ? (
            <OAuthErrorStep 
              errorTitle={serverError.title}
              errorMessage={serverError.message}
              note={serverError.note}
              actionText={serverError.actionText}
              actionHref={serverError.actionHref}
            />
          ) : (
            <SigninClient
              initialStep={initialStep}
              initialTempSessionId={tid}
              initialMethods={initialMethods}
              sudoMeta={initialSudoMeta}
              appData={appData}
            />
          )}
        </Suspense>
      </I18nProvider>
    </>
  );
}