"use client";

import { useContext } from 'react';
import { I18nContext } from './provider';
import type { Namespace } from './config';
import type { TranslationKey, Dictionary } from '@/types/i18n.types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTranslations<T extends Namespace>(_namespace?: T) {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslations must be used within an I18nProvider');
  }

  const { locale, messages, setLocale } = context;

  // We cast messages back to the specific dictionary type
  const dict = messages as Dictionary<T>;

  // Return a translation function that takes a key from the dictionary
  const t = (key: TranslationKey<T> | string): string => {
    const keys = (key as string).split('.');
    let value: unknown = dict;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key as string;
      }
    }
    return typeof value === 'string' ? value : (key as string);
  };

  return { t, locale, setLocale };
}
