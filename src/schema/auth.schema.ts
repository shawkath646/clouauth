import { z } from "zod";
import type { TranslationKey } from "@/types/i18n.types";

const noHtmlRegex = /<[a-z\/][^>]*>/i;

export const getSignInSchema = (t: (key: TranslationKey<"schema_auth">) => string) => z.object({
  username: z.string()
    .trim()
    .min(1, t("signIn.usernameRequired"))
    .max(100),
  password: z.string()
    .min(1, t("signIn.passwordRequired"))
    .max(100),
  rememberMe: z.boolean().default(true),
});

export const getSignUpSchema = (t: (key: TranslationKey<"schema_auth">) => string) => z.object({
  firstName: z.string()
    .trim()
    .min(1, t("signUp.firstNameRequired"))
    .max(50)
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" }),
  lastName: z.string()
    .trim()
    .min(1, t("signUp.lastNameRequired"))
    .max(50)
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" }),
  email: z.string()
    .trim()
    .toLowerCase()
    .min(1, t("signUp.emailRequired")) 
    .email(t("signUp.emailInvalid"))
    .max(100),
  password: z.string()
    .min(6, t("signUp.passwordMin"))
    .max(100),
});

export type SignInValues = z.infer<ReturnType<typeof getSignInSchema>>;
export type SignUpValues = z.infer<ReturnType<typeof getSignUpSchema>>;