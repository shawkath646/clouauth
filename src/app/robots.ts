import { getEnv } from "@/utils/utils";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getEnv("NEXT_PUBLIC_BASE_URL", true).replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/.well-known/"],
      disallow: [
        "/api/",
        "/*/profile/",
        "/*/consent",
        "/*/recovery",
        "/*/forgot-password",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}