import { z } from "zod";
import type { TranslationKey } from "@/types/i18n.types";

const noHtmlRegex = /<[a-z\/][^>]*>/i;

export const getNameSchema = (t: (key: TranslationKey<"schema_profile">) => string) => z.object({
  first_name: z.string()
    .trim()
    .min(1, t("name.firstNameRequired"))
    .max(50, t("name.firstNameMax"))
    .regex(/^[\p{L}\s\-']+$/u, t("name.firstNameFormat")),
  last_name: z.string()
    .trim()
    .min(1, t("name.lastNameRequired"))
    .max(50, t("name.lastNameMax"))
    .regex(/^[\p{L}\s\-']+$/u, t("name.lastNameFormat")),
});

export const getUsernameSchema = (t: (key: TranslationKey<"schema_profile">) => string) => z.object({
  username: z.string()
    .trim()
    .toLowerCase()
    .min(3, t("username.min"))
    .max(30, t("username.max"))
    .regex(/^[a-z0-9_]+$/, t("username.format")),
});

export const getBioSchema = (t: (key: TranslationKey<"schema_profile">) => string) => z.object({
  bio: z.string()
    .trim()
    .max(500, t("bio.max"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") })
    .nullish(),
});

export const getPronounsSchema = (t: (key: TranslationKey<"schema_profile">) => string) => z.object({
  pronouns: z.string()
    .trim()
    .max(20, t("pronouns.max"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") })
    .nullish(),
});

export const getAddressSchema = (t: (key: TranslationKey<"schema_profile">) => string) => z.object({
  address_1: z.string()
    .trim()
    .min(1, t("address.line1Required"))
    .max(100, t("address.line1Max"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") }),
  address_2: z.string()
    .trim()
    .max(100, t("address.line2Max"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") })
    .nullish(),
  city: z.string()
    .trim()
    .min(1, t("address.cityRequired"))
    .max(50, t("address.cityMax"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") }),
  state: z.string()
    .trim()
    .max(50, t("address.stateMax"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") })
    .nullish(),
  zip_code: z.string()
    .trim()
    .min(1, t("address.zipRequired"))
    .max(20, t("address.zipMax"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") }),
  country: z.string()
    .trim()
    .min(1, t("address.countryRequired"))
    .max(50, t("address.countryMax"))
    .refine((val) => !noHtmlRegex.test(val), { message: t("noHtml") }),
});

export type NameValues = z.infer<ReturnType<typeof getNameSchema>>;
export type UsernameValues = z.infer<ReturnType<typeof getUsernameSchema>>;
export type BioValues = z.infer<ReturnType<typeof getBioSchema>>;
export type PronounsValues = z.infer<ReturnType<typeof getPronounsSchema>>;
export type AddressValues = z.infer<ReturnType<typeof getAddressSchema>>;