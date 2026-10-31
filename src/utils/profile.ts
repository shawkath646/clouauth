export const getDisplayName = (first: string, last: string) => `${first} ${last}`.trim();

export const getInitials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

export const formatMonthYear = (date: Date | string, locale: string) =>
  new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(date));