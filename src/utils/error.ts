const isErrorObject = (e: unknown): e is Record<string, unknown> => {
    return typeof e === "object" && e !== null;
};

export function handleError(
    error: unknown,
    contextOrReturnRaw?: string | boolean
): string {
    if (isErrorObject(error) && typeof error.digest === "string") {
        if (error.digest.startsWith("NEXT_") || error.digest === "DYNAMIC_SERVER_USAGE") {
            throw error;
        }
    }

    let rawMessage = "An unexpected error occurred.";

    if (isErrorObject(error)) {
        if ("clientVersion" in error) {
            rawMessage = "A database error occurred.";
        } else if (error instanceof Error) {
            rawMessage = error.message;
        } else if (typeof error.message === "string") {
            rawMessage = error.message;
        } else {
            try {
                rawMessage = JSON.stringify(error);
            } catch {
                rawMessage = String(error);
            }
        }
    } else if (typeof error === "string") {
        rawMessage = error;
    } else {
        rawMessage = String(error);
    }

    const logContext = typeof contextOrReturnRaw === "string" ? contextOrReturnRaw : "Unhandled";
    console.error(`[Error] ${logContext}:`, error);

    if (contextOrReturnRaw === true) return rawMessage;
    if (typeof contextOrReturnRaw === "string") return contextOrReturnRaw;

    return "An unexpected error occurred.";
}

export function getErrorCode(error: unknown): string | undefined {
    if (isErrorObject(error) && typeof error.code === "string") {
        return error.code;
    }
    return undefined;
}