import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/layout/footer";
import { BackgroundStars } from "@/components/landing/background-stars";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";
import { getServerTranslations, getStaticTranslations, getDictionary, resolveLocale } from "@/lib/i18n/server";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { ShieldCheck, HardDrive, Lock, ExternalLink, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getLocalizedAlternates } from "@/utils/seo";

type PrivacyDict = {
  meta: {
    title: string;
    description: string;
  };
  header: {
    title: string;
    lastUpdated: string;
    badge: string;
    subtitle: string;
  };
  sections: {
    intro: {
      title: string;
      content: string;
    };
    collection: {
      title: string;
      content: string;
      list: string[];
    };
    usage: {
      title: string;
      content: string;
      list: string[];
    };
    googleCompliance: {
      title: string;
      content: string;
      policyLinkText: string;
      policyUrl: string;
      specifics: string[];
    };
    cloudDrives: {
      title: string;
      content: string;
    };
    sharing: {
      title: string;
      content: string;
    };
    retention: {
      title: string;
      content: string;
      list: string[];
    };
    security: {
      title: string;
      content: string;
    };
    contact: {
      title: string;
      content: string;
    };
  };
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const { t } = await getStaticTranslations("privacy", locale);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: getLocalizedAlternates("/privacy", locale),
    openGraph: {
      title: `${t("meta.title")} — clouburstlab`,
      description: t("meta.description"),
      type: "website",
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = resolveLocale(lang);

  const [{ dict }, landingDict, commonDict] = await Promise.all([
    getServerTranslations("privacy", locale),
    getDictionary("landing", locale),
    getDictionary("common", locale),
  ]);

  const privacy = dict as unknown as PrivacyDict;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <BackgroundStars />
        <div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-primary/5 to-transparent dark:from-primary/15" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
      </div>

      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${privacy.meta.title} — clouburstlab`,
          description: privacy.meta.description,
          dateModified: "2026-09-26",
          publisher: {
            "@type": "Organization",
            name: "clouburstlab",
            url: "https://clouburstlab.com",
          },
        }}
      />

      <div className="relative z-20">
        <Navigation locale={locale} dict={landingDict.navigation} />
      </div>

      <main className="flex-1 relative z-10 w-full container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <article className="space-y-12">
          {/* Header */}
          <header className="border-b border-border/50 pb-8 space-y-4">
            <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-primary/30 text-primary gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{privacy.header.badge || "Privacy & Data Protection"}</span>
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              {privacy.header.title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {privacy.header.subtitle}
            </p>
            <div className="text-xs font-mono text-muted-foreground/80 pt-2">
              {privacy.header.lastUpdated}
            </div>
          </header>

          {/* 1. Introduction */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>{privacy.sections.intro.title}</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.intro.content}
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section className="space-y-4 p-6 sm:p-8 bg-card/60 backdrop-blur-xl border border-primary/15 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {privacy.sections.collection.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.collection.content}
            </p>
            {Array.isArray(privacy.sections.collection.list) && (
              <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                {privacy.sections.collection.list.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 3. How We Use Information */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {privacy.sections.usage.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.usage.content}
            </p>
            {Array.isArray(privacy.sections.usage.list) && (
              <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                {privacy.sections.usage.list.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4. Google Limited Use Compliance */}
          <section className="space-y-4 p-6 sm:p-8 bg-primary/5 border border-primary/20 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {privacy.sections.googleCompliance.title}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.googleCompliance.content}
            </p>
            {privacy.sections.googleCompliance.policyUrl && (
              <div className="pt-2">
                <Link
                  href={privacy.sections.googleCompliance.policyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <span>{privacy.sections.googleCompliance.policyLinkText}</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            )}
            {Array.isArray(privacy.sections.googleCompliance.specifics) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                {privacy.sections.googleCompliance.specifics.map((spec, idx) => (
                  <div key={idx} className="p-3.5 bg-background/50 rounded-xl border border-primary/10 text-xs sm:text-sm text-muted-foreground">
                    {spec}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. Cloud Drives & Storage Integrations */}
          <section className="space-y-4 p-6 sm:p-8 bg-card/60 backdrop-blur-xl border border-primary/15 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {privacy.sections.cloudDrives.title}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.cloudDrives.content}
            </p>
          </section>

          {/* 6. Sharing of Information */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {privacy.sections.sharing.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.sharing.content}
            </p>
          </section>

          {/* 7. Data Retention & Deletion */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {privacy.sections.retention.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.retention.content}
            </p>
            {Array.isArray(privacy.sections.retention.list) && (
              <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                {privacy.sections.retention.list.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 8. Security Measures */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {privacy.sections.security.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.security.content}
            </p>
          </section>

          {/* 9. Contact */}
          <section className="space-y-4 p-6 sm:p-8 bg-muted/40 border border-border/50 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {privacy.sections.contact.title}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {privacy.sections.contact.content}
            </p>
          </section>
        </article>
      </main>

      <Footer locale={locale} dict={landingDict.footer} commonDict={commonDict} />
    </div>
  );
}
