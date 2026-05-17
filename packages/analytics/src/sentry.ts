/**
 * Sentry helper. Real `@sentry/nextjs` and `@sentry/react-native` wiring lands in M2 once
 * we have a Sentry org + DSN. Until then this is a no-op recorder so call sites compile.
 *
 * Privacy: NEVER pass PII through `captureException` extras. Use Sentry's data scrubber
 * + a small sanitiser at the call site if doubt exists.
 */

export type SentryUser = { id: string; locale?: string; countryCode?: string };

export interface SentryFacade {
  init(opts: { dsn?: string; environment: string; release?: string }): void;
  setUser(user: SentryUser | null): void;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: 'fatal' | 'error' | 'warning' | 'info'): void;
}

class NoopSentry implements SentryFacade {
  init(): void {
    // intentionally blank
  }
  setUser(): void {
    // intentionally blank
  }
  captureException(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error('[sentry-noop]', error);
  }
  captureMessage(message: string): void {
    // eslint-disable-next-line no-console
    console.warn('[sentry-noop]', message);
  }
}

export const sentry: SentryFacade = new NoopSentry();
