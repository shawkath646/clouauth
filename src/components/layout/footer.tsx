import Link from "next/link";
import { Shield } from "lucide-react";
import { BrandName } from "@/components/ui/brand-name";
import { FooterLinks } from "@/components/layout/footer-links";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

export interface FooterProps {
  locale?: Locale;
  dict: Dictionary<"landing">["footer"];
  commonDict: Dictionary<"common">;
}

export function Footer({ locale = defaultLocale, dict, commonDict }: FooterProps) {
  const currentYear = 2026;

  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm py-12 md:py-16">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <Link href={`/${locale}`} className="flex items-center gap-2 mb-4">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight text-lg">Clou Auth</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              {dict.brandDescription}{" "}
              <BrandName /> {dict.brandDescriptionSuffix}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-4">
              {dict.sections.platform}
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}#features`} className="hover:text-foreground transition-colors">
                  {dict.links.features}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}#security`} className="hover:text-foreground transition-colors">
                  {dict.links.security}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">
              {dict.sections.developers}
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/docs`} className="hover:text-foreground transition-colors">
                  {dict.links.documentation}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/developers`} className="hover:text-foreground transition-colors">
                  {dict.links.apiReference}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">
              {dict.sections.company}
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-foreground transition-colors">
                  {dict.links.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms`} className="hover:text-foreground transition-colors">
                  {dict.links.termsOfService}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <FooterLinks locale={locale} dict={commonDict} />
            <p className="mt-2 sm:mt-0">
              {dict.copyright.replace('{{year}}', currentYear.toString())}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {dict.developedBy}{" "}
              <Link href="https://shawkath646.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors font-medium">
                Shawkat Hossain Maruf
              </Link>
            </span>
            <Link href="https://gh.shawkath646.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors ml-2">GitHub</Link>
            <Link href="https://li.shawkath646.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Linkedin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
