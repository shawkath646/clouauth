
// ----------------------------------
// Date Parsing
// ----------------------------------

interface TimestampLike {
  toDate(): Date;
}

function isTimestampLike(val: unknown): val is TimestampLike {
  return (
    typeof val === "object" &&
    val !== null &&
    "toDate" in val &&
    typeof (val as Record<string, unknown>).toDate === "function"
  );
}

export function toDate(val: unknown): Date {
  if (val instanceof Date) return val;

  if (isTimestampLike(val)) {
    const result = val.toDate();
    if (result instanceof Date && !isNaN(result.getTime())) {
      return result;
    }
  }

  if (typeof val === "string" || typeof val === "number") {
    const date = new Date(val);
    if (!isNaN(date.getTime())) return date;
  }

  return new Date();
}

export function toNullableDate(val: unknown): Date | null {
  if (val === null || val === undefined) return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  if (isTimestampLike(val)) {
    const date = val.toDate();
    return date instanceof Date && !isNaN(date.getTime()) ? date : null;
  }

  if (typeof val === "string" || typeof val === "number") {
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// ----------------------------------
// Formatting Types
// ----------------------------------

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
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  month?: Intl.DateTimeFormatOptions["month"];
  preferences?: {
    language?: string | null;
    timezone?: string | null;
  } | null;
  fallback?: string;
}

// ----------------------------------
// Internal Helpers
// ----------------------------------

function getLocaleOptions(options: FormatTimeOptions) {
  return {
    locale:
      options.locale ||
      options.preferences?.language ||
      undefined,

    timeZone:
      options.timezone ||
      options.preferences?.timezone ||
      undefined,
  };
}

function formatDate(
  date: Date,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toLocaleDateString(locale);
  }
}

function formatRelative(
  date: Date,
  locale: string | undefined,
  timeZone: string | undefined
): string {
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);

  const units = [
    { limit: 60_000, divisor: 1_000, unit: "second" },
    { limit: 3_600_000, divisor: 60_000, unit: "minute" },
    { limit: 86_400_000, divisor: 3_600_000, unit: "hour" },
    { limit: 604_800_000, divisor: 86_400_000, unit: "day" },
    { limit: Infinity, divisor: 604_800_000, unit: "week" },
  ] as const;

  const selected = units.find(({ limit }) => abs < limit)!;

  try {
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
      style: "long",
    }).format(
      Math.round(diff / selected.divisor),
      selected.unit
    );
  } catch {
    return formatDate(date, locale, {
      month: "short",
      day: "numeric",
      ...(timeZone ? { timeZone } : {}),
    });
  }
}

// ----------------------------------
// Main Formatter
// ----------------------------------

export function formatTime(
  dateInput: Date | string | number | null | undefined,
  options: FormatTimeOptions = {}
): string {
  const { fallback = "—", format = "date", month } = options;

  if (dateInput === null || dateInput === undefined) {
    return fallback;
  }

  const date =
    dateInput instanceof Date
      ? dateInput
      : new Date(dateInput);

  if (isNaN(date.getTime())) return fallback;

  const { locale, timeZone } = getLocaleOptions(options);

  if (format === "relative") {
    return formatRelative(date, locale, timeZone);
  }

  const common = {
    ...(timeZone ? { timeZone } : {}),
  };

  const formatOptions: Intl.DateTimeFormatOptions =
    (() => {
      switch (format) {
        case "time":
          return {
            hour: "numeric",
            minute: "numeric",
            ...(options.timeStyle ? { timeStyle: options.timeStyle } : {}),
            ...common,
          };

        case "datetime":
        case "full":
          return {
            dateStyle: options.dateStyle || "medium",
            timeStyle: options.timeStyle || "short",
            ...common,
          };

        case "month-year":
          return {
            month: month || "long",
            year: "numeric",
            ...common,
          };

        default:
          return {
            ...(options.dateStyle
              ? { dateStyle: options.dateStyle }
              : {
                  year: "numeric",
                  month: month || "short",
                  day: "numeric",
                }),
            ...common,
          };
      }
    })();

  return formatDate(date, locale, formatOptions);
}
