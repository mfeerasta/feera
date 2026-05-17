import { z } from 'zod';

const slug = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/u, 'slug must be lowercase kebab-case');

export const clubCreateSchema = z.object({
  name: z.string().min(1).max(160),
  slug,
  countryCode: z.string().length(2),
  city: z.string().min(1).max(80),
  address: z.string().max(400).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  photos: z.array(z.string().url()).default([]),
  amenities: z.record(z.unknown()).default({}),
  openingHours: z.record(z.unknown()).default({}),
  hasWomenOnlyHours: z.boolean().default(false),
  womenOnlySchedule: z.record(z.unknown()).optional(),
  hasIndoor: z.boolean().default(false),
  hasOutdoor: z.boolean().default(true),
  hasClimateControl: z.boolean().default(false),
  hasPanoramic: z.boolean().default(false),
  hasPrayerRoom: z.boolean().default(false),
  hasShowerFacilities: z.boolean().default(true),
  hasParking: z.boolean().default(false),
  hasFoodService: z.boolean().default(false),
  editionPartnerStatus: z.enum(['none', 'pending', 'active', 'paused', 'terminated']).default('none'),
  platformFeePct: z.number().min(0).max(1).default(0.1),
  defaultCurrency: z.string().length(3),
});

export const clubUpdateSchema = clubCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const clubListQuerySchema = z.object({
  country_code: z.string().length(2).optional(),
  city: z.string().min(1).max(80).optional(),
  has_women_only_hours: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  has_indoor: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const courtCreateSchema = z.object({
  name: z.string().min(1).max(120),
  surface: z.string().min(1).max(40).default('artificial_grass'),
  isIndoor: z.boolean().default(false),
  isClimateControlled: z.boolean().default(false),
  isPanoramic: z.boolean().default(false),
  courtDimensions: z.string().min(1).max(40).default('standard'),
  isActive: z.boolean().default(true),
  photos: z.array(z.string().url()).default([]),
});

export const courtUpdateSchema = courtCreateSchema.partial();

export const pricingRuleCreateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/u, 'HH:MM[:SS]'),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/u, 'HH:MM[:SS]'),
  pricePerSlot: z.number().nonnegative(),
  currency: z.string().length(3),
  isMemberOnly: z.boolean().default(false),
  isPeak: z.boolean().default(false),
  appliesToEditionOnly: z.boolean().default(false),
});

export type ClubCreateInput = z.infer<typeof clubCreateSchema>;
export type ClubUpdateInput = z.infer<typeof clubUpdateSchema>;
export type CourtCreateInput = z.infer<typeof courtCreateSchema>;
export type CourtUpdateInput = z.infer<typeof courtUpdateSchema>;
export type PricingRuleCreateInput = z.infer<typeof pricingRuleCreateSchema>;
