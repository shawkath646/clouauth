export const locales = ['en', 'bn', 'ko', 'es', 'ar', 'zh'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

export const namespaces = ['common', 'signin', 'signup'] as const;
export type Namespace = typeof namespaces[number];
