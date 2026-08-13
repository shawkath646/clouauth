"use client";

import React, { createContext, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Namespace, Locale } from './config';
import { defaultLocale } from './config';
import type { Dictionary } from '@/types/i18n.types';
import { setUserLocale } from './client';

type I18nContextType<T extends Namespace> = {
  locale: Locale;
  messages: Dictionary<T>;
  setLocale: (locale: string) => void;
};

// We use `any` here because the provider is polymorphic regarding the namespace dictionary it receives.
// The hook will provide strict typing based on the namespace used.
export const I18nContext = createContext<I18nContextType<Namespace> | null>(null);

export function I18nProvider<T extends Namespace>({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale?: Locale;
  messages: Dictionary<T>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const existingContext = React.useContext(I18nContext);
  
  const mergedLocale = locale || existingContext?.locale || defaultLocale;
  const mergedMessages = {
    ...(existingContext?.messages || {}),
    ...messages
  };

  const handleSetLocale = React.useCallback((newLocale: string) => {
    setUserLocale(newLocale);
    startTransition(() => {
      import("@/actions/profile/personal-info.actions").then(m => {
        m.updateProfilePreferences({ language: newLocale }).catch(() => {});
      });
      router.refresh();
    });
  }, [router]);

  const contextValue = React.useMemo(() => ({
    locale: mergedLocale,
    messages: mergedMessages,
    setLocale: handleSetLocale
  }), [mergedLocale, mergedMessages, handleSetLocale]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}
