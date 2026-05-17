import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'disputerName' | 'reason' | 'matchId';

export const matchDisputed: NotificationTemplate<Vars> = {
  name: 'match_disputed',
  variables: ['disputerName', 'reason', 'matchId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Match score disputed'),
      body: t(
        locale,
        `${vars.disputerName} disputed the score for your match. Reason: ${vars.reason}.`,
      ),
      actionUrl: `feera://match/${vars.matchId}`,
    };
  },
};
