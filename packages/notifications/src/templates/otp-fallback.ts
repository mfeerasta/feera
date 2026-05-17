import type { NotificationTemplate } from '../types';
import { t } from './t';

type Vars = 'code' | 'expiresInMinutes';

export const otpFallback: NotificationTemplate<Vars> = {
  name: 'otp_fallback',
  variables: ['code', 'expiresInMinutes'] as const,
  render(locale, vars) {
    return {
      title: t(locale, 'Your Feera code'),
      body: t(
        locale,
        `Your Feera verification code is ${vars.code}. It expires in ${vars.expiresInMinutes} minutes.`,
      ),
    };
  },
};
