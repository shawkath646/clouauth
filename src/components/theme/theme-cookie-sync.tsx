"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Ensures theme synchronization across cookies and UI state.
 * If not logged in (or on initial render), reads theme from cookie.
 * Whenever theme changes, persists it to 'theme' and 'theme_pref' cookies.
 */
export function ThemeCookieSync() {
  const { theme, setTheme } = useTheme();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (typeof document === "undefined") return;

    // Check if theme or theme_pref cookie exists
    const match = document.cookie.match(/(?:^|; )(?:theme|theme_pref)=([^;]*)/);
    const cookieTheme = match ? decodeURIComponent(match[1]) : null;

    if (cookieTheme && ["light", "dark", "system"].includes(cookieTheme)) {
      if (theme !== cookieTheme) {
        setTheme(cookieTheme);
      }
    }
  }, [theme, setTheme]);

  useEffect(() => {
    if (!theme) return;
    document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `theme_pref=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  return null;
}
