/**
 * i18n core. Exposes the locale union, RTL helper, default locale, and JSON
 * dictionaries for every shipped locale. The runtime translator lives in
 * `apps/web/src/lib/i18n/*` so it can plug into Next 16 Server Component
 * APIs without dragging Node-only dependencies into shared packages.
 *
 * Phase 1 ships en + ur + ar with native-quality copy. es / fr / it / pt
 * remain in the union for Phase 2 and fall back to en at runtime.
 */

import enDict from './locales/en.json' with { type: 'json' };
import urDict from './locales/ur.json' with { type: 'json' };
import arDict from './locales/ar.json' with { type: 'json' };

export const LOCALES = ['en', 'ur', 'ar', 'es', 'fr', 'it', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES = new Set<Locale>(['ur', 'ar']);

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export const DEFAULT_LOCALE: Locale = 'en';

export const SHIPPED_LOCALES = ['en', 'ur', 'ar'] as const;
export type ShippedLocale = (typeof SHIPPED_LOCALES)[number];

export function isShippedLocale(locale: string): locale is ShippedLocale {
  return (SHIPPED_LOCALES as readonly string[]).includes(locale);
}

export type Dictionary = typeof enDict;

const DICTS: Record<ShippedLocale, Dictionary> = {
  en: enDict as Dictionary,
  ur: urDict as Dictionary,
  ar: arDict as Dictionary,
};

/**
 * Returns the dictionary for the given locale, falling back to English for
 * Phase 2 languages that are declared but not yet translated.
 */
export function getDictionary(locale: Locale): Dictionary {
  return isShippedLocale(locale) ? DICTS[locale] : DICTS.en;
}

/**
 * Locale display labels for switchers. Always render in the target script.
 */
export const LOCALE_LABELS: Record<ShippedLocale, string> = {
  en: 'English',
  ur: 'اردو',
  ar: 'العربية',
};

/**
 * Coerces an arbitrary string to a Locale, falling back to DEFAULT_LOCALE.
 * Accepts BCP-47 forms like `ur-PK`, `ar-SA`, `en-GB`.
 */
export function coerceLocale(input: string | undefined | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  const primary = input.toLowerCase().split(/[-_]/)[0] ?? DEFAULT_LOCALE;
  return (LOCALES as readonly string[]).includes(primary)
    ? (primary as Locale)
    : DEFAULT_LOCALE;
}
