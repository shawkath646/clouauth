import { getEnv } from "@/utils/env";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getEnv("NEXT_PUBLIC_BASE_URL");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/signin",
          "/signup",
          "/docs",
          "/developers",
          "/privacy",
          "/terms",
          "/forgot-password",
          "/p/",
          "/.well-known/",
        ],
        disallow: ["/profile/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
