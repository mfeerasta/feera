import { and, desc, eq, gte, inArray, or } from 'drizzle-orm';
import { zipSync, strToU8 } from 'fflate';
import {
  auditLog,
  bookingJoinRequests,
  bookingParticipants,
  bookings,
  chatMembers,
  chatMessages,
  editionMemberships,
  matches,
  payments,
  payouts,
  userRatings,
  userSocialScores,
  users,
} from '@feera/db';
import { getSession, withRequestContext } from '@/lib/api/request-context';
import { serverError, unauthorized } from '@/lib/api/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GDPR Article 20 data portability endpoint. Returns a ZIP containing one
 * JSON file per data category, all rows owned by or about the authenticated
 * user. Reads run under RLS via the shared request context tx.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const userId = session.userId;

    const bundle = await withRequestContext(session, async (tx) => {
      const profileRow = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const ratingRow = await tx
        .select()
        .from(userRatings)
        .where(eq(userRatings.userId, userId))
        .limit(1);
      const socialRow = await tx
        .select()
        .from(userSocialScores)
        .where(eq(userSocialScores.userId, userId))
        .limit(1);

      const organizerBookings = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.organizerUserId, userId));
      const participantRows = await tx
        .select()
        .from(bookingParticipants)
        .where(eq(bookingParticipants.userId, userId));
      const bookingIdSet = new Set<string>([
        ...organizerBookings.map((b) => b.id),
        ...participantRows.map((p) => p.bookingId),
      ]);
      const bookingIds = Array.from(bookingIdSet);
      const allParticipants = bookingIds.length
        ? await tx
            .select()
            .from(bookingParticipants)
            .where(inArray(bookingParticipants.bookingId, bookingIds))
        : [];
      const joinReqs = await tx
        .select()
        .from(bookingJoinRequests)
        .where(eq(bookingJoinRequests.requesterUserId, userId));

      const userMatches = await tx
        .select()
        .from(matches)
        .where(
          or(
            eq(matches.teamAPlayer1, userId),
            eq(matches.teamAPlayer2, userId),
            eq(matches.teamBPlayer1, userId),
            eq(matches.teamBPlayer2, userId),
            eq(matches.recordedByUserId, userId),
          ),
        );

      const userPayments = await tx
        .select()
        .from(payments)
        .where(or(eq(payments.payerUserId, userId), eq(payments.payeeUserId, userId)));
      const userPayouts = await tx
        .select()
        .from(payouts)
        .where(eq(payouts.payeeUserId, userId));

      const myChatMembers = await tx
        .select()
        .from(chatMembers)
        .where(eq(chatMembers.userId, userId));
      const chatIds = myChatMembers.map((m) => m.chatId);
      const recentMessages = chatIds.length
        ? await tx
            .select()
            .from(chatMessages)
            .where(inArray(chatMessages.chatId, chatIds))
            .orderBy(desc(chatMessages.createdAt))
            .limit(200 * chatIds.length)
        : [];

      const editionRow = await tx
        .select()
        .from(editionMemberships)
        .where(eq(editionMemberships.userId, userId));

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const auditRows = await tx
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.actorUserId, userId),
            gte(auditLog.createdAt, ninetyDaysAgo),
          ),
        );

      return {
        profile: {
          user: profileRow[0] ?? null,
          rating: ratingRow[0] ?? null,
          socialScores: socialRow[0] ?? null,
        },
        bookings: {
          organized: organizerBookings,
          participants: allParticipants,
          joinRequests: joinReqs,
        },
        matches: userMatches,
        payments: { payments: userPayments, payouts: userPayouts },
        chats: { members: myChatMembers, recentMessages },
        edition: editionRow[0] ?? null,
        audit: auditRows,
      };
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `feera-export-${userId}-${stamp}.zip`;

    const fileMap: Record<string, Uint8Array> = {
      'profile.json': strToU8(JSON.stringify(bundle.profile, null, 2)),
      'bookings.json': strToU8(JSON.stringify(bundle.bookings, null, 2)),
      'matches.json': strToU8(JSON.stringify(bundle.matches, null, 2)),
      'payments.json': strToU8(JSON.stringify(bundle.payments, null, 2)),
      'chats.json': strToU8(JSON.stringify(bundle.chats, null, 2)),
      'edition.json': strToU8(JSON.stringify(bundle.edition, null, 2)),
      'audit.json': strToU8(JSON.stringify(bundle.audit, null, 2)),
      'README.txt': strToU8(
        [
          'Feera personal data export',
          `Generated: ${new Date().toISOString()}`,
          `User: ${userId}`,
          '',
          'This archive contains all personal data Feera holds about you, as',
          'required by GDPR Article 20 (right to data portability).',
          '',
          'Files:',
          '  profile.json  account, rating, social score',
          '  bookings.json bookings you organized + participated in + join requests',
          '  matches.json  every match you appear in',
          '  payments.json payments and payouts where you are payer or payee',
          '  chats.json    chat memberships and last 200 messages per chat',
          '  edition.json  Feera Edition membership record',
          '  audit.json    last 90 days of audit log entries for your actions',
          '',
          'For deletion, visit /me/delete.',
        ].join('\n'),
      ),
    };

    const zipped = zipSync(fileMap, { level: 6 });

    return new Response(new Uint8Array(zipped), {
      status: 200,
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return serverError('me/export:GET', err);
  }
}
