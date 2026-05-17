import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'clubName' | 'date' | 'time' | 'bookingId';

export const bookingJoinApproved: NotificationTemplate<Vars> = {
  name: 'booking_join_approved',
  variables: ['clubName', 'date', 'time', 'bookingId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'You are in'),
      body: t(
        locale,
        `Your request to join at ${vars.clubName} on ${vars.date} at ${vars.time} was approved.`,
      ),
      actionUrl: `feera://booking/${vars.bookingId}`,
    };
  },
};
