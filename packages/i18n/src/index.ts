/**
 * i18n loaders. M6 wires next-intl + i18next properly. For M1 this just exports the
 * locale union + RTL helper so call sites compile.
 */

export const LOCALES = ['en', 'ur', 'ar', 'es', 'fr', 'it', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES = new Set<Locale>(['ur', 'ar']);

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export const DEFAULT_LOCALE: Locale = 'en';
