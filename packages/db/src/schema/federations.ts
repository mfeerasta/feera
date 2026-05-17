import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  createdAtColumn,
  idColumn,
  updatedAtColumn,
} from './common';
import { users } from './users';

/**
 * federations - external sanctioning bodies (PPF, FIP, FEP, UAE Padel Assoc, etc.).
 */
export const federations = pgTable(
  'federations',
  {
    id: idColumn(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    countryCode: text('country_code'),
    websiteUrl: text('website_url'),
    apiBaseUrl: text('api_base_url'),
    apiAuthType: text('api_auth_type'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('federations_code_uq').on(t.code),
    index('federations_country_idx').on(t.countryCode),
  ],
);

/**
 * federation_player_links - maps a Feera user to their federation player id, optionally
 * caches the latest federation-issued rating for cross-display.
 */
export const federationPlayerLinks = pgTable(
  'federation_player_links',
  {
    id: idColumn(),
    federationId: uuid('federation_id')
      .notNull()
      .references(() => federations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    federationPlayerId: text('federation_player_id').notNull(),
    federationRating: doublePrecision('federation_rating'),
    federationRank: text('federation_rank'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    rawProfile: jsonb('raw_profile'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (t) => [
    uniqueIndex('federation_player_links_unique').on(t.federationId, t.federationPlayerId),
    uniqueIndex('federation_player_links_user_fed_uq').on(t.federationId, t.userId),
    index('federation_player_links_user_idx').on(t.userId),
  ],
);
