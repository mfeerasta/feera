import Link from 'next/link';
import { headers } from 'next/headers';

interface CoachRow {
  userId: string;
  displayName: string;
  countryCode: string;
  city: string | null;
  hourlyRate: number;
  currency: string;
  isVerifiedByFeera: boolean;
  averageRating: number | null;
  ratingCount: number;
  specialties: string[];
}

interface PageProps {
  searchParams: Promise<{ status?: 'pending' | 'verified' | 'all' }>;
}

async function fetchCoaches(verified?: boolean): Promise<CoachRow[]> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const qs = new URLSearchParams({ limit: '200' });
  if (verified !== undefined) qs.set('isVerified', verified ? 'true' : 'false');
  const res = await fetch(`${base}/api/v1/coaches?${qs.toString()}`, {
    cache: 'no-store',
    headers: { 'x-feera-dev-admin': '1' },
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { data: CoachRow[] };
  return j.data;
}

export default async function AdminCoachesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = sp.status ?? 'pending';
  let rows: CoachRow[] = [];
  if (status === 'all') {
    const [pending, verified] = await Promise.all([fetchCoaches(false), fetchCoaches(true)]);
    rows = [...pending, ...verified];
  } else {
    rows = await fetchCoaches(status === 'verified');
  }

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Coaches</h1>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        Review and verify coach applications. Verified coaches appear in the
        marketplace at /play/coaches.
      </p>

      <nav className="mt-6 flex gap-2 text-xs uppercase tracking-[0.18em]">
        {(['pending', 'verified', 'all'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/coaches?status=${s}`}
            className={`border px-3 py-1.5 ${
              s === status
                ? 'border-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                : 'border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-[color:var(--color-fg-muted)]">
          No coaches match this filter.
        </p>
      ) : (
        <table className="mt-8 w-full border-collapse border border-[color:var(--color-border)] text-sm">
          <thead className="bg-[color:var(--color-bg-elev)] text-[10px] uppercase tracking-[0.18em]">
            <tr>
              <th className="border border-[color:var(--color-border)] px-3 py-2 text-start">Coach</th>
              <th className="border border-[color:var(--color-border)] px-3 py-2 text-start">Location</th>
              <th className="border border-[color:var(--color-border)] px-3 py-2 text-start">Rate</th>
              <th className="border border-[color:var(--color-border)] px-3 py-2 text-start">Status</th>
              <th className="border border-[color:var(--color-border)] px-3 py-2 text-start">Rating</th>
              <th className="border border-[color:var(--color-border)] px-3 py-2 text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td className="border border-[color:var(--color-border)] px-3 py-2">
                  <div className="font-medium">{r.displayName}</div>
                  <div className="text-[11px] text-[color:var(--color-fg-muted)]">
                    {r.specialties.slice(0, 3).join(', ')}
                  </div>
                </td>
                <td className="border border-[color:var(--color-border)] px-3 py-2">
                  {r.countryCode}
                  {r.city ? ` · ${r.city}` : ''}
                </td>
                <td className="border border-[color:var(--color-border)] px-3 py-2 tabular-nums">
                  {r.currency} {Math.round(r.hourlyRate)} / hr
                </td>
                <td className="border border-[color:var(--color-border)] px-3 py-2">
                  {r.isVerifiedByFeera ? (
                    <span className="text-court">Verified</span>
                  ) : (
                    <span className="text-brass">Pending</span>
                  )}
                </td>
                <td className="border border-[color:var(--color-border)] px-3 py-2 tabular-nums">
                  {r.averageRating != null
                    ? `${r.averageRating.toFixed(1)} (${r.ratingCount})`
                    : '—'}
                </td>
                <td className="border border-[color:var(--color-border)] px-3 py-2 text-end">
                  <Link
                    href={`/admin/coaches/${r.userId}`}
                    className="text-[color:var(--color-accent)] underline-offset-4 hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
