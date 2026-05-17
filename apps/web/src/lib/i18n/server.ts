/**
 * Server-side locale resolution. Reads the `x-feera-locale` header set by
 * `apps/web/src/proxy.ts` and falls back to the cookie or DEFAULT_LOCALE.
 *
 * Next 16 requires `headers()` and `cookies()` to be awaited. All exports
 * here are async to match.
 */

import { headers, cookies } from 'next/headers';
import {
  SHIPPED_LOCALES,
  type ShippedLocale,
} from '@feera/i18n';

const FALLBACK: ShippedLocale = 'en';

function isShipped(value: string | undefined | null): value is ShippedLocale {
  return (
    !!value && (SHIPPED_LOCALES as readonly string[]).includes(value)
  );
}

export async function getLocale(): Promise<ShippedLocale> {
  const h = await headers();
  const fromHeader = h.get('x-feera-locale');
  if (isShipped(fromHeader)) return fromHeader;

  // Fallback path (e.g. when the proxy matcher does not run for a route).
  const c = await cookies();
  const fromCookie = c.get('feera-locale')?.value;
  if (isShipped(fromCookie)) return fromCookie;

  return FALLBACK;
}
