import { z } from "zod";
import type { Dictionary } from "@/types/i18n.types";

const noHtmlRegex = /<[a-z\/][^>]*>/i;

export const getSignInSchema = (dict: Dictionary<"schema_auth">) => z.object({
  username: z.string()
    .trim()
    .min(1, dict.signIn.usernameRequired)
    .max(100),
  password: z.string()
    .min(1, dict.signIn.passwordRequired)
    .max(100),
  rememberMe: z.boolean().default(true),
});

export const getSignUpSchema = (dict: Dictionary<"schema_auth">) => z.object({
  firstName: z.string()
    .trim()
    .min(1, dict.signUp.firstNameRequired)
    .max(50)
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" }),
  lastName: z.string()
    .trim()
    .min(1, dict.signUp.lastNameRequired)
    .max(50)
    .refine((val) => !noHtmlRegex.test(val), { message: "HTML is not allowed!" }),
  email: z.string()
    .trim()
    .toLowerCase()
    .min(1, dict.signUp.emailRequired) 
    .email(dict.signUp.emailInvalid)
    .max(100),
  password: z.string()
    .min(8, dict.signUp.passwordMin)
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export type SignInValues = z.infer<ReturnType<typeof getSignInSchema>>;
export type SignUpValues = z.infer<ReturnType<typeof getSignUpSchema>>;
