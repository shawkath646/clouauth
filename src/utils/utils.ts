import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
  expires?: Date;
}

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const getSecureCookieOptions = (
  options: Partial<CookieOptions> = {}
): CookieOptions => {
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    ...(domain ? { domain } : {}),
    ...options,
  };
};

export function getEnv(key: string, optional: boolean = false): string {
  const value = process.env[key];
  if (!value && !optional) {
    throw new Error(`Environment variable ${key} is required but not defined.`);
  }
  return value || "";
}

