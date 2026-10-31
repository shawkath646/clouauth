import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";
import { getUserSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { parseRedirectUris } from "@/lib/oauth/scope-utils";
import OAuthErrorStep from "../signin/oauth-error-step";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

interface AuthorizePageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const getStringParam = (param: string | string[] | undefined) =>
  typeof param === "string" ? param : null;

async function AuthorizeDynamicContent({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Promise<{ lang: string }>;
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await paramsPromise;
  const locale = resolveLocale(lang);

  await getDictionary("common", locale);

  await connection();

  const [searchParams, session] = await Promise.all([
    searchParamsPromise,
    getUserSession(),
  ]);

  const clientId = getStringParam(searchParams.client_id);
  const redirectUri = getStringParam(searchParams.redirect_uri);
  const responseType = getStringParam(searchParams.response_type);
  const scope = getStringParam(searchParams.scope) || "openid profile email";
  const state = getStringParam(searchParams.state);
  const codeChallenge = getStringParam(searchParams.code_challenge);
  const codeChallengeMethod = getStringParam(searchParams.code_challenge_method);
  const nonce = getStringParam(searchParams.nonce);

  // 1. Mandatory parameter validation
  if (!clientId || !redirectUri) {
    return (
      <OAuthErrorStep
        errorTitle="Invalid Authorization Request"
        errorMessage="Missing required 'client_id' or 'redirect_uri' parameter."
        actionHref={`/${locale}/signin`}
        actionText="Back to Sign In"
      />
    );
  }

  if (responseType !== "code") {
    return (
      <OAuthErrorStep
        errorTitle="Unsupported Response Type"
        errorMessage={`The response_type '${responseType || "unknown"}' is not supported. Only 'code' is supported.`}
        actionHref={`/${locale}/signin`}
        actionText="Back to Sign In"
      />
    );
  }

  // 2. Client verification against database
  const clientApp = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: clientId },
    include: { app: true },
  });

  if (!clientApp || !clientApp.enabled) {
    return (
      <OAuthErrorStep
        errorTitle="Unauthorized Client"
        errorMessage="The requesting client application was not found or is disabled."
        actionHref={`/${locale}/signin`}
        actionText="Back to Sign In"
      />
    );
  }

  const registeredUris = parseRedirectUris(clientApp.redirect_uris);
  if (!registeredUris.includes(redirectUri)) {
    return (
      <OAuthErrorStep
        errorTitle="Invalid Redirect URI"
        errorMessage="The provided redirect_uri is not authorized for this client."
        actionHref={`/${locale}/signin`}
        actionText="Back to Sign In"
      />
    );
  }

  if ((clientApp.pkce_required || clientApp.client_type === "public") && !codeChallenge) {
    return (
      <OAuthErrorStep
        errorTitle="PKCE Required"
        errorMessage="This client requires Proof Key for Code Exchange (PKCE) with code_challenge (S256)."
        actionHref={`/${locale}/signin`}
        actionText="Back to Sign In"
      />
    );
  }

  if (codeChallenge && codeChallengeMethod && codeChallengeMethod !== "S256") {
    return (
      <OAuthErrorStep
        errorTitle="Invalid PKCE Method"
        errorMessage="Only 'S256' code_challenge_method is supported per OAuth 2.0 Security BCP."
        actionHref={`/${locale}/signin`}
        actionText="Back to Sign In"
      />
    );
  }

  // Build the forward query string preserving all OAuth context
  const forwardParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope,
    ...(state ? { state } : {}),
    ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
    ...(codeChallengeMethod ? { code_challenge_method: codeChallengeMethod } : {}),
    ...(nonce ? { nonce } : {}),
  });

  // If user is not authenticated, redirect to signin
  if (!session) {
    redirect(`/${locale}/signin?${forwardParams.toString()}`);
  }

  // If user is authenticated, redirect to consent screen
  redirect(`/${locale}/consent?${forwardParams.toString()}`);
}

export default async function AuthorizePage({
  params,
  searchParams,
}: AuthorizePageProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md p-8 bg-background/70 backdrop-blur-xl border border-primary/20 rounded-3xl flex flex-col items-center justify-center min-h-75 mx-auto animate-pulse">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <div className="h-4 w-32 bg-muted rounded mb-2" />
        </div>
      }
    >
      <AuthorizeDynamicContent
        paramsPromise={params}
        searchParamsPromise={searchParams}
      />
    </Suspense>
  );
}
