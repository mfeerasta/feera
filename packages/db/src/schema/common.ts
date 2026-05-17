import { sql } from 'drizzle-orm';
import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core';

export const idColumn = () =>
  uuid('id').primaryKey().default(sql`gen_random_uuid()`);

export const createdAtColumn = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const updatedAtColumn = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const deletedAtColumn = () => timestamp('deleted_at', { withTimezone: true });

export const localeEnum = pgEnum('locale', ['en', 'ur', 'ar', 'es', 'fr', 'it', 'pt']);

export const genderVisibilityEnum = pgEnum('gender_visibility', [
  'public',
  'friends',
  'private',
]);

export const editionStatusEnum = pgEnum('edition_status', [
  'none',
  'applicant',
  'active',
  'lapsed',
  'suspended',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
]);

export const matchVerificationEnum = pgEnum('match_verification_status', [
  'unverified',
  'peer_verified',
  'club_verified',
]);

export const genderPreferenceEnum = pgEnum('gender_preference', [
  'open',
  'men_only',
  'women_only',
  'mixed',
]);
