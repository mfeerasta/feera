import { and, desc, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm';
import {
  chatMembers,
  chatMessages,
  chats,
  users,
} from '@feera/db';
import type { db as Db } from '@feera/db';
import { toDbChatType, type ApiChatType, type ChatMessageCreateInput } from '@/lib/api/chat-schemas';

export type ChatMemberSummary = {
  userId: string;
  displayName: string | null;
};

export type ChatListItem = {
  id: string;
  type: string;
  title: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  lastMessagePreview: string | null;
  members: ChatMemberSummary[];
};

export async function listUserChats(
  tx: typeof Db,
  userId: string,
  opts: { limit: number; offset: number },
): Promise<ChatListItem[]> {
  const rows = await tx
    .select({
      id: chats.id,
      type: chats.type,
      title: chats.title,
      lastMessageAt: chats.lastMessageAt,
      lastReadAt: chatMembers.lastReadAt,
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .where(
      and(
        eq(chatMembers.userId, userId),
        isNull(chats.deletedAt),
        isNull(chatMembers.leftAt),
      ),
    )
    .orderBy(desc(chats.lastMessageAt))
    .limit(opts.limit)
    .offset(opts.offset);

  if (rows.length === 0) return [];

  const chatIds = rows.map((r) => r.id);

  // Last message preview per chat (latest single row).
  const previews = await tx
    .select({
      chatId: chatMessages.chatId,
      body: chatMessages.body,
      kind: chatMessages.kind,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(
        inArray(chatMessages.chatId, chatIds),
        isNull(chatMessages.deletedAt),
      ),
    )
    .orderBy(desc(chatMessages.createdAt));

  const previewByChat = new Map<string, { body: string | null; kind: string; createdAt: Date }>();
  for (const p of previews) {
    if (!previewByChat.has(p.chatId)) {
      previewByChat.set(p.chatId, { body: p.body, kind: p.kind, createdAt: p.createdAt });
    }
  }

  // Unread counts.
  const unreadCounts = new Map<string, number>();
  for (const r of rows) {
    const cutoff = r.lastReadAt ?? new Date(0);
    const cnt = await tx
      .select({ c: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chatId, r.id),
          gt(chatMessages.createdAt, cutoff),
          isNull(chatMessages.deletedAt),
        ),
      );
    unreadCounts.set(r.id, cnt[0]?.c ?? 0);
  }

  // Fetch members with display names for each chat.
  const memberRows = await tx
    .select({
      chatId: chatMembers.chatId,
      userId: chatMembers.userId,
      displayName: users.displayName,
    })
    .from(chatMembers)
    .innerJoin(users, eq(users.id, chatMembers.userId))
    .where(
      and(
        inArray(chatMembers.chatId, chatIds),
        isNull(chatMembers.leftAt),
      ),
    );

  const membersByChatId = new Map<string, ChatMemberSummary[]>();
  for (const m of memberRows) {
    const arr = membersByChatId.get(m.chatId) ?? [];
    arr.push({ userId: m.userId, displayName: m.displayName });
    membersByChatId.set(m.chatId, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    lastMessageAt: r.lastMessageAt,
    unreadCount: unreadCounts.get(r.id) ?? 0,
    lastMessagePreview: previewByChat.get(r.id)?.body ?? null,
    members: membersByChatId.get(r.id) ?? [],
  }));
}

export type CreateChatResult =
  | { kind: 'invalid_members' }
  | { kind: 'ok'; chat: typeof chats.$inferSelect };

/**
 * Chat type rules:
 *   - dm: requires exactly 1 other memberUserIds entry. Title ignored.
 *   - match: requires contextId (booking.id). Members usually added by the booking flow.
 *   - tournament: contextId required (tournament.id).
 *   - coaching: contextId required (coaching_session.id).
 *   - club_announcement: contextId required (club.id). Creator must be club_staff (caller enforces).
 */
export async function createChat(
  tx: typeof Db,
  creatorUserId: string,
  input: {
    type: ApiChatType;
    title?: string;
    contextId?: string;
    memberUserIds: string[];
  },
): Promise<CreateChatResult> {
  const dbType = toDbChatType(input.type);
  let memberIds = Array.from(new Set([creatorUserId, ...input.memberUserIds]));

  if (input.type === 'dm') {
    if (memberIds.length !== 2) return { kind: 'invalid_members' };
  }

  // Verify each member exists. Cheap guard against typos / spoofed ids.
  if (memberIds.length > 0) {
    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, memberIds));
    if (existing.length !== memberIds.length) return { kind: 'invalid_members' };
  }

  const [created] = await tx
    .insert(chats)
    .values({
      type: dbType,
      title: input.title ?? null,
      contextId: input.contextId ?? null,
      contextTable: contextTableFor(input.type),
      createdByUserId: creatorUserId,
    })
    .returning();

  await tx.insert(chatMembers).values(
    memberIds.map((uid) => ({
      chatId: created!.id,
      userId: uid,
      role: uid === creatorUserId ? 'admin' : 'member',
    })),
  );

  return { kind: 'ok', chat: created! };
}

