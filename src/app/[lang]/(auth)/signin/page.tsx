import { getEnv } from "@/utils/utils";
import { Metadata } from "next";
import { Suspense } from "react";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";
import JsonLd from "@/components/json-ld";
import SigninClient from "./signin-client";
import { getUserSession } from "@/lib/session";
import { redirect } from "next/navigation";
import OAuthErrorStep from "./oauth-error-step";
import { VerificationMethod } from "@/types/auth.types";
import { resolveTempSessionStep, type SudoMeta } from "@/actions/auth/verification";
import { getSafeReturnTo } from "@/utils/url";
import { getLocalizedAlternates } from "@/utils/seo";
import { AUTH_REQUEST_PARAM } from "@/constants/oauth.constants";


export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(props: PageProps<'/[lang]/signin'>): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = resolveLocale(lang);

  return {
    title: "Sign In",
    description:
      "Sign in to your clouburstlab account. Access your dashboard, manage security settings, " +
      "passkeys, and connected OAuth applications with our secure OIDC-compliant login.",
    alternates: getLocalizedAlternates("/signin", locale),
    openGraph: {
      title: "Sign In — clouburstlab",
      description:
        "Securely sign in to clouburstlab — your centralized identity provider. " +
        "Supports passkeys, 2FA, and social login via Google, GitHub, and Microsoft.",
      url: `/signin`,
    },
  };
}

const getStringParam = (param: string | string[] | undefined) =>
  typeof param === "string" ? param : null;

const QUERY_ERRORS: Record<string, string> = {
  invalid_state: "Security check failed (invalid state). Please try signing in again.",
  missing_parameters: "Missing required authentication parameters. Please try again.",
  connection_failed: "Failed to connect to the authentication provider. Please try again later.",
};

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

  const [searchParams, session] = await Promise.all([
    searchParamsPromise,
    getUserSession(),
  ]);

  const authRequest = getStringParam(searchParams?.[AUTH_REQUEST_PARAM]);
  const returnTo = getStringParam(searchParams?.return_to);
  const tid = getStringParam(searchParams?.tid);

  let initialStep: "CREDENTIALS" | "METHOD_SELECTION" | "VERIFICATION" | "REENABLE_ACCOUNT" | "SUDO_VERIFICATION" = "CREDENTIALS";
  let initialMethods: VerificationMethod[] = [];
  let initialSudoMeta: SudoMeta | null = null;
  let resolutionError: string | null = null;

  if (tid) {
    const resolution = await resolveTempSessionStep(tid);
    if (!resolution.error && resolution.step) {
      initialStep = resolution.step;
      initialMethods = resolution.methods || [];
      initialSudoMeta = resolution.sudoMeta || null;
    } else if (resolution.error) {
      resolutionError = resolution.error;
    }
  }

  // If user is already authenticated and not currently undergoing sudo step-up re-authentication:
  if (session && initialStep !== "SUDO_VERIFICATION") {
    // If there was a resolution error for a sudo attempt, don't blindly bounce back to the sensitive page (which causes a redirect loop)
    if (!resolutionError) {
      if (authRequest) {
        redirect(`/${locale}/consent?${AUTH_REQUEST_PARAM}=${encodeURIComponent(authRequest)}`);
      } else {
        redirect(getSafeReturnTo(returnTo, locale));
      }
    }
  }

  let serverError: {
    title: string;
    message: string;
    actionText: string;
    actionHref: string;
  } | null = null;

  if (resolutionError) {
    serverError = {
      title: "Verification Expired",
      message: resolutionError,
      actionText: "Return to Profile",
      actionHref: `/${locale}/profile`,
    };
  } else {
    const queryError = getStringParam(searchParams?.error);
    if (queryError) {
      serverError = {
        title: "Sign In Error",
        message: Object.hasOwn(QUERY_ERRORS, queryError)
          ? QUERY_ERRORS[queryError]
          : "Something went wrong while signing in. Please try again.",
        actionText: "Return to Sign In",
        actionHref: `/${locale}/signin`,
      };
    }
  }

  return serverError ? (
    <OAuthErrorStep
      errorTitle={serverError.title}
      errorMessage={serverError.message}
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
      authRequest={authRequest}
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
}: PageProps<'/[lang]/signin'>) {
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
