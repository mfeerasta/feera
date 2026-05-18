import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'inviterName' | 'clubName' | 'date' | 'time' | 'bookingId';

export const bookingInviteReceived: NotificationTemplate<Vars> = {
  name: 'booking_invite_received',
  variables: ['inviterName', 'clubName', 'date', 'time', 'bookingId'] as const,
  render(locale, vars) {
    const who = String(vars.inviterName ?? '').trim();
    const where = String(vars.clubName ?? '').trim() || 'a club';
    return {
      title: t(locale, 'New booking invite'),
      body: who
        ? t(
            locale,
            `${who} invited you to play at ${where} on ${vars.date} at ${vars.time}.`,
          )
        : t(
            locale,
            `You have a new booking invite at ${where} on ${vars.date} at ${vars.time}.`,
          ),
      actionUrl: `/play/invites`,
    };
  },
};
