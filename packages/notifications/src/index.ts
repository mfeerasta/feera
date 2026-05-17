export * from './types';
export * from './router';

export { ExpoPushChannel } from './channels/expo-push';
export { TwilioSmsChannel } from './channels/twilio-sms';
export { TwilioWhatsappChannel } from './channels/twilio-whatsapp';
export { ResendEmailChannel } from './channels/resend-email';
export { OneSignalWebChannel } from './channels/onesignal-web';
export { SoketiChannel, soketi, activeRealtimeTransport } from './channels/soketi';
export type { SoketiEvent, SoketiTransport } from './channels/soketi';

export { bookingConfirmed } from './templates/booking-confirmed';
export { bookingCancelled } from './templates/booking-cancelled';
export { matchInvite } from './templates/match-invite';
export { tournamentUpdate } from './templates/tournament-update';
export { chatMessage } from './templates/chat-message';
export { paymentSucceeded } from './templates/payment-succeeded';
export { otpFallback } from './templates/otp-fallback';
export { editionApplicationUpdate } from './templates/edition-application-update';
export { bookingJoinRequested } from './templates/booking-join-requested';
export { bookingJoinApproved } from './templates/booking-join-approved';
export { bookingJoinDeclined } from './templates/booking-join-declined';
export { matchScoreSubmitted } from './templates/match-score-submitted';
export { matchDisputed } from './templates/match-disputed';
export { coachingSessionReviewed } from './templates/coaching-session-reviewed';
export { coachingVerificationApproved } from './templates/coaching-verification-approved';

import type { NotificationTemplate, NotificationTemplateName } from './types';
import { bookingConfirmed as _bookingConfirmed } from './templates/booking-confirmed';
import { bookingCancelled as _bookingCancelled } from './templates/booking-cancelled';
import { matchInvite as _matchInvite } from './templates/match-invite';
import { tournamentUpdate as _tournamentUpdate } from './templates/tournament-update';
import { chatMessage as _chatMessage } from './templates/chat-message';
import { paymentSucceeded as _paymentSucceeded } from './templates/payment-succeeded';
import { otpFallback as _otpFallback } from './templates/otp-fallback';
import { editionApplicationUpdate as _editionApplicationUpdate } from './templates/edition-application-update';
import { bookingJoinRequested as _bookingJoinRequested } from './templates/booking-join-requested';
import { bookingJoinApproved as _bookingJoinApproved } from './templates/booking-join-approved';
import { bookingJoinDeclined as _bookingJoinDeclined } from './templates/booking-join-declined';
import { matchScoreSubmitted as _matchScoreSubmitted } from './templates/match-score-submitted';
import { matchDisputed as _matchDisputed } from './templates/match-disputed';
import { coachingSessionReviewed as _coachingSessionReviewed } from './templates/coaching-session-reviewed';
import { coachingVerificationApproved as _coachingVerificationApproved } from './templates/coaching-verification-approved';

export const templateRegistry: Record<NotificationTemplateName, NotificationTemplate<string>> = {
  booking_confirmed: _bookingConfirmed,
  booking_cancelled: _bookingCancelled,
  booking_join_requested: _bookingJoinRequested,
  booking_join_approved: _bookingJoinApproved,
  booking_join_declined: _bookingJoinDeclined,
  match_invite: _matchInvite,
  match_score_submitted: _matchScoreSubmitted,
  match_disputed: _matchDisputed,
  tournament_update: _tournamentUpdate,
  chat_message: _chatMessage,
  payment_succeeded: _paymentSucceeded,
  otp_fallback: _otpFallback,
  edition_application_update: _editionApplicationUpdate,
  coaching_session_reviewed: _coachingSessionReviewed,
  coaching_verification_approved: _coachingVerificationApproved,
};
