import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Styling ---
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// --- Name & Profile Formatting ---
export function getDisplayName(first?: string | null, last?: string | null): string {
  return `${first || ""} ${last || ""}`.trim();
}

export function getInitials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}
