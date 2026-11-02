import { locales } from "@/lib/i18n/config";

const AUTH_PATHS = ["/signin", "/signup"];
const matches = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

export function getSafeReturnTo(
  raw: string | null | undefined,
  locale: string,
  fallback = "/profile"
): string {
  const fallbackUrl = `/${locale}${fallback}`;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallbackUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw, "http://localhost");
  } catch {
    return fallbackUrl;
  }
  if (parsed.origin !== "http://localhost") return fallbackUrl;

  const segments = parsed.pathname.split("/").filter(Boolean);
  const hasLocale = (locales as readonly string[]).includes(segments[0]);
  const path = `/${(hasLocale ? segments.slice(1) : segments).join("/")}`;
  if (AUTH_PATHS.some((p) => matches(path, p))) return fallbackUrl;

  const target = hasLocale
    ? parsed.pathname
    : `/${locale}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  return `${target}${parsed.search}${parsed.hash}`;
}
