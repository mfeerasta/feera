import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

interface CoachDetail {
  userId: string;
  coachId: string;
  displayName: string;
  city: string | null;
  countryCode: string;
  bio: string | null;
  languages: string[];
  specialties: string[];
  certifications: Array<{ title?: string; issuer?: string; year?: number }>;
  yearsExperience: number | null;
  hourlyRate: number;
  hourlyRateMax: number | null;
  currency: string;
  introVideoUrl: string | null;
  responseTimeAvgHours: number;
  isVerifiedByFeera: boolean;
  isEditionEndorsed: boolean;
  averageRating: number | null;
  ratingCount: number;
  verificationDocuments?: Array<{
    kind: string;
    url: string;
    label?: string;
    uploadedAt?: string;
  }>;
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return fetch(`${proto}://${host}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-feera-dev-admin': '1',
      ...(init?.headers ?? {}),
    },
  });
}

async function verifyAction(formData: FormData) {
  'use server';
  const userId = String(formData.get('userId') ?? '');
  if (!userId) return;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  await fetch(`${proto}://${host}/api/v1/coaches/${encodeURIComponent(userId)}/verify`, {
    method: 'POST',
    headers: { 'x-feera-dev-admin': '1' },
  });
  revalidatePath(`/admin/coaches/${userId}`);
  revalidatePath('/admin/coaches');
  redirect(`/admin/coaches/${userId}`);
}

async function rejectAction(formData: FormData) {
  'use server';
  const userId = String(formData.get('userId') ?? '');
  if (!userId) return;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  await fetch(`${proto}://${host}/api/v1/coaches/${encodeURIComponent(userId)}/reject`, {
    method: 'POST',
    headers: { 'x-feera-dev-admin': '1' },
  });
  revalidatePath(`/admin/coaches/${userId}`);
  revalidatePath('/admin/coaches');
  redirect('/admin/coaches');
}

export default async function AdminCoachDetail({ params }: PageProps) {
  const { userId } = await params;
  const res = await adminFetch(`/api/v1/coaches/${encodeURIComponent(userId)}`);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <p className="text-sm text-red-600">
        Failed to load coach (HTTP {res.status}).
      </p>
    );
  }
  const { data: coach } = (await res.json()) as { data: CoachDetail };

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/coaches"
        className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
      >
        All coaches
      </Link>
      <h1 className="mt-3 font-serif text-3xl tracking-tight">{coach.displayName}</h1>
      <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
        {coach.countryCode}
        {coach.city ? ` · ${coach.city}` : ''} ·{' '}
        {coach.isVerifiedByFeera ? (
          <span className="text-court">Verified</span>
        ) : (
          <span className="text-brass">Pending verification</span>
        )}
      </p>

      <section className="mt-8 border border-[color:var(--color-border)] p-4">
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Profile
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm">{coach.bio ?? 'No bio'}</p>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-[color:var(--color-fg-muted)]">Hourly rate</dt>
          <dd className="text-end tabular-nums">
            {coach.currency} {Math.round(coach.hourlyRate)}
            {coach.hourlyRateMax ? ` to ${Math.round(coach.hourlyRateMax)}` : ''} / hr
          </dd>
          <dt className="text-[color:var(--color-fg-muted)]">Years experience</dt>
          <dd className="text-end">{coach.yearsExperience ?? '—'}</dd>
          <dt className="text-[color:var(--color-fg-muted)]">Languages</dt>
          <dd className="text-end">{coach.languages.join(', ') || '—'}</dd>
          <dt className="text-[color:var(--color-fg-muted)]">Specialties</dt>
          <dd className="text-end">{coach.specialties.join(', ') || '—'}</dd>
          <dt className="text-[color:var(--color-fg-muted)]">Response time</dt>
          <dd className="text-end">{coach.responseTimeAvgHours}h</dd>
          <dt className="text-[color:var(--color-fg-muted)]">Intro video</dt>
          <dd className="text-end">
            {coach.introVideoUrl ? (
              <a
                className="text-[color:var(--color-accent)] underline-offset-4 hover:underline"
                href={coach.introVideoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            ) : (
              '—'
            )}
          </dd>
        </dl>
      </section>

      <section className="mt-6 border border-[color:var(--color-border)] p-4">
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Certifications
        </h2>
        {coach.certifications.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">None submitted.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {coach.certifications.map((c, i) => (
              <li key={i}>
                {c.title} · {c.issuer}
                {c.year ? ` · ${c.year}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 border border-[color:var(--color-border)] p-4">
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Verification documents
        </h2>
        {(coach.verificationDocuments ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">No documents uploaded.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {(coach.verificationDocuments ?? []).map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span>
                  <span className="text-[color:var(--color-fg-muted)]">[{d.kind}]</span>{' '}
                  {d.label ?? d.url}
                </span>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--color-accent)] underline-offset-4 hover:underline"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex items-center gap-3">
        <form action={verifyAction}>
          <input type="hidden" name="userId" value={coach.userId} />
          <button
            type="submit"
            className="inline-flex h-10 items-center border border-court bg-court/10 px-5 text-sm text-court hover:bg-court/20"
          >
            {coach.isVerifiedByFeera ? 'Re-verify' : 'Verify and publish'}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="userId" value={coach.userId} />
          <button
            type="submit"
            className="inline-flex h-10 items-center border border-red-600/50 bg-red-600/5 px-5 text-sm text-red-600 hover:bg-red-600/15"
          >
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}
