"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/i18n/hooks";
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

const languages = [
  { code: 'en', name: 'English' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' },
  { code: 'zh', name: '中文' },
];

export function FooterLinks() {
  const { locale, setLocale, t } = useTranslations("common");

  const activeLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm font-medium">
      <div className="relative group">
        <Select value={locale || "en"} onValueChange={(val) => { if (val) setLocale(val) }}>

          <SelectTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors bg-background/60 dark:bg-card/40 backdrop-blur-xl px-3 py-1.5 h-auto rounded-full border border-primary/20 shadow-sm cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus:ring-offset-0">
            <Globe className="w-4 h-4" />
            <SelectValue vocab="dd" placeholder="Language">{activeLanguage.name}</SelectValue>
          </SelectTrigger>

          <SelectContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-35 rounded-xl bg-background/80 backdrop-blur-xl border-primary/20"
          >
            <SelectGroup>
              <SelectLabel>Language</SelectLabel>
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
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          {t('privacyPolicy')}
        </Link>
        <span className="w-1 h-1 rounded-full bg-primary/30"></span>
        <Link href="/terms" className="hover:text-foreground transition-colors">
          {t('termsOfService')}
        </Link>
      </div>
    </div>
  );
}