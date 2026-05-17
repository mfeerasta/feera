'use client';

/**
 * Client-side locale + translator context. The root layout reads the active
 * locale on the server and renders this provider so client components can use
 * `useT()` without an extra round trip.
 *
 * The translator is built once per locale change. We pass the dictionary in
 * via props rather than re-importing it client-side, which keeps the JSON
 * payload to exactly the locale the user asked for.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  type Dictionary,
  type ShippedLocale,
} from '@feera/i18n';

type Vars = Record<string, string | number>;
type TFn = (key: string, vars?: Vars) => string;

type Ctx = {
  locale: ShippedLocale;
  dir: 'ltr' | 'rtl';
  t: TFn;
};

const I18nContext = createContext<Ctx | null>(null);

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split('.');
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

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: ShippedLocale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo<Ctx>(() => {
    const t: TFn = (key, vars) =>
      interpolate(lookup(dictionary, key) ?? key, vars);
    return {
      locale,
      dir: locale === 'ur' || locale === 'ar' ? 'rtl' : 'ltr',
      t,
    };
  }, [locale, dictionary]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Defensive default: render without crashing if a client component is
    // ever used outside the provider tree. Falls back to DEFAULT_LOCALE.
    return {
      locale: 'en' as ShippedLocale,
      dir: 'ltr',
      t: (key) => key,
    };
  }
  return ctx;
}

export function useT(): TFn {
  return useI18n().t;
}

export function useLocale(): ShippedLocale {
  return useI18n().locale;
}
