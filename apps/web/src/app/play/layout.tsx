import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { getT } from '@/lib/i18n/t';

/**
 * Player-facing chrome. Dark nav strip over theme-aware content area.
 * The nav itself is always dark (`data-theme='dark'`) so it stays consistent
 * regardless of page theme; the main content inherits the page theme.
 */
export default async function PlayLayout({ children }: { children: ReactNode }) {
  const t = await getT();

  const links: { href: string; key: string }[] = [
    { href: '/play/clubs', key: 'nav.clubs' },
    { href: '/play/open', key: 'nav.openMatches' },
    { href: '/play/coaches', key: 'nav.coaches' },
    { href: '/play/bookings', key: 'nav.myBookings' },
    { href: '/me', key: 'nav.profile' },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header
        data-theme="dark"
        className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="feera-motion font-serif text-2xl tracking-tight"
          >
            feera
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
              >
                {t(link.key)}
              </Link>
            ))}
            <Link
              href="/sign-in"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              {t('common.signIn')}
            </Link>
            <LocaleSwitcher />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
