import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Player-facing chrome. Dark nav strip over theme-aware content area.
 * The nav itself is always dark (`data-theme='dark'`) so it stays consistent
 * regardless of page theme; the main content inherits the page theme.
 */
export default function PlayLayout({ children }: { children: ReactNode }) {
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
            <Link
              href="/play/clubs"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Clubs
            </Link>
            <Link
              href="/play/open"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Open matches
            </Link>
            <Link
              href="/play/bookings"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              My bookings
            </Link>
            <Link
              href="/me"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Profile
            </Link>
            <Link
              href="/sign-in"
              className="feera-motion text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              Sign in
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
