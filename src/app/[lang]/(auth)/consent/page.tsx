import { Suspense } from "react";
import { redirect } from "next/navigation";
import { resolveLocale, getDictionary } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";
import { getUserSession } from "@/lib/session";
import OAuthErrorStep from "../signin/oauth-error-step";
import { ConsentClient } from "./consent-client";
import { verifyAuthRequest } from "@/lib/oauth/auth-request";
import { AUTH_REQUEST_PARAM } from "@/constants/oauth.constants";

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
    redirect(signInUrl);
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
    <Suspense
      fallback={
        <div className="w-full max-w-lg mx-auto p-8 bg-background/80 backdrop-blur-2xl border border-primary/20 rounded-3xl flex flex-col items-center justify-center min-h-105 animate-pulse">
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
