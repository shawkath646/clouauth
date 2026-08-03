import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    if (error && typeof error === "object") {
        if ("message" in error && typeof error.message === "string") {
            return error.message;
        }

        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }

    return String(error);
}

export function getErrorCode(e: unknown): string | undefined {
    if (e && typeof e === "object" && "code" in e && typeof e.code === "string") {
        return e.code;
    }
    return undefined;
}
