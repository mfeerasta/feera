/**
 * Friendships service.
 *
 * Encapsulates the entire friend graph lifecycle: send, accept, decline,
 * cancel, block, unblock. Plus the read-side helpers that power
 * /play/friends and /play/players/[userId].
 *
 * Direction matters in the schema (requester -> addressee). The "auto accept
 * on mutual pending" rule below means two users can independently send each
 * other a request and both rows resolve to a single accepted edge instead of
 * a ping-pong of pending invites. We achieve this by detecting a reverse-
 * direction PENDING when sendFriendRequest runs and flipping that row to
 * accepted instead of inserting a new one.
 */

import { and, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { friendships, users } from '@feera/db';
import type { db as Db } from '@feera/db';
import { enqueueNotificationSafe } from '@/lib/notifications/outbox';

export type FriendshipAction = 'accept' | 'decline' | 'block' | 'unblock' | 'cancel';

export type FriendshipRow = typeof friendships.$inferSelect;

interface FriendUser {
  id: string;
  displayName: string;
  city: string | null;
  countryCode: string;
  profilePhotoUrl: string | null;
  gender: string | null;
  genderVisibility: 'public' | 'friends' | 'private';
}

export interface FriendshipWithUser {
  id: string;
  status: FriendshipRow['status'];
  requesterUserId: string;
  addresseeUserId: string;
  note: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  other: FriendUser;
}

const FRIEND_USER_SELECT = {
  id: users.id,
  displayName: users.displayName,
  city: users.city,
  countryCode: users.countryCode,
  profilePhotoUrl: users.profilePhotoUrl,
  gender: users.gender,
  genderVisibility: users.genderVisibility,
} as const;

async function attachOtherUsers(
  tx: typeof Db,
  rows: FriendshipRow[],
  viewerUserId: string,
): Promise<FriendshipWithUser[]> {
  if (rows.length === 0) return [];
  const otherIds = Array.from(
    new Set(
      rows.map((r) =>
        r.requesterUserId === viewerUserId ? r.addresseeUserId : r.requesterUserId,
      ),
    ),
  );
  const usersList = await tx
    .select(FRIEND_USER_SELECT)
    .from(users)
    .where(inArray(users.id, otherIds));
  const byId = new Map(usersList.map((u) => [u.id, u as FriendUser]));
  return rows
    .map((r) => {
      const otherId = r.requesterUserId === viewerUserId ? r.addresseeUserId : r.requesterUserId;
      const other = byId.get(otherId);
      if (!other) return null;
      return {
        id: r.id,
        status: r.status,
        requesterUserId: r.requesterUserId,
        addresseeUserId: r.addresseeUserId,
        note: r.note,
        createdAt: r.createdAt,
        respondedAt: r.respondedAt,
        other,
      } satisfies FriendshipWithUser;
    })
    .filter((r): r is FriendshipWithUser => r !== null);
}

/** Legacy: simple list across all statuses (used by GET /api/v1/friends). */
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

export async function listFriends(tx: typeof Db, userId: string): Promise<FriendshipWithUser[]> {
  const rows = await tx
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(eq(friendships.requesterUserId, userId), eq(friendships.addresseeUserId, userId)),
      ),
    )
    .orderBy(desc(friendships.respondedAt));
  return attachOtherUsers(tx, rows, userId);
}

export async function listIncoming(tx: typeof Db, userId: string): Promise<FriendshipWithUser[]> {
  const rows = await tx
    .select()
    .from(friendships)
    .where(and(eq(friendships.addresseeUserId, userId), eq(friendships.status, 'pending')))
    .orderBy(desc(friendships.createdAt));
  return attachOtherUsers(tx, rows, userId);
}

export async function listOutgoing(tx: typeof Db, userId: string): Promise<FriendshipWithUser[]> {
  const rows = await tx
    .select()
    .from(friendships)
    .where(and(eq(friendships.requesterUserId, userId), eq(friendships.status, 'pending')))
    .orderBy(desc(friendships.createdAt));
  return attachOtherUsers(tx, rows, userId);
}

