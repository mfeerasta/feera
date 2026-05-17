import type { NotificationTemplate } from '../types.js';
import { t } from './t.js';

type Vars = 'tournamentName' | 'updateSummary' | 'tournamentId';

export const tournamentUpdate: NotificationTemplate<Vars> = {
  name: 'tournament_update',
  variables: ['tournamentName', 'updateSummary', 'tournamentId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, `${vars.tournamentName}: update`),
      body: t(locale, String(vars.updateSummary)),
      actionUrl: `feera://tournament/${vars.tournamentId}`,
    };
  },
};
