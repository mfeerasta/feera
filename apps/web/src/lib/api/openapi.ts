/**
 * Feera OpenAPI 3.1 document builder. Single source of truth for the public
 * REST surface. Generated from the same Zod schemas the route handlers parse
 * with, so drift between docs and runtime validation is impossible by design.
 *
 * Add new routes to the `routes` table below. Each entry maps to a real
 * `app/api/**\/route.ts` handler. Server pages call `buildOpenApiDocument()`
 * once per cache window and serialise it to JSON or YAML.
 */

import { z, type ZodTypeAny } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import {
  clubCreateSchema,
  clubListQuerySchema,
  clubUpdateSchema,
  courtCreateSchema,
  courtUpdateSchema,
  pricingRuleCreateSchema,
} from './schemas';
import {
  bookingCreateSchema,
  bookingListQuerySchema,
  bookingUpdateSchema,
  joinRequestActionSchema,
  joinRequestCreateSchema,
  matchCreateSchema,
  matchDisputeSchema,
  matchListQuerySchema,
  matchScoreSchema,
  participantInviteSchema,
  participantRsvpSchema,
} from './booking-schemas';
import { clubOnboardSchema } from './onboard-schemas';
import {
  chatCreateSchema,
  chatListQuerySchema,
  chatMarkReadSchema,
  chatMemberAddSchema,
  chatMessageCreateSchema,
  chatMessageListQuerySchema,
} from './chat-schemas';
import {
  coachListQuerySchema,
  coachPatchSchema,
  coachUpsertSchema,
  coachingSessionCreateSchema,
  coachingSessionListQuerySchema,
  coachingSessionPatchSchema,
  coachingSessionReviewSchema,
  verificationUploadSchema,
} from './coach-schemas';
import {
  tournamentCreateSchema,
  tournamentListQuerySchema,
  tournamentMatchScoreSchema,
  tournamentRegistrationCreateSchema,
  tournamentRegistrationUpdateSchema,
  tournamentUpdateSchema,
} from './tournament-schemas';

extendZodWithOpenApi(z);

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

interface RouteSpec {
  path: string;
  method: Method;
  summary: string;
  tag: string;
  pathParams?: readonly string[];
  query?: ZodTypeAny;
  body?: ZodTypeAny;
  successStatus?: 200 | 201 | 204;
  auth?: 'session' | 'public' | 'admin';
}

/**
 * Standard error envelope returned by `responses.ts`. Matches the shape:
 *   { error: string, message: string, details?: unknown }
 */
const errorSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  })
  .openapi('Error');

const dataEnvelope = (inner: ZodTypeAny, name: string) =>
  z.object({ data: inner }).openapi(name);

const idResource = z.object({ id: z.string().uuid() }).passthrough();

