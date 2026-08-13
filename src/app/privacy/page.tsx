import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";
import JsonLd from "@/components/json-ld";
import { Metadata } from "next";
import { getServerTranslations } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { Shield } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("privacy");
  return {
    title: `${t('meta.title')} | ClouAuth`,
    description: t('meta.description'),
    openGraph: {
      title: `${t('meta.title')} | ClouAuth`,
      description: t('meta.description'),
    },
  };
}

export default async function PrivacyPage() {
  const { locale, t } = await getServerTranslations("privacy");
  const landingDict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then(m => m.default);
  const commonDict = await import(`@/lib/i18n/locales/${locale}/common.json`).then(m => m.default);
  
  // We combine dictionaries to provide translations for the Navigation and Footer components.
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
                <Shield className="w-8 h-8" />
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

            <section className="mb-10 p-6 bg-card/50 backdrop-blur-xl border border-primary/10 rounded-2xl shadow-sm">
              <h2 className="text-2xl font-bold text-primary mb-4 border-l-4 border-primary/50 pl-4">{t('sections.collection.title')}</h2>
              <p>{t('sections.collection.content')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-muted-foreground">
                <li>{t('sections.collection.list.0')}</li>
                <li>{t('sections.collection.list.1')}</li>
                <li>{t('sections.collection.list.2')}</li>
                <li>{t('sections.collection.list.3')}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.usage.title')}</h2>
              <p>{t('sections.usage.content')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-muted-foreground">
                <li>{t('sections.usage.list.0')}</li>
                <li>{t('sections.usage.list.1')}</li>
                <li>{t('sections.usage.list.2')}</li>
                <li>{t('sections.usage.list.3')}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.sharing.title')}</h2>
              <p>{t('sections.sharing.content')}</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.security.title')}</h2>
              <p>{t('sections.security.content')}</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.rights.title')}</h2>
              <p>{t('sections.rights.content')}</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary mt-8 mb-4 border-l-4 border-primary/50 pl-4">{t('sections.contact.title')}</h2>
              <p>{t('sections.contact.content')}</p>
            </section>
          </article>
        </main>

        <Footer />
      </div>
    </I18nProvider>
  );
}
