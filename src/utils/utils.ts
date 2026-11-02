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

export type TimeFormatStyle =
  | "date"
  | "time"
  | "datetime"
  | "relative"
  | "month-year"
  | "full";

export interface FormatTimeOptions {
  format?: TimeFormatStyle;
  locale?: string;
  timezone?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  preferences?: {
    language?: string | null;
    timezone?: string | null;
  } | null;
  fallback?: string;
}

/**
 * Centralized date/time formatter for UI display across ClouAuth.
 * Formats timestamps (typically from database query records) according to
 * user preferences (language/locale and timezone) or specified format style.
 */
export function formatTime(
  dateInput: Date | string | number | null | undefined,
  options: FormatTimeOptions = {}
): string {
  if (!dateInput) {
    return options.fallback ?? "—";
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    return options.fallback ?? "—";
  }

  const {
    format = "date",
    preferences,
    dateStyle,
    timeStyle,
    month,
  } = options;

  const locale = options.locale || preferences?.language || undefined;
  const timezone = options.timezone || preferences?.timezone || undefined;

  // Relative time format (e.g., "Just now", "5m ago", "2h ago", "3d ago", or formatted date)
  if (format === "relative") {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    // Older than 7 days: format as date
    try {
      const nowYear = new Date().getFullYear();
      const formatOptions: Intl.DateTimeFormatOptions = {
        month: month || "short",
        day: "numeric",
        ...(date.getFullYear() !== nowYear ? { year: "numeric" as const } : {}),
        ...(timezone ? { timeZone: timezone } : {}),
      };
      return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch {
      return date.toLocaleDateString(locale);
    }
  }

  // Month-Year format (e.g., "November 2026")
  if (format === "month-year") {
    try {
      const formatOptions: Intl.DateTimeFormatOptions = {
        month: month || "long",
        year: "numeric",
        ...(timezone ? { timeZone: timezone } : {}),
      };
      return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch {
      return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
    }
  }

  // Time only (e.g., "2:45 PM")
  if (format === "time") {
    try {
      const formatOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "numeric",
        ...(timeStyle ? { timeStyle } : {}),
        ...(timezone ? { timeZone: timezone } : {}),
      };
      return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch {
      return date.toLocaleTimeString(locale);
    }
  }

  // Date and Time (e.g., "Nov 2, 2026, 2:45 PM")
  if (format === "datetime" || format === "full") {
    try {
      const formatOptions: Intl.DateTimeFormatOptions = {
        dateStyle: dateStyle || "medium",
        timeStyle: timeStyle || "short",
        ...(timezone ? { timeZone: timezone } : {}),
      };
      return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch {
      return date.toLocaleString(locale);
    }
  }

  // Standard Date format (e.g., "Nov 2, 2026")
  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      ...(dateStyle
        ? { dateStyle }
        : {
            year: "numeric",
            month: month || "short",
            day: "numeric",
          }),
      ...(timezone ? { timeZone: timezone } : {}),
    };
    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  } catch {
    return date.toLocaleDateString(locale);
  }
}

export { getSafeReturnTo } from "./url";


