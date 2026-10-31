import { getEnv } from "@/utils/utils";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/layout/footer";
import JsonLd from "@/components/json-ld";
import { BrandName } from "@/components/ui/brand-name";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Metadata } from "next";
import Link from "next/link";
import { getServerTranslations, getDictionary, resolveLocale } from "@/lib/i18n/server";
import { locales } from "@/lib/i18n/config";
import { Bot, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

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

export default async function DocsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);

  const BASE_URL =
    getEnv("NEXT_PUBLIC_BASE_URL", true) ||
    getEnv("NEXT_PUBLIC_APP_URL", true) ||
    "https://auth.clouburstlab.com";

  const [{ t }, landingDict, commonDict] = await Promise.all([
    getServerTranslations("docs", locale),
    getDictionary("landing", locale),
    getDictionary("common", locale),
  ]);

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
  "authorization_endpoint": "${BASE_URL}/${locale}/authorize",
  "token_endpoint": "${BASE_URL}/api/oauth/token",
  "userinfo_endpoint": "${BASE_URL}/api/oauth/userinfo",
  "revocation_endpoint": "${BASE_URL}/api/oauth/revoke",
  "introspection_endpoint": "${BASE_URL}/api/oauth/introspect",
  "jwks_uri": "${BASE_URL}/api/oauth/jwks",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email", "phone", "offline_access"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic", "none"],
  "code_challenge_methods_supported": ["S256"]
}`
    },

    // 2. Token Endpoint
    {
      method: "POST",
      path: "/api/oauth/token",
      category: "oidc",
      name: t("endpoints.token.name"),
      description: t("endpoints.token.description"),
      params: [
        { name: "grant_type", type: "string", in: "body", required: true, desc: t("endpoints.token.params.grant_type") },
        { name: "code", type: "string", in: "body", required: false, desc: t("endpoints.token.params.code") },
        { name: "redirect_uri", type: "string", in: "body", required: false, desc: t("endpoints.token.params.redirect_uri") },
        { name: "client_id", type: "string", in: "body", required: true, desc: t("endpoints.token.params.client_id") },
        { name: "client_secret", type: "string", in: "body", required: false, desc: t("endpoints.token.params.client_secret") },
        { name: "code_verifier", type: "string", in: "body", required: false, desc: t("endpoints.token.params.code_verifier") },
        { name: "refresh_token", type: "string", in: "body", required: false, desc: t("endpoints.token.params.refresh_token") }
      ],
      curlExample: `curl -X POST "${BASE_URL}/api/oauth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code=splat_code_xyz" \\
  -d "redirect_uri=https://your-app.com/callback" \\
  -d "client_id=your_client_id" \\
  -d "client_secret=your_client_secret" \\
  -d "code_verifier=high_entropy_random_verifier"`,
      response: `{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_secure_random_token",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email"
}`
    },

    // 3. Userinfo Endpoint
    {
      method: "GET",
      path: "/api/oauth/userinfo",
      category: "oidc",
      name: t("endpoints.userinfo.name"),
      description: t("endpoints.userinfo.description"),
      params: [
        { name: "Authorization", type: "string", in: "header", required: true, desc: t("endpoints.userinfo.params.auth") }
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/oauth/userinfo" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`,
      response: `{
  "sub": "usr_94f8a2bc4e7a",
  "name": "Jane Developer",
  "given_name": "Jane",
  "family_name": "Developer",
  "preferred_username": "janedev",
  "email": "jane@clouburstlab.com",
  "email_verified": true,
  "picture": "https://pub-...r2.dev/avatars/usr_94f8a2bc4e7a.png"
}`
    },

    // 4. JWKS Endpoint
    {
      method: "GET",
      path: "/api/oauth/jwks",
      category: "oidc",
      name: t("endpoints.jwks.name"),
      description: t("endpoints.jwks.description"),
      params: null,
      curlExample: `curl -X GET "${BASE_URL}/api/oauth/jwks"`,
      response: `{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "clouauth-key-2026-v1",
      "n": "u1w2x3y4z5...",
      "e": "AQAB"
    }
  ]
}`
    },

    // 5. Token Revocation
    {
      method: "POST",
      path: "/api/oauth/revoke",
      category: "oidc",
      name: t("endpoints.revoke.name"),
      description: t("endpoints.revoke.description"),
      params: [
        { name: "token", type: "string", in: "body", required: true, desc: t("endpoints.revoke.params.token") },
        { name: "token_type_hint", type: "string", in: "body", required: false, desc: t("endpoints.revoke.params.hint") },
        { name: "client_id", type: "string", in: "body", required: true, desc: t("endpoints.revoke.params.client_id") },
        { name: "client_secret", type: "string", in: "body", required: false, desc: t("endpoints.revoke.params.client_secret") }
      ],
      curlExample: `curl -X POST "${BASE_URL}/api/oauth/revoke" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "token=rt_token_to_revoke" \\
  -d "token_type_hint=refresh_token" \\
  -d "client_id=your_client_id" \\
  -d "client_secret=your_client_secret"`,
      response: `HTTP/1.1 200 OK
{
  "revoked": true
}`
    },

    // 6. Bridge: User Session Inspection
    {
      method: "GET",
      path: "/api/inter-services/v1/user-session",
      category: "bridge",
      name: t("endpoints.session.name"),
      description: t("endpoints.session.description"),
      params: [
        { name: "Cookie", type: "string", in: "header", required: false, desc: t("endpoints.session.params.cookie") },
        { name: "x-user-id", type: "string", in: "header", required: false, desc: t("endpoints.session.params.user_id") }
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/inter-services/v1/user-session" \\
  --cookie "session_token=YOUR_SESSION_COOKIE"`,
      response: `{
  "authenticated": true,
  "user": {
    "id": "usr_94f8a2bc4e7a",
    "username": "janedev",
    "first_name": "Jane",
    "last_name": "Developer",
    "avatar": "https://pub-...r2.dev/avatars/usr_94f8a2bc4e7a.png"
  },
  "session": {
    "id": "ses_7a9f1b2c",
    "expires_on": "2026-11-01T00:00:00.000Z"
  }
}`
    },

    // 7. Bridge: Connected Drives
    {
      method: "GET",
      path: "/api/inter-services/v1/connected-drives",
      category: "bridge",
      name: t("endpoints.drives.name"),
      description: t("endpoints.drives.description"),
      params: [
        { name: "Cookie", type: "string", in: "header", required: false, desc: t("endpoints.drives.params.cookie") },
        { name: "x-user-id", type: "string", in: "header", required: false, desc: t("endpoints.drives.params.user_id") },
        { name: "Authorization", type: "string", in: "header", required: false, desc: t("endpoints.drives.params.auth") }
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/inter-services/v1/connected-drives" \\
  -u "CLIENT_ID:CLIENT_SECRET" \\
  -H "x-user-id: usr_94f8a2bc4e7a"`,
      response: `{
  "success": true,
  "data": [
    {
      "provider": "google",
      "account_email": "jane@gmail.com",
      "access_token": "ya29.a0AWY7C...",
      "refresh_token": "1//04...",
      "expires_at": "2026-10-31T05:30:00.000Z",
      "scopes": ["https://www.googleapis.com/auth/drive.readonly"]
    }
  ]
}`
    },

    // 8. Bridge: Machine OpenAPI / Docs
    {
      method: "GET",
      path: "/api/inter-services/v1/docs",
      category: "bridge",
      name: t("endpoints.docs.name"),
      description: t("endpoints.docs.description"),
      params: [
        { name: "format", type: "string", in: "query", required: false, desc: t("endpoints.docs.params.format") }
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/inter-services/v1/docs?format=markdown" \\
  -u "CLIENT_ID:CLIENT_SECRET"`,
      response: `# ClouAuth Inter-Service Bridge Documentation (Markdown)
...`
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "API Documentation | ClouAuth",
          description: "Official API reference, OIDC discovery, and inter-service bridge documentation for the ClouAuth identity provider.",
          url: `${BASE_URL}/${locale}/docs`,
          publisher: {
            "@type": "Organization",
            name: "clouburstlab",
            url: BASE_URL
          }
        }}
      />

      <Navigation locale={locale} dict={landingDict.navigation} />

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
                <span className="text-sm font-medium text-foreground truncate">{ep.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* API Endpoint Cards */}
        <div className="space-y-10">
          {endpoints.map((ep, i) => {
            const anchorId = ep.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return (
              <Card key={i} id={anchorId} className="scroll-mt-24 border-primary/10 bg-card/50 backdrop-blur-xl shadow-sm hover:border-primary/20 transition-colors">
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`text-xs font-mono font-bold px-2.5 py-1 ${
                          ep.method === "GET"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                        variant="outline"
                      >
                        {ep.method}
                      </Badge>
                      <code className="text-base sm:text-lg font-mono font-semibold text-foreground">{ep.path}</code>
                    </div>
                    <Badge variant="secondary" className="text-xs uppercase tracking-wider font-semibold">
                      {ep.category === "oidc" ? "OIDC 2.0 Core" : "Inter-Service Bridge"}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl pt-1">{ep.name}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    {ep.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-2">
                  {/* Parameters Table */}
                  {ep.params && ep.params.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('parameters')}</h4>
                      <div className="overflow-x-auto rounded-xl border border-border/50">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase border-b border-border/50">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">{t('table.name')}</th>
                              <th className="py-2.5 px-4 font-semibold">{t('table.type')}</th>
                              <th className="py-2.5 px-4 font-semibold">{t('table.in')}</th>
                              <th className="py-2.5 px-4 font-semibold">{t('table.required')}</th>
                              <th className="py-2.5 px-4 font-semibold">{t('table.description')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-mono text-xs">
                            {ep.params.map((param, pIdx) => (
                              <tr key={pIdx} className="hover:bg-muted/20">
                                <td className="py-2.5 px-4 font-bold text-foreground">{param.name}</td>
                                <td className="py-2.5 px-4 text-primary">{param.type}</td>
                                <td className="py-2.5 px-4 text-muted-foreground">{param.in}</td>
                                <td className="py-2.5 px-4">
                                  {param.required ? (
                                    <span className="text-destructive font-semibold">Required</span>
                                  ) : (
                                    <span className="text-muted-foreground">Optional</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 font-sans text-xs text-foreground/80">{param.desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* cURL Example */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('curlExample')}</h4>
                    <div className="relative group/code">
                      <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-xl overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                        {ep.curlExample}
                      </pre>
                      <div className="absolute top-3 right-3 opacity-80 group-hover/code:opacity-100 transition-opacity">
                        <CopyButton text={ep.curlExample} />
                      </div>
                    </div>
                  </div>

                  {/* Response Example */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('exampleResponse')}</h4>
                    <div className="relative group/code">
                      <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-xl overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                        {ep.response}
                      </pre>
                      <div className="absolute top-3 right-3 opacity-80 group-hover/code:opacity-100 transition-opacity">
                        <CopyButton text={ep.response} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <Footer locale={locale} dict={landingDict.footer} commonDict={commonDict} />
    </div>
  );
}