const ROUTES: readonly RouteSpec[] = [
  // health
  { path: '/api/health', method: 'get', tag: 'health', summary: 'Liveness probe.', auth: 'public' },

  // clubs
  { path: '/api/v1/clubs', method: 'get', tag: 'clubs', summary: 'List clubs.', query: clubListQuerySchema, auth: 'public' },
  { path: '/api/v1/clubs', method: 'post', tag: 'clubs', summary: 'Create a club.', body: clubCreateSchema, successStatus: 201, auth: 'admin' },
  { path: '/api/v1/clubs/onboard', method: 'post', tag: 'clubs', summary: 'Public 4-step club onboarding.', body: clubOnboardSchema, successStatus: 201, auth: 'public' },
  { path: '/api/v1/clubs/{slug}', method: 'get', tag: 'clubs', summary: 'Fetch a single club.', pathParams: ['slug'], auth: 'public' },
  { path: '/api/v1/clubs/{slug}', method: 'patch', tag: 'clubs', summary: 'Update a club.', pathParams: ['slug'], body: clubUpdateSchema, auth: 'admin' },
  { path: '/api/v1/clubs/{slug}/approve', method: 'post', tag: 'clubs', summary: 'Approve a pending club.', pathParams: ['slug'], auth: 'admin' },
  { path: '/api/v1/clubs/{slug}/reject', method: 'post', tag: 'clubs', summary: 'Reject a pending club.', pathParams: ['slug'], auth: 'admin' },
  { path: '/api/v1/clubs/{slug}/courts', method: 'get', tag: 'clubs', summary: 'List courts in a club.', pathParams: ['slug'], auth: 'public' },
  { path: '/api/v1/clubs/{slug}/courts', method: 'post', tag: 'clubs', summary: 'Create a court for a club.', pathParams: ['slug'], body: courtCreateSchema, successStatus: 201, auth: 'admin' },

  // courts
  { path: '/api/v1/courts/{id}', method: 'patch', tag: 'courts', summary: 'Update a court.', pathParams: ['id'], body: courtUpdateSchema, auth: 'admin' },
  { path: '/api/v1/courts/{id}/pricing', method: 'get', tag: 'courts', summary: 'List pricing rules for a court.', pathParams: ['id'], auth: 'public' },
  { path: '/api/v1/courts/{id}/pricing', method: 'post', tag: 'courts', summary: 'Add a pricing rule.', pathParams: ['id'], body: pricingRuleCreateSchema, successStatus: 201, auth: 'admin' },

  // bookings
  { path: '/api/v1/bookings', method: 'get', tag: 'bookings', summary: 'List bookings.', query: bookingListQuerySchema, auth: 'session' },
  { path: '/api/v1/bookings', method: 'post', tag: 'bookings', summary: 'Create a booking.', body: bookingCreateSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/bookings/open', method: 'get', tag: 'bookings', summary: 'List open-match bookings still seeking players.', auth: 'session' },
  { path: '/api/v1/bookings/{id}', method: 'get', tag: 'bookings', summary: 'Fetch a booking.', pathParams: ['id'], auth: 'session' },
  { path: '/api/v1/bookings/{id}', method: 'patch', tag: 'bookings', summary: 'Update a booking.', pathParams: ['id'], body: bookingUpdateSchema, auth: 'session' },
  { path: '/api/v1/bookings/{id}/cancel', method: 'post', tag: 'bookings', summary: 'Cancel a booking.', pathParams: ['id'], auth: 'session' },
  { path: '/api/v1/bookings/{id}/confirm', method: 'post', tag: 'bookings', summary: 'Confirm a booking after payment.', pathParams: ['id'], auth: 'session' },
  { path: '/api/v1/bookings/{id}/participants', method: 'post', tag: 'bookings', summary: 'Invite a participant.', pathParams: ['id'], body: participantInviteSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/bookings/{id}/participants/{participantId}', method: 'patch', tag: 'bookings', summary: 'RSVP to an invite.', pathParams: ['id', 'participantId'], body: participantRsvpSchema, auth: 'session' },
  { path: '/api/v1/bookings/{id}/join', method: 'post', tag: 'bookings', summary: 'Request to join an open match.', pathParams: ['id'], body: joinRequestCreateSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/bookings/{id}/join/{requestId}', method: 'patch', tag: 'bookings', summary: 'Approve or decline a join request.', pathParams: ['id', 'requestId'], body: joinRequestActionSchema, auth: 'session' },
  { path: '/api/v1/bookings/{id}/joins', method: 'get', tag: 'bookings', summary: 'List join requests for a booking.', pathParams: ['id'], auth: 'session' },

  // matches
  { path: '/api/v1/matches', method: 'get', tag: 'matches', summary: 'List matches.', query: matchListQuerySchema, auth: 'session' },
  { path: '/api/v1/matches', method: 'post', tag: 'matches', summary: 'Create a match from a booking.', body: matchCreateSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/matches/discover', method: 'get', tag: 'matches', summary: 'Bookings finished without a verified score.', auth: 'admin' },
  { path: '/api/v1/matches/{id}', method: 'get', tag: 'matches', summary: 'Fetch a match.', pathParams: ['id'], auth: 'session' },
  { path: '/api/v1/matches/{id}/score', method: 'post', tag: 'matches', summary: 'Submit set scores. Triggers Glicko-2 rating updates.', pathParams: ['id'], body: matchScoreSchema, auth: 'session' },
  { path: '/api/v1/matches/{id}/verify', method: 'post', tag: 'matches', summary: 'Verify a submitted score (peer or club).', pathParams: ['id'], auth: 'session' },
  { path: '/api/v1/matches/{id}/dispute', method: 'post', tag: 'matches', summary: 'Open a dispute against a match score.', pathParams: ['id'], body: matchDisputeSchema, successStatus: 201, auth: 'session' },

  // tournaments
  { path: '/api/v1/tournaments', method: 'get', tag: 'tournaments', summary: 'List tournaments.', query: tournamentListQuerySchema, auth: 'public' },
  { path: '/api/v1/tournaments', method: 'post', tag: 'tournaments', summary: 'Create a tournament.', body: tournamentCreateSchema, successStatus: 201, auth: 'admin' },
  { path: '/api/v1/tournaments/{id}', method: 'get', tag: 'tournaments', summary: 'Fetch a tournament.', pathParams: ['id'], auth: 'public' },
  { path: '/api/v1/tournaments/{id}', method: 'patch', tag: 'tournaments', summary: 'Update a tournament.', pathParams: ['id'], body: tournamentUpdateSchema, auth: 'admin' },
  { path: '/api/v1/tournaments/{id}/start', method: 'post', tag: 'tournaments', summary: 'Lock registrations and seed brackets.', pathParams: ['id'], auth: 'admin' },
  { path: '/api/v1/tournaments/{id}/standings', method: 'get', tag: 'tournaments', summary: 'Live standings.', pathParams: ['id'], auth: 'public' },
  { path: '/api/v1/tournaments/{id}/registrations', method: 'get', tag: 'tournaments', summary: 'List tournament registrations.', pathParams: ['id'], auth: 'public' },
  { path: '/api/v1/tournaments/{id}/registrations', method: 'post', tag: 'tournaments', summary: 'Register a team.', pathParams: ['id'], body: tournamentRegistrationCreateSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/tournaments/{id}/registrations/{regId}', method: 'patch', tag: 'tournaments', summary: 'Update a tournament registration.', pathParams: ['id', 'regId'], body: tournamentRegistrationUpdateSchema, auth: 'admin' },
  { path: '/api/v1/tournaments/{id}/matches/{matchId}/score', method: 'post', tag: 'tournaments', summary: 'Submit a tournament match score.', pathParams: ['id', 'matchId'], body: tournamentMatchScoreSchema, auth: 'session' },

  // coaches
  { path: '/api/v1/coaches', method: 'get', tag: 'coaches', summary: 'List coaches.', query: coachListQuerySchema, auth: 'public' },
  { path: '/api/v1/coaches/{userId}', method: 'get', tag: 'coaches', summary: 'Fetch coach profile.', pathParams: ['userId'], auth: 'public' },
  { path: '/api/v1/coaches/{userId}', method: 'put', tag: 'coaches', summary: 'Upsert coach profile.', pathParams: ['userId'], body: coachUpsertSchema, auth: 'session' },
  { path: '/api/v1/coaches/{userId}', method: 'patch', tag: 'coaches', summary: 'Patch coach profile.', pathParams: ['userId'], body: coachPatchSchema, auth: 'session' },
  { path: '/api/v1/coaches/{userId}/availability', method: 'get', tag: 'coaches', summary: 'Fetch coach weekly availability.', pathParams: ['userId'], auth: 'public' },
  { path: '/api/v1/coaches/{userId}/verification', method: 'post', tag: 'coaches', summary: 'Submit verification documents.', pathParams: ['userId'], body: verificationUploadSchema, auth: 'session' },
  { path: '/api/v1/coaches/{userId}/verify', method: 'post', tag: 'coaches', summary: 'Mark coach verified.', pathParams: ['userId'], auth: 'admin' },
  { path: '/api/v1/coaches/{userId}/reject', method: 'post', tag: 'coaches', summary: 'Reject coach verification.', pathParams: ['userId'], auth: 'admin' },

  // coaching sessions
  { path: '/api/v1/coaching-sessions', method: 'get', tag: 'coaching', summary: 'List coaching sessions.', query: coachingSessionListQuerySchema, auth: 'session' },
  { path: '/api/v1/coaching-sessions', method: 'post', tag: 'coaching', summary: 'Book a coaching session.', body: coachingSessionCreateSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/coaching-sessions/{id}', method: 'patch', tag: 'coaching', summary: 'Update a coaching session.', pathParams: ['id'], body: coachingSessionPatchSchema, auth: 'session' },
  { path: '/api/v1/coaching-sessions/{id}/review', method: 'post', tag: 'coaching', summary: 'Leave a post-session review.', pathParams: ['id'], body: coachingSessionReviewSchema, successStatus: 201, auth: 'session' },

  // chats
  { path: '/api/v1/chats', method: 'get', tag: 'chats', summary: 'List chats.', query: chatListQuerySchema, auth: 'session' },
  { path: '/api/v1/chats', method: 'post', tag: 'chats', summary: 'Create a chat.', body: chatCreateSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/chats/{id}', method: 'get', tag: 'chats', summary: 'Fetch a chat.', pathParams: ['id'], auth: 'session' },
  { path: '/api/v1/chats/{id}', method: 'patch', tag: 'chats', summary: 'Mark a chat read.', pathParams: ['id'], body: chatMarkReadSchema, auth: 'session' },
  { path: '/api/v1/chats/{id}/members', method: 'post', tag: 'chats', summary: 'Add a chat member.', pathParams: ['id'], body: chatMemberAddSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/chats/{id}/messages', method: 'get', tag: 'chats', summary: 'List chat messages.', pathParams: ['id'], query: chatMessageListQuerySchema, auth: 'session' },
  { path: '/api/v1/chats/{id}/messages', method: 'post', tag: 'chats', summary: 'Post a message.', pathParams: ['id'], body: chatMessageCreateSchema, successStatus: 201, auth: 'session' },
  { path: '/api/v1/chats/{id}/messages/stream', method: 'get', tag: 'chats', summary: 'SSE stream of new messages.', pathParams: ['id'], auth: 'session' },

  // me / friends / edition
  { path: '/api/v1/me', method: 'get', tag: 'me', summary: 'Fetch the current user.', auth: 'session' },
  { path: '/api/v1/me/export', method: 'get', tag: 'me', summary: 'Export GDPR personal data.', auth: 'session' },
  { path: '/api/v1/me/delete', method: 'post', tag: 'me', summary: 'Request account deletion.', auth: 'session' },
  { path: '/api/v1/me/push-tokens', method: 'post', tag: 'me', summary: 'Register a device push token.', auth: 'session' },
  { path: '/api/v1/friends', method: 'get', tag: 'friends', summary: 'List friendships.', auth: 'session' },
  { path: '/api/v1/friends', method: 'post', tag: 'friends', summary: 'Send a friend request.', auth: 'session' },
  { path: '/api/v1/friends/{id}', method: 'patch', tag: 'friends', summary: 'Accept or reject a friend request.', pathParams: ['id'], auth: 'session' },
  { path: '/api/v1/edition/applications', method: 'post', tag: 'edition', summary: 'Apply for Feera Edition.', auth: 'session' },

  // payments / uploads / realtime
  { path: '/api/v1/payments/intent', method: 'post', tag: 'payments', summary: 'Create a payment intent.', auth: 'session' },
  { path: '/api/v1/payments/webhook/stripe', method: 'post', tag: 'payments', summary: 'Stripe webhook receiver.', auth: 'public' },
  { path: '/api/v1/uploads/sign', method: 'post', tag: 'uploads', summary: 'Sign an upload URL.', auth: 'session' },
  { path: '/api/v1/uploads/confirm', method: 'post', tag: 'uploads', summary: 'Confirm a completed upload.', auth: 'session' },
  { path: '/api/v1/realtime/auth', method: 'post', tag: 'realtime', summary: 'Authenticate a Soketi channel subscription.', auth: 'session' },
];

function buildPathParams(names: readonly string[]) {
  return names.map((name) => ({
    name,
    in: 'path' as const,
    required: true,
    schema: { type: 'string' as const },
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildOpenApiDocument(): any {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', 'sessionCookie', {
    type: 'apiKey',
    in: 'cookie',
    name: 'better-auth.session_token',
  });
  registry.registerComponent('securitySchemes', 'devAdmin', {
    type: 'apiKey',
    in: 'header',
    name: 'x-feera-dev-admin',
    description: 'Development-only admin bypass. Set to "1". Enabled when NODE_ENV != production or ADMIN_DEV_HEADER=1.',
  });

  const successData = z.object({ data: z.unknown() }).openapi('SuccessEnvelope');

  for (const r of ROUTES) {
    const security: Array<Record<string, string[]>> =
      r.auth === 'public'
        ? []
        : r.auth === 'admin'
          ? [{ sessionCookie: [] as string[] }, { devAdmin: [] as string[] }]
          : [{ sessionCookie: [] as string[] }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responses: Record<string, any> = {
      [String(r.successStatus ?? 200)]: {
        description: 'Success',
        content: { 'application/json': { schema: successData } },
      },
      '400': { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } },
      '500': { description: 'Internal error', content: { 'application/json': { schema: errorSchema } } },
    };
    if (r.auth !== 'public') {
      responses['401'] = { description: 'Unauthenticated', content: { 'application/json': { schema: errorSchema } } };
      responses['403'] = { description: 'Forbidden', content: { 'application/json': { schema: errorSchema } } };
    }

    registry.registerPath({
      method: r.method,
      path: r.path,
      summary: r.summary,
      tags: [r.tag],
      security,
      request: {
        params: r.pathParams
          ? (z.object(Object.fromEntries(r.pathParams.map((p) => [p, z.string()]))) as never)
          : undefined,
        query: r.query as never,
        body: r.body
          ? {
              required: true,
              content: { 'application/json': { schema: r.body as never } },
            }
          : undefined,
      },
      responses,
    });
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Feera API',
      version: '0.1.0',
      description:
        'Public REST surface for Feera and Feera Edition. All success responses are wrapped in a `{ data: T }` envelope; errors return `{ error, message, details? }`.',
      contact: { name: 'Feera', email: 'hello@feera.ai', url: 'https://www.feera.ai' },
      license: { name: 'MIT', url: 'https://opensource.org/license/mit' },
    },
    servers: [
      { url: 'https://www.feera.ai', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    tags: [
      { name: 'clubs' }, { name: 'courts' }, { name: 'bookings' }, { name: 'matches' },
      { name: 'tournaments' }, { name: 'coaches' }, { name: 'coaching' }, { name: 'chats' },
      { name: 'me' }, { name: 'friends' }, { name: 'edition' }, { name: 'payments' },
      { name: 'uploads' }, { name: 'realtime' }, { name: 'health' },
    ],
  });
}

export const apiRouteCount = ROUTES.length;

// Re-export so tests can introspect the registered list without re-parsing.
export { ROUTES as openApiRoutes };

// Silence unused helper while keeping the symbol available for future use.
export const _internalHelpers = { buildPathParams, dataEnvelope, idResource };
