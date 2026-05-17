import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'opponentName' | 'score' | 'matchId';

export const matchScoreSubmitted: NotificationTemplate<Vars> = {
  name: 'match_score_submitted',
  variables: ['opponentName', 'score', 'matchId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Score submitted, please verify'),
      body: t(
        locale,
        `${vars.opponentName} submitted the score: ${vars.score}. Confirm or dispute within 48 hours.`,
      ),
      actionUrl: `feera://match/${vars.matchId}`,
    };
  },
};
