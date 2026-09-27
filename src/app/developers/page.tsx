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
import { ArrowRight, ShieldCheck, Key, RefreshCw, HardDrive, Bot, ExternalLink } from "lucide-react";

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

export default async function DevelopersPage() {
  const { locale, t } = await getServerTranslations("developers");
  const landingDict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then(m => m.default);
  const developersDict = await import(`@/lib/i18n/locales/${locale}/developers.json`).then(m => m.default);
  const allMessages = { ...landingDict, ...developersDict };

  const authUrlExample = `/signin?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=openid%20profile%20email&state=RANDOM_STATE&code_challenge=PKCE_CHALLENGE&code_challenge_method=S256`;

  const tokenPostExample = `POST /api/sso/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=YOUR_AUTHORIZATION_CODE&
redirect_uri=YOUR_REDIRECT_URI&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
code_verifier=YOUR_PKCE_VERIFIER`;

  const userinfoExample = `GET /api/sso/v1/userinfo
Authorization: Bearer YOUR_ACCESS_TOKEN`;

  const refreshExample = `POST /api/sso/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=YOUR_REFRESH_TOKEN&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET`;

  const bridgeClientCredentialsExample = `POST /api/sso/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=cbl_YOUR_CLIENT_ID&
client_secret=cbl_sec_YOUR_SECRET&
scope=internal_service`;

  const bridgeSessionExample = `// Browser fetch from *.clouburstlab.com
fetch("https://auth.clouburstlab.com/api/inter-services/v1/user-session?scope=id,firstname,lastname,email,avatar", {
  credentials: "include",
  headers: {
    "Authorization": "Bearer " + appToken
  }
});`;

  const bridgeDrivesExample = `// Retrieve decrypted Google Drive, OneDrive, or Dropbox credentials
fetch("https://auth.clouburstlab.com/api/inter-services/v1/connected-drives?provider=google_drive&refresh=true", {
  credentials: "include",
  headers: {
    "Authorization": "Bearer " + appToken
  }
});`;

  return (
    <I18nProvider locale={locale} messages={allMessages}>
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
        <Navigation />

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
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
                    <Link href="/profile/applications" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
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
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                    <li>{t('steps.step2.content.list.0')}</li>
                    <li>{t('steps.step2.content.list.1.part1')} <strong>{t('steps.step2.content.list.1.bold')}</strong> (e.g., <code className="bg-muted px-1.5 py-0.5 rounded text-xs">https://yourapp.com/api/auth/callback</code>).</li>
                    <li>{t('steps.step2.content.list.2.part1')} <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{t('steps.step2.content.list.2.code')}</code>.</li>
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
                  <CardTitle>{t('steps.step3.title')}</CardTitle>
                  <CardDescription>{t('steps.step3.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-foreground/80">
                  <p>{t('steps.step3.content.intro')}</p>
                  <div className="relative group/code">
                    <div className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                      GET /signin?<br />
                      &nbsp;&nbsp;client_id=YOUR_CLIENT_ID<br />
                      &nbsp;&nbsp;&redirect_uri=YOUR_REDIRECT_URI<br />
                      &nbsp;&nbsp;&response_type=code<br />
                      &nbsp;&nbsp;&scope=openid%20profile%20email<br />
                      &nbsp;&nbsp;&state=RANDOM_STATE_STRING<br />
                      &nbsp;&nbsp;&code_challenge=PKCE_CHALLENGE<br />
                      &nbsp;&nbsp;&code_challenge_method=S256
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
                  <CardTitle>{t('steps.step4.title')}</CardTitle>
                  <CardDescription>{t('steps.step4.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-foreground/80">
                  <p>
                    {t('steps.step4.content.intro.part1')} <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{t('steps.step4.content.intro.code')}</code>. {t('steps.step4.content.intro.part2')}
                  </p>
                  <div className="relative group/code">
                    <div className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                      POST /api/sso/v1/token<br />
                      Content-Type: application/x-www-form-urlencoded<br /><br />
                      grant_type=authorization_code&amp;<br />
                      code=YOUR_AUTHORIZATION_CODE&amp;<br />
                      redirect_uri=YOUR_REDIRECT_URI&amp;<br />
                      client_id=YOUR_CLIENT_ID&amp;<br />
                      client_secret=YOUR_CLIENT_SECRET&amp;<br />
                      code_verifier=YOUR_PKCE_VERIFIER
                    </div>
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
                  <CardTitle>{t('steps.step5.title')}</CardTitle>
                  <CardDescription>{t('steps.step5.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-foreground/80">
                  <p>
                    {t('steps.step5.content.intro.part1')} <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{t('steps.step5.content.intro.code')}</code>, {t('steps.step5.content.intro.part2')}
                  </p>
                  <div className="relative group/code">
                    <div className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                      GET /api/sso/v1/userinfo<br />
                      Authorization: Bearer YOUR_ACCESS_TOKEN
                    </div>
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
                  <p>
                    {t('steps.step6.content.intro.part1')} <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{t('steps.step6.content.intro.code')}</code> {t('steps.step6.content.intro.part2')}
                  </p>
                  <div className="relative group/code">
                    <div className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono pr-12 leading-relaxed">
                      POST /api/sso/v1/token<br />
                      Content-Type: application/x-www-form-urlencoded<br /><br />
                      grant_type=refresh_token&amp;<br />
                      refresh_token=YOUR_REFRESH_TOKEN&amp;<br />
                      client_id=YOUR_CLIENT_ID&amp;<br />
                      client_secret=YOUR_CLIENT_SECRET
                    </div>
                    <div className="absolute top-2 right-2 opacity-80 group-hover/code:opacity-100 transition-opacity">
                      <CopyButton text={refreshExample} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Step 7: Internal Bridge & Machine-to-Machine Integration */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                7
              </div>
              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card/50 backdrop-blur-xl border-primary/20 shadow-sm hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-primary" />
                    <CardTitle>{t('steps.step7.title')}</CardTitle>
                  </div>
                  <CardDescription>{t('steps.step7.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-foreground/80">
                  <p>{t('steps.step7.content.intro')}</p>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A. Machine-to-Machine App Token</span>
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
                    <Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                      View Full API Reference <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </main>

        <Footer />
      </div>
    </I18nProvider>
  );
}
