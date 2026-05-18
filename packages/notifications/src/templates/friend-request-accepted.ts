import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'requesterDisplayName';

export const friendRequestAccepted: NotificationTemplate<Vars> = {
  name: 'friend_request_accepted',
  variables: ['requesterDisplayName'] as const,
  render(locale, vars) {
    const who = String(vars.requesterDisplayName ?? '').trim();
    return {
      title: t(locale, 'You are now friends'),
      body: who
        ? t(locale, `${who} accepted your friend request. Plan a match.`)
        : t(locale, 'Your friend request was accepted. Plan a match.'),
      actionUrl: '/play/friends?tab=accepted',
    };
  },
};
