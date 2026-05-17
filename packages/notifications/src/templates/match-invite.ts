import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'inviterName' | 'matchDate' | 'matchTime' | 'matchId';

export const matchInvite: NotificationTemplate<Vars> = {
  name: 'match_invite',
  variables: ['inviterName', 'matchDate', 'matchTime', 'matchId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'New match invite'),
      body: t(
        locale,
        `${vars.inviterName} invited you to a match on ${vars.matchDate} at ${vars.matchTime}.`,
      ),
      actionUrl: `feera://match/${vars.matchId}`,
    };
  },
};
