import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";
import { getUserSession } from "@/lib/session";
import OAuthErrorStep from "../signin/oauth-error-step";
import { ConsentClient } from "./consent-client";
import { ConsentCardSkeleton } from "@/components/profile/profile-skeletons";
import { verifyAuthRequest } from "@/lib/oauth/auth-request";
import { AUTH_REQUEST_PARAM } from "@/constants/oauth.constants";
import { findOAuthClient } from "@/lib/oauth/clients";
import { grantOAuthAccess } from "@/actions/oauth/oauth.actions";

export const instant = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: "Authorize Application",
  robots: {
    index: false,
    follow: false,
  },
};

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

  const [searchParams, session] = await Promise.all([
    searchParamsPromise,
    getUserSession(),
  ]);

  const authRequest = getStringParam(searchParams?.[AUTH_REQUEST_PARAM]);

  // If user is not authenticated, redirect to sign-in while preserving auth_request
  if (!session) {
    const signInUrl = authRequest
      ? `/${locale}/signin?${AUTH_REQUEST_PARAM}=${encodeURIComponent(authRequest)}`
      : `/${locale}/signin`;
    redirect(signInUrl as Route);
  }

  // If auth_request parameter is missing
  if (!authRequest) {
    return (
      <OAuthErrorStep
        errorTitle="Invalid Authorization Request"
        errorMessage="Missing authorization request token. Please restart authorization from the application."
        actionHref={`/${locale}/profile`}
        actionText="Back to Profile"
      />
    );
  }

  // Verify and decode the JWT-secured authorization request
  const authReq = await verifyAuthRequest(authRequest);

  if (!authReq) {
    return (
      <OAuthErrorStep
        errorTitle="Expired or Invalid Request"
        errorMessage="This authorization session has expired or is invalid. Please return to the application and try again."
        actionHref={`/${locale}/profile`}
        actionText="Back to Profile"
      />
    );
  }

  // Auto-grant for first-party ecosystem apps without showing consent prompt
  const clientApp = await findOAuthClient(authReq.clientId);

  if (clientApp?.is_first_party) {
    const grantResult = await grantOAuthAccess(
      authReq.clientId,
      authReq.redirectUri,
      authReq.state,
      authReq.codeChallenge,
      authReq.codeChallengeMethod,
      authReq.scope,
      authReq.nonce
    );
    if (grantResult.success && grantResult.redirectUrl) {
      redirect(grantResult.redirectUrl as Route);
    }
  }

  return (
    <ConsentClient
      appName={authReq.appName}
      appDescription={authReq.appDescription}
      appIcon={authReq.appIcon}
      appWebsite={authReq.appWebsite}
      userEmail={session.user.email || ""}
      userName={
        `${session.user.first_name || ""} ${session.user.last_name || ""}`.trim() ||
        session.user.username
      }
      userAvatar={session.user.avatar}
      scope={authReq.scope}
      authRequestToken={authRequest}
    />
  );
}

export default async function ConsentPage({
  params,
  searchParams,
}: ConsentPageProps) {
  return (
    <Suspense fallback={<ConsentCardSkeleton />}>
      <ConsentDynamicContent
        paramsPromise={params}
        searchParamsPromise={searchParams}
      />
    </Suspense>
  );
}
