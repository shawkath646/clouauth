import "server-only";

const DEFAULT_SCOPES = ["openid", "profile", "email"] as const;

/**
 * Robustly parses OAuth client scopes stored as JSON arrays, comma-separated, or space-separated strings.
 */
export function parseClientScopes(rawScopes: string | null | undefined): string[] {
  if (!rawScopes?.trim()) {
    return [...DEFAULT_SCOPES];
  }

  const trimmed = rawScopes.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const scopes = parsed.map((s) => String(s).trim()).filter(Boolean);
        return scopes.length > 0 ? scopes : [...DEFAULT_SCOPES];
      }
    } catch {
      // Fall through to regex split on malformed JSON
    }
  }

  const split = trimmed.split(/[\s,]+/).filter(Boolean);
  return split.length > 0 ? split : [...DEFAULT_SCOPES];
}

/**
 * Safely parses registered redirect URIs from stored database string or array.
 */
export function parseRedirectUris(rawUris: unknown): string[] {
  if (Array.isArray(rawUris)) {
    return rawUris.map(String).filter(Boolean);
  }
  if (typeof rawUris === "string" && rawUris.trim()) {
    try {
      const parsed = JSON.parse(rawUris);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}
