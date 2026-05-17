'use client';

/**
 * Three-option locale switcher. Writes the `feera-locale` cookie and refreshes
 * the route so the server re-renders with the new dictionary and dir attribute.
 *
 * Styling matches the rest of the chrome: sharp corners, border, semantic
 * tokens. No external dependency.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_LABELS, type ShippedLocale } from '@feera/i18n';
import { useLocale, useT } from '@/lib/i18n/context';

const OPTIONS: readonly ShippedLocale[] = ['en', 'ur', 'ar'] as const;

function setLocaleCookie(locale: ShippedLocale) {
  // 1-year cookie, lax for normal browser navigation, path=/ so every route sees it.
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `feera-locale=${locale}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const current = useLocale();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const choose = useCallback(
    (locale: ShippedLocale) => {
      setLocaleCookie(locale);
      setOpen(false);
      router.refresh();
    },
    [router]
  );

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('localeSwitcher.label')}
        className="feera-motion inline-flex h-9 items-center justify-center gap-2 border border-[color:var(--color-border)] px-3 text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
      >
        <span aria-hidden>{LOCALE_LABELS[current]}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={t('localeSwitcher.label')}
          className="absolute end-0 z-50 mt-1 min-w-[140px] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-1 text-sm shadow-lg"
        >
          {OPTIONS.map((locale) => {
            const selected = locale === current;
            return (
              <li key={locale} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => choose(locale)}
                  dir={locale === 'ur' || locale === 'ar' ? 'rtl' : 'ltr'}
                  className={`feera-motion block w-full px-3 py-2 text-start hover:bg-[color:var(--color-accent)]/10 hover:text-[color:var(--color-accent)] ${
                    selected
                      ? 'text-[color:var(--color-fg)]'
                      : 'text-[color:var(--color-fg-muted)]'
                  }`}
                >
                  {LOCALE_LABELS[locale]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
