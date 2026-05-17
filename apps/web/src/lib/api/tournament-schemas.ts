import { z } from 'zod';

const slug = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/u, 'slug must be lowercase kebab-case');

export const tournamentFormatSchema = z.enum([
  'americano',
  'mexicano',
  'round_robin',
  'single_elimination',
  'king_of_the_court',
  'pplp',
]);

export const tournamentStatusSchema = z.enum([
  'draft',
  'open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const tournamentCreateSchema = z.object({
  clubId: z.string().uuid().optional(),
  name: z.string().min(1).max(160),
  slug,
  description: z.string().max(4000).optional(),
  format: tournamentFormatSchema,
  countryCode: z.string().length(2),
  city: z.string().min(1).max(80).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  registrationOpensAt: z.string().datetime().optional(),
  registrationClosesAt: z.string().datetime().optional(),
  maxTeams: z.number().int().positive().max(256).optional(),
  minLevel: z.number().min(0).max(7).optional(),
  maxLevel: z.number().min(0).max(7).optional(),
  genderPreference: z.enum(['open', 'men_only', 'women_only', 'mixed']).default('open'),
  entryFee: z.number().nonnegative().default(0),
  currency: z.string().length(3),
  prizePool: z.record(z.unknown()).default({}),
  rulesUrl: z.string().url().optional(),
  isEditionOnly: z.boolean().default(false),
  isRanked: z.boolean().default(true),
  pplpEnabled: z.boolean().default(false),
});

export const tournamentUpdateSchema = tournamentCreateSchema.partial().extend({
  status: tournamentStatusSchema.optional(),
});

export const tournamentListQuerySchema = z.object({
  club_id: z.string().uuid().optional(),
  status: tournamentStatusSchema.optional(),
  format: tournamentFormatSchema.optional(),
  country_code: z.string().length(2).optional(),
  city: z.string().min(1).max(80).optional(),
  gender_preference: z.enum(['open', 'men_only', 'women_only', 'mixed']).optional(),
  min_level: z.coerce.number().min(0).max(7).optional(),
  max_level: z.coerce.number().min(0).max(7).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const tournamentRegistrationCreateSchema = z.object({
  partnerUserId: z.string().uuid().optional(),
  teamName: z.string().min(1).max(120).optional(),
  seed: z.number().int().positive().optional(),
});

export const tournamentRegistrationUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'waitlisted', 'withdrawn', 'rejected']),
});

export const tournamentMatchScoreSchema = z.object({
  sets: z
    .array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]))
    .min(1)
    .max(5),
});

export type TournamentCreateInput = z.infer<typeof tournamentCreateSchema>;
export type TournamentUpdateInput = z.infer<typeof tournamentUpdateSchema>;
export type TournamentRegistrationCreateInput = z.infer<typeof tournamentRegistrationCreateSchema>;
