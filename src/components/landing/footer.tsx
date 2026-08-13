"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { BrandName } from "@/components/ui/brand-name";
import { useTranslations } from "@/lib/i18n/hooks";
import { FooterLinks } from "@/components/landing/footer-links";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslations("landing");

  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm py-12 md:py-16">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight text-lg">Clou Auth</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              {t('footer.brandDescription')} <BrandName /> {t('footer.brandDescriptionSuffix')}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-4">{t('footer.sections.platform')}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/#features" className="hover:text-foreground transition-colors">{t('footer.links.features')}</Link></li>
              <li><Link href="/#security" className="hover:text-foreground transition-colors">{t('footer.links.security')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">{t('footer.sections.developers')}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-foreground transition-colors">{t('footer.links.documentation')}</Link></li>
              <li><Link href="/developers" className="hover:text-foreground transition-colors">{t('footer.links.apiReference')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">{t('footer.sections.company')}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">{t('footer.links.privacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">{t('footer.links.termsOfService')}</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <FooterLinks />
            <p className="mt-2 sm:mt-0">{t('footer.copyright').replace('{{year}}', currentYear.toString())}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{t('footer.developedBy')} <Link href="https://shawkath646.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors font-medium">Shawkat Hossain Maruf</Link></span>
            <Link href="https://gh.shawkath646.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors ml-2">GitHub</Link>
            <Link href="https://li.shawkath646.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Linkedin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
