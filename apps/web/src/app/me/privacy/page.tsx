import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { users } from '@feera/db';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { PrivacyForm } from './privacy-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/me/privacy');

  const row = await withRequestContext(session, async (tx) => {
    const [u] = await tx
      .select({
        gender: users.gender,
        genderVisibility: users.genderVisibility,
        womenOnlyPoolOptIn: users.womenOnlyPoolOptIn,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    return u ?? null;
  });
  if (!row) redirect('/sign-in?next=/me/privacy');

  return (
    <main className="min-h-screen bg-cream text-ink-deep">
      <header className="border-b border-ink-deep/10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            feera
          </Link>
          <Link href="/me" className="text-xs uppercase tracking-[0.25em] text-ink-deep/60 hover:text-court">
            Back to profile
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/60">
          Privacy
        </p>
        <h1 className="mt-3 font-serif text-5xl tracking-tight">
          Pool and privacy.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-deep/70">
          Control who sees your gender, and opt in or out of the women only
          matchmaking pool. Everything saves immediately.
        </p>

        <div className="mt-10">
          <PrivacyForm
            initial={{
              gender: (row.gender === 'm' || row.gender === 'f' || row.gender === 'x')
                ? row.gender
                : null,
              genderVisibility: row.genderVisibility,
              womenOnlyPoolOptIn: row.womenOnlyPoolOptIn,
            }}
          />
        </div>
      </section>
    </main>
  );
}
