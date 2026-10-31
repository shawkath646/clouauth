import { z } from "zod";
import type { Dictionary } from "@/types/i18n.types";

const noHtmlRegex = /<[a-z\/][^>]*>/i;

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
  redirect_uris: z.array(
    z.object({
      value: z.url(dict.redirectUriUrl)
    })
  ).min(1, dict.redirectUriMin),
  scopes: z.array(z.string()).min(1, dict.scopesMin),
});

export type ApplicationValues = z.infer<ReturnType<typeof getApplicationSchema>>;
