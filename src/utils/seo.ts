import { getEnv } from "@/utils/env.server";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL", true).replace(/\/$/, "");

/**
 * Generates canonical and multi-locale hreflang alternate URLs for Google/Bing compliance.
 */
export function getLocalizedAlternates(
  pathname: string = "",
  currentLocale: Locale = defaultLocale
) {
  const cleanPath = pathname.startsWith("/")
    ? pathname
    : pathname
      ? `/${pathname}`
      : "";
  const canonical = `${BASE_URL}/${currentLocale}${cleanPath}`;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE_URL}/${loc}${cleanPath}`;
  }
  languages["x-default"] = `${BASE_URL}/${defaultLocale}${cleanPath}`;

  return {
    canonical,
    languages,
  };
}
