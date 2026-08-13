import { z } from "zod";
import type { TranslationKey } from "@/types/i18n.types";

const noHtmlRegex = /<[a-z\/][^>]*>/i;

export const getApplicationSchema = (t: (key: TranslationKey<"schema_app">) => string) => z.object({
  name: z.string()
    .trim()
    .min(2, t("nameMin"))
    .max(50, t("nameMax"))
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" }), 
  description: z.string()
    .trim()
    .max(200, t("descriptionMax"))
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" })
    .nullish(),
  website: z.url(t("websiteUrl")).optional().or(z.literal("")),
  icon: z.string().optional(),
  redirect_uris: z.array(
    z.object({
      value: z.url(t("redirectUriUrl"))
    })
  ).min(1, t("redirectUriMin")),
  scopes: z.array(z.string()).min(1, t("scopesMin")),
});

export type ApplicationValues = z.infer<ReturnType<typeof getApplicationSchema>>;