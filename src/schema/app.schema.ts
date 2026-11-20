import { z } from "zod";
import type { Dictionary } from "@/types/i18n.types";

const noHtmlRegex = /<[a-z\/][^>]*>/i;

const DISALLOWED_REDIRECT_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
]);

export const getApplicationSchema = (dict: Dictionary<"schema_app">) => z.object({
  name: z.string()
    .trim()
    .min(2, dict.nameMin)
    .max(50, dict.nameMax)
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" }), 
  description: z.string()
    .trim()
    .max(200, dict.descriptionMax)
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" })
    .nullish(),
  website: z.url(dict.websiteUrl).optional().or(z.literal("")),
  icon: z.string().optional(),
  client_type: z.enum(["confidential", "public"]),
  redirect_uris: z.array(
    z.object({
      value: z.string().trim().min(1, dict.redirectUriMin).refine((val) => {
        if (!val || val.includes("*") || val.includes("#")) return false;
        try {
          const u = new URL(val);
          const protocol = u.protocol.toLowerCase();
          if (DISALLOWED_REDIRECT_SCHEMES.has(protocol)) {
            return false;
          }
          if (protocol === "http:") {
            return (
              u.hostname === "localhost" ||
              u.hostname === "127.0.0.1" ||
              u.hostname === "[::1]"
            );
          }
          if (protocol === "https:") {
            return Boolean(u.hostname);
          }
          return /^[a-z][a-z0-9+.-]*:$/.test(protocol);
        } catch {
          return false;
        }
      }, { message: dict.redirectUriUrl })
    })
  ).min(1, dict.redirectUriMin),
  scopes: z.array(z.string()).min(1, dict.scopesMin),
});

export type ApplicationValues = z.infer<ReturnType<typeof getApplicationSchema>>;
