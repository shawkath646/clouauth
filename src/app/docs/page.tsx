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

export const metadata: Metadata = {
  title: "API Documentation | ClouAuth",
  description: "Official API reference and OIDC discovery documentation for the ClouAuth identity provider. Learn how to authenticate and manage users.",
  openGraph: {
    title: "API Documentation | ClouAuth",
    description: "Official API reference and OIDC discovery documentation for the ClouAuth identity provider.",
  },
};

export default async function DocsPage() {
  const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL");
  
  const { locale, t } = await getServerTranslations("docs");
  const landingDict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then(m => m.default);
  const docsDict = await import(`@/lib/i18n/locales/${locale}/docs.json`).then(m => m.default);
  const allMessages = { ...landingDict, ...docsDict };

  const endpoints = [
    {
      method: "GET",
      path: "/.well-known/openid-configuration",
      name: t('endpoints.oidc.name'),
      description: t('endpoints.oidc.description'),
      params: null,
      response: t('endpoints.oidc.response')
    },
    {
      method: "POST",
      path: "/api/sso/v1/authorize",
      name: t('endpoints.auth.name'),
      description: t('endpoints.auth.description'),
      params: [
        { name: "client_id", type: "string", required: true, desc: t('endpoints.auth.params.client_id') },
        { name: "redirect_uri", type: "string", required: true, desc: t('endpoints.auth.params.redirect_uri') },
        { name: "response_type", type: "string", required: true, desc: t('endpoints.auth.params.response_type') },
        { name: "scope", type: "string", required: false, desc: t('endpoints.auth.params.scope') },
        { name: "state", type: "string", required: true, desc: t('endpoints.auth.params.state') },
        { name: "code_challenge", type: "string", required: true, desc: t('endpoints.auth.params.code_challenge') },
        { name: "code_challenge_method", type: "string", required: true, desc: t('endpoints.auth.params.code_challenge_method') },
      ],
      response: t('endpoints.auth.response')
    },
    {
      method: "POST",
      path: "/api/sso/v1/token",
      name: t('endpoints.token.name'),
      description: t('endpoints.token.description'),
      params: [
        { name: "grant_type", type: "string", required: true, desc: t('endpoints.token.params.grant_type') },
        { name: "code", type: "string", required: true, desc: t('endpoints.token.params.code') },
        { name: "redirect_uri", type: "string", required: true, desc: t('endpoints.token.params.redirect_uri') },
        { name: "client_id", type: "string", required: true, desc: t('endpoints.token.params.client_id') },
        { name: "client_secret", type: "string", required: true, desc: t('endpoints.token.params.client_secret') },
        { name: "code_verifier", type: "string", required: true, desc: t('endpoints.token.params.code_verifier') },
      ],
      response: t('endpoints.token.response')
    },
    {
      method: "GET",
      path: "/api/sso/v1/userinfo",
      name: t('endpoints.userinfo.name'),
      description: t('endpoints.userinfo.description'),
      params: [
        { name: "Authorization", type: "header", required: true, desc: t('endpoints.userinfo.params.authorization') }
      ],
      response: t('endpoints.userinfo.response')
    },
    {
      method: "GET",
      path: "/api/sso/v1/jwks.json",
      name: t('endpoints.jwks.name'),
      description: t('endpoints.jwks.description'),
      params: null,
      response: t('endpoints.jwks.response')
    },
    {
      method: "POST",
      path: "/api/sso/v1/revoke",
      name: t('endpoints.revoke.name'),
      description: t('endpoints.revoke.description'),
      params: [
        { name: "client_id", type: "string", required: true, desc: t('endpoints.revoke.params.client_id') },
        { name: "client_secret", type: "string", required: true, desc: t('endpoints.revoke.params.client_secret') },
        { name: "token", type: "string", required: true, desc: t('endpoints.revoke.params.token') },
        { name: "token_type_hint", type: "string", required: false, desc: t('endpoints.revoke.params.token_type_hint') },
      ],
      response: t('endpoints.revoke.response')
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
          description: "Official API reference and OIDC discovery documentation for the ClouAuth identity provider.",
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
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{t('title')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('descriptionPart1')} <BrandName /> {t('descriptionPart2')}
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mb-12 p-6 bg-muted/20 border rounded-xl">
          <h2 className="text-lg font-semibold mb-4">{t('quickLinks')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {endpoints.map((ep, i) => (
              <Link 
                key={i} 
                href={`#${ep.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border"
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${ep.method === 'GET' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {ep.method}
                </span>
                <span className="text-sm font-medium">{ep.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          {endpoints.map((endpoint, i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm overflow-hidden" id={endpoint.name.toLowerCase().replace(/\s+/g, '-')}>
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-xl mb-2">{endpoint.name}</CardTitle>
                    <CardDescription className="text-sm text-foreground/80">{endpoint.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 bg-background pl-3 pr-1 py-1 rounded-md border font-mono text-sm">
                    <span className={`font-bold ${endpoint.method === 'GET' ? 'text-blue-500' : 'text-emerald-500'}`}>
                      {endpoint.method}
                    </span>
                    <span className="text-muted-foreground">{endpoint.path}</span>
                    <CopyButton text={endpoint.path} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {endpoint.params && (
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">{t('parameters')}</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">{t('table.name')}</th>
                            <th className="px-4 py-3 font-medium">{t('table.type')}</th>
                            <th className="px-4 py-3 font-medium">{t('table.required')}</th>
                            <th className="px-4 py-3 font-medium">{t('table.description')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {endpoint.params.map((param, j) => (
                            <tr key={j} className="bg-card">
                              <td className="px-4 py-3 font-mono text-xs text-primary">{param.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{param.type}</td>
                              <td className="px-4 py-3">
                                {param.required ? (
                                  <Badge variant="default" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">{t('table.requiredBadge')}</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">{t('table.optionalBadge')}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">{param.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">{t('response')}</h3>
                  <div className="bg-muted/30 p-4 rounded-lg border font-mono text-sm text-foreground/80">
                    {endpoint.response}
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
    </I18nProvider>
  );
}
