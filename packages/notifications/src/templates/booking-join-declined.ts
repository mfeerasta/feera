import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'clubName' | 'date' | 'time' | 'bookingId';

export const bookingJoinDeclined: NotificationTemplate<Vars> = {
  name: 'booking_join_declined',
  variables: ['clubName', 'date', 'time', 'bookingId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Join request declined'),
      body: t(
        locale,
        `The organizer declined your request to join at ${vars.clubName} on ${vars.date} at ${vars.time}.`,
      ),
      actionUrl: `feera://booking/${vars.bookingId}`,
    };
  },
};
