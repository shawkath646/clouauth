import { getEnv } from "@/utils/env.server";

// --- Cookie Options ---
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
  expires?: Date;
}

export const getSecureCookieOptions = (
  options: Partial<CookieOptions> = {}
): CookieOptions => {
  const domain = getEnv("COOKIE_DOMAIN", true) || undefined;
  return {
    httpOnly: true,
    secure: getEnv("NODE_ENV", true) === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    ...(domain ? { domain } : {}),
    ...options,
  };
};
