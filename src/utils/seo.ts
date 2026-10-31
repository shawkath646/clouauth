import { getEnv } from "@/utils/utils";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

const BASE_URL = getEnv("NEXT_PUBLIC_BASE_URL", true).replace(/\/$/, "");

/**
 * Truncates a string cleanly without cutting words in half when possible.
 * Guarantees output length <= maxLen.
 */
export function clampText(text: string | null | undefined, maxLen: number, suffix = "..."): string {
  if (!text) return "";
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxLen) return cleaned;

  const targetLen = maxLen - suffix.length;
  if (targetLen <= 0) return cleaned.slice(0, maxLen);

  const truncated = cleaned.slice(0, targetLen);
  const lastSpace = truncated.lastIndexOf(" ");

  // If last space is reasonably close to the cut point, truncate at word boundary
  if (lastSpace > targetLen * 0.7) {
    return `${truncated.slice(0, lastSpace)}${suffix}`;
  }

  return `${truncated}${suffix}`;
}

/**
 * Enforces strict SEO title safety (<= 60 characters).
 */
export function clampMetaTitle(title: string, maxLen = 60): string {
  return clampText(title, maxLen, "…");
}

/**
 * Enforces strict SEO description safety (<= 160 characters).
 */
export function clampMetaDescription(description: string, maxLen = 160): string {
  return clampText(description, maxLen, "…");
}

/**
 * Generates canonical and multi-locale hreflang alternate URLs for Google/Bing compliance.
 */
export function getLocalizedAlternates(pathname: string = "", currentLocale: Locale = defaultLocale) {
  const cleanPath = pathname.startsWith("/") ? pathname : pathname ? `/${pathname}` : "";
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
