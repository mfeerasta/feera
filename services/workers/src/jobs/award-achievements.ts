import { sql as drizzleSql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import type { Job, JobContext, JobResult } from '../types.js';

/**
 * Award detector. Every 30 minutes the cron picks up every non-deleted user,
 * evaluates the 12 achievement rules against live DB state, and inserts any
 * newly-satisfied rows into user_achievements (ON CONFLICT DO NOTHING so
 * reruns are idempotent). A small notification is enqueued for each new
 * award via the notifications outbox.
 *
 * Each user's evaluation is wrapped in a try/catch so one bad user does not
 * crash the whole run.
 *
 * Achievement ids are the catalogue keys seeded by
 * `packages/db/scripts/seed-achievements.mjs`.
 */

export type AchievementId =
  | 'first_match'
  | 'wins_10'
  | 'wins_50'
  | 'streak_5'
  | 'streak_10'
  | 'century'
  | 'founder_member'
  | 'social_butterfly'
  | 'mixer'
  | 'tournament_finalist'
  | 'tournament_champion'
  | 'early_bird';

export interface UserCandidate {
  id: string;
  createdAt: Date;
}

export interface UserSignals {
  matchCount: number;
  winCount: number;
  currentStreak: number;
  acceptedFriendsCount: number;
  distinctPartnersCount: number;
  isTournamentFinalist: boolean;
  isTournamentChampion: boolean;
  earlyBirdCount: number;
}

export interface AwardRow {
  userId: string;
  achievementId: AchievementId;
}

export interface AwardAchievementsDb {
  listLiveUsers(): Promise<UserCandidate[]>;
  loadSignals(userId: string): Promise<UserSignals>;
  listExistingAwards(userId: string): Promise<AchievementId[]>;
  insertAward(row: AwardRow): Promise<boolean>;
  enqueueAchievementNotification(
    userId: string,
    achievementId: AchievementId,
  ): Promise<void>;
}

export const ACHIEVEMENT_NAMES: Record<AchievementId, string> = {
  first_match: 'First Match',
  wins_10: '10 Wins',
  wins_50: '50 Wins',
  streak_5: '5-Match Win Streak',
  streak_10: '10-Match Win Streak',
  century: 'Century Club',
  founder_member: 'Founder Member',
  social_butterfly: 'Social Butterfly',
  mixer: 'Mixer',
  tournament_finalist: 'Tournament Finalist',
  tournament_champion: 'Tournament Champion',
  early_bird: 'Early Bird',
};

const FOUNDER_CUTOFF = new Date('2027-01-01T00:00:00Z');

export function evaluateRules(
  user: UserCandidate,
  signals: UserSignals,
): AchievementId[] {
  const out: AchievementId[] = [];
  if (signals.matchCount >= 1) out.push('first_match');
  if (signals.winCount >= 10) out.push('wins_10');
  if (signals.winCount >= 50) out.push('wins_50');
  if (signals.currentStreak >= 5) out.push('streak_5');
  if (signals.currentStreak >= 10) out.push('streak_10');
  if (signals.matchCount >= 100) out.push('century');
  if (user.createdAt < FOUNDER_CUTOFF) out.push('founder_member');
  if (signals.acceptedFriendsCount >= 25) out.push('social_butterfly');
  if (signals.distinctPartnersCount >= 20) out.push('mixer');
  if (signals.isTournamentFinalist) out.push('tournament_finalist');
  if (signals.isTournamentChampion) out.push('tournament_champion');
  if (signals.earlyBirdCount >= 10) out.push('early_bird');
  return out;
}

export interface AwardMetrics {
  usersChecked: number;
  newAwards: number;
  errored: number;
  notificationsEnqueued: number;
}

export async function runAwardDetector(
  handle: AwardAchievementsDb,
  ctx: JobContext,
): Promise<AwardMetrics> {
  const metrics: AwardMetrics = {
    usersChecked: 0,
    newAwards: 0,
    errored: 0,
    notificationsEnqueued: 0,
  };

  const users = await handle.listLiveUsers();
  ctx.log.info('award-achievements: starting', { userCount: users.length });

  for (const user of users) {
    metrics.usersChecked += 1;
    try {
      const signals = await handle.loadSignals(user.id);
      const due = evaluateRules(user, signals);
      if (due.length === 0) continue;

      const existing = new Set(await handle.listExistingAwards(user.id));
      for (const achievementId of due) {
        if (existing.has(achievementId)) continue;
        if (ctx.dryRun) {
          ctx.log.info('award-achievements: would award', {
            userId: user.id,
            achievementId,
          });
          continue;
        }
        const inserted = await handle.insertAward({
          userId: user.id,
          achievementId,
        });
        if (inserted) {
          metrics.newAwards += 1;
          try {
            await handle.enqueueAchievementNotification(user.id, achievementId);
            metrics.notificationsEnqueued += 1;
          } catch (notifErr) {
            ctx.log.warn('award-achievements: notification enqueue failed', {
              userId: user.id,
              achievementId,
              error: notifErr instanceof Error ? notifErr.message : String(notifErr),
            });
          }
        }
      }
    } catch (err) {
      metrics.errored += 1;
      ctx.log.error('award-achievements: user crashed', err, { userId: user.id });
    }
  }

  return metrics;
}

/**
 * Live drizzle-backed implementation. All reads use raw SQL because most of
 * the rules are aggregations the drizzle query builder makes verbose.
 */
function liveDb(): AwardAchievementsDb {
  return {
    async listLiveUsers() {
      const rows = await db.execute<{ id: string; created_at: string | Date }>(drizzleSql`
        SELECT id, created_at FROM users WHERE deleted_at IS NULL
      `);
      const list = rows as unknown as Array<{ id: string; created_at: string | Date }>;
      return list.map((r) => ({
        id: r.id,
        createdAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
      }));
    },

    async loadSignals(userId) {
      const matchRows = await db.execute<{
        match_count: number;
        win_count: number;
      }>(drizzleSql`
        SELECT
          COUNT(*)::int AS match_count,
          COUNT(*) FILTER (
            WHERE verification_status = 'verified' AND (
              ((team_a_player_1 = ${userId} OR team_a_player_2 = ${userId}) AND team_a_sets_won > team_b_sets_won)
              OR
              ((team_b_player_1 = ${userId} OR team_b_player_2 = ${userId}) AND team_b_sets_won > team_a_sets_won)
            )
          )::int AS win_count
        FROM matches
        WHERE ${userId} IN (team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2)
      `);
      const matchAgg = (matchRows as unknown as Array<{ match_count: number; win_count: number }>)[0] ?? {
        match_count: 0,
        win_count: 0,
      };

      // Current consecutive win streak. Walk recent matches newest first,
      // count wins until a loss.
      const recentRows = await db.execute<{ won: boolean }>(drizzleSql`
        SELECT
          CASE
            WHEN (team_a_player_1 = ${userId} OR team_a_player_2 = ${userId})
              THEN team_a_sets_won > team_b_sets_won
            ELSE team_b_sets_won > team_a_sets_won
          END AS won
        FROM matches
        WHERE ${userId} IN (team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2)
        ORDER BY played_at DESC
        LIMIT 200
      `);
      const recent = recentRows as unknown as Array<{ won: boolean }>;
      let streak = 0;
      for (const r of recent) {
        if (r.won) streak += 1;
        else break;
      }

      const friendRows = await db.execute<{ n: number }>(drizzleSql`
        SELECT COUNT(*)::int AS n
        FROM friendships
        WHERE status = 'accepted'
          AND (requester_user_id = ${userId} OR addressee_user_id = ${userId})
      `);
      const friendCount = (friendRows as unknown as Array<{ n: number }>)[0]?.n ?? 0;

      const partnerRows = await db.execute<{ n: number }>(drizzleSql`
        SELECT COUNT(DISTINCT partner)::int AS n
        FROM (
          SELECT CASE
            WHEN team_a_player_1 = ${userId} THEN team_a_player_2
            WHEN team_a_player_2 = ${userId} THEN team_a_player_1
            WHEN team_b_player_1 = ${userId} THEN team_b_player_2
            WHEN team_b_player_2 = ${userId} THEN team_b_player_1
          END AS partner
          FROM matches
          WHERE ${userId} IN (team_a_player_1, team_a_player_2, team_b_player_1, team_b_player_2)
        ) p
        WHERE partner IS NOT NULL AND partner <> ${userId}
      `);
      const distinctPartners = (partnerRows as unknown as Array<{ n: number }>)[0]?.n ?? 0;

      // Tournament champion / finalist: find any tournament where the user's
      // registration was on the winning or losing side of the highest-ordinal
      // round (the final).
      const tournamentRows = await db.execute<{
        champion: boolean;
        finalist: boolean;
      }>(drizzleSql`
        WITH user_regs AS (
          SELECT id AS reg_id, tournament_id
          FROM tournament_registrations
          WHERE user_id = ${userId} OR partner_user_id = ${userId}
        ),
        finals AS (
          SELECT m.*, ur.reg_id AS user_reg_id
          FROM tournament_matches m
          JOIN tournament_rounds r ON r.id = m.round_id
          JOIN user_regs ur ON ur.tournament_id = m.tournament_id
          WHERE m.status = 'completed'
            AND m.team_a_sets_won IS NOT NULL
            AND r.ordinal = (
              SELECT MAX(ordinal) FROM tournament_rounds
              WHERE tournament_id = m.tournament_id
            )
        )
        SELECT
          BOOL_OR(
            (team_a_registration_id = user_reg_id AND team_a_sets_won > team_b_sets_won)
            OR (team_b_registration_id = user_reg_id AND team_b_sets_won > team_a_sets_won)
          ) AS champion,
          BOOL_OR(
            (team_a_registration_id = user_reg_id AND team_a_sets_won < team_b_sets_won)
            OR (team_b_registration_id = user_reg_id AND team_b_sets_won < team_a_sets_won)
          ) AS finalist
        FROM finals
      `);
      const tAgg = (tournamentRows as unknown as Array<{
        champion: boolean | null;
        finalist: boolean | null;
      }>)[0] ?? { champion: false, finalist: false };

      const earlyRows = await db.execute<{ n: number }>(drizzleSql`
        SELECT COUNT(*)::int AS n
        FROM booking_participants bp
        JOIN bookings b ON b.id = bp.booking_id
        WHERE bp.user_id = ${userId}
          AND bp.checked_in_at IS NOT NULL
          AND bp.checked_in_at BETWEEN (b.start_at - INTERVAL '30 minutes')
                                   AND (b.start_at + INTERVAL '5 minutes')
          AND EXTRACT(HOUR FROM b.start_at) < 9
      `);
      const earlyBirdCount = (earlyRows as unknown as Array<{ n: number }>)[0]?.n ?? 0;

      return {
        matchCount: Number(matchAgg.match_count ?? 0),
        winCount: Number(matchAgg.win_count ?? 0),
        currentStreak: streak,
        acceptedFriendsCount: Number(friendCount),
        distinctPartnersCount: Number(distinctPartners),
        isTournamentChampion: tAgg.champion === true,
        isTournamentFinalist: tAgg.finalist === true,
        earlyBirdCount: Number(earlyBirdCount),
      };
    },

    async listExistingAwards(userId) {
      const rows = await db.execute<{ achievement_id: AchievementId }>(drizzleSql`
        SELECT achievement_id FROM user_achievements WHERE user_id = ${userId}
      `);
      return (rows as unknown as Array<{ achievement_id: AchievementId }>).map(
        (r) => r.achievement_id,
      );
    },

    async insertAward(row) {
      const res = await db.execute<{ id: string }>(drizzleSql`
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (${row.userId}, ${row.achievementId})
        ON CONFLICT (user_id, achievement_id) DO NOTHING
        RETURNING id
      `);
      const list = res as unknown as Array<{ id: string }>;
      return list.length > 0;
    },

    async enqueueAchievementNotification(userId, achievementId) {
      const payload = {
        achievementId,
        achievementName: ACHIEVEMENT_NAMES[achievementId] ?? achievementId,
      };
      await db.execute(drizzleSql`
        INSERT INTO notifications_outbox (
          recipient_user_id, template, variables, urgency, state
        )
        VALUES (
          ${userId},
          'achievement_awarded',
          ${JSON.stringify(payload)}::jsonb,
          'low',
          'queued'
        )
      `);
    },
  };
}

export const awardAchievements: Job = {
  name: 'award-achievements',
  // Every 30 minutes at the top + half hour. croner 6-field with seconds.
  schedule: '0 */30 * * * *',
  async run(ctx: JobContext): Promise<JobResult> {
    const start = Date.now();
    try {
      const metrics = await runAwardDetector(liveDb(), ctx);
      const durationMs = Date.now() - start;
      ctx.log.info('award-achievements: done', {
        job: 'award-achievements',
        usersChecked: metrics.usersChecked,
        newAwards: metrics.newAwards,
        durationMs,
      });
      return {
        status: metrics.errored === 0 ? 'success' : 'partial',
        metrics: { ...metrics },
        durationMs,
      };
    } catch (err) {
      ctx.log.error('award-achievements crashed', err);
      return {
        status: 'failed',
        metrics: { usersChecked: 0, newAwards: 0, errored: 0, notificationsEnqueued: 0 },
        durationMs: Date.now() - start,
      };
    }
  },
};
