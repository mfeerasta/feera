import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'learnerName' | 'rating' | 'sessionId';

export const coachingSessionReviewed: NotificationTemplate<Vars> = {
  name: 'coaching_session_reviewed',
  variables: ['learnerName', 'rating', 'sessionId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'New review for your session'),
      body: t(
        locale,
        `${vars.learnerName} rated your session ${vars.rating} out of 5.`,
      ),
      actionUrl: `feera://coaching/${vars.sessionId}`,
    };
  },
};