function contextTableFor(t: ApiChatType): string | null {
  switch (t) {
    case 'match':
      return 'bookings';
    case 'tournament':
      return 'tournaments';
    case 'coaching':
      return 'coaching_sessions';
    case 'club_announcement':
      return 'clubs';
    default:
      return null;
  }
}

export async function isChatMember(
  tx: typeof Db,
  chatId: string,
  userId: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: chatMembers.id })
    .from(chatMembers)
    .where(
      and(
        eq(chatMembers.chatId, chatId),
        eq(chatMembers.userId, userId),
        isNull(chatMembers.leftAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function fetchChatThread(tx: typeof Db, chatId: string) {
  const chatRow = (
    await tx.select().from(chats).where(eq(chats.id, chatId)).limit(1)
  )[0];
  if (!chatRow) return null;

  const members = await tx
    .select({
      userId: chatMembers.userId,
      role: chatMembers.role,
      joinedAt: chatMembers.joinedAt,
      lastReadAt: chatMembers.lastReadAt,
      displayName: users.displayName,
    })
    .from(chatMembers)
    .innerJoin(users, eq(users.id, chatMembers.userId))
    .where(and(eq(chatMembers.chatId, chatId), isNull(chatMembers.leftAt)));

  const messages = await tx
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.chatId, chatId), isNull(chatMessages.deletedAt)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(50);

  return { chat: chatRow, members, messages: messages.reverse() };
}

export async function markChatRead(
  tx: typeof Db,
  chatId: string,
  userId: string,
  at: Date,
) {
  await tx
    .update(chatMembers)
    .set({ lastReadAt: at })
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
}

export async function listMessages(
  tx: typeof Db,
  chatId: string,
  opts: { limit: number; before?: Date },
) {
  const wheres = [eq(chatMessages.chatId, chatId), isNull(chatMessages.deletedAt)];
  if (opts.before) wheres.push(lt(chatMessages.createdAt, opts.before));
  const rows = await tx
    .select()
    .from(chatMessages)
    .where(and(...wheres))
    .orderBy(desc(chatMessages.createdAt))
    .limit(opts.limit);
  return rows.reverse();
}

export async function sendMessage(
  tx: typeof Db,
  chatId: string,
  senderUserId: string,
  input: ChatMessageCreateInput,
) {
  const [inserted] = await tx
    .insert(chatMessages)
    .values({
      chatId,
      senderUserId,
      kind: input.kind,
      body: input.body ?? null,
      attachments: input.attachments,
      replyToMessageId: input.replyToMessageId ?? null,
    })
    .returning();
  return inserted!;
}

export async function addMember(
  tx: typeof Db,
  chatId: string,
  userId: string,
  role: 'member' | 'admin',
) {
  const existing = await tx
    .select({ id: chatMembers.id, leftAt: chatMembers.leftAt })
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    .limit(1);
  if (existing[0]) {
    if (existing[0].leftAt) {
      await tx
        .update(chatMembers)
        .set({ leftAt: null, role })
        .where(eq(chatMembers.id, existing[0].id));
    }
    return { kind: 'exists' as const };
  }
  const [row] = await tx
    .insert(chatMembers)
    .values({ chatId, userId, role })
    .returning();
  return { kind: 'added' as const, member: row! };
}

export async function removeMember(tx: typeof Db, chatId: string, userId: string) {
  await tx
    .update(chatMembers)
    .set({ leftAt: new Date() })
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
}
