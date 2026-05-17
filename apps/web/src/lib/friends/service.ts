import { and, eq, inArray, or } from 'drizzle-orm';
import { friendships, users } from '@feera/db';
import type { db as Db } from '@feera/db';

export type FriendshipAction = 'accept' | 'decline' | 'block' | 'unblock';

export async function listFriendships(tx: typeof Db, userId: string) {
  return tx
    .select({
      id: friendships.id,
      requesterUserId: friendships.requesterUserId,
      addresseeUserId: friendships.addresseeUserId,
      status: friendships.status,
      note: friendships.note,
      respondedAt: friendships.respondedAt,
      createdAt: friendships.createdAt,
    })
    .from(friendships)
    .where(or(eq(friendships.requesterUserId, userId), eq(friendships.addresseeUserId, userId)));
}

export type SendRequestResult =
  | { kind: 'self_request' }
  | { kind: 'addressee_missing' }
  | { kind: 'exists'; row: typeof friendships.$inferSelect }
  | { kind: 'created'; row: typeof friendships.$inferSelect };

export async function sendFriendRequest(
  tx: typeof Db,
  requesterUserId: string,
  addresseeUserId: string,
  note?: string,
): Promise<SendRequestResult> {
  if (requesterUserId === addresseeUserId) return { kind: 'self_request' };
  const exists = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, addresseeUserId))
    .limit(1);
  if (exists.length === 0) return { kind: 'addressee_missing' };

  const dupes = await tx
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterUserId, requesterUserId),
          eq(friendships.addresseeUserId, addresseeUserId),
        ),
        and(
          eq(friendships.requesterUserId, addresseeUserId),
          eq(friendships.addresseeUserId, requesterUserId),
        ),
      ),
    )
    .limit(1);
  if (dupes[0]) return { kind: 'exists', row: dupes[0] };

  const [row] = await tx
    .insert(friendships)
    .values({ requesterUserId, addresseeUserId, status: 'pending', note: note ?? null })
    .returning();
  return { kind: 'created', row: row! };
}

export type ActionResult =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'ok'; row: typeof friendships.$inferSelect };

export async function actOnFriendship(
  tx: typeof Db,
  id: string,
  userId: string,
  action: FriendshipAction,
): Promise<ActionResult> {
  const row = (await tx.select().from(friendships).where(eq(friendships.id, id)).limit(1))[0];
  if (!row) return { kind: 'not_found' };
  if (row.requesterUserId !== userId && row.addresseeUserId !== userId) {
    return { kind: 'forbidden' };
  }
  const now = new Date();

  let nextStatus: typeof row.status = row.status;
  if (action === 'accept') {
    if (row.addresseeUserId !== userId) return { kind: 'forbidden' };
    nextStatus = 'accepted';
  } else if (action === 'decline') {
    if (row.addresseeUserId !== userId) return { kind: 'forbidden' };
    nextStatus = 'declined';
  } else if (action === 'block') {
    nextStatus = 'blocked';
  } else if (action === 'unblock') {
    if (row.status !== 'blocked') return { kind: 'forbidden' };
    nextStatus = 'declined';
  }

  const [updated] = await tx
    .update(friendships)
    .set({ status: nextStatus, respondedAt: now })
    .where(eq(friendships.id, id))
    .returning();
  return { kind: 'ok', row: updated! };
}
