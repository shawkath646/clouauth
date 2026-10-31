import { z } from "zod";
import type { Dictionary } from "@/types/i18n.types";

export const getPasswordSchema = (dict: Dictionary<"schema_security">) => z.object({
  currentPassword: z.string().nullish(),
  newPassword: z.string()
    .min(8, dict.password.min)
    .max(100, dict.password.max)
    .regex(/[A-Z]/, dict.password.uppercase)
    .regex(/[a-z]/, dict.password.lowercase)
    .regex(/[0-9]/, dict.password.number)
    .regex(/[^A-Za-z0-9]/, dict.password.special),
});

export const getEmailSchema = (dict: Dictionary<"schema_security">) => z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .email(dict.email.invalid)
    .max(100, dict.email.max),
});

export const getPhoneSchema = (dict: Dictionary<"schema_security">) => z.object({
  phone: z.string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/, dict.phone.invalid),
});

export type PasswordValues = z.infer<ReturnType<typeof getPasswordSchema>>;
export type EmailValues = z.infer<ReturnType<typeof getEmailSchema>>;
export type PhoneValues = z.infer<ReturnType<typeof getPhoneSchema>>;
