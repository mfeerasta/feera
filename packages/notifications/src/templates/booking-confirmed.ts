import type { NotificationTemplate } from '../types.js';
import { t } from './t.js';

type Vars = 'clubName' | 'date' | 'time' | 'bookingId';

export const bookingConfirmed: NotificationTemplate<Vars> = {
  name: 'booking_confirmed',
  variables: ['clubName', 'date', 'time', 'bookingId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Booking confirmed'),
      body: t(
        locale,
        `Your court at ${vars.clubName} is confirmed for ${vars.date} at ${vars.time}.`,
      ),
      actionUrl: `feera://booking/${vars.bookingId}`,
    };
  },
};
