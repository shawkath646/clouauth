import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, type Locale, type Namespace } from './config';
import type { Dictionary, TranslationKey } from '@/types/i18n.types';
import { cache } from 'react';

export async function getLocale(): Promise<Locale> {
  // 1. Check user session cookie FIRST (Not the DB!)
  // e.g., const session = await getSession(); 
  // if (session?.user?.locale) return session.user.locale;

  // 2. Locale cookie (manual override)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  // 3. Accept-Language request header (Safely parsed)
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')?.[0]?.split('-')?.[0];
    if (preferredLocale && locales.includes(preferredLocale as Locale)) {
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
    schema_profile: () => import('@/lib/i18n/locales/en/schema_profile.json').then((module) => module.default),
    schema_security: () => import('@/lib/i18n/locales/en/schema_security.json').then((module) => module.default),
    schema_app: () => import('@/lib/i18n/locales/en/schema_app.json').then((module) => module.default),
    schema_auth: () => import('@/lib/i18n/locales/en/schema_auth.json').then((module) => module.default),
    profile_personal: () => import('@/lib/i18n/locales/en/profile_personal.json').then((module) => module.default),
    profile_security: () => import('@/lib/i18n/locales/en/profile_security.json').then((module) => module.default),
    profile_apps: () => import('@/lib/i18n/locales/en/profile_apps.json').then((module) => module.default),
    profile_nav: () => import('@/lib/i18n/locales/en/profile_nav.json').then((module) => module.default),
    landing: () => import('@/lib/i18n/locales/en/landing.json').then((module) => module.default),
    docs: () => import('@/lib/i18n/locales/en/docs.json').then((module) => module.default),
    developers: () => import('@/lib/i18n/locales/en/developers.json').then((module) => module.default),
    privacy: () => import('@/lib/i18n/locales/en/privacy.json').then((module) => module.default),
    terms: () => import('@/lib/i18n/locales/en/terms.json').then((module) => module.default),
  },
  bn: {
    signin: () => import('@/lib/i18n/locales/bn/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/bn/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/bn/common.json').then((module) => module.default),
    schema_profile: () => import('@/lib/i18n/locales/bn/schema_profile.json').then((module) => module.default),
    schema_security: () => import('@/lib/i18n/locales/bn/schema_security.json').then((module) => module.default),
    schema_app: () => import('@/lib/i18n/locales/bn/schema_app.json').then((module) => module.default),
    schema_auth: () => import('@/lib/i18n/locales/bn/schema_auth.json').then((module) => module.default),
    profile_personal: () => import('@/lib/i18n/locales/bn/profile_personal.json').then((module) => module.default),
    profile_security: () => import('@/lib/i18n/locales/bn/profile_security.json').then((module) => module.default),
    profile_apps: () => import('@/lib/i18n/locales/bn/profile_apps.json').then((module) => module.default),
    profile_nav: () => import('@/lib/i18n/locales/bn/profile_nav.json').then((module) => module.default),
    landing: () => import('@/lib/i18n/locales/bn/landing.json').then((module) => module.default),
    docs: () => import('@/lib/i18n/locales/bn/docs.json').then((module) => module.default),
    developers: () => import('@/lib/i18n/locales/bn/developers.json').then((module) => module.default),
    privacy: () => import('@/lib/i18n/locales/bn/privacy.json').then((module) => module.default),
    terms: () => import('@/lib/i18n/locales/bn/terms.json').then((module) => module.default),
  },
  ko: {
    signin: () => import('@/lib/i18n/locales/ko/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/ko/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/ko/common.json').then((module) => module.default),
    schema_profile: () => import('@/lib/i18n/locales/ko/schema_profile.json').then((module) => module.default),
    schema_security: () => import('@/lib/i18n/locales/ko/schema_security.json').then((module) => module.default),
    schema_app: () => import('@/lib/i18n/locales/ko/schema_app.json').then((module) => module.default),
    schema_auth: () => import('@/lib/i18n/locales/ko/schema_auth.json').then((module) => module.default),
    profile_personal: () => import('@/lib/i18n/locales/ko/profile_personal.json').then((module) => module.default),
    profile_security: () => import('@/lib/i18n/locales/ko/profile_security.json').then((module) => module.default),
    profile_apps: () => import('@/lib/i18n/locales/ko/profile_apps.json').then((module) => module.default),
    profile_nav: () => import('@/lib/i18n/locales/ko/profile_nav.json').then((module) => module.default),
    landing: () => import('@/lib/i18n/locales/ko/landing.json').then((module) => module.default),
    docs: () => import('@/lib/i18n/locales/ko/docs.json').then((module) => module.default),
    developers: () => import('@/lib/i18n/locales/ko/developers.json').then((module) => module.default),
    privacy: () => import('@/lib/i18n/locales/ko/privacy.json').then((module) => module.default),
    terms: () => import('@/lib/i18n/locales/ko/terms.json').then((module) => module.default),
  },
  es: {
    signin: () => import('@/lib/i18n/locales/es/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/es/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/es/common.json').then((module) => module.default),
    schema_profile: () => import('@/lib/i18n/locales/es/schema_profile.json').then((module) => module.default),
    schema_security: () => import('@/lib/i18n/locales/es/schema_security.json').then((module) => module.default),
    schema_app: () => import('@/lib/i18n/locales/es/schema_app.json').then((module) => module.default),
    schema_auth: () => import('@/lib/i18n/locales/es/schema_auth.json').then((module) => module.default),
    profile_personal: () => import('@/lib/i18n/locales/es/profile_personal.json').then((module) => module.default),
    profile_security: () => import('@/lib/i18n/locales/es/profile_security.json').then((module) => module.default),
    profile_apps: () => import('@/lib/i18n/locales/es/profile_apps.json').then((module) => module.default),
    profile_nav: () => import('@/lib/i18n/locales/es/profile_nav.json').then((module) => module.default),
    landing: () => import('@/lib/i18n/locales/es/landing.json').then((module) => module.default),
    docs: () => import('@/lib/i18n/locales/es/docs.json').then((module) => module.default),
    developers: () => import('@/lib/i18n/locales/es/developers.json').then((module) => module.default),
    privacy: () => import('@/lib/i18n/locales/es/privacy.json').then((module) => module.default),
    terms: () => import('@/lib/i18n/locales/es/terms.json').then((module) => module.default),
  },
  ar: {
    signin: () => import('@/lib/i18n/locales/ar/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/ar/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/ar/common.json').then((module) => module.default),
    schema_profile: () => import('@/lib/i18n/locales/ar/schema_profile.json').then((module) => module.default),
    schema_security: () => import('@/lib/i18n/locales/ar/schema_security.json').then((module) => module.default),
    schema_app: () => import('@/lib/i18n/locales/ar/schema_app.json').then((module) => module.default),
    schema_auth: () => import('@/lib/i18n/locales/ar/schema_auth.json').then((module) => module.default),
    profile_personal: () => import('@/lib/i18n/locales/ar/profile_personal.json').then((module) => module.default),
    profile_security: () => import('@/lib/i18n/locales/ar/profile_security.json').then((module) => module.default),
    profile_apps: () => import('@/lib/i18n/locales/ar/profile_apps.json').then((module) => module.default),
    profile_nav: () => import('@/lib/i18n/locales/ar/profile_nav.json').then((module) => module.default),
    landing: () => import('@/lib/i18n/locales/ar/landing.json').then((module) => module.default),
    docs: () => import('@/lib/i18n/locales/ar/docs.json').then((module) => module.default),
    developers: () => import('@/lib/i18n/locales/ar/developers.json').then((module) => module.default),
    privacy: () => import('@/lib/i18n/locales/ar/privacy.json').then((module) => module.default),
    terms: () => import('@/lib/i18n/locales/ar/terms.json').then((module) => module.default),
  },
  zh: {
    signin: () => import('@/lib/i18n/locales/zh/signin.json').then((module) => module.default),
    signup: () => import('@/lib/i18n/locales/zh/signup.json').then((module) => module.default),
    common: () => import('@/lib/i18n/locales/zh/common.json').then((module) => module.default),
    schema_profile: () => import('@/lib/i18n/locales/zh/schema_profile.json').then((module) => module.default),
    schema_security: () => import('@/lib/i18n/locales/zh/schema_security.json').then((module) => module.default),
    schema_app: () => import('@/lib/i18n/locales/zh/schema_app.json').then((module) => module.default),
    schema_auth: () => import('@/lib/i18n/locales/zh/schema_auth.json').then((module) => module.default),
    profile_personal: () => import('@/lib/i18n/locales/zh/profile_personal.json').then((module) => module.default),
    profile_security: () => import('@/lib/i18n/locales/zh/profile_security.json').then((module) => module.default),
    profile_apps: () => import('@/lib/i18n/locales/zh/profile_apps.json').then((module) => module.default),
    profile_nav: () => import('@/lib/i18n/locales/zh/profile_nav.json').then((module) => module.default),
    landing: () => import('@/lib/i18n/locales/zh/landing.json').then((module) => module.default),
    docs: () => import('@/lib/i18n/locales/zh/docs.json').then((module) => module.default),
    developers: () => import('@/lib/i18n/locales/zh/developers.json').then((module) => module.default),
    privacy: () => import('@/lib/i18n/locales/zh/privacy.json').then((module) => module.default),
    terms: () => import('@/lib/i18n/locales/zh/terms.json').then((module) => module.default),
  },
};

export async function getDictionary<T extends Namespace>(
  locale: Locale,
  namespace: T
): Promise<Dictionary<T>> {
  return dictionaries[locale][namespace]() as Promise<Dictionary<T>>;
}

function flattenDictionary(dict: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.keys(dict).reduce((acc: Record<string, string>, key: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    const value = dict[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(acc, flattenDictionary(value as Record<string, unknown>, pre + key));
    }
    else if (typeof value === 'string') {
      acc[pre + key] = value;
    }

    return acc;
  }, {} as Record<string, string>);
}

export const getServerTranslations = cache(async <T extends Namespace>(
  namespace: T
) => {
  const locale = await getLocale();
  const rawDict = await getDictionary(locale, namespace);

  const flatDict = flattenDictionary(rawDict);

  const t = (key: TranslationKey<T> | string): string => {
    return flatDict[key as keyof typeof flatDict] || key;
  };

  return { t, locale, dict: rawDict };
});