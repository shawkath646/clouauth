import { getEnv } from "@/utils/env";

const GOOGLE_RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const DEFAULT_MIN_SCORE = 0.5;

export interface VerifyRecaptchaOptions {
  /** Expected reCAPTCHA action name (e.g. 'signin', 'signup', 'verify_code') */
  expectedAction?: string;
  /** Minimum acceptable score between 0.0 and 1.0 (defaults to 0.5) */
  minScore?: number;
}

export interface VerifyRecaptchaResult {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  error?: string;
}

interface GoogleVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

/**
 * Server-side verification for Google reCAPTCHA v3 tokens.
 *
 * @param token - The reCAPTCHA token generated on the client via window.grecaptcha.execute()
 * @param options - Validation constraints such as expectedAction and minScore
 * @returns Result object containing success status, score, action, and optional error message
 */
export async function verifyRecaptcha(
  token: string | null | undefined,
  options: VerifyRecaptchaOptions = {}
): Promise<VerifyRecaptchaResult> {
  const isDev = process.env.NODE_ENV !== "production";
  const secretKey = process.env.RECAPTCHA_SECRET_KEY || getEnv("RECAPTCHA_SECRET_KEY", true);
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  // Development bypass: if no secret key is set, do not block local development
  if (!secretKey) {
    if (isDev) {
      console.warn(
        `[reCAPTCHA] RECAPTCHA_SECRET_KEY is not defined. Bypassing verification for action: "${options.expectedAction || "unspecified"}" in development.`
      );
      return { success: true, score: 1.0, action: options.expectedAction };
    }
    console.error("[reCAPTCHA] RECAPTCHA_SECRET_KEY is required in production.");
    return { success: false, error: "reCAPTCHA server configuration error." };
  }

  // Development bypass token from client when client site key was empty in dev
  if (isDev && token === "dev-mock-token") {
    console.warn(`[reCAPTCHA] Dev mock token received. Bypassing verification in development.`);
    return { success: true, score: 1.0, action: options.expectedAction };
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Security verification token is missing. Please refresh and try again.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());

    const res = await fetch(GOOGLE_RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      // 5-second timeout to avoid locking requests if Google is unreachable
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[reCAPTCHA] Verification request failed with HTTP ${res.status}`);
      return {
        success: false,
        error: "Failed to connect to security verification service.",
      };
    }

    const data = (await res.json()) as GoogleVerifyResponse;

    if (!data.success) {
      console.warn("[reCAPTCHA] Verification failed:", data["error-codes"]);
      return {
        success: false,
        error: "Security check failed. Please try again.",
      };
    }

    // Verify action match if specified
    if (options.expectedAction && data.action && data.action !== options.expectedAction) {
      console.warn(
        `[reCAPTCHA] Action mismatch: expected "${options.expectedAction}", received "${data.action}".`
      );
      return {
        success: false,
        action: data.action,
        score: data.score,
        error: "Security action mismatch. Please try again.",
      };
    }

    // Validate score threshold for v3
    if (typeof data.score === "number" && data.score < minScore) {
      console.warn(
        `[reCAPTCHA] Score (${data.score}) is below minimum threshold (${minScore}).`
      );
      return {
        success: false,
        score: data.score,
        action: data.action,
        error: "Suspicious activity detected. Security verification denied.",
      };
    }

    return {
      success: true,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
    };
  } catch (error) {
    console.error("[reCAPTCHA] Verification exception:", error);
    if (isDev) {
      console.warn("[reCAPTCHA] Error during verification in dev mode; bypassing to prevent lockouts.");
      return { success: true, score: 1.0, action: options.expectedAction };
    }
    return {
      success: false,
      error: "Security verification service encountered an unexpected error.",
    };
  }
}
