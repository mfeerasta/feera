import type { NotificationTemplate } from '../types.js';
import { t } from './t.js';

type Vars = 'status' | 'applicationId';

export const editionApplicationUpdate: NotificationTemplate<Vars> = {
  name: 'edition_application_update',
  variables: ['status', 'applicationId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Feera Edition application update'),
      body: t(locale, `Your application is now ${vars.status}.`),
      actionUrl: `feera://edition/application/${vars.applicationId}`,
    };
  },
};
