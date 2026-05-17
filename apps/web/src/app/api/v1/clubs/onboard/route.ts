import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  clubs,
  clubStaff,
  courts,
  courtPricingRules,
  users,
} from '@feera/db';
import { sendMagicLinkEmail } from '@feera/auth';
import { sql as dsql } from 'drizzle-orm';
import {
  badRequest,
  created,
  fromZodError,
  serverError,
} from '@/lib/api/responses';
import { withRequestContext } from '@/lib/api/request-context';
import { clubOnboardSchema, slugify } from '@/lib/api/onboard-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PEAK_DAYS = [0, 5, 6]; // Fri, Sat, Sun in en-week order (Sun=0, Fri=5, Sat=6)

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

async function uniqueSlug(tx: typeof import('@feera/db').db, base: string): Promise<string> {
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const collision = await tx
      .select({ id: clubs.id })
      .from(clubs)
      .where(eq(clubs.slug, candidate))
      .limit(1);
    if (collision.length === 0) return candidate;
    candidate = `${base}-${randomSuffix()}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * POST /api/v1/clubs/onboard
 *
 * Public self-onboarding for clubs. No auth required. Creates the club
 * (approval_status='pending', is_active=false), the first court, default
 * peak/off-peak pricing rules, a domain `users` row for the owner, an
 * auth_user shell for sign-in, and links them via `club_staff` as owner.
 *
 * The owner receives a magic-link to sign in. The admin team approves the
 * listing later from `/admin/clubs`. Returns `{ clubSlug, ownerSignInUrl }`.
 *
 * TODO(admin): wire `/admin/clubs/[slug]/approve` to flip approval_status to
 * 'approved' + is_active=true and notify the owner.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (body === null) return badRequest('Body must be valid JSON.');

    const parsed = clubOnboardSchema.safeParse(body);
    if (!parsed.success) return fromZodError(parsed.error);
    const input = parsed.data;

    const baseSlug = slugify(input.slug || input.name);
    if (!baseSlug) return badRequest('Could not derive a slug from the name.');

    const result = await withRequestContext(null, async (tx) => {
      const finalSlug = await uniqueSlug(tx, baseSlug);

      const insertedClubs = await tx
        .insert(clubs)
        .values({
          name: input.name,
          slug: finalSlug,
          countryCode: input.countryCode,
          city: input.city,
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          phone: input.phone,
          email: input.email ?? input.owner.email,
          websiteUrl: input.websiteUrl,
          isActive: false,
          approvalStatus: 'pending',
          hasIndoor: input.hasIndoor,
          hasOutdoor: input.hasOutdoor,
          hasClimateControl: input.hasClimateControl,
          hasPanoramic: input.hasPanoramic,
          hasPrayerRoom: input.hasPrayerRoom,
          hasShowerFacilities: input.hasShowerFacilities,
          hasParking: input.hasParking,
          hasFoodService: input.hasFoodService,
          hasWomenOnlyHours: input.hasWomenOnlyHours,
          defaultCurrency: input.defaultCurrency,
        })
        .returning();
      const club = insertedClubs[0];
      if (!club) throw new Error('club insert returned no row');

      const insertedCourts = await tx
        .insert(courts)
        .values({
          clubId: club.id,
          name: input.court.name,
          surface: input.court.surface,
          isIndoor: input.court.isIndoor,
        })
        .returning();
      const court = insertedCourts[0];
      if (!court) throw new Error('court insert returned no row');

      // Default pricing: one off-peak rule (09:00-17:00) + one peak rule
      // (17:00-22:00) for every day of the week. Weekend days (Fri/Sat/Sun)
      // mark the full peak window. Owners refine per-day after sign-in.
      const pricingRows: Array<typeof courtPricingRules.$inferInsert> = [];
      for (let day = 0; day < 7; day += 1) {
        const isWeekend = PEAK_DAYS.includes(day);
        pricingRows.push({
          courtId: court.id,
          dayOfWeek: day,
          startTime: '09:00:00',
          endTime: '17:00:00',
          pricePerSlot: input.pricing.offPeakPrice,
          currency: input.defaultCurrency,
          isPeak: false,
        });
        pricingRows.push({
          courtId: court.id,
          dayOfWeek: day,
          startTime: '17:00:00',
          endTime: '22:00:00',
          pricePerSlot: input.pricing.peakPrice,
          currency: input.defaultCurrency,
          isPeak: isWeekend,
        });
      }
      await tx.insert(courtPricingRules).values(pricingRows);

      // Reuse a domain user row by email or phone if it already exists.
      const existingByEmail = await tx
        .select()
        .from(users)
        .where(eq(users.email, input.owner.email))
        .limit(1);
      const existingByPhone = existingByEmail.length
        ? existingByEmail
        : await tx
            .select()
            .from(users)
            .where(eq(users.phone, input.owner.phone))
            .limit(1);

      let ownerUser = existingByPhone[0];
      if (!ownerUser) {
        const insertedUsers = await tx
          .insert(users)
          .values({
            displayName: input.owner.displayName,
            email: input.owner.email,
            phone: input.owner.phone,
            countryCode: input.countryCode,
            city: input.city,
          })
          .returning();
        const fresh = insertedUsers[0];
        if (!fresh) throw new Error('user insert returned no row');
        ownerUser = fresh;
      }

      // Mirror into the auth_user shell so the magic-link verification has a
      // row to attach the session to. Raw SQL bypasses a drizzle dual-version
      // type clash between @feera/auth and apps/web's react@19 resolution.
      // Idempotent on email (auth_user.email is unique).
      await tx.execute(dsql`
        INSERT INTO auth_user (email, name, phone_number, country_code, is_club_staff, feera_user_id)
        VALUES (
          ${input.owner.email},
          ${input.owner.displayName},
          ${input.owner.phone},
          ${input.countryCode},
          true,
          ${ownerUser.id}
        )
        ON CONFLICT (email) DO UPDATE
          SET is_club_staff = true,
              feera_user_id = COALESCE(auth_user.feera_user_id, EXCLUDED.feera_user_id)
      `);

      await tx.insert(clubStaff).values({
        clubId: club.id,
        userId: ownerUser.id,
        role: 'owner',
        isActive: true,
        invitedAt: new Date(),
        acceptedAt: new Date(),
      });

      return { club, ownerEmail: input.owner.email };
    });

    // Generate a sign-in URL the owner can click. We construct a plain
    // magic-link landing URL; better-auth's /sign-in/magic-link will dispatch
    // a real signed token when the owner enters their email. For now we
    // surface the deep link plus mail a welcome note that points there.
    const appUrl =
      process.env.APP_URL ??
      process.env.AUTH_URL ??
      'https://www.feera.ai';
    const ownerSignInUrl = `${appUrl}/sign-in?email=${encodeURIComponent(result.ownerEmail)}`;

    try {
      if (process.env.RESEND_API_KEY) {
        await sendMagicLinkEmail({
          email: result.ownerEmail,
          url: ownerSignInUrl,
          token: '',
        });
      } else {
        console.log(
          `[clubs/onboard:DEV] welcome ${result.ownerEmail} -> ${ownerSignInUrl}`,
        );
      }
    } catch (mailErr) {
      // Mailer failures should never block the onboarding. The owner can
      // still sign in manually via /sign-in.
      console.warn('[clubs/onboard] welcome email failed', mailErr);
    }

    return created({
      data: {
        clubSlug: result.club.slug,
        ownerSignInUrl,
        approvalStatus: 'pending',
      },
    });
  } catch (err) {
    return serverError('clubs/onboard:POST', err);
  }
}
