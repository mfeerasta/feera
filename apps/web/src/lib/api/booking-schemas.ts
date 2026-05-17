import { z } from 'zod';

const isoDateTime = z
  .string()
  .min(10)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Must be a valid ISO datetime.');

export const bookingCreateSchema = z
  .object({
    courtId: z.string().uuid(),
    organizerUserId: z.string().uuid().optional(),
    startAt: isoDateTime,
    endAt: isoDateTime.optional(),
    durationMinutes: z.number().int().positive().max(720).optional(),
    isOpenMatch: z.boolean().default(false),
    requiredLevelMin: z.number().min(0).max(7).optional(),
    requiredLevelMax: z.number().min(0).max(7).optional(),
    genderPreference: z
      .enum(['open', 'men_only', 'women_only', 'mixed'])
      .default('open'),
    maxParticipants: z.number().int().min(2).max(8).default(4),
    seatsBooked: z.number().int().min(1).max(8).optional(),
    notes: z.string().max(2000).optional(),
    participantUserIds: z.array(z.string().uuid()).max(8).optional(),
  })
  .refine(
    (v) => v.endAt || v.durationMinutes || true,
    'Provide endAt, durationMinutes, or rely on default 90 minutes.',
  )
  .refine(
    (v) => v.seatsBooked == null || v.seatsBooked <= v.maxParticipants,
    'seatsBooked cannot exceed maxParticipants.',
  );

export const joinRequestCreateSchema = z.object({
  seatsRequested: z.number().int().min(1).max(4).default(1),
  message: z.string().max(500).optional(),
});

export const joinRequestActionSchema = z.object({
  action: z.enum(['approve', 'decline']),
});

export const bookingUpdateSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
  genderPreference: z.enum(['open', 'men_only', 'women_only', 'mixed']).optional(),
  maxParticipants: z.number().int().min(2).max(8).optional(),
  isOpenMatch: z.boolean().optional(),
  requiredLevelMin: z.number().min(0).max(7).nullable().optional(),
  requiredLevelMax: z.number().min(0).max(7).nullable().optional(),
  startAt: isoDateTime.optional(),
  endAt: isoDateTime.optional(),
});

export const bookingListQuerySchema = z.object({
  organizerUserId: z.string().uuid().optional(),
  courtId: z.string().uuid().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const participantInviteSchema = z.object({
  userId: z.string().uuid(),
});

export const participantRsvpSchema = z.object({
  status: z.enum(['accepted', 'declined']),
});

const setScore = z
  .tuple([z.number().int().min(0).max(9), z.number().int().min(0).max(9)]);

export const matchCreateSchema = z.object({
  bookingId: z.string().uuid(),
  teamAPlayer1: z.string().uuid(),
  teamAPlayer2: z.string().uuid(),
  teamBPlayer1: z.string().uuid(),
  teamBPlayer2: z.string().uuid(),
  playedAt: isoDateTime.optional(),
  isRanked: z.boolean().default(true),
});

export const matchListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  clubId: z.string().uuid().optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  verificationStatus: z
    .enum(['unverified', 'peer_verified', 'club_verified'])
    .optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const matchScoreSchema = z.object({
  sets: z.array(setScore).min(2).max(5),
});

export const matchDisputeSchema = z.object({
  kind: z
    .enum(['wrong_score', 'wrong_winner', 'ineligible_player', 'other'])
    .default('other'),
  reason: z.string().min(1).max(1000),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
export type MatchScoreInput = z.infer<typeof matchScoreSchema>;
