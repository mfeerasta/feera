'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import {
  acceptFriendRequest,
  blockByUserId,
  cancelFriendRequest,
  declineFriendRequest,
  findUserByContact,
  sendFriendRequest,
  unblockUser,
} from '@/lib/friends/service';

function ensureUuid(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export async function acceptAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const id = ensureUuid(formData.get('id'));
  if (!id) return;
  await withRequestContext(session, (tx) => acceptFriendRequest(tx, id, session.userId));
  revalidatePath('/play/friends');
}

export async function declineAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const id = ensureUuid(formData.get('id'));
  if (!id) return;
  await withRequestContext(session, (tx) => declineFriendRequest(tx, id, session.userId));
  revalidatePath('/play/friends');
}

export async function cancelAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const id = ensureUuid(formData.get('id'));
  if (!id) return;
  await withRequestContext(session, (tx) => cancelFriendRequest(tx, id, session.userId));
  revalidatePath('/play/friends');
}

export async function unblockAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const id = ensureUuid(formData.get('id'));
  if (!id) return;
  await withRequestContext(session, (tx) => unblockUser(tx, id, session.userId));
  revalidatePath('/play/friends');
}

export async function blockAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const targetUserId = ensureUuid(formData.get('targetUserId'));
  if (!targetUserId) return;
  await withRequestContext(session, (tx) => blockByUserId(tx, session.userId, targetUserId));
  revalidatePath('/play/friends');
}

export interface SearchActionState {
  query: string;
  found?: { id: string; displayName: string; city: string | null; countryCode: string } | null;
  sent?: boolean;
  error?: string | null;
}

export async function searchAndSendAction(
  _prev: SearchActionState,
  formData: FormData,
): Promise<SearchActionState> {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const query = String(formData.get('query') ?? '').trim();
  const sendTo = ensureUuid(formData.get('addresseeUserId'));

  if (sendTo) {
    const result = await withRequestContext(session, (tx) =>
      sendFriendRequest(tx, session.userId, sendTo),
    );
    if (result.kind === 'self_request') {
      return { query, error: 'You cannot friend yourself.' };
    }
    if (result.kind === 'addressee_missing') {
      return { query, error: 'User no longer exists.' };
    }
    if (result.kind === 'blocked') {
      return { query, error: 'Cannot send a request to this user.' };
    }
    revalidatePath('/play/friends');
    return { query: '', sent: true };
  }

  if (!query) {
    return { query: '', error: 'Enter a phone or email.' };
  }

  const found = await withRequestContext(session, (tx) =>
    findUserByContact(tx, query, session.userId),
  );
  if (!found) {
    return { query, found: null, error: 'No player found with that contact.' };
  }
  return {
    query,
    found: {
      id: found.id,
      displayName: found.displayName,
      city: found.city,
      countryCode: found.countryCode,
    },
  };
}

export async function sendByIdAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/sign-in?next=/play/friends');
  const addresseeUserId = ensureUuid(formData.get('addresseeUserId'));
  if (!addresseeUserId) return;
  await withRequestContext(session, (tx) =>
    sendFriendRequest(tx, session.userId, addresseeUserId),
  );
  revalidatePath('/play/friends');
  revalidatePath(`/play/players/${addresseeUserId}`);
}
