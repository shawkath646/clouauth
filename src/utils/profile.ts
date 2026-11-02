import { formatTime } from "@/utils/utils";

export const getDisplayName = (first: string, last: string) => `${first} ${last}`.trim();

export const getInitials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

export const formatMonthYear = (date: Date | string, locale: string) =>
  formatTime(date, { format: "month-year", locale });
