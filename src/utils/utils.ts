import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CookieQueueItem } from "@/proxy";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const getSecureCookieOptions = (
    options: Partial<CookieQueueItem["options"]> = {}
): CookieQueueItem["options"] => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    ...options,
});
