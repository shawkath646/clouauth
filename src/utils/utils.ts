import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function handleError(error: unknown, contextOrReturnRaw?: string | boolean): string {
    // 0. Rethrow Next.js internal errors (redirect, notFound, dynamic server usage)
    if (error && typeof error === "object" && "digest" in error && typeof (error as Record<string, unknown>).digest === "string") {
        const digest = (error as Record<string, unknown>).digest as string;
        if (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE") {
            throw error;
        }
    }

    // 1. Parse raw error message
    let rawMessage = "An unexpected error occurred.";
    if (error && typeof error === "object" && "clientVersion" in error) {
        // Mask Prisma internal errors
        rawMessage = "A database error occurred.";
    } else if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === "string") {
        rawMessage = error;
    } else if (error && typeof error === "object") {
        if ("message" in error && typeof error.message === "string") {
            rawMessage = error.message;
        } else {
            try {
                rawMessage = JSON.stringify(error);
            } catch {
                rawMessage = String(error);
            }
        }
    } else {
        rawMessage = String(error);
    }

    // 2. Log it (can be extended to a central logging system later)
    console.error(`[Error] ${typeof contextOrReturnRaw === 'string' ? contextOrReturnRaw : 'Unhandled'}:`, error);

    // 3. Return appropriate message
    if (contextOrReturnRaw === true) {
        return rawMessage; // Return raw parsed message
    } else if (typeof contextOrReturnRaw === "string") {
        return contextOrReturnRaw; // Return generic message
    } else {
        return "An unexpected error occurred."; // Fallback generic
    }
}

export function getErrorCode(e: unknown): string | undefined {
    if (e && typeof e === "object" && "code" in e && typeof e.code === "string") {
        return e.code;
    }
    return undefined;
}
