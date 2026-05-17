import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { gateAdmin } from '@/lib/admin/gate';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  listOpenDisputes,
  resolveDispute,
} from '@/lib/matches/service';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ admin?: string }>;
}

async function resolveAction(formData: FormData): Promise<void> {
  'use server';
  const disputeId = String(formData.get('disputeId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (
    !disputeId ||
    (status !== 'upheld' && status !== 'rejected' && status !== 'reviewed')
  ) {
    return;
  }
  const session = await getSession();
  if (!session) return;
  if (session.role !== 'platform_admin') return;
  await withRequestContext(session, (tx) =>
    resolveDispute(tx, disputeId, session.userId, {
      status: status as 'upheld' | 'rejected' | 'reviewed',
    }),
  );
  revalidatePath('/admin/matches/disputes');
}

export default async function AdminDisputesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  gateAdmin(sp);
  const session = await getSession();
  const rows = session
    ? await withRequestContext(session, (tx) => listOpenDisputes(tx, 100))
    : [];

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          Triage
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-[color:var(--color-fg)]">
          Open match disputes.
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          {rows.length === 0
            ? 'Nothing to triage.'
            : `${rows.length} dispute${rows.length === 1 ? '' : 's'} awaiting review.`}
        </p>
      </header>

      {rows.length > 0 && (
        <ul className="divide-y divide-[color:var(--color-border)] border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]">
          {rows.map(({ dispute, match }) => (
            <li key={dispute.id} className="space-y-3 px-6 py-5">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="font-serif text-lg tracking-tight text-[color:var(--color-fg)]">
                    {dispute.kind.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                    Match {match.id.slice(0, 8)} - score {match.teamASetsWon} vs {match.teamBSetsWon}
                  </p>
                </div>
                <span className="text-xs text-[color:var(--color-fg-muted)]">
                  {new Date(dispute.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-[color:var(--color-fg)]">{dispute.note}</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/admin/bookings?admin=1`}
                  className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] feera-motion hover:text-[color:var(--color-accent)]"
                >
                  View context
                </Link>
                <form action={resolveAction} className="contents">
                  <input type="hidden" name="disputeId" value={dispute.id} />
                  <input type="hidden" name="status" value="upheld" />
                  <button
                    type="submit"
                    className="feera-motion inline-flex h-10 items-center justify-center border border-[color:var(--color-accent)] px-5 text-sm text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)]"
                  >
                    Uphold
                  </button>
                </form>
                <form action={resolveAction} className="contents">
                  <input type="hidden" name="disputeId" value={dispute.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button
                    type="submit"
                    className="feera-motion inline-flex h-10 items-center justify-center border border-[color:var(--color-border)] px-5 text-sm text-[color:var(--color-fg-muted)] hover:border-red-500 hover:text-red-600"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
