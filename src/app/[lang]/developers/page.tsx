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
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { ArrowRight, ShieldCheck, Key, RefreshCw, HardDrive, Bot, ExternalLink } from "lucide-react";
import { getEnv } from "@/utils/utils";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: "Developer Integration Guide — ClouAuth",
  description: "Step-by-step tutorial on registering applications, integrating OAuth 2.0 with PKCE, and connecting to the internal app bridge with ClouAuth by clouburstlab.",
  alternates: {
    canonical: "/developers",
  },
  openGraph: {
    title: "Developer Integration Guide — clouburstlab",
    description: "Step-by-step tutorial on registering applications, integrating OAuth 2.0 with PKCE, and connecting to the internal app bridge with ClouAuth by clouburstlab.",
  },
};

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL", true) || "https://auth.clouburstlab.com";

  const [{ locale: resolvedLocale, t }, landingDict, commonDict] = await Promise.all([
    getServerTranslations("developers", locale),
    getDictionary("landing", locale),
    getDictionary("common", locale),
  ]);

  const authUrlExample = `/${locale}/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=openid%20profile%20email&state=RANDOM_STATE&code_challenge=PKCE_CHALLENGE&code_challenge_method=S256`;

  const tokenPostExample = `POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=YOUR_AUTHORIZATION_CODE&
redirect_uri=YOUR_REDIRECT_URI&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
code_verifier=YOUR_PKCE_VERIFIER`;

  const userinfoExample = `GET /api/oauth/userinfo
Authorization: Bearer YOUR_ACCESS_TOKEN`;

  const refreshExample = `POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=YOUR_REFRESH_TOKEN&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET`;

  const bridgeClientCredentialsExample = `POST /api/inter-services/v1/docs
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`;

  const bridgeSessionExample = `GET /api/inter-services/v1/user-session
Cookie: session_token=... (auto-forwarded via credentials: 'include')`;

  const bridgeDrivesExample = `GET /api/inter-services/v1/connected-drives
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
x-user-id: usr_...`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to Integrate ClouAuth via OAuth 2.0",
          description: "Step-by-step guide on registering an application and implementing the OAuth 2.0 Authorization Code flow with PKCE.",
          step: [
            {
              "@type": "HowToStep",
              name: "Register your Application",
              text: "Navigate to your Profile Dashboard, create a new Developer Application, and save your Client ID and Client Secret."
            },
            {
              "@type": "HowToStep",
              name: "Configure Redirect URIs",
              text: "Add your application's authorized redirect URIs in the application settings."
            },
            {
              "@type": "HowToStep",
              name: "Implement Authorization Code Flow",
              text: "Redirect users to the /signin authorization endpoint, handle the callback, and exchange the authorization code for an access token."
            }
          ]
        }}
      />

      <Navigation locale={locale} dict={landingDict.navigation} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-primary border-primary/30">OIDC 2.0 & OAuth 2.0</Badge>
            <Badge variant="outline" className="border-border">PKCE Enforced</Badge>
            <Badge variant="outline" className="border-border">Internal Bridge v1</Badge>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{t('title')}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t('descriptionPart1')} <BrandName />. {t('descriptionPart2')}
          </p>
        </div>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent">

          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              1
            </div>
            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <CardTitle>{t('steps.step1.title')}</CardTitle>
                </div>
                <CardDescription>{t('steps.step1.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/80">
                <p>{t('steps.step1.content.intro')}</p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
                  <li>{t('steps.step1.content.list.0')}</li>
                  <li>{t('steps.step1.content.list.1.part1')} <strong>{t('steps.step1.content.list.1.bold')}</strong>.</li>
                  <li>{t('steps.step1.content.list.2.part1')} <strong>{t('steps.step1.content.list.2.bold')}</strong>.</li>
                  <li>{t('steps.step1.content.list.3.part1')} <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{t('steps.step1.content.list.3.code1')}</code> {t('steps.step1.content.list.3.part2')} <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{t('steps.step1.content.list.3.code2')}</code>.</li>
                </ol>
                <div className="pt-2">
                  <Link href={`/${locale}/profile/applications`} className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
                    Manage Developer Applications <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              2
            </div>
            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <CardTitle>{t('steps.step2.title')}</CardTitle>
                </div>
                <CardDescription>{t('steps.step2.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/80">
                <p>{t('steps.step2.content.intro')}</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li><code className="text-primary font-mono text-xs">code_verifier</code>: High-entropy cryptographic random string (43–128 characters).</li>
                  <li><code className="text-primary font-mono text-xs">code_challenge</code>: <code className="text-xs bg-muted px-1 py-0.5 rounded">BASE64URL(SHA256(code_verifier))</code>.</li>
                  <li><code className="text-primary font-mono text-xs">code_challenge_method</code>: Strict literal <code className="text-xs font-bold text-foreground">S256</code>. Plain method is disallowed.</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              3
            </div>
            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <CardTitle>{t('steps.step3.title')}</CardTitle>
                </div>
                <CardDescription>{t('steps.step3.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/80">
                <p>{t('steps.step3.content.intro')}</p>
                <div className="relative group/code">
                  <div className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono break-all pr-12 leading-relaxed">
                    {authUrlExample}
                  </div>
                  <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                    <CopyButton text={authUrlExample} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 4 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              4
            </div>
            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <CardTitle>{t('steps.step4.title')}</CardTitle>
                </div>
                <CardDescription>{t('steps.step4.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/80">
                <p>{t('steps.step4.content.intro')}</p>
                <div className="relative group/code">
                  <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                    {tokenPostExample}
                  </pre>
                  <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                    <CopyButton text={tokenPostExample} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 5 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              5
            </div>
            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <CardTitle>{t('steps.step5.title')}</CardTitle>
                </div>
                <CardDescription>{t('steps.step5.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/80">
                <p>{t('steps.step5.content.intro')}</p>
                <div className="relative group/code">
                  <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                    {userinfoExample}
                  </pre>
                  <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                    <CopyButton text={userinfoExample} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 6 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              6
            </div>
            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <CardTitle>{t('steps.step6.title')}</CardTitle>
                </div>
                <CardDescription>{t('steps.step6.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/80">
                <p>{t('steps.step6.content.intro')}</p>
                <div className="relative group/code">
                  <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                    {refreshExample}
                  </pre>
                  <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                    <CopyButton text={refreshExample} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 7: Internal Ecosystem Service Bridge */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              7
            </div>
            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <CardTitle>Internal Service Bridge (clouburstlab Ecosystem)</CardTitle>
                </div>
                <CardDescription>Direct Machine-to-Machine microservice endpoints for high-performance intra-cluster calls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/80">
                <p className="text-muted-foreground leading-relaxed">
                  First-party services (e.g. ClouDrive, CloudDrop) can bypass browser redirects using authenticated M2M HTTP Basic or user session cookie pass-through.
                </p>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A. Machine-to-Machine Discovery</span>
                  <div className="relative group/code">
                    <div className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                      {bridgeClientCredentialsExample}
                    </div>
                    <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                      <CopyButton text={bridgeClientCredentialsExample} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">B. Cross-Subdomain User Session Bridge</span>
                  <div className="relative group/code">
                    <div className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                      {bridgeSessionExample}
                    </div>
                    <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                      <CopyButton text={bridgeSessionExample} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">C. Decrypted Cloud Storage Credentials</span>
                  <div className="relative group/code">
                    <div className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                      {bridgeDrivesExample}
                    </div>
                    <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                      <CopyButton text={bridgeDrivesExample} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/50">
                  <Link href="/api/inter-services/v1/docs" target="_blank" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" /> AI & Machine Docs (Raw Markdown) <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link href={`/${locale}/docs`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    View Full API Reference <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>

      <Footer locale={locale} dict={landingDict.footer} commonDict={commonDict} />
    </div>
  );
}
