import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import { BackgroundStars } from "@/components/landing/background-stars";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";
import { getServerTranslations } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { Shield, ShieldCheck, HardDrive, Lock, ExternalLink, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("privacy");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: {
      canonical: "/privacy",
    },
    openGraph: {
      title: `${t("meta.title")} — clouburstlab`,
      description: t("meta.description"),
      type: "website",
    },
  };
}

export default async function PrivacyPage() {
  const { locale, t, dict } = await getServerTranslations("privacy");
  const landingDict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then((m) => m.default);
  const commonDict = await import(`@/lib/i18n/locales/${locale}/common.json`).then((m) => m.default);

  const privacy = dict as unknown as PrivacyDict;
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
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
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
                <ul className="space-y-2.5 text-muted-foreground text-sm sm:text-base">
                  {privacy.sections.usage.list.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 4. Google API Services & Limited Use Disclosure */}
            <section
              id="google-user-data-policy"
              className="space-y-5 p-6 sm:p-8 bg-primary/5 dark:bg-primary/10 border-2 border-primary/30 rounded-3xl"
            >
              <div className="flex items-center gap-3 text-primary">
                <Shield className="w-6 h-6 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight m-0">
                  {privacy.sections.googleCompliance.title}
                </h2>
              </div>

              <div className="p-4 bg-background/80 dark:bg-card/80 border border-primary/20 rounded-2xl">
                <p className="text-foreground font-medium leading-relaxed m-0">
                  {privacy.sections.googleCompliance.content}{" "}
                  <a
                    href={privacy.sections.googleCompliance.policyUrl || "https://developers.google.com/terms/api-services-user-data-policy"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <span>{privacy.sections.googleCompliance.policyLinkText || "Google API Services User Data Policy"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  .
                </p>
              </div>

              {Array.isArray(privacy.sections.googleCompliance.specifics) && (
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {privacy.sections.googleCompliance.specifics.map((spec, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 5. Cloud Storage Integrations */}
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                <span>{privacy.sections.cloudDrives.title}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {privacy.sections.cloudDrives.content}
              </p>
            </section>

            {/* 6. Data Sharing & Third Parties */}
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {privacy.sections.sharing.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {privacy.sections.sharing.content}
              </p>
            </section>

            {/* 7. Data Retention & User Rights */}
            <section className="space-y-4 p-6 sm:p-8 bg-card/60 backdrop-blur-xl border border-primary/15 rounded-3xl shadow-sm">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {privacy.sections.retention.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {privacy.sections.retention.content}
              </p>
              {Array.isArray(privacy.sections.retention.list) && (
                <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                  {privacy.sections.retention.list.map((item, idx) => {
                    const isGoogleRevoke = item.includes("https://myaccount.google.com/connections");
                    const isDangerZone =
                      item.toLowerCase().includes("danger zone") ||
                      item.includes("ডেঞ্জার জোন") ||
                      item.includes("Zona de Peligro") ||
                      item.includes("منطقة الخطر") ||
                      item.includes("위험 구역") ||
                      item.includes("危险区域");

                    if (isGoogleRevoke) {
                      const textBeforeUrl = item.split("(https://")[0];
                      return (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                          <div>
                            <span>{textBeforeUrl} (</span>
                            <a
                              href="https://myaccount.google.com/connections"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              <span>Google Account Connections</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span>)</span>
                          </div>
                        </li>
                      );
                    }

                    if (isDangerZone) {
                      return (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                          <div>
                            <span>{item} </span>
                            <Link href="/profile/danger" className="text-destructive hover:underline font-semibold ml-1">
                              → Danger Zone
                            </Link>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                        <span>{item}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 8. Security Measures */}
            <section className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <span>{privacy.sections.security.title}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {privacy.sections.security.content}
              </p>
            </section>

            {/* 9. Contact */}
            <section className="space-y-3 pt-6 border-t border-border/50">
              <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <span>{privacy.sections.contact.title}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {privacy.sections.contact.content}{" "}
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
