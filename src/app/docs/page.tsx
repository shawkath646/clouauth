import { getEnv } from "@/utils/env";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import JsonLd from "@/components/json-ld";
import { BrandName } from "@/components/ui/brand-name";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Metadata } from "next";
import Link from "next/link";
import { getServerTranslations } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { Bot, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "API Documentation & OIDC Discovery — ClouAuth",
  description: "Official API reference, OIDC discovery, and inter-service bridge documentation for the ClouAuth identity provider by clouburstlab.",
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    title: "API Documentation & OIDC Discovery — clouburstlab",
    description: "Official API reference, OIDC discovery, and inter-service bridge documentation for the ClouAuth identity provider by clouburstlab.",
  },
};

interface EndpointParam {
  name: string;
  type: string;
  in: "query" | "header" | "body";
  required: boolean;
  desc: string;
}

interface EndpointDoc {
  method: "GET" | "POST";
  path: string;
  category: "oidc" | "bridge";
  name: string;
  description: string;
  params: EndpointParam[] | null;
  curlExample: string;
  response: string;
}

export default async function DocsPage() {
  const BASE_URL =
    getEnv("NEXT_PUBLIC_BASE_URL", true) ||
    getEnv("NEXT_PUBLIC_APP_URL", true) ||
    "https://auth.clouburstlab.com";

  const { locale, t } = await getServerTranslations("docs");
  const landingDict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then(m => m.default);
  const docsDict = await import(`@/lib/i18n/locales/${locale}/docs.json`).then(m => m.default);
  const allMessages = { ...landingDict, ...docsDict };

  const endpoints: EndpointDoc[] = [
    // 1. OIDC Discovery
    {
      method: "GET",
      path: "/.well-known/openid-configuration",
      category: "oidc",
      name: t("endpoints.oidc.name"),
      description: t("endpoints.oidc.description"),
      params: null,
      curlExample: `curl -X GET "${BASE_URL}/.well-known/openid-configuration" \\
  -H "Accept: application/json"`,
      response: `{
  "issuer": "${BASE_URL}",
  "authorization_endpoint": "${BASE_URL}/signin",
  "token_endpoint": "${BASE_URL}/api/sso/v1/token",
  "userinfo_endpoint": "${BASE_URL}/api/sso/v1/userinfo",
  "jwks_uri": "${BASE_URL}/api/sso/v1/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "code_challenge_methods_supported": ["S256"]
}`
    },
    // 2. Authorization Endpoint
    {
      method: "GET",
      path: "/signin",
      category: "oidc",
      name: t("endpoints.auth.name"),
      description: t("endpoints.auth.description"),
      params: [
        { name: "client_id", type: "string", in: "query", required: true, desc: t("endpoints.auth.params.client_id") },
        { name: "redirect_uri", type: "string", in: "query", required: true, desc: t("endpoints.auth.params.redirect_uri") },
        { name: "response_type", type: "string", in: "query", required: true, desc: t("endpoints.auth.params.response_type") },
        { name: "scope", type: "string", in: "query", required: false, desc: t("endpoints.auth.params.scope") },
        { name: "state", type: "string", in: "query", required: true, desc: t("endpoints.auth.params.state") },
        { name: "code_challenge", type: "string", in: "query", required: true, desc: t("endpoints.auth.params.code_challenge") },
        { name: "code_challenge_method", type: "string", in: "query", required: true, desc: t("endpoints.auth.params.code_challenge_method") }
      ],
      curlExample: `https://auth.clouburstlab.com/signin?client_id=cbl_xyz&redirect_uri=https%3A%2F%2Fyourapp.com%2Fcallback&response_type=code&scope=openid%20profile%20email&state=xyz123&code_challenge=E9Mel-2VzpFloWfKxIWDZaTuedIFWhGLE-XuW11fYn4&code_challenge_method=S256`,
      response: `HTTP/1.1 302 Found
Location: https://yourapp.com/callback?code=eyJhbGciOiJIUzI1Ni...&state=xyz123`
    },
    // 3. Token Endpoint
    {
      method: "POST",
      path: "/api/sso/v1/token",
      category: "oidc",
      name: t("endpoints.token.name"),
      description: t("endpoints.token.description"),
      params: [
        { name: "grant_type", type: "string", in: "body", required: true, desc: t("endpoints.token.params.grant_type") },
        { name: "client_id", type: "string", in: "body", required: true, desc: t("endpoints.token.params.client_id") },
        { name: "client_secret", type: "string", in: "body", required: false, desc: t("endpoints.token.params.client_secret") },
        { name: "code", type: "string", in: "body", required: false, desc: t("endpoints.token.params.code") },
        { name: "redirect_uri", type: "string", in: "body", required: false, desc: t("endpoints.token.params.redirect_uri") },
        { name: "code_verifier", type: "string", in: "body", required: false, desc: t("endpoints.token.params.code_verifier") },
        { name: "refresh_token", type: "string", in: "body", required: false, desc: t("endpoints.token.params.refresh_token") },
        { name: "scope", type: "string", in: "body", required: false, desc: t("endpoints.token.params.scope") }
      ],
      curlExample: `# 1. Authorization Code Exchange
curl -X POST "${BASE_URL}/api/sso/v1/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=YOUR_URI&client_id=YOUR_ID&client_secret=YOUR_SECRET&code_verifier=YOUR_PKCE_VERIFIER"

# 2. Machine-to-Machine Client Credentials
curl -X POST "${BASE_URL}/api/sso/v1/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET&scope=internal_service"`,
      response: `{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1Ni...",
  "id_token": "eyJhbGciOiJSUzI1Ni...",
  "scope": "openid profile email"
}`
    },
    // 4. UserInfo
    {
      method: "GET",
      path: "/api/sso/v1/userinfo",
      category: "oidc",
      name: t("endpoints.userinfo.name"),
      description: t("endpoints.userinfo.description"),
      params: [
        { name: "Authorization", type: "header", in: "header", required: true, desc: t("endpoints.userinfo.params.authorization") }
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/sso/v1/userinfo" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`,
      response: `{
  "sub": "cm0a1b2c3d4e5f6g7h8i9j0k",
  "name": "Shawkath Ali",
  "given_name": "Shawkath",
  "family_name": "Ali",
  "preferred_username": "shawkath",
  "email": "shawkath646@gmail.com",
  "email_verified": true,
  "picture": "https://lh3.googleusercontent.com/a/...",
  "updated_at": 1727400000
}`
    },
    // 5. JWKS
    {
      method: "GET",
      path: "/api/sso/v1/jwks.json",
      category: "oidc",
      name: t("endpoints.jwks.name"),
      description: t("endpoints.jwks.description"),
      params: null,
      curlExample: `curl -X GET "${BASE_URL}/api/sso/v1/jwks.json"`,
      response: `{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "clou_68a9b2...",
      "n": "u5K7w...p9L",
      "e": "AQAB"
    }
  ]
}`
    },
    // 6. Token Revocation
    {
      method: "POST",
      path: "/api/sso/v1/revoke",
      category: "oidc",
      name: t("endpoints.revoke.name"),
      description: t("endpoints.revoke.description"),
      params: [
        { name: "token", type: "string", in: "body", required: true, desc: t("endpoints.revoke.params.token") },
        { name: "client_id", type: "string", in: "body", required: false, desc: t("endpoints.revoke.params.client_id") },
        { name: "client_secret", type: "string", in: "body", required: false, desc: t("endpoints.revoke.params.client_secret") },
        { name: "token_type_hint", type: "string", in: "body", required: false, desc: t("endpoints.revoke.params.token_type_hint") }
      ],
      curlExample: `curl -X POST "${BASE_URL}/api/sso/v1/revoke" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "token=YOUR_ACCESS_OR_REFRESH_TOKEN"`,
      response: `HTTP/1.1 200 OK`
    },
    // 7. Inter-Services: User Session
    {
      method: "GET",
      path: "/api/inter-services/v1/user-session",
      category: "bridge",
      name: t("endpoints.user_session.name"),
      description: t("endpoints.user_session.description"),
      params: [
        { name: "Authorization", type: "header", in: "header", required: true, desc: t("endpoints.user_session.params.authorization") },
        { name: "Cookie", type: "header", in: "header", required: false, desc: t("endpoints.user_session.params.cookie") },
        { name: "scope", type: "string", in: "query", required: false, desc: t("endpoints.user_session.params.scope") },
        { name: "user_id", type: "string", in: "query", required: false, desc: t("endpoints.user_session.params.user_id") }
      ],
      curlExample: `# 1. Browser Cross-Subdomain Call (*.clouburstlab.com)
fetch("${BASE_URL}/api/inter-services/v1/user-session?scope=id,firstname,lastname,email,avatar", {
  credentials: "include",
  headers: { "Authorization": "Bearer " + appToken }
});

# 2. Server-to-Server cURL with User Identifier
curl -X GET "${BASE_URL}/api/inter-services/v1/user-session?user_id=cm0a1b2c3...&scope=id,firstname,lastname,email" \\
  -H "Authorization: Bearer YOUR_APP_TOKEN"`,
      response: `{
  "authenticated": true,
  "user": {
    "id": "cm0a1b2c3d4e5f6g7h8i9j0k",
    "username": "shawkath",
    "first_name": "Shawkath",
    "last_name": "Ali",
    "email": "shawkath646@gmail.com",
    "email_verified": true,
    "avatar": "https://lh3.googleusercontent.com/a/..."
  },
  "scopes": ["id", "firstname", "lastname", "email"]
}`
    },
    // 8. Inter-Services: Connected Drives
    {
      method: "GET",
      path: "/api/inter-services/v1/connected-drives",
      category: "bridge",
      name: t("endpoints.connected_drives.name"),
      description: t("endpoints.connected_drives.description"),
      params: [
        { name: "Authorization", type: "header", in: "header", required: true, desc: t("endpoints.connected_drives.params.authorization") },
        { name: "Cookie", type: "header", in: "header", required: false, desc: t("endpoints.connected_drives.params.cookie") },
        { name: "provider", type: "string", in: "query", required: false, desc: t("endpoints.connected_drives.params.provider") },
        { name: "refresh", type: "boolean", in: "query", required: false, desc: t("endpoints.connected_drives.params.refresh") }
      ],
      curlExample: `# Retrieve decrypted Google Drive, OneDrive, or Dropbox credentials
curl -X GET "${BASE_URL}/api/inter-services/v1/connected-drives?provider=google_drive&refresh=true" \\
  -H "Authorization: Bearer YOUR_APP_TOKEN" \\
  -H "Cookie: session_token=YOUR_SESSION_TOKEN"`,
      response: `{
  "success": true,
  "user_id": "cm0a1b2c3d4e5f6g7h8i9j0k",
  "count": 1,
  "drives": [
    {
      "id": "acc_gdrive_123",
      "provider": "google_drive",
      "provider_user_id": "1083948572019",
      "access_token": "ya29.a0AfH6SMBx...",
      "refresh_token": "1//04_AbCdEf...",
      "expires_at": 1727400000,
      "expires_in": 3540,
      "is_expired": false,
      "created_on": "2026-09-27T02:00:00.000Z"
    }
  ]
}`
    },
    // 9. Inter-Services: AI Machine Docs
    {
      method: "GET",
      path: "/api/inter-services/v1/docs",
      category: "bridge",
      name: t("endpoints.bridge_docs.name"),
      description: t("endpoints.bridge_docs.description"),
      params: null,
      curlExample: `curl -X GET "${BASE_URL}/api/inter-services/v1/docs" \\
  -H "Accept: text/markdown"`,
      response: `# ClouAuth Inter-Service Bridge API Reference (v1)
> Complete raw markdown document optimized for AI agents & LLMs...`
    }
  ];

  return (
    <I18nProvider locale={locale} messages={allMessages}>
      <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-primary/20 selection:text-primary overflow-x-hidden">
        <JsonLd
          schema={{
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: "API Documentation | ClouAuth",
            description: "Official API reference, OIDC discovery, and inter-service bridge documentation for the ClouAuth identity provider.",
            url: `${BASE_URL}/docs`,
            publisher: {
              "@type": "Organization",
              name: "clouburstlab",
              url: BASE_URL
            }
          }}
        />
        <Navigation />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-primary border-primary/30">OIDC 2.0 / OAuth 2.0</Badge>
              <Badge variant="outline" className="border-border">Inter-Service Bridge v1</Badge>
              <Badge variant="outline" className="border-border">Universal CORS</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{t('title')}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('descriptionPart1')} <BrandName /> {t('descriptionPart2')}
            </p>
          </div>

          {/* AI Callout Banner */}
          <div className="mb-12 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 mt-0.5 sm:mt-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Building with AI Agents or LLMs?
                  <Sparkles className="w-4 h-4 text-primary" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ingest raw markdown docs directly via our machine endpoint or reference our standardized LLM profile.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/api/inter-services/v1/docs"
                target="_blank"
                className="text-xs bg-primary text-primary-foreground font-semibold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
              >
                /api/inter-services/v1/docs <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/llms.txt"
                target="_blank"
                className="text-xs bg-muted text-foreground font-semibold px-3 py-2 rounded-lg hover:bg-muted/80 transition-colors inline-flex items-center gap-1.5"
              >
                /llms.txt <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Links Navigation */}
          <div className="mb-12 p-6 bg-card/60 backdrop-blur-xl border rounded-2xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t('quickLinks')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {endpoints.map((ep, i) => (
                <Link
                  key={i}
                  href={`#${ep.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="flex items-center gap-2.5 p-2.5 hover:bg-muted/60 rounded-xl transition-colors border border-transparent hover:border-border text-left"
                >
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      ep.method === "GET"
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="text-sm font-medium truncate">{ep.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Endpoints Documentation */}
          <div className="space-y-12">
            {endpoints.map((endpoint, i) => {
              const anchorId = endpoint.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              return (
                <Card
                  key={i}
                  id={anchorId}
                  className="bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm overflow-hidden scroll-mt-28 hover:border-primary/20 transition-colors"
                >
                  <CardHeader className="bg-muted/30 border-b border-border/50 pb-5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={
                              endpoint.method === "GET"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }
                          >
                            {endpoint.method}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {endpoint.category === "oidc" ? "OAuth / OIDC" : "Inter-Service Bridge"}
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight mb-1.5">{endpoint.name}</CardTitle>
                        <CardDescription className="text-sm text-foreground/80">{endpoint.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-lg border text-xs font-mono text-muted-foreground">
                        <span>{endpoint.path}</span>
                        <CopyButton text={`${BASE_URL}${endpoint.path}`} />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Parameters Table */}
                    {endpoint.params && endpoint.params.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t('parameters')}
                        </h4>
                        <div className="border border-border/60 rounded-xl overflow-x-auto bg-background/50">
                          <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                              <tr>
                                <th className="p-3">Parameter</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">In</th>
                                <th className="p-3">Requirement</th>
                                <th className="p-3">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {endpoint.params.map((param, pIdx) => (
                                <tr key={pIdx} className="hover:bg-muted/20 transition-colors">
                                  <td className="p-3 font-mono font-medium text-foreground">{param.name}</td>
                                  <td className="p-3 text-muted-foreground">{param.type}</td>
                                  <td className="p-3">
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono uppercase text-muted-foreground">
                                      {param.in}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    {param.required ? (
                                      <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                        Required
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground border-border">
                                        Optional
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="p-3 text-foreground/80 leading-relaxed">{param.desc}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Example Request */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t('example')}
                        </h4>
                        <CopyButton text={endpoint.curlExample} />
                      </div>
                      <div className="bg-muted/70 p-4 rounded-xl overflow-x-auto text-xs font-mono border border-border/50 text-foreground/90 leading-relaxed whitespace-pre">
                        {endpoint.curlExample}
                      </div>
                    </div>

                    {/* Example Response */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t('response')}
                        </h4>
                        <CopyButton text={endpoint.response} />
                      </div>
                      <div className="bg-muted/70 p-4 rounded-xl overflow-x-auto text-xs font-mono border border-border/50 text-foreground/90 leading-relaxed whitespace-pre">
                        {endpoint.response}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>

        <Footer />
      </div>
    </I18nProvider>
  );
}