export async function listBlocked(tx: typeof Db, userId: string): Promise<FriendshipWithUser[]> {
  const rows = await tx
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'blocked'),
        // Only show blocks initiated by the viewer (one-way visibility).
        eq(friendships.requesterUserId, userId),
      ),
    )
    .orderBy(desc(friendships.respondedAt));
  return attachOtherUsers(tx, rows, userId);
}

/**
 * Set of accepted-friend ids for a viewer. Used by maskUserForViewer for the
 * 'friends' gender_visibility branch.
 */
export async function loadFriendIds(tx: typeof Db, userId: string): Promise<Set<string>> {
  const rows = await tx
    .select({
      requester: friendships.requesterUserId,
      addressee: friendships.addresseeUserId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(eq(friendships.requesterUserId, userId), eq(friendships.addresseeUserId, userId)),
      ),
    );
  return new Set(rows.map((r) => (r.requester === userId ? r.addressee : r.requester)));
}

/**
 * Find an existing edge in either direction. Internal helper, exported for
 * the player-profile page so the CTA can render the right state.
 */
export async function getEdgeBetween(
  tx: typeof Db,
  a: string,
  b: string,
): Promise<FriendshipRow | null> {
  const row = (
    await tx
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterUserId, a), eq(friendships.addresseeUserId, b)),
          and(eq(friendships.requesterUserId, b), eq(friendships.addresseeUserId, a)),
        ),
      )
      .limit(1)
  )[0];
  return row ?? null;
}

export type SendRequestResult =
  | { kind: 'self_request' }
  | { kind: 'addressee_missing' }
  | { kind: 'blocked' }
  | { kind: 'exists'; row: FriendshipRow }
  | { kind: 'auto_accepted'; row: FriendshipRow }
  | { kind: 'created'; row: FriendshipRow };

export async function sendFriendRequest(
  tx: typeof Db,
  requesterUserId: string,
  addresseeUserId: string,
  note?: string,
): Promise<SendRequestResult> {
  if (requesterUserId === addresseeUserId) return { kind: 'self_request' };
  const exists = await tx
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, addresseeUserId))
    .limit(1);
  if (exists.length === 0) return { kind: 'addressee_missing' };

  const existing = await getEdgeBetween(tx, requesterUserId, addresseeUserId);
  if (existing) {
    if (existing.status === 'blocked') return { kind: 'blocked' };
    if (existing.status === 'accepted') return { kind: 'exists', row: existing };
    if (existing.status === 'pending') {
      // Auto-accept on mutual: viewer is the addressee of the existing pending.
      if (existing.addresseeUserId === requesterUserId) {
        const [updated] = await tx
          .update(friendships)
          .set({ status: 'accepted', respondedAt: new Date() })
          .where(eq(friendships.id, existing.id))
          .returning();
        const row = updated!;
        await enqueueNotificationSafe(
          {
            recipientUserId: existing.requesterUserId,
            template: 'friend_request_accepted',
            variables: { requesterDisplayName: exists[0]!.displayName },
            urgency: 'low',
            idempotencyKey: `friend_request_accepted:${row.id}`,
          },
          tx,
        );
        return { kind: 'auto_accepted', row };
      }
      // Same direction already pending: idempotent.
      return { kind: 'exists', row: existing };
    }
    if (existing.status === 'declined') {
      // Allow re-request: flip back to pending, viewer is the new requester.
      const [updated] = await tx
        .update(friendships)
        .set({
          status: 'pending',
          requesterUserId,
          addresseeUserId,
          note: note ?? null,
          respondedAt: null,
        })
        .where(eq(friendships.id, existing.id))
        .returning();
      const row = updated!;
      await enqueueNotificationSafe(
        {
          recipientUserId: addresseeUserId,
          template: 'friend_request_received',
          variables: { requesterDisplayName: '' },
          urgency: 'low',
          idempotencyKey: `friend_request_received:${row.id}:${row.createdAt.toISOString()}`,
        },
        tx,
      );
      return { kind: 'created', row };
    }
  }

  const [row] = await tx
    .insert(friendships)
    .values({ requesterUserId, addresseeUserId, status: 'pending', note: note ?? null })
    .returning();
  const created = row!;
  await enqueueNotificationSafe(
    {
      recipientUserId: addresseeUserId,
      template: 'friend_request_received',
      variables: { requesterDisplayName: '' },
      urgency: 'low',
      idempotencyKey: `friend_request_received:${created.id}`,
    },
    tx,
  );
  return { kind: 'created', row: created };
}

