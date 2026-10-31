import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "@/lib/i18n/config";
import { getEnv } from "@/utils/utils";

const routes = [
  { path: "", priority: 1.0, changeFrequency: "monthly" as const },
  { path: "/docs", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/developers", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.5, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getEnv("NEXT_PUBLIC_BASE_URL", true).replace(/\/$/, "");

  return routes.flatMap(({ path, priority, changeFrequency }) => {
    const languages = Object.fromEntries(
      locales.map((locale) => [
        locale,
        `${baseUrl}/${locale}${path}`,
      ])
    );

    languages["x-default"] = `${baseUrl}/${defaultLocale}${path}`;

    return locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      changeFrequency,
      priority,
      alternates: {
        languages,
      },
    }));
  });
}