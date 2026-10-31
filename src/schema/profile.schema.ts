import { z } from "zod";
import type { Dictionary } from "@/types/i18n.types";

const noHtmlRegex = /<[a-z\/][^>]*>/i;

export const getNameSchema = (dict: Dictionary<"schema_profile">) => z.object({
  first_name: z.string()
    .trim()
    .min(1, dict.name.firstNameRequired)
    .max(50, dict.name.firstNameMax)
    .regex(/^[\p{L}\s\-']+$/u, dict.name.firstNameFormat),
  last_name: z.string()
    .trim()
    .min(1, dict.name.lastNameRequired)
    .max(50, dict.name.lastNameMax)
    .regex(/^[\p{L}\s\-']+$/u, dict.name.lastNameFormat),
});

export const getUsernameSchema = (dict: Dictionary<"schema_profile">) => z.object({
  username: z.string()
    .trim()
    .toLowerCase()
    .min(3, dict.username.min)
    .max(30, dict.username.max)
    .regex(/^[a-z0-9_]+$/, dict.username.format),
});

export const getBioSchema = (dict: Dictionary<"schema_profile">) => z.object({
  bio: z.string()
    .trim()
    .max(500, dict.bio.max)
    .refine((val) => !noHtmlRegex.test(val), { message: dict.noHtml })
    .nullish(),
});

export const getPronounsSchema = (dict: Dictionary<"schema_profile">) => z.object({
  pronouns: z.string()
    .trim()
    .max(20, dict.pronouns.max)
    .refine((val) => !noHtmlRegex.test(val), { message: dict.noHtml })
    .nullish(),
});

export const getAddressSchema = (dict: Dictionary<"schema_profile">) => z.object({
  address_1: z.string()
    .trim()
    .min(1, dict.address.line1Required)
    .max(100, dict.address.line1Max)
    .refine((val) => !noHtmlRegex.test(val), { message: dict.noHtml }),
  address_2: z.string()
    .trim()
    .max(100, dict.address.line2Max)
    .refine((val) => !val || !noHtmlRegex.test(val), { message: dict.noHtml })
    .nullish(),
  city: z.string()
    .trim()
    .min(1, dict.address.cityRequired)
    .max(50, dict.address.cityMax)
    .refine((val) => !noHtmlRegex.test(val), { message: dict.noHtml }),
  state: z.string()
    .trim()
    .max(50, dict.address.stateMax)
    .refine((val) => !val || !noHtmlRegex.test(val), { message: dict.noHtml })
    .nullish(),
  zip_code: z.string()
    .trim()
    .min(1, dict.address.zipRequired)
    .max(20, dict.address.zipMax)
    .refine((val) => !noHtmlRegex.test(val), { message: dict.noHtml }),
  country: z.string()
    .trim()
    .min(1, dict.address.countryRequired)
    .max(50, dict.address.countryMax)
    .refine((val) => !noHtmlRegex.test(val), { message: dict.noHtml }),
});

export type NameValues = z.infer<ReturnType<typeof getNameSchema>>;
export type UsernameValues = z.infer<ReturnType<typeof getUsernameSchema>>;
export type BioValues = z.infer<ReturnType<typeof getBioSchema>>;
export type PronounsValues = z.infer<ReturnType<typeof getPronounsSchema>>;
export type AddressValues = z.infer<ReturnType<typeof getAddressSchema>>;
