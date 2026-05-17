import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { users } from '@feera/db';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { getT } from '@/lib/i18n/t';
import { OnboardingForm } from './onboarding-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * First-run profile completion. Redirects here from the sign-in callback when
 * the user has no display name OR no gender set. Three steps:
 *   1. display name + city
 *   2. gender (man / woman / prefer not to say)
 *   3. visibility + women-only pool opt-in
 */
export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    redirect('/sign-in?next=/onboarding');
  }

  const row = await withRequestContext(session, async (tx) => {
    const [u] = await tx
      .select({
        displayName: users.displayName,
        city: users.city,
        gender: users.gender,
        genderVisibility: users.genderVisibility,
        womenOnlyPoolOptIn: users.womenOnlyPoolOptIn,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    return u ?? null;
  });

  if (!row) {
    redirect('/sign-in?next=/onboarding');
  }

  // Already onboarded: bounce to /me.
  if (row.displayName && row.gender) {
    redirect('/me');
  }

  const t = await getT();
  return (
    <main className="min-h-screen bg-cream text-ink-deep">
      <header className="border-b border-ink-deep/10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5">
          <span className="font-serif text-2xl tracking-tight">feera</span>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-deep/60">
            {t('onboarding.title')}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-deep/60">
          {t('onboarding.subtitle')}
        </p>
        <h1 className="mt-3 font-serif text-5xl tracking-tight">
          {t('onboarding.title')}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-deep/70">
          {t('onboarding.privacyBody')}
        </p>

        <div className="mt-12">
          <OnboardingForm
            initial={{
              displayName: row.displayName ?? '',
              city: row.city ?? '',
              gender: row.gender ?? null,
              genderVisibility: row.genderVisibility ?? 'private',
              womenOnlyPoolOptIn: row.womenOnlyPoolOptIn ?? false,
            }}
          />
        </div>
      </section>
    </main>
  );
}
