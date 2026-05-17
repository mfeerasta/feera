import Link from 'next/link';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/admin/clubs', label: 'Clubs' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/matches/discover', label: 'Matches' },
  { href: '/admin/chats', label: 'Chats' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-e border-cream/10 bg-ink-deep text-cream">
        <div className="px-6 py-6">
          <Link href="/" className="font-serif text-xl tracking-tight text-cream">
            feera
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cream/40">
            Admin
          </p>
        </div>
        <nav className="flex flex-col gap-px px-3 pb-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex items-center px-3 py-2.5 text-sm text-cream/70 transition-colors duration-150 hover:text-cream"
            >
              <span className="absolute inset-y-2 -start-3 w-px bg-transparent group-hover:bg-court" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto" />
      </aside>
      <div className="flex flex-1 flex-col bg-cream text-ink-deep">
        <header className="flex items-center justify-end border-b border-ink-deep/10 px-8 py-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-ink-deep/50">
              Dev admin
            </span>
            <Link
              href="/sign-in"
              className="text-ink-deep transition-colors duration-150 hover:text-court"
            >
              Sign out
            </Link>
          </div>
        </header>
        <main className="flex-1 px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
