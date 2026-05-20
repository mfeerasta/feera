import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { userRatings, users } from '@feera/db';
import { fromDisplayRating } from '@feera/matching';
import {
  badRequest,
  fromZodError,
  notFound,
  ok,
  serverError,
  unauthorized,
} from '@/lib/api/responses';
import { getSession, withRequestContext } from '@/lib/api/request-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const answerKey = z.enum(['a', 'b', 'c']);
const skillQuizSchema = z
  .object({
    tennisYears: answerKey.optional(),
    padelMonths: answerKey.optional(),
    backWall: answerKey.optional(),
    attendance: answerKey.optional(),
    serve: answerKey.optional(),
    lob: answerKey.optional(),
    bandejaVibora: answerKey.optional(),
    tournaments: answerKey.optional(),
  })
  .strict();

const updateSchema = z.object({
  displayName: z.string().min(1).max(160).optional(),
  locale: z.enum(['en', 'ur', 'ar', 'es', 'fr', 'it', 'pt']).optional(),
  city: z.string().min(1).max(80).nullable().optional(),
  gender: z.enum(['m', 'f', 'x']).nullable().optional(),
  genderVisibility: z.enum(['public', 'friends', 'private']).optional(),
  womenOnlyPoolOptIn: z.boolean().optional(),
  bio: z.string().max(2000).nullable().optional(),
  skillQuizAnswers: skillQuizSchema.optional(),
  startingRating: z.number().min(0).max(7).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const result = await withRequestContext(session, async (tx) => {
      const [user] = await tx
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          phone: users.phone,
          locale: users.locale,
          countryCode: users.countryCode,
          city: users.city,
          gender: users.gender,
          genderVisibility: users.genderVisibility,
          profilePhotoUrl: users.profilePhotoUrl,
          bio: users.bio,
          editionMemberStatus: users.editionMemberStatus,
          isVerifiedCoach: users.isVerifiedCoach,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      if (!user) return null;

      const [rating] = await tx
        .select({
          ratingDisplay: userRatings.ratingDisplay,
          reliabilityPct: userRatings.reliabilityPct,
          matchCount: userRatings.matchCount,
          isProvisional: userRatings.isProvisional,
          lastMatchAt: userRatings.lastMatchAt,
        })
        .from(userRatings)
        .where(eq(userRatings.userId, session.userId))
        .limit(1);

      return { user, rating: rating ?? null };
    });

    if (!result) return notFound('User not found.');
    return ok({ data: result });
  } catch (err) {
    return serverError('me:GET', err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);

    const { skillQuizAnswers, startingRating, ...rest } = parsed.data;

    const updated = await withRequestContext(session, async (tx) => {
      const updates: Record<string, unknown> = { ...rest };
      if (skillQuizAnswers !== undefined) {
        updates.skillQuizAnswers = skillQuizAnswers;
      }

      const [row] = await tx
        .update(users)
        .set(updates)
        .where(eq(users.id, session.userId))
        .returning({
          id: users.id,
          displayName: users.displayName,
          locale: users.locale,
          city: users.city,
          genderVisibility: users.genderVisibility,
          bio: users.bio,
        });

      // Only apply the quiz-derived starting rating when the player has zero
      // verified matches. Real Glicko output must never be clobbered.
      if (row && typeof startingRating === 'number') {
        const [existing] = await tx
          .select({
            matchCount: userRatings.matchCount,
          })
          .from(userRatings)
          .where(eq(userRatings.userId, session.userId))
          .limit(1);

        if (!existing) {
          await tx.insert(userRatings).values({
            userId: session.userId,
            ratingInternal: fromDisplayRating(startingRating),
            ratingDisplay: startingRating,
            isProvisional: true,
          });
        } else if (existing.matchCount === 0) {
          await tx
            .update(userRatings)
            .set({
              ratingInternal: fromDisplayRating(startingRating),
              ratingDisplay: startingRating,
              isProvisional: true,
            })
            .where(eq(userRatings.userId, session.userId));
        }
      }

      return row;
    });

    if (!updated) return notFound('User not found.');
    return ok({ data: updated });
  } catch (err) {
    return serverError('me:PATCH', err);
  }
}
