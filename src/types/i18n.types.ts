import type common from '@/lib/i18n/locales/en/common.json';
import type signin from '@/lib/i18n/locales/en/signin.json';
import type signup from '@/lib/i18n/locales/en/signup.json';
import type schema_profile from '@/lib/i18n/locales/en/schema_profile.json';
import type schema_security from '@/lib/i18n/locales/en/schema_security.json';
import type schema_app from '@/lib/i18n/locales/en/schema_app.json';
import type schema_auth from '@/lib/i18n/locales/en/schema_auth.json';
import type profile_personal from '@/lib/i18n/locales/en/profile_personal.json';
import type profile_security from '@/lib/i18n/locales/en/profile_security.json';
import type profile_apps from '@/lib/i18n/locales/en/profile_apps.json';
import type profile_nav from '@/lib/i18n/locales/en/profile_nav.json';
import type landing from '@/lib/i18n/locales/en/landing.json';
import type docs from '@/lib/i18n/locales/en/docs.json';
import type developers from '@/lib/i18n/locales/en/developers.json';
import type privacy from '@/lib/i18n/locales/en/privacy.json';
import type terms from '@/lib/i18n/locales/en/terms.json';

export type Dictionaries = {
  common: typeof common;
  signin: typeof signin;
  signup: typeof signup;
  schema_profile: typeof schema_profile;
  schema_security: typeof schema_security;
  schema_app: typeof schema_app;
  schema_auth: typeof schema_auth;
  profile_personal: typeof profile_personal;
  profile_security: typeof profile_security;
  profile_apps: typeof profile_apps;
  profile_nav: typeof profile_nav;
  landing: typeof landing;
  docs: typeof docs;
  developers: typeof developers;
  privacy: typeof privacy;
  terms: typeof terms;
};

export type Dictionary<T extends keyof Dictionaries> = Dictionaries[T];

// Simplified to avoid TS memory leak
export type TranslationKey<T extends keyof Dictionaries> = any;
