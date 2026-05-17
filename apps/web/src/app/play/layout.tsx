import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Player-facing chrome. Dark forest nav over cream content.
 * flex.one-inspired per ADR-0010.
 */
export default function PlayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink-deep">
      <header className="border-b border-cream/10 bg-ink-deep text-cream">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-serif text-2xl tracking-tight text-cream"
          >
            feera
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/play/clubs"
              className="text-cream/80 transition-colors duration-150 hover:text-court"
            >
              Clubs
            </Link>
            <Link
              href="/play/open"
              className="text-cream/80 transition-colors duration-150 hover:text-court"
            >
              Open matches
            </Link>
            <Link
              href="/play/bookings"
              className="text-cream/80 transition-colors duration-150 hover:text-court"
            >
              My bookings
            </Link>
            <Link
              href="/sign-in"
              className="text-cream/60 transition-colors duration-150 hover:text-court"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
