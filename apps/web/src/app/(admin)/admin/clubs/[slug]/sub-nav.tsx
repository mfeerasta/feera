import Link from 'next/link';

const items = [
  { href: '', labelKey: 'clubAdmin.navOverview' },
  { href: '/calendar', labelKey: 'clubAdmin.navCalendar' },
  { href: '/courts', labelKey: 'clubAdmin.navCourts' },
  { href: '/revenue', labelKey: 'clubAdmin.navRevenue' },
  { href: '/members', labelKey: 'clubAdmin.navMembers' },
  { href: '/photos', labelKey: 'clubAdmin.navPhotos' },
];

export function ClubSubNav({
  slug,
  active,
  t,
}: {
  slug: string;
  active: string;
  t: (k: string) => string;
}) {
  const base = `/admin/clubs/${slug}`;
  return (
    <nav className="mb-8 flex flex-wrap gap-px border-b border-[color:var(--color-border)]">
      {items.map((it) => {
        const href = `${base}${it.href}`;
        const isActive = active === (it.href || '/');
        return (
          <Link
            key={it.href || 'overview'}
            href={href}
            className={
              'feera-motion px-4 py-2 text-xs uppercase tracking-[0.18em] ' +
              (isActive
                ? 'border-b-2 border-[color:var(--color-accent)] text-[color:var(--color-fg)]'
                : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]')
            }
          >
            {t(it.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
