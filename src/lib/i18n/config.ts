export const locales = ['en', 'bn', 'ko', 'es', 'ar', 'zh'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

export const namespaces = [
  'common',
  'signin',
  'signup',
  'schema_profile',
  'schema_security',
  'schema_app',
  'schema_auth',
  'profile_personal',
  'profile_security',
  'profile_apps',
  'profile_nav',
  'landing',
  'docs',
  'developers',
  'privacy',
  'terms',
] as const;
export type Namespace = typeof namespaces[number];
