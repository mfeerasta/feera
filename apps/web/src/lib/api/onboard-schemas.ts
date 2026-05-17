import { z } from 'zod';

const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9-]+$/u, 'slug must be lowercase kebab-case');

const e164 = z.string().regex(/^\+[1-9]\d{6,14}$/u, 'phone must be E.164');

/**
 * Single payload posted by the 4-step public onboarding flow. Every step's
 * fields collapse to one object so the client can POST once on submit. The
 * client UI persists in-progress state to sessionStorage and only hits the
 * server when the user clicks "Submit" on step 4.
 */
export const clubOnboardSchema = z.object({
  // Step 1: basics
  name: z.string().min(1).max(160),
  slug: slugSchema,
  countryCode: z.string().length(2).toUpperCase(),
  city: z.string().min(1).max(80),
  address: z.string().max(400).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  websiteUrl: z.string().url().optional(),
  defaultCurrency: z.string().length(3).toUpperCase(),

  // Step 2: location
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),

  // Step 3: amenities
  hasIndoor: z.boolean().default(false),
  hasOutdoor: z.boolean().default(true),
  hasClimateControl: z.boolean().default(false),
  hasPanoramic: z.boolean().default(false),
  hasPrayerRoom: z.boolean().default(false),
  hasShowerFacilities: z.boolean().default(true),
  hasParking: z.boolean().default(false),
  hasFoodService: z.boolean().default(false),
  hasWomenOnlyHours: z.boolean().default(false),

  // Step 4: first court + pricing + owner
  court: z.object({
    name: z.string().min(1).max(120),
    surface: z.string().min(1).max(40).default('artificial_grass'),
    isIndoor: z.boolean().default(false),
  }),
  pricing: z.object({
    offPeakPrice: z.number().nonnegative(),
    peakPrice: z.number().nonnegative(),
  }),
  owner: z.object({
    displayName: z.string().min(1).max(120),
    phone: e164,
    email: z.string().email(),
  }),
});

export type ClubOnboardInput = z.infer<typeof clubOnboardSchema>;

/**
 * Slugify helper shared by the form (live preview) and the endpoint
 * (final validation). Lowercase, ascii, hyphenated.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Parse a "lat,lng" pair from a pasted Google Maps URL. Supports both
 * the `@LAT,LNG,zoom` form and the `!3dLAT!4dLNG` form. Returns null when
 * nothing matches so the UI can fall back to manual entry.
 */
export function parseLatLngFromMapsUrl(
  url: string,
): { lat: number; lng: number } | null {
  if (!url) return null;
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/u);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };
  const bang = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/u);
  if (bang) return { lat: Number(bang[1]), lng: Number(bang[2]) };
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/u);
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };
  return null;
}
