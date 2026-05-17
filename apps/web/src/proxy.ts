/**
 * Next 16 proxy (formerly middleware). Resolves the active locale on every
 * request and exposes it via the `x-feera-locale` request header so server
 * components can read it without an extra cookie parse.
 *
 * Resolution order:
 *   1. `feera-locale` cookie set by the locale switcher.
 *   2. First language in the `Accept-Language` header that we ship.
 *   3. DEFAULT_LOCALE (en).
 *
 * Keep this fast: every request runs it. No I/O, no JSON parse, just header
 * sniffing.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  SHIPPED_LOCALES,
  type ShippedLocale,
} from '@feera/i18n';

const FALLBACK: ShippedLocale = 'en';

function pickFromAcceptLanguage(header: string | null): ShippedLocale | null {
  if (!header) return null;
  const entries = header
    .split(',')
    .map((part) => {
      const [tag, q = 'q=1'] = part.trim().split(';');
      const quality = Number(q.replace('q=', '')) || 0;
      return { tag: (tag ?? '').toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of entries) {
    const primary = tag.split('-')[0] as ShippedLocale;
    if ((SHIPPED_LOCALES as readonly string[]).includes(primary)) {
      return primary;
    }
  }
  return null;
}

export function proxy(request: NextRequest): NextResponse {
  const cookieLocale = request.cookies.get('feera-locale')?.value;
  let locale: ShippedLocale = FALLBACK;

  if (
    cookieLocale &&
    (SHIPPED_LOCALES as readonly string[]).includes(cookieLocale)
  ) {
    locale = cookieLocale as ShippedLocale;
  } else {
    const fromHeader = pickFromAcceptLanguage(
      request.headers.get('accept-language')
    );
    if (fromHeader) locale = fromHeader;
  }

  const headers = new Headers(request.headers);
  headers.set('x-feera-locale', locale);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Skip Next internals, static assets, and API routes that do not render HTML.
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)',
  ],
};
