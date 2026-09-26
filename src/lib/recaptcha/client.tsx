"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import Script from "next/script";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export interface ReCaptchaContextType {
  /**
   * Execute reCAPTCHA v3 with an action name and retrieve the token.
   * In non-production environments with no site key configured, returns a mock token.
   */
  executeRecaptcha: (action: string) => Promise<string | null>;
  /** True when the reCAPTCHA v3 script is loaded and ready for execution */
  isReady: boolean;
}

const ReCaptchaContext = createContext<ReCaptchaContextType>({
  executeRecaptcha: async () => null,
  isReady: false,
});

export interface ReCaptchaProviderProps {
  children: React.ReactNode;
  /** Optional custom site key. If omitted, uses process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY */
  siteKey: string;
}

export function ReCaptchaProvider({
  children,
  siteKey,
}: ReCaptchaProviderProps) {

  const [isLoaded, setIsLoaded] = useState(false);
  const isExecutingRef = useRef(false);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (typeof window === "undefined") return null;

      // In development mode, if the site key is not configured, bypass without breaking forms
      if (!siteKey) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[reCAPTCHA] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not defined. Returning dev mock token for action: "${action}".`
          );
          return "dev-mock-token";
        }
        console.error("[reCAPTCHA] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is missing.");
        return null;
      }

      return new Promise<string | null>((resolve) => {
        try {
          if (!window.grecaptcha) {
            console.warn("[reCAPTCHA] grecaptcha is not yet loaded on window.");
            resolve(process.env.NODE_ENV !== "production" ? "dev-mock-token" : null);
            return;
          }

          window.grecaptcha.ready(async () => {
            try {
              isExecutingRef.current = true;
              const token = await window.grecaptcha!.execute(siteKey, { action });
              resolve(token);
            } catch (err) {
              console.error(`[reCAPTCHA] Execution failed for action "${action}":`, err);
              resolve(process.env.NODE_ENV !== "production" ? "dev-mock-token" : null);
            } finally {
              isExecutingRef.current = false;
            }
          });
        } catch (err) {
          console.error("[reCAPTCHA] Unexpected error executing reCAPTCHA:", err);
          resolve(process.env.NODE_ENV !== "production" ? "dev-mock-token" : null);
        }
      });
    },
    [siteKey]
  );

  return (
    <ReCaptchaContext.Provider
      value={{ executeRecaptcha, isReady: isLoaded || !siteKey }}
    >
      {siteKey && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`}
          strategy="afterInteractive"
          onLoad={() => setIsLoaded(true)}
          onReady={() => setIsLoaded(true)}
          onError={(e) => console.error("[reCAPTCHA] Script failed to load:", e)}
        />
      )}
      {children}
    </ReCaptchaContext.Provider>
  );
}

/**
 * Hook to trigger reCAPTCHA v3 verification in client components.
 */
export function useReCaptcha(): ReCaptchaContextType {
  const context = useContext(ReCaptchaContext);
  if (!context) {
    throw new Error("useReCaptcha must be used within a ReCaptchaProvider");
  }
  return context;
}

/**
 * Reusable Google reCAPTCHA v3 compliance disclaimer.
 * Displayed under forms according to Google reCAPTCHA Terms of Service.
 */
export function ReCaptchaDisclaimer({
  className = "",
}: {
  className?: string;
}) {
  return (
    <p
      className={`text-[11px] text-muted-foreground/70 leading-relaxed select-none ${className}`}
    >
      This site is protected by reCAPTCHA and the Google{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary/80 underline underline-offset-2 hover:text-primary transition-colors"
      >
        Privacy Policy
      </a>{" "}
      and{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary/80 underline underline-offset-2 hover:text-primary transition-colors"
      >
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}
