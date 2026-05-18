/**
 * Common types for the notifications adapter layer.
 *
 * Every NotificationChannel speaks these types so the router can swap providers
 * per region without call sites caring. Modelled on `@feera/payments`.
 */

import type { CountryCode, Locale, Uuid } from '@feera/types';

export type NotificationChannelName =
  | 'expo_push'
  | 'twilio_sms'
  | 'twilio_whatsapp'
  | 'resend_email'
  | 'onesignal_web';

export type NotificationUrgency = 'high' | 'medium' | 'low' | 'marketing';

export type NotificationTemplateName =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_join_requested'
  | 'booking_join_approved'
  | 'booking_join_declined'
  | 'match_invite'
  | 'match_score_submitted'
  | 'match_disputed'
  | 'tournament_update'
  | 'chat_message'
  | 'payment_succeeded'
  | 'otp_fallback'
  | 'edition_application_update'
  | 'coaching_session_reviewed'
  | 'coaching_verification_approved'
  | 'friend_request_received'
  | 'friend_request_accepted';

export type NotificationRecipient = Readonly<{
  userId: Uuid;
  locale: Locale;
  countryCode: CountryCode;
  timezone?: string;
  expoPushToken?: string;
  phoneE164?: string;
  email?: string;
  onesignalPlayerId?: string;
  /**
   * Per-channel opt-ins. Missing entries are treated as "unknown" (allowed by
   * default for transactional channels, blocked for marketing). An explicit
   * `false` is an opt-out and is never bypassed.
   */
  optIns: Partial<Record<NotificationChannelName, boolean>>;
}>;

export type NotificationRequest = Readonly<{
  recipient: NotificationRecipient;
  template: NotificationTemplateName;
  variables: Record<string, string | number>;
  urgency: NotificationUrgency;
  /** Idempotency so retries do not duplicate sends. */
  idempotencyKey: string;
}>;

export type RenderedTemplate = Readonly<{
  title: string;
  body: string;
  actionUrl?: string;
}>;

export type NotificationResult = Readonly<{
  channel: NotificationChannelName;
  providerMessageId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';
  reason?: string;
}>;

export interface NotificationChannel {
  readonly name: NotificationChannelName;
  send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult>;
}

/**
 * A typed template definition. Each template under `src/templates/` exports one
 * of these. `variables` is the closed list of placeholders the template needs.
 */
export interface NotificationTemplate<TVar extends string = string> {
  readonly name: NotificationTemplateName;
  readonly variables: readonly TVar[];
  render(locale: Locale, vars: Record<TVar, string | number>): RenderedTemplate;
}
