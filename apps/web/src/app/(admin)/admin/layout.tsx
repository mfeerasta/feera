import Link from 'next/link';
import type { ReactNode } from 'react';
import { and, eq, isNull } from 'drizzle-orm';
import { clubs } from '@feera/db';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSession, withRequestContext } from '@/lib/api/request-context';

interface NavItem {
  href: string;
  label: string;
  showCount?: boolean;
}
const navItems: readonly NavItem[] = [
  { href: '/admin/clubs', label: 'Clubs' },
  { href: '/admin/clubs/pending', label: 'Pending clubs', showCount: true },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/matches/discover', label: 'Matches' },
  { href: '/admin/chats', label: 'Chats' },
  { href: '/admin/coaches', label: 'Coaches' },
];

async function pendingClubsCount(): Promise<number> {
  try {
    const session = await getSession();
    const rows = await withRequestContext(session, (tx) =>
      tx
        .select({ id: clubs.id })
        .from(clubs)
        .where(and(eq(clubs.approvalStatus, 'pending'), isNull(clubs.deletedAt))),
    );
    return rows.length;
  } catch {
    return 0;
  }
}

/**
 * Admin shell. Sidebar is always dark (operator focus mode); the working
 * area follows the user's theme choice so spreadsheets read well in light.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const pending = await pendingClubsCount();
  return (
    <div className="flex min-h-screen">
      <aside
        data-theme="dark"
        className="w-60 shrink-0 border-e border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
      >
        <div className="px-6 py-6">
          <Link href="/" className="feera-motion font-serif text-xl tracking-tight">
            feera
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
            Admin
          </p>
        </div>
        <nav className="flex flex-col gap-px px-3 pb-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="feera-motion group relative flex items-center justify-between px-3 py-2.5 text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
            >
              <span className="feera-motion absolute inset-y-2 -start-3 w-px bg-transparent group-hover:bg-[color:var(--color-accent)]" />
              <span>{item.label}</span>
              {item.showCount && pending > 0 ? (
                <span className="ms-2 inline-flex h-5 min-w-5 items-center justify-center border border-[color:var(--color-accent)] px-1.5 text-[10px] text-[color:var(--color-accent)]">
                  {pending}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="mt-auto" />
      </aside>
      <div className="flex flex-1 flex-col bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        <header className="flex items-center justify-end border-b border-[color:var(--color-border)] px-8 py-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              Dev admin
            </span>
            <Link
              href="/sign-in"
              className="feera-motion text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
            >
              Sign out
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
