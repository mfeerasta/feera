import type { Locale } from '@feera/types';

/**
 * Tiny stub translator. Returns the English string until M6 wires real i18n
 * via `@feera/i18n`. Keeping the call site shape stable so the M6 swap is
 * mechanical.
 *
 * TODO(M6): replace with `t` from `@feera/i18n` and load locale catalogues.
 */
export function t(locale: Locale, englishFallback: string): string {
  void locale;
  return englishFallback;
}
