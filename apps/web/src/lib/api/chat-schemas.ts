import { z } from 'zod';

/**
 * Public chat-type names exposed at the API edge. These map onto the
 * `chat_type` Postgres enum (direct, group, booking, tournament, coaching, support).
 *
 * Mapping:
 *   dm                 -> direct
 *   match              -> booking
 *   tournament         -> tournament
 *   coaching           -> coaching
 *   club_announcement  -> group
 */
export const apiChatTypeSchema = z.enum([
  'dm',
  'match',
  'tournament',
  'coaching',
  'club_announcement',
]);
export type ApiChatType = z.infer<typeof apiChatTypeSchema>;

const dbChatTypeByApi: Record<ApiChatType, 'direct' | 'group' | 'booking' | 'tournament' | 'coaching'> = {
  dm: 'direct',
  match: 'booking',
  tournament: 'tournament',
  coaching: 'coaching',
  club_announcement: 'group',
};

export function toDbChatType(t: ApiChatType) {
  return dbChatTypeByApi[t];
}

export const chatCreateSchema = z.object({
  type: apiChatTypeSchema,
  title: z.string().min(1).max(160).optional(),
  contextId: z.string().uuid().optional(),
  memberUserIds: z.array(z.string().uuid()).max(64).default([]),
});

export const chatListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const chatMarkReadSchema = z.object({
  lastReadAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'ISO datetime expected')
    .optional(),
});

export const chatMessageCreateSchema = z.object({
  body: z.string().min(1).max(4000).optional(),
  kind: z
    .enum(['text', 'image', 'system', 'location', 'booking_invite', 'score_card'])
    .default('text'),
  attachments: z.array(z.record(z.unknown())).max(10).default([]),
  replyToMessageId: z.string().uuid().optional(),
});

export const chatMessageListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
  before: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'ISO datetime expected')
    .optional(),
});

export const chatMemberAddSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['member', 'admin']).default('member'),
});

export type ChatCreateInput = z.infer<typeof chatCreateSchema>;
export type ChatMessageCreateInput = z.infer<typeof chatMessageCreateSchema>;
export type ChatMemberAddInput = z.infer<typeof chatMemberAddSchema>;
