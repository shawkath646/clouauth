"use client";
import { SectionCard } from "@/components/profile/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon, Monitor } from "lucide-react";
import { locales, localeNames, defaultLocale, type Locale } from "@/lib/i18n/config";
import { cn } from "@/utils/utils";
import { Separator } from "@/components/ui/separator";
import type { FullProfile } from "@/types/profile.types";
import { useRouter, usePathname } from "next/navigation";
import { updateProfilePreferences } from "@/actions/profile/personal-info.actions";
import { BrandName } from "@/components/ui/brand-name";
import { useTheme } from "next-themes";
import type { Dictionary } from "@/types/i18n.types";

export interface PreferencesSectionProps {
  profile: FullProfile;
  locale?: Locale;
  dict: Dictionary<"profile_personal">["preferencesSection"];
}

export function PreferencesSection({
  profile,
  locale = defaultLocale,
  dict,
}: PreferencesSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  
  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    await updateProfilePreferences({ theme: newTheme });
  };
  
  const handleLanguageChange = async (newLang: string | null) => {
    if (!newLang) return;
    await updateProfilePreferences({ language: newLang });
    if (pathname) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
        segments[0] = newLang as Locale;
      } else {
        segments.unshift(newLang);
      }
      router.push(`/${segments.join("/")}`);
    } else {
      router.push(`/${newLang}/profile/preferences`);
    }
  };

  const handleTimezoneChange = async (tz: string | null) => {
    if (!tz) return;
    await updateProfilePreferences({ timezone: tz });
  };

  return (
    <div className="space-y-6">
      <SectionCard title={dict.title1} description={<span>{dict.desc1} <BrandName /> {dict.desc1b}</span>}>
        <div className="flex gap-3">
          <button 
            onClick={() => handleThemeChange("light")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 flex-1 rounded-xl border transition-all cursor-pointer",
              theme === "light" 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "border-border/50 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
            )}
          >
            <Sun className="h-5 w-5" />
            <span className="text-sm font-medium">{dict.light}</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange("dark")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 flex-1 rounded-xl border transition-all cursor-pointer",
              theme === "dark" 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "border-border/50 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
            )}
          >
            <Moon className="h-5 w-5" />
            <span className="text-sm font-medium">{dict.dark}</span>
          </button>
          
          <button 
            onClick={() => handleThemeChange("system")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 flex-1 rounded-xl border transition-all cursor-pointer",
              theme === "system" 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "border-border/50 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
            )}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-sm font-medium">{dict.system}</span>
          </button>
        </div>
      </SectionCard>

      <SectionCard title={dict.title2} description={dict.desc2} noPadding>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">{dict.langTitle}</h4>
            <p className="text-base font-semibold">{dict.langDesc}</p>
          </div>
          <Select key={profile.preferences?.language || locale} defaultValue={profile.preferences?.language || locale} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full sm:w-48 bg-background/50 rounded-xl">
              <SelectValue placeholder={dict.langPlaceholder} />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background/90 backdrop-blur-xl border-primary/20">
              {locales.map((l) => (
                <SelectItem key={l} value={l}>
                  {localeNames[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">{dict.tzTitle}</h4>
            <p className="text-base font-semibold">{dict.tzDesc}</p>
          </div>
          <Select key={profile.preferences?.timezone || "UTC"} defaultValue={profile.preferences?.timezone || "UTC"} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-full sm:w-48 bg-background/50 rounded-xl">
              <SelectValue placeholder={dict.tzPlaceholder} />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background/90 backdrop-blur-xl border-primary/20">
              <SelectItem value="UTC">(UTC+00:00) UTC</SelectItem>
              <SelectItem value="pst">(UTC-08:00) Pacific Time</SelectItem>
              <SelectItem value="est">(UTC-05:00) Eastern Time</SelectItem>
              <SelectItem value="gmt">(UTC+00:00) GMT</SelectItem>
              <SelectItem value="jst">(UTC+09:00) JST</SelectItem>
              <SelectItem value="ist">(UTC+05:30) IST</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator className="opacity-50" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-4 gap-4 hover:bg-muted/10 transition-colors">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">{dict.dateFormatTitle}</h4>
            <p className="text-base font-semibold">{dict.dateFormatDesc}</p>
          </div>
          <Select key="mm-dd-yyyy" defaultValue="mm-dd-yyyy">
            <SelectTrigger className="w-full sm:w-48 bg-background/50 rounded-xl">
              <SelectValue placeholder={dict.dateFormatPlaceholder} />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-background/90 backdrop-blur-xl border-primary/20">
              <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
              <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
              <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>
    </div>
  );
}
