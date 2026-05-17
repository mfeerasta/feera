import { z } from 'zod';

const isoDateTime = z
  .string()
  .min(10)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Must be a valid ISO datetime.');

const hhmm = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm 24h format.');

const weeklyWindow = z.object({
  start: hhmm,
  end: hhmm,
});

export const weeklyAvailabilitySchema = z
  .object({
    sun: z.array(weeklyWindow).optional(),
    mon: z.array(weeklyWindow).optional(),
    tue: z.array(weeklyWindow).optional(),
    wed: z.array(weeklyWindow).optional(),
    thu: z.array(weeklyWindow).optional(),
    fri: z.array(weeklyWindow).optional(),
    sat: z.array(weeklyWindow).optional(),
  })
  .strict();

const certification = z.object({
  title: z.string().min(2).max(160),
  issuer: z.string().min(2).max(160),
  year: z.number().int().min(1970).max(2100).optional(),
});

const verificationDocument = z.object({
  kind: z.enum(['certification', 'id', 'insurance', 'other']),
  url: z.string().url(),
  uploadedAt: isoDateTime.optional(),
  label: z.string().max(200).optional(),
});

export const coachUpsertSchema = z.object({
  bio: z.string().min(40).max(2000),
  languages: z.array(z.string().min(2).max(40)).min(1).max(8),
  specialties: z.array(z.string().min(2).max(60)).min(1).max(12),
  certifications: z.array(certification).max(20).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  hourlyRate: z.number().positive().max(100000),
  hourlyRateMax: z.number().positive().max(100000).optional(),
  currency: z.string().length(3),
  primaryClubId: z.string().uuid().optional(),
  weeklyAvailability: weeklyAvailabilitySchema.optional(),
  introVideoUrl: z.string().url().optional(),
  responseTimeAvgHours: z.number().int().min(1).max(168).optional(),
  acceptsWomenOnly: z.boolean().optional(),
  acceptsJuniors: z.boolean().optional(),
  isAcceptingBookings: z.boolean().optional(),
});

export const coachPatchSchema = coachUpsertSchema.partial();

export const coachListQuerySchema = z.object({
  city: z.string().min(1).max(120).optional(),
  country: z.string().length(2).optional(),
  language: z.string().min(2).max(40).optional(),
  specialty: z.string().min(2).max(60).optional(),
  level: z.string().optional(),
  hourlyRateMax: z.coerce.number().positive().max(100000).optional(),
  isVerified: z.coerce.boolean().optional(),
  isEditionEndorsed: z.coerce.boolean().optional(),
  sort: z.enum(['rating', 'reliability', 'priceAsc', 'priceDesc']).default('rating'),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const verificationUploadSchema = z.object({
  documents: z.array(verificationDocument).min(1).max(10),
});

export const coachingSessionCreateSchema = z.object({
  coachUserId: z.string().uuid(),
  startAt: isoDateTime,
  durationMinutes: z
    .number()
    .int()
    .min(30)
    .max(240)
    .refine((v) => v % 30 === 0, 'Duration must be a multiple of 30 minutes.'),
  sessionType: z.enum(['single', 'group', 'clinic']).default('single'),
  clubId: z.string().uuid().optional(),
  courtId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const coachingSessionListQuerySchema = z.object({
  coachUserId: z.string().uuid().optional(),
  learnerUserId: z.string().uuid().optional(),
  status: z
    .enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const coachingSessionPatchSchema = z.object({
  startAt: isoDateTime.optional(),
  durationMinutes: z
    .number()
    .int()
    .min(30)
    .max(240)
    .refine((v) => v % 30 === 0, 'Duration must be a multiple of 30 minutes.')
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const coachingSessionReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

export type CoachUpsertInput = z.infer<typeof coachUpsertSchema>;
export type CoachPatchInput = z.infer<typeof coachPatchSchema>;
export type CoachingSessionCreateInput = z.infer<typeof coachingSessionCreateSchema>;
export type CoachingSessionReviewInput = z.infer<typeof coachingSessionReviewSchema>;
export type VerificationUploadInput = z.infer<typeof verificationUploadSchema>;
