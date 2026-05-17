/**
 * Column-level masking for `users` rows before they cross an API boundary.
 *
 * `gender_visibility` controls who may see the `gender` field. Rather than
 * filter rows in RLS (which would hide whole users from clubs / matches),
 * we serve the row with `gender = null` when the requester is not allowed
 * to see it. Visibility levels:
 *
 *   - public  → anyone signed in may see the gender
 *   - friends → only accepted friendships + the owner may see it
 *   - private → only the owner may see it
 *
 * Callers pass a small `Viewer` describing the request: who is signed in
 * and whether they are an accepted friend of the user being serialized.
 *
 * This module is pure. Per-request friendship lookup lives in
 * `loadFriendIds(viewerUserId, ...)` callers wire in.
 */

export type GenderVisibility = 'public' | 'friends' | 'private';

export interface MaskableUser {
  id: string;
  gender: string | null;
  genderVisibility: GenderVisibility;
}

export interface Viewer {
  userId: string | null;
  /** Accepted-friend user ids of the viewer. Used for the 'friends' visibility branch. */
  friendUserIds?: ReadonlySet<string>;
  /** Service / admin bypass: see everything regardless of visibility. */
  isAdmin?: boolean;
}

/**
 * Returns true when the viewer is allowed to see this user's gender field.
 */
export function canSeeGender<T extends MaskableUser>(user: T, viewer: Viewer): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.userId && viewer.userId === user.id) return true;
  switch (user.genderVisibility) {
    case 'public':
      return true;
    case 'friends':
      return Boolean(viewer.userId && viewer.friendUserIds?.has(user.id));
    case 'private':
      return false;
    default:
      return false;
  }
}

/**
 * Returns a copy of `user` with `gender` blanked to null when the viewer
 * is not allowed to see it. Non-mutating.
 */
export function maskUserForViewer<T extends MaskableUser>(user: T, viewer: Viewer): T {
  if (canSeeGender(user, viewer)) return user;
  return { ...user, gender: null };
}

/**
 * Batch helper for lists.
 */
export function maskUsersForViewer<T extends MaskableUser>(
  users: ReadonlyArray<T>,
  viewer: Viewer,
): T[] {
  return users.map((u) => maskUserForViewer(u, viewer));
}
