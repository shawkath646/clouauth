import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { BackgroundStars } from "@/components/landing/background-stars";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";
import { getServerTranslations } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { FileText, ShieldAlert, HardDrive, Terminal, CheckCircle2, Mail, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type TermsDict = {
  meta: {
    title: string;
    description: string;
  };
  header: {
    badge?: string;
    title: string;
    subtitle?: string;
    lastUpdated: string;
  };
  sections: {
    intro: {
      title: string;
      content: string;
    };
    account: {
      title: string;
      content: string;
    };
    developer: {
      title: string;
      content: string;
      list?: string[];
    };
    cloudStorage?: {
      title: string;
      content: string;
      list?: string[];
    };
    acceptableUse: {
      title: string;
      content: string;
      list?: string[];
    };
    termination: {
      title: string;
      content: string;
    };
    disclaimer?: {
      title: string;
      content: string;
    };
    changes: {
      title: string;
      content: string;
    };
  };
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("terms");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: {
      canonical: "/terms",
    },
    openGraph: {
      title: `${t("meta.title")} — clouburstlab`,
      description: t("meta.description"),
      type: "website",
    },
  };
}

export default async function TermsPage() {
  const { locale, t, dict } = await getServerTranslations("terms");
  const landingDict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then((m) => m.default);
  const commonDict = await import(`@/lib/i18n/locales/${locale}/common.json`).then((m) => m.default);

  const terms = dict as unknown as TermsDict;
  const allMessages = { ...commonDict, ...landingDict };

  return (
    <I18nProvider locale={locale} messages={allMessages}>
      <div className="min-h-screen flex flex-col relative bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-x-hidden">
        {/* Background Ambience */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <BackgroundStars />
          <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/15" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
        </div>

        <JsonLd
          schema={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${t("meta.title")} — clouburstlab`,
            description: t("meta.description"),
            dateModified: "2026-09-26",
            publisher: {
              "@type": "Organization",
              name: "clouburstlab",
              url: "https://clouburstlab.com",
            },
          }}
        />

        <div className="relative z-20">
          <Navigation />
        </div>

        <main className="flex-1 relative z-10 w-full container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          <article className="space-y-12">
            {/* Header */}
            <header className="border-b border-border/50 pb-8 space-y-4">
              <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-primary/30 text-primary gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>{terms.header.badge || "Legal & Terms of Service"}</span>
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                {terms.header.title}
              </h1>
              {terms.header.subtitle && (
                <p className="text-lg text-muted-foreground max-w-2xl">
                  {terms.header.subtitle}
                </p>
              )}
              <div className="text-xs font-mono text-muted-foreground/80 pt-2">
                {terms.header.lastUpdated}
              </div>
            </header>

            {/* 1. Acceptance of Terms */}
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {terms.sections.intro.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {terms.sections.intro.content}
              </p>
            </section>

            {/* 2. Account Registration and Security */}
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {terms.sections.account.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {terms.sections.account.content}
              </p>
            </section>

            {/* 3. Developer Applications and API Usage */}
            <section className="space-y-4 p-6 sm:p-8 bg-card/60 backdrop-blur-xl border border-primary/15 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2.5 text-primary">
                <Terminal className="w-6 h-6 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight m-0">
                  {terms.sections.developer.title}
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {terms.sections.developer.content}
              </p>
              {Array.isArray(terms.sections.developer.list) && (
                <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                  {terms.sections.developer.list.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 4. Connected Cloud Storage Integrations */}
            {terms.sections.cloudStorage && (
              <section className="space-y-4 p-6 sm:p-8 bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-3xl">
                <div className="flex items-center gap-2.5 text-primary">
                  <HardDrive className="w-6 h-6 shrink-0" />
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight m-0">
                    {terms.sections.cloudStorage.title}
                  </h2>
                </div>
                <p className="text-foreground/90 leading-relaxed font-medium">
                  {terms.sections.cloudStorage.content}
                </p>
                {Array.isArray(terms.sections.cloudStorage.list) && (
                  <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                    {terms.sections.cloudStorage.list.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* 5. Acceptable Use Policy */}
            <section className="space-y-4 p-6 sm:p-8 bg-card/60 backdrop-blur-xl border border-destructive/15 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2.5 text-destructive">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight m-0">
                  {terms.sections.acceptableUse.title}
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {terms.sections.acceptableUse.content}
              </p>
              {Array.isArray(terms.sections.acceptableUse.list) && (
                <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                  {terms.sections.acceptableUse.list.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 6. Termination and Account Deletion */}
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {terms.sections.termination.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {terms.sections.termination.content}{" "}
                <Link
                  href="/profile/danger"
                  className="text-destructive hover:underline font-semibold inline-flex items-center gap-1 ml-1"
                >
                  <span>Danger Zone</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                .
              </p>
            </section>

            {/* 7. Disclaimers and Limitation of Liability */}
            {terms.sections.disclaimer && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {terms.sections.disclaimer.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {terms.sections.disclaimer.content}
                </p>
              </section>
            )}

            {/* 8. Modifications and Contact Information */}
            <section className="space-y-3 pt-6 border-t border-border/50">
              <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <span>{terms.sections.changes.title}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {terms.sections.changes.content}{" "}
                <a
                  href="mailto:support@clouburstlab.com"
                  className="text-primary hover:underline font-semibold"
                >
                  support@clouburstlab.com
                </a>
                .
              </p>
            </section>
          </article>
        </main>

        <Footer />
      </div>
    </I18nProvider>
  );
}
