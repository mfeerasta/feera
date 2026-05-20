import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, achievements, userAchievements, userRatings, friendships } from '@feera/db';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/api/request-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Achievements — Feera',
  description: 'Badges you have unlocked. Earn more by playing.',
};

interface AchievementRow {
  id: string;
  category: string;
  icon: string;
  points: number;
}

interface UnlockedRow {
  achievementId: string;
  awardedAt: Date;
}

// Static label table — short of i18n until K1 lands the keys.
const LABELS: Record<string, { name: string; description: string; progress?: (signals: ProgressSignals) => string }> = {
  first_match: {
    name: 'First match',
    description: 'Record your first verified match.',
    progress: (s) => `${Math.min(s.matchCount, 1)}/1 matches`,
  },
  wins_10: {
    name: 'Ten wins',
    description: 'Win 10 verified matches.',
    progress: (s) => `${Math.min(s.wins, 10)}/10 wins`,
  },
  wins_50: {
    name: 'Fifty wins',
    description: 'Win 50 verified matches.',
    progress: (s) => `${Math.min(s.wins, 50)}/50 wins`,
  },
  streak_5: {
    name: 'Five in a row',
    description: 'String together a 5-match winning streak.',
    progress: (s) => `${s.currentStreak} match win streak`,
  },
  streak_10: {
    name: 'Ten in a row',
    description: 'String together a 10-match winning streak.',
    progress: (s) => `${s.currentStreak} match win streak`,
  },
  century: {
    name: 'Century',
    description: 'Play 100 matches on Feera.',
    progress: (s) => `${Math.min(s.matchCount, 100)}/100 matches`,
  },
  founder_member: {
    name: 'Founder',
    description: 'Joined Feera in 2026.',
  },
  social_butterfly: {
    name: 'Social butterfly',
    description: 'Accept 25 friend requests.',
    progress: (s) => `${Math.min(s.friendCount, 25)}/25 friends`,
  },
  mixer: {
    name: 'Mixer',
    description: 'Play with 20 different partners.',
    progress: (s) => `${Math.min(s.partnerCount, 20)}/20 partners`,
  },
  tournament_finalist: {
    name: 'Finalist',
    description: 'Reach a tournament final.',
  },
  tournament_champion: {
    name: 'Champion',
    description: 'Win a tournament.',
  },
  early_bird: {
    name: 'Early bird',
    description: 'Check in to ten morning bookings before 9am.',
  },
};

interface ProgressSignals {
  matchCount: number;
  wins: number;
  currentStreak: number;
  friendCount: number;
  partnerCount: number;
}

export default async function MyAchievementsPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/me/achievements');
  const userId = session.userId;

  const catalogue = (await db
    .select({
      id: achievements.id,
      category: achievements.category,
      icon: achievements.icon,
      points: achievements.points,
    })
    .from(achievements)) as AchievementRow[];

  const unlocked = (await db
    .select({
      achievementId: userAchievements.achievementId,
      awardedAt: userAchievements.awardedAt,
    })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.awardedAt))) as UnlockedRow[];

  const unlockedSet = new Set(unlocked.map((u) => u.achievementId));
  const awardedAtById = new Map(unlocked.map((u) => [u.achievementId, u.awardedAt]));

  // Progress signals (one round-trip each).
  const ratingsRow = await db
    .select({ matchCount: userRatings.matchCount })
    .from(userRatings)
    .where(eq(userRatings.userId, userId))
    .limit(1);
  const matchCount = ratingsRow[0]?.matchCount ?? 0;

  const friendsCountRows = await db
    .select({ n: count() })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        sql`(${friendships.requesterUserId} = ${userId} OR ${friendships.addresseeUserId} = ${userId})`,
      ),
    );
  const friendCount = Number(friendsCountRows[0]?.n ?? 0);

  const signals: ProgressSignals = {
    matchCount,
    wins: 0, // cheap-skipped; the worker computes the real number on award.
    currentStreak: 0,
    friendCount,
    partnerCount: 0,
  };

  const ordered = [...catalogue].sort((a, b) => {
    const aLocked = !unlockedSet.has(a.id) ? 1 : 0;
    const bLocked = !unlockedSet.has(b.id) ? 1 : 0;
    if (aLocked !== bLocked) return aLocked - bLocked;
    return a.points - b.points;
  });

  return (
    <>
      <section className="bg-ink-shadow text-cream">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/60">Achievements</p>
          <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">
            Your badges.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream/70">
            Twelve achievements across progress, milestones, streaks, social,
            and tournaments. Unlocked badges show on your public profile.
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-cream/50">
            {unlocked.length} of {catalogue.length} unlocked
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-bg)] text-[var(--color-fg)]">
        <div className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ordered.map((a) => {
              const isUnlocked = unlockedSet.has(a.id);
              const label = LABELS[a.id] ?? { name: a.id, description: '' };
              const at = awardedAtById.get(a.id);
              return (
                <article
                  key={a.id}
                  className={`flex flex-col gap-3 border p-6 transition-colors duration-150 ${
                    isUnlocked
                      ? 'border-[var(--color-border)] bg-paper'
                      : 'border-[var(--color-border)] bg-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-serif text-3xl ${
                        isUnlocked ? 'text-court' : 'text-[var(--color-fg-muted)]'
                      }`}
                    >
                      {a.icon}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                      {a.category} · {a.points} pts
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl tracking-tight">{label.name}</h2>
                  <p className="text-sm leading-relaxed text-[var(--color-fg-muted)]">
                    {label.description}
                  </p>
                  {isUnlocked ? (
                    <p className="mt-auto text-[10px] uppercase tracking-[0.2em] text-court">
                      Unlocked {at ? new Date(at).toLocaleDateString() : ''}
                    </p>
                  ) : label.progress ? (
                    <p className="mt-auto text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                      {label.progress(signals)}
                    </p>
                  ) : (
                    <p className="mt-auto text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                      Locked
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <p className="mt-12 text-sm text-[var(--color-fg-muted)]">
            <Link href="/me" className="underline hover:text-court">
              Back to profile
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
