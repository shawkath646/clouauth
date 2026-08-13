import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";
import { getServerTranslations } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { FileText } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("terms");
  return {
    title: `${t('meta.title')} | ClouAuth`,
    description: t('meta.description'),
    openGraph: {
      title: `${t('meta.title')} | ClouAuth`,
      description: t('meta.description'),
    },
  };
}

export default async function TermsPage() {
  const { locale, t } = await getServerTranslations("terms");
  const landingDict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then(m => m.default);
  const commonDict = await import(`@/lib/i18n/locales/${locale}/common.json`).then(m => m.default);

  const allMessages = { ...commonDict, ...landingDict };

  return (
    <I18nProvider locale={locale} messages={allMessages}>
      <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-x-hidden">
        <JsonLd
          schema={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: t('meta.title'),
            description: t('meta.description'),
            publisher: {
              "@type": "Organization",
              name: "ClouAuth",
            }
          }}
        />
        <Navigation />

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <article className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
            <header className="mb-12 border-b border-border/50 pb-8">
              <div className="flex items-center gap-4 mb-4 text-primary">
                <FileText className="w-8 h-8" />
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight m-0">{t('header.title')}</h1>
              </div>
              <time className="text-muted-foreground text-sm font-medium block">
                {t('header.lastUpdated')}
              </time>
            </header>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.intro.title')}</h2>
              <p>{t('sections.intro.content')}</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.account.title')}</h2>
              <p>{t('sections.account.content')}</p>
            </section>

            <section className="mb-10 p-6 bg-card/50 backdrop-blur-xl border border-primary/10 rounded-2xl shadow-sm">
              <h2 className="text-2xl font-bold text-primary mb-4 border-l-4 border-primary/50 pl-4">{t('sections.developer.title')}</h2>
              <p>{t('sections.developer.content')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-muted-foreground">
                <li>{t('sections.developer.list.0')}</li>
                <li>{t('sections.developer.list.1')}</li>
                <li>{t('sections.developer.list.2')}</li>
                <li>{t('sections.developer.list.3')}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.acceptableUse.title')}</h2>
              <p>{t('sections.acceptableUse.content')}</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.termination.title')}</h2>
              <p>{t('sections.termination.content')}</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.changes.title')}</h2>
              <p>{t('sections.changes.content')}</p>
            </section>
          </article>
        </main>

        <Footer />
      </div>
    </I18nProvider>
  );
}
