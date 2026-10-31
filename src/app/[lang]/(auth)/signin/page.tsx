import { getEnv } from "@/utils/utils";
import { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";
import JsonLd from "@/components/json-ld";
import SigninClient from "./signin-client";
import { getUserSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import OAuthErrorStep from "./oauth-error-step";
import { VerificationMethod } from "@/types/auth.types";
import { resolveTempSessionStep } from "@/actions/auth/verification";
import { BrandName } from "@/components/ui/brand-name";
import { parseRedirectUris } from "@/lib/oauth/scope-utils";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

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
  typeof param === "string" ? param : null;

async function SignInDynamicContent({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Promise<{ lang: string }>;
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await paramsPromise;
  const locale = resolveLocale(params?.lang);

  const [dict, commonDict, schemaAuthDict] = await Promise.all([
    getDictionary("signin", locale),
    getDictionary("common", locale),
    getDictionary("schema_auth", locale),
  ]);

  await connection();

  const [searchParams, session] = await Promise.all([
    searchParamsPromise,
    getUserSession(),
  ]);

  const clientId = getStringParam(searchParams?.client_id);
  const redirectUri = getStringParam(searchParams?.redirect_uri);
  const responseType = getStringParam(searchParams?.response_type);
  const returnTo = getStringParam(searchParams?.return_to);
  const tid = getStringParam(searchParams?.tid);

  const isOAuthRequest = Boolean(clientId && responseType === "code");

  let appData: { name: string; icon: string | null } | null = null;
  let oauthError: { title?: string; message: string } | null = null;

  if (isOAuthRequest && clientId) {
    const clientApp = await prisma.oAuthClientConfig.findUnique({
      where: { client_id: clientId },
      include: { app: true },
    });

    if (!clientApp) {
      oauthError = { message: "The requesting application could not be found." };
    } else if (redirectUri) {
      const registeredUris = parseRedirectUris(clientApp.redirect_uris);
      if (!registeredUris.includes(redirectUri)) {
        oauthError = {
          message: "The provided redirect URI is not authorized for this application.",
        };
      } else {
        appData = {
          name: clientApp.app.name,
          icon: clientApp.app.icon,
        };
      }
    }
  }

  // Pre-resolve initial step for instant rendering without client-side waterfalls
  let initialStep: "CREDENTIALS" | "METHOD_SELECTION" | "VERIFICATION" | "AGREEMENT" | "REENABLE_ACCOUNT" | "SUDO_VERIFICATION" = "CREDENTIALS";
  let initialMethods: VerificationMethod[] = [];
  let initialSudoMeta: import("@/actions/auth/verification").SudoMeta | null = null;

  if (tid) {
    const resolution = await resolveTempSessionStep(tid);
    if (!resolution.error && resolution.step) {
      initialStep = resolution.step;
      initialMethods = resolution.methods || [];
      initialSudoMeta = resolution.sudoMeta || null;
    }
  } else if (session && isOAuthRequest && !oauthError) {
    const forwardParams = new URLSearchParams({
      client_id: clientId || "",
      redirect_uri: redirectUri || "",
      response_type: responseType || "code",
      ...(getStringParam(searchParams?.scope) ? { scope: getStringParam(searchParams?.scope)! } : {}),
      ...(getStringParam(searchParams?.state) ? { state: getStringParam(searchParams?.state)! } : {}),
      ...(getStringParam(searchParams?.code_challenge) ? { code_challenge: getStringParam(searchParams?.code_challenge)! } : {}),
      ...(getStringParam(searchParams?.code_challenge_method) ? { code_challenge_method: getStringParam(searchParams?.code_challenge_method)! } : {}),
      ...(getStringParam(searchParams?.nonce) ? { nonce: getStringParam(searchParams?.nonce)! } : {}),
    });
    redirect(`/${locale}/consent?${forwardParams.toString()}`);
  } else if (session && !isOAuthRequest) {
    redirect(returnTo || `/${locale}/profile`);
  }

  let serverError: {
    title: string;
    message: string;
    note?: React.ReactNode;
    actionText: string;
    actionHref: string;
  } | null = null;

  if (oauthError) {
    if (redirectUri) {
      serverError = {
        title: "Unauthorized Application",
        message: oauthError.message,
        note: (
          <span>
            Contact the application developer or return to{" "}
            <BrandName className="text-primary font-semibold" />.
          </span>
        ),
        actionText: "Return to Sign In",
        actionHref: `/${locale}/signin`,
      };
    } else {
      serverError = {
        title: "Invalid Authorization Request",
        message: "Missing required redirect_uri parameter.",
        note: (
          <span>
            Please check the link provided by the application and try again.
          </span>
        ),
        actionText: "Return to Sign In",
        actionHref: `/${locale}/signin`,
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
        actionHref: `/${locale}/signin`,
      };
    }
  }

  return serverError ? (
    <OAuthErrorStep
      errorTitle={serverError.title}
      errorMessage={serverError.message}
      note={serverError.note}
      actionText={serverError.actionText}
      actionHref={serverError.actionHref}
    />
  ) : (
    <SigninClient
      key={tid || initialStep}
      initialStep={initialStep}
      initialTempSessionId={tid}
      initialMethods={initialMethods}
      sudoMeta={initialSudoMeta}
      appData={appData}
      locale={locale}
      dict={dict}
      commonDict={commonDict}
      schemaDict={schemaAuthDict}
    />
  );
}

export default async function SignInPage({
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
          "@id": `${BASE_URL}/${locale}/signin#webpage`,
          name: "Sign In — ClouAuth",
          description:
            "Secure sign-in portal for clouburstlab accounts. " +
            "Supports username/password, passkeys, social login, and two-factor authentication.",
          url: `${BASE_URL}/${locale}/signin`,
          isPartOf: {
            "@id": `${BASE_URL}/#website`,
          },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/${locale}` },
              {
                "@type": "ListItem",
                position: 2,
                name: "Sign In",
                item: `${BASE_URL}/${locale}/signin`,
              },
            ],
          },
        }}
      />

      <Suspense
        fallback={
          <div className="w-full max-w-md p-5 sm:p-8 md:p-10 bg-background/70 dark:bg-card/40 backdrop-blur-xl border border-primary/20 dark:border-primary/10 shadow-2xl rounded-3xl flex flex-col items-center justify-center min-h-120 mx-auto animate-pulse">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-48 bg-muted/60 rounded" />
          </div>
        }
      >
        <SignInDynamicContent
          paramsPromise={params}
          searchParamsPromise={searchParams}
        />
      </Suspense>
    </>
  );
}
