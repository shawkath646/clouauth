import type common from '@/lib/i18n/locales/en/common.json';
import type signin from '@/lib/i18n/locales/en/signin.json';
import type signup from '@/lib/i18n/locales/en/signup.json';

export type Dictionaries = {
  common: typeof common;
  signin: typeof signin;
  signup: typeof signup;
};

export type Dictionary<T extends keyof Dictionaries> = Dictionaries[T];

export type TranslationKey<T extends keyof Dictionaries> = keyof Dictionaries[T];
