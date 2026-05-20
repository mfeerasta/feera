import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'achievementId' | 'achievementName';

/**
 * Sent by the award-achievements worker when a user newly satisfies an
 * achievement rule. Low urgency: this is a nice-to-have, not a real-money
 * notification.
 */
export const achievementAwarded: NotificationTemplate<Vars> = {
  name: 'achievement_awarded',
  variables: ['achievementId', 'achievementName'] as const,
  render(locale, vars) {
    const name = String(vars.achievementName ?? vars.achievementId ?? '').trim();
    return {
      title: t(locale, 'New achievement unlocked'),
      body: name
        ? t(locale, `You earned "${name}". See it on your profile.`)
        : t(locale, 'You earned a new achievement. See it on your profile.'),
      actionUrl: '/me/achievements',
    };
  },
};