export type ActionResult =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'invalid' }
  | { kind: 'ok'; row: FriendshipRow };

export async function acceptFriendRequest(
  tx: typeof Db,
  id: string,
  userId: string,
): Promise<ActionResult> {
  const row = (await tx.select().from(friendships).where(eq(friendships.id, id)).limit(1))[0];
  if (!row) return { kind: 'not_found' };
  if (row.addresseeUserId !== userId) return { kind: 'forbidden' };
  if (row.status !== 'pending') return { kind: 'invalid' };
  const [updated] = await tx
    .update(friendships)
    .set({ status: 'accepted', respondedAt: new Date() })
    .where(eq(friendships.id, id))
    .returning();
  const result = updated!;
  const [accepter] = await tx
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await enqueueNotificationSafe(
    {
      recipientUserId: row.requesterUserId,
      template: 'friend_request_accepted',
      variables: { requesterDisplayName: accepter?.displayName ?? '' },
      urgency: 'low',
      idempotencyKey: `friend_request_accepted:${result.id}`,
    },
    tx,
  );
  return { kind: 'ok', row: result };
}

export async function declineFriendRequest(
  tx: typeof Db,
  id: string,
  userId: string,
): Promise<ActionResult> {
  const row = (await tx.select().from(friendships).where(eq(friendships.id, id)).limit(1))[0];
  if (!row) return { kind: 'not_found' };
  if (row.addresseeUserId !== userId) return { kind: 'forbidden' };
  if (row.status !== 'pending') return { kind: 'invalid' };
  const [updated] = await tx
    .update(friendships)
    .set({ status: 'declined', respondedAt: new Date() })
    .where(eq(friendships.id, id))
    .returning();
  return { kind: 'ok', row: updated! };
}

export async function cancelFriendRequest(
  tx: typeof Db,
  id: string,
  userId: string,
): Promise<ActionResult> {
  const row = (await tx.select().from(friendships).where(eq(friendships.id, id)).limit(1))[0];
  if (!row) return { kind: 'not_found' };
  if (row.requesterUserId !== userId) return { kind: 'forbidden' };
  if (row.status !== 'pending') return { kind: 'invalid' };
  await tx.delete(friendships).where(eq(friendships.id, id));
  return { kind: 'ok', row };
}

export async function blockUser(
  tx: typeof Db,
  id: string,
  userId: string,
): Promise<ActionResult> {
  const row = (await tx.select().from(friendships).where(eq(friendships.id, id)).limit(1))[0];
  if (!row) return { kind: 'not_found' };
  if (row.requesterUserId !== userId && row.addresseeUserId !== userId) {
    return { kind: 'forbidden' };
  }
  // The blocker becomes the requester so listBlocked() can show one-way blocks.
  const [updated] = await tx
    .update(friendships)
    .set({
      status: 'blocked',
      requesterUserId: userId,
      addresseeUserId: row.requesterUserId === userId ? row.addresseeUserId : row.requesterUserId,
      respondedAt: new Date(),
    })
    .where(eq(friendships.id, id))
    .returning();
  return { kind: 'ok', row: updated! };
}

export async function blockByUserId(
  tx: typeof Db,
  blockerUserId: string,
  targetUserId: string,
): Promise<ActionResult> {
  if (blockerUserId === targetUserId) return { kind: 'forbidden' };
  const existing = await getEdgeBetween(tx, blockerUserId, targetUserId);
  if (existing) {
    const [updated] = await tx
      .update(friendships)
      .set({
        status: 'blocked',
        requesterUserId: blockerUserId,
        addresseeUserId: targetUserId,
        respondedAt: new Date(),
      })
      .where(eq(friendships.id, existing.id))
      .returning();
    return { kind: 'ok', row: updated! };
  }
  const [row] = await tx
    .insert(friendships)
    .values({
      requesterUserId: blockerUserId,
      addresseeUserId: targetUserId,
      status: 'blocked',
      respondedAt: new Date(),
    })
    .returning();
  return { kind: 'ok', row: row! };
}

