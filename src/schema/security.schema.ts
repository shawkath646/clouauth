import { z } from "zod";
import type { TranslationKey } from "@/types/i18n.types";

export const getPasswordSchema = (t: (key: TranslationKey<"schema_security">) => string) => z.object({
  currentPassword: z.string().nullish(),
  newPassword: z.string()
    .min(8, t("password.min"))
    .max(100, t("password.max"))
    .regex(/[A-Z]/, t("password.uppercase"))
    .regex(/[a-z]/, t("password.lowercase"))
    .regex(/[0-9]/, t("password.number"))
    .regex(/[^A-Za-z0-9]/, t("password.special")),
});

export const getEmailSchema = (t: (key: TranslationKey<"schema_security">) => string) => z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .email(t("email.invalid"))
    .max(100, t("email.max")),
});

export const getPhoneSchema = (t: (key: TranslationKey<"schema_security">) => string) => z.object({
  phone: z.string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/, t("phone.invalid")),
});

export type PasswordValues = z.infer<ReturnType<typeof getPasswordSchema>>;
export type EmailValues = z.infer<ReturnType<typeof getEmailSchema>>;
export type PhoneValues = z.infer<ReturnType<typeof getPhoneSchema>>;