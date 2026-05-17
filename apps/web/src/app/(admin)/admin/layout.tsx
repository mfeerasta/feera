import Link from 'next/link';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/admin/clubs', label: 'Clubs' },
  { href: '/admin/courts', label: 'Courts' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/tournaments', label: 'Tournaments' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-feera-cream">
      <aside className="w-60 shrink-0 border-e border-feera-court/10 bg-white">
        <div className="px-6 py-5">
          <Link href="/" className="text-sm uppercase tracking-widest text-feera-court">
            feera admin
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-feera-charcoal hover:bg-feera-court/5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