export async function unblockUser(
  tx: typeof Db,
  id: string,
  userId: string,
): Promise<ActionResult> {
  const row = (await tx.select().from(friendships).where(eq(friendships.id, id)).limit(1))[0];
  if (!row) return { kind: 'not_found' };
  if (row.status !== 'blocked') return { kind: 'invalid' };
  if (row.requesterUserId !== userId) return { kind: 'forbidden' };
  // Hard delete on unblock so a fresh request can be sent later.
  await tx.delete(friendships).where(eq(friendships.id, id));
  return { kind: 'ok', row };
}

/**
 * Legacy dispatcher kept for PATCH /api/v1/friends/[id].
 */
export async function actOnFriendship(
  tx: typeof Db,
  id: string,
  userId: string,
  action: FriendshipAction,
): Promise<ActionResult> {
  switch (action) {
    case 'accept':
      return acceptFriendRequest(tx, id, userId);
    case 'decline':
      return declineFriendRequest(tx, id, userId);
    case 'cancel':
      return cancelFriendRequest(tx, id, userId);
    case 'block':
      return blockUser(tx, id, userId);
    case 'unblock':
      return unblockUser(tx, id, userId);
    default:
      return { kind: 'invalid' };
  }
}

/**
 * Exact match phone/email search used by the "Add friend" form. Single result
 * or null. Skips the viewer themselves and soft-deleted users.
 */
export async function findUserByContact(
  tx: typeof Db,
  query: string,
  viewerUserId: string,
): Promise<FriendUser | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const rows = await tx
    .select(FRIEND_USER_SELECT)
    .from(users)
    .where(
      and(
        ne(users.id, viewerUserId),
        sql`${users.deletedAt} is null`,
        or(eq(users.phone, trimmed), ilike(users.email, lower)),
      ),
    )
    .limit(1);
  return (rows[0] as FriendUser | undefined) ?? null;
}

/* ---------- Pure helpers (DB-free, easy to unit test) ---------- */

export type EdgeShape = Pick<FriendshipRow, 'requesterUserId' | 'addresseeUserId' | 'status'>;

/**
 * Pure decision for "what happens when `requesterUserId` sends a request to
 * `addresseeUserId` given the current edge (if any)". Mirrors the branches
 * in sendFriendRequest so the auto-accept rule is testable without a DB.
 */
export function decideSendOutcome(
  requesterUserId: string,
  addresseeUserId: string,
  edge: EdgeShape | null,
): 'self' | 'blocked' | 'exists' | 'auto_accept' | 'reactivate' | 'create' {
  if (requesterUserId === addresseeUserId) return 'self';
  if (!edge) return 'create';
  if (edge.status === 'blocked') return 'blocked';
  if (edge.status === 'accepted') return 'exists';
  if (edge.status === 'pending') {
    if (
      edge.requesterUserId === addresseeUserId &&
      edge.addresseeUserId === requesterUserId
    ) {
      return 'auto_accept';
    }
    return 'exists';
  }
  if (edge.status === 'declined') return 'reactivate';
  return 'create';
}

/**
 * Pure helper used by blockByUserId tests: when a viewer blocks a target,
 * any prior accepted/pending edge must be replaced by a single blocked edge
 * owned by the viewer.
 */
export function computeBlockEdge(
  blockerUserId: string,
  targetUserId: string,
  prior: EdgeShape | null,
): { requesterUserId: string; addresseeUserId: string; status: 'blocked' } {
  void prior; // collapses any prior pair-state.
  return {
    requesterUserId: blockerUserId,
    addresseeUserId: targetUserId,
    status: 'blocked',
  };
}
