import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, type Locale, type Namespace } from './config';
import type { Dictionary, TranslationKey } from '@/types/i18n.types';

export async function getLocale(): Promise<Locale> {
  // 1. Authenticated user's language preference (database)
  // TODO: Fetch user preference from database if logged in
  
  // 2. Locale cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }
  
  // 3. Accept-Language request header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (locales.includes(preferredLocale as Locale)) {
      return preferredLocale as Locale;
    }
  }
  
  // 4. Default locale
  return defaultLocale;
}

const dictionaries = {
  en: {
    signin: () => import('@/lib/i18n/locales/en/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/en/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/en/common.json').then((module) => module.default),
  },
  bn: {
    signin: () => import('@/lib/i18n/locales/bn/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/bn/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/bn/common.json').then((module) => module.default),
  },
  ko: {
    signin: () => import('@/lib/i18n/locales/ko/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/ko/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/ko/common.json').then((module) => module.default),
  },
  es: {
    signin: () => import('@/lib/i18n/locales/es/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/es/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/es/common.json').then((module) => module.default),
  },
  ar: {
    signin: () => import('@/lib/i18n/locales/ar/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/ar/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/ar/common.json').then((module) => module.default),
  },
  zh: {
    signin: () => import('@/lib/i18n/locales/zh/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/zh/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/zh/common.json').then((module) => module.default),
  },
};

export async function getDictionary<T extends Namespace>(
  locale: Locale,
  namespace: T
): Promise<Dictionary<T>> {
  return dictionaries[locale][namespace]() as Promise<Dictionary<T>>;
}
