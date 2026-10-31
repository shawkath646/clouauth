import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";
import { getUserSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { parseRedirectUris } from "@/lib/oauth/scope-utils";
import OAuthErrorStep from "../signin/oauth-error-step";
import { ConsentClient } from "./consent-client";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

interface ConsentPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const getStringParam = (param: string | string[] | undefined) =>
  typeof param === "string" ? param : null;

async function ConsentDynamicContent({
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

  const forwardParams = new URLSearchParams({
    ...(clientId ? { client_id: clientId } : {}),
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    ...(responseType ? { response_type: responseType } : {}),
    scope,
    ...(state ? { state } : {}),
    ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
    ...(codeChallengeMethod ? { code_challenge_method: codeChallengeMethod } : {}),
    ...(nonce ? { nonce } : {}),
  });

  // If user is not authenticated, bounce to signin with all context preserved
  if (!session) {
    redirect(`/${locale}/signin?${forwardParams.toString()}`);
  }

  // Validate required client & redirect_uri
  if (!clientId || !redirectUri) {
    return (
      <OAuthErrorStep
        errorTitle="Invalid Consent Request"
        errorMessage="Missing required 'client_id' or 'redirect_uri' parameter."
        actionHref={`/${locale}/profile`}
        actionText="Back to Profile"
      />
    );
  }

  const clientApp = await prisma.oAuthClientConfig.findUnique({
    where: { client_id: clientId },
    include: { app: true },
  });

  if (!clientApp || !clientApp.enabled) {
    return (
      <OAuthErrorStep
        errorTitle="Unauthorized Client"
        errorMessage="The application requesting authorization could not be found or has been disabled."
        actionHref={`/${locale}/profile`}
        actionText="Back to Profile"
      />
    );
  }

  const registeredUris = parseRedirectUris(clientApp.redirect_uris);
  if (!registeredUris.includes(redirectUri)) {
    return (
      <OAuthErrorStep
        errorTitle="Invalid Redirect URI"
        errorMessage="The redirect URI provided is not registered for this application."
        actionHref={`/${locale}/profile`}
        actionText="Back to Profile"
      />
    );
  }

  return (
    <ConsentClient
      appName={clientApp.app.name}
      appDescription={clientApp.app.description}
      appIcon={clientApp.app.icon}
      appWebsite={clientApp.app.website}
      userEmail={session.user.email || ""}
      userName={`${session.user.first_name} ${session.user.last_name}`.trim() || session.user.username}
      userAvatar={session.user.avatar}
      clientId={clientId}
      redirectUri={redirectUri}
      state={state}
      codeChallenge={codeChallenge}
      codeChallengeMethod={codeChallengeMethod}
      scope={scope}
      nonce={nonce}
      locale={locale}
    />
  );
}

export default async function ConsentPage({
  params,
  searchParams,
}: ConsentPageProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-lg mx-auto p-8 bg-background/80 backdrop-blur-2xl border border-primary/20 rounded-3xl flex flex-col items-center justify-center min-h-[420px] animate-pulse">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <div className="h-4 w-40 bg-muted rounded mb-2" />
          <div className="h-3 w-56 bg-muted/60 rounded" />
        </div>
      }
    >
      <ConsentDynamicContent
        paramsPromise={params}
        searchParamsPromise={searchParams}
      />
    </Suspense>
  );
}
