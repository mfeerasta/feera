import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api/request-context';
import { DeleteAccountFlow } from './delete-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Delete your account — Feera',
  description: 'Permanently delete your Feera account, with a 7 day grace period to cancel.',
};

interface Params {
  searchParams: Promise<{ token?: string }>;
}

export default async function DeletePage({ searchParams }: Params) {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in?next=/me/delete');
  }
  const { token } = await searchParams;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)]">
          Account
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Delete your account</h1>
        <p className="mt-6 text-base leading-relaxed text-[color:var(--color-fg-muted)]">
          Deleting your account removes your profile, rating, chat memberships,
          and personal contact details. For data integrity reasons, anonymised
          references remain on bookings, matches, and payments your opponents
          rely on. You have a 7 day grace period to cancel before purge runs.
        </p>

        <section className="mt-10 border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] p-6">
          <h2 className="font-serif text-xl tracking-tight">Before you continue</h2>
          <ul className="mt-4 space-y-2 text-sm text-[color:var(--color-fg-muted)]">
            <li>Download your data first if you want a copy.</li>
            <li>Any active Edition membership stays billed through the end of its current term.</li>
            <li>Outstanding match disputes you opened will be auto-closed.</li>
            <li>You will be signed out everywhere once the purge runs.</li>
          </ul>
        </section>

        <div className="mt-10">
          <DeleteAccountFlow initialToken={token ?? null} />
        </div>
      </main>
    </div>
  );
}
