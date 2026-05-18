import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'requesterDisplayName';

export const friendRequestReceived: NotificationTemplate<Vars> = {
  name: 'friend_request_received',
  variables: ['requesterDisplayName'] as const,
  render(locale, vars) {
    const who = String(vars.requesterDisplayName ?? '').trim();
    return {
      title: t(locale, 'New friend request'),
      body: who
        ? t(locale, `${who} wants to be your friend on Feera.`)
        : t(locale, 'Someone wants to be your friend on Feera.'),
      actionUrl: '/play/friends?tab=incoming',
    };
  },
};
