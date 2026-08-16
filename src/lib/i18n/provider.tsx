"use client";

import { createContext, useMemo, useCallback, useContext, useTransition, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Namespace, Locale } from './config';
import { defaultLocale } from './config';
import type { Dictionary } from '@/types/i18n.types';

type I18nContextType<T extends Namespace> = {
  locale: Locale;
  messages: Dictionary<T>;
  setLocale: (locale: string) => void;
  isPending: boolean;
};

export const I18nContext = createContext<I18nContextType<Namespace> | null>(null);

export function I18nProvider<T extends Namespace>({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale?: Locale;
  messages: Dictionary<T>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const existingContext = useContext(I18nContext);

  const mergedLocale = locale || existingContext?.locale || defaultLocale;

  const mergedMessages = useMemo(() => ({
    ...(existingContext?.messages || {}),
    ...messages
  }), [existingContext?.messages, messages]);

  const handleSetLocale = useCallback((newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    import("@/actions/profile/personal-info.actions")
      .then(m => m.updateProfilePreferences({ language: newLocale }))
      .catch((err) => { console.error("Failed to update profile lang:", err) });

    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const contextValue = useMemo(() => ({
    locale: mergedLocale,
    messages: mergedMessages,
    setLocale: handleSetLocale,
    isPending
  }), [mergedLocale, mergedMessages, handleSetLocale, isPending]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}