import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'coachName';

export const coachingVerificationApproved: NotificationTemplate<Vars> = {
  name: 'coaching_verification_approved',
  variables: ['coachName'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'You are now a verified coach'),
      body: t(
        locale,
        `Congratulations ${vars.coachName}. Your coach verification has been approved.`,
      ),
      actionUrl: 'feera://coach/profile',
    };
  },
};
