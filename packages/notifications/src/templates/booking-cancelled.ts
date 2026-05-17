import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'clubName' | 'date' | 'time' | 'bookingId' | 'reason';

export const bookingCancelled: NotificationTemplate<Vars> = {
  name: 'booking_cancelled',
  variables: ['clubName', 'date', 'time', 'bookingId', 'reason'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Booking cancelled'),
      body: t(
        locale,
        `Your booking at ${vars.clubName} on ${vars.date} at ${vars.time} was cancelled. Reason: ${vars.reason}.`,
      ),
      actionUrl: `feera://booking/${vars.bookingId}`,
    };
  },
};
