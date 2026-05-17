import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'senderName' | 'preview' | 'threadId';

export const chatMessage: NotificationTemplate<Vars> = {
  name: 'chat_message',
  variables: ['senderName', 'preview', 'threadId'] as const,
  render(locale, vars) {
    return {
      title: t(locale, String(vars.senderName)),
      body: t(locale, String(vars.preview)),
      actionUrl: `feera://chat/${vars.threadId}`,
    };
  },
};
