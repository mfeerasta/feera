/**
 * Tiny translator. Looks up dotted keys against the dictionary for the active
 * locale, interpolates `{name}` placeholders, and falls back to the English
 * value (and finally the key itself) if anything is missing. The CI guard at
 * `packages/i18n/scripts/check-missing.mjs` makes "missing" a build error,
 * so the fallback is defensive, not a feature.
 *
 * Usage in a Server Component:
 *
 *   const t = await getT();
 *   t('home.heroTitle');                         // string
 *   t('payments.payNow', { amount: '$24.00' });  // interpolated
 */

import {
  getDictionary,
  DEFAULT_LOCALE,
  type Dictionary,
  type Locale,
} from '@feera/i18n';
import { getLocale } from './server';

type Vars = Record<string, string | number>;

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split('.');
  // The dictionary may be nested OR flat (keys like "section.basics" exist
  // verbatim inside an object). Try the flat path first so dotted keys map
  // to the literal property name, then fall back to a nested walk.
  // Cast through unknown to satisfy strict mode while we recurse a JSON tree.
  let node: unknown = dict;
  for (const part of parts) {
    if (
      node &&
      typeof node === 'object' &&
      part in (node as Record<string, unknown>)
    ) {
      node = (node as Record<string, unknown>)[part];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node === 'string') return node;

  // Flat fallback (handles literal dotted keys like `section.basics`).
  const flat = (dict as unknown as Record<string, unknown>)[key];
  return typeof flat === 'string' ? flat : undefined;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? `{${name}}` : String(value);
  });
}

export type TFn = (key: string, vars?: Vars) => string;

export function makeT(locale: Locale): TFn {
  const dict = getDictionary(locale);
  const fallback = getDictionary(DEFAULT_LOCALE);
  return (key, vars) => {
    const value = lookup(dict, key) ?? lookup(fallback, key);
    return interpolate(value ?? key, vars);
  };
}

/**
 * Convenience: resolve the active locale and return a translator in one call.
 * Use this in Server Components: `const t = await getT();`
 */
export async function getT(): Promise<TFn> {
  const locale = await getLocale();
  return makeT(locale);
}
