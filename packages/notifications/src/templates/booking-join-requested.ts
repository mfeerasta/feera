import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'requesterName' | 'clubName' | 'date' | 'time' | 'bookingId' | 'requestId';

export const bookingJoinRequested: NotificationTemplate<Vars> = {
  name: 'booking_join_requested',
  variables: ['requesterName', 'clubName', 'date', 'time', 'bookingId', 'requestId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'New join request'),
      body: t(
        locale,
        `${vars.requesterName} wants to join your match at ${vars.clubName} on ${vars.date} at ${vars.time}.`,
      ),
      actionUrl: `feera://booking/${vars.bookingId}/requests/${vars.requestId}`,
    };
  },
};
