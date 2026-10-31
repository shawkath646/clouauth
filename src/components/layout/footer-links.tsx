"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/types/i18n.types";

const languages = [
  { code: 'en', name: 'English' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' },
  { code: 'zh', name: '中文' },
];

export interface FooterLinksProps {
  locale?: Locale;
  dict: Dictionary<"common">;
}

export function FooterLinks({ locale = defaultLocale, dict }: FooterLinksProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  const handleLocaleChange = (newLocale: string | null) => {
    if (!newLocale) return;
    if (!pathname) {
      router.push(`/${newLocale}`);
      return;
    }
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
      segments[0] = newLocale as Locale;
    } else {
      segments.unshift(newLocale);
    }
    router.push(`/${segments.join("/")}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm font-medium">
      <div className="relative group">
        <Select value={locale} onValueChange={handleLocaleChange}>
          <SelectTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors bg-background/60 dark:bg-card/40 backdrop-blur-xl px-3 py-1.5 h-auto rounded-full border border-primary/20 shadow-sm cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0">
            <Globe className="w-4 h-4" />
            <SelectValue placeholder={dict.language}>{activeLanguage.name}</SelectValue>
          </SelectTrigger>

          <SelectContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-35 rounded-xl bg-background/80 backdrop-blur-xl border-primary/20"
          >
            <SelectGroup>
              <SelectLabel>{dict.language}</SelectLabel>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-lg cursor-pointer px-4 hover:bg-black/10 dark:hover:bg-black/40">
                  {lang.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 bg-background/60 dark:bg-card/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-primary/20 shadow-sm text-muted-foreground">
        <Link href={`/${locale}/privacy`} className="hover:text-foreground transition-colors">
          {dict.privacyPolicy}
        </Link>
        <span className="w-1 h-1 rounded-full bg-primary/30"></span>
        <Link href={`/${locale}/terms`} className="hover:text-foreground transition-colors">
          {dict.termsOfService}
        </Link>
      </div>
    </div>
  );
}
