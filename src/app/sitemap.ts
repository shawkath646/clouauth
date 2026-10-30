import { getEnv } from "@/utils/env";
import { locales } from "@/lib/i18n/config";
import type { MetadataRoute } from "next";

// Deterministic timestamp for static sitemap prerendering in Next.js 16
const SITEMAP_LAST_MODIFIED = new Date("2026-10-01T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (getEnv("NEXT_PUBLIC_BASE_URL", true) || "https://clouburstlab.com").replace(/\/$/, "");

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "monthly" as const },
    { path: "/signin", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/signup", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/docs", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/developers", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/forgot-password", priority: 0.6, changeFrequency: "yearly" as const },
  ];

  return routes.map((route) => {
    const fullUrl = `${baseUrl}${route.path}`;
    const languages: Record<string, string> = {};
    for (const loc of locales) {
      const sep = route.path ? "?" : "?";
      languages[loc] = `${fullUrl}${sep}locale=${loc}`;
    }
    languages["x-default"] = fullUrl;

    return {
      url: fullUrl,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages,
      },
    };
  });
}
