/**
 * PostHog facade. Real `posthog-js` + `posthog-react-native` wiring lands in M2 once
 * the self-hosted PostHog instance on Hetzner Falkenstein is up.
 *
 * Until then this is a no-op + console echo so call sites compile and developers can see
 * the event taxonomy at work locally.
 */

import type { AnalyticsEvent, EventName, EventProperties } from './events.js';

export interface PostHogFacade {
  init(opts: { apiKey?: string; host?: string }): void;
  identify(distinctId: string, traits?: EventProperties): void;
  capture(event: AnalyticsEvent): void;
  track(name: EventName, properties?: EventProperties): void;
  reset(): void;
}

class NoopPostHog implements PostHogFacade {
  private distinctId: string | undefined;

  init(): void {
    // intentionally blank
  }
  identify(distinctId: string): void {
    this.distinctId = distinctId;
  }
  capture(event: AnalyticsEvent): void {
    // eslint-disable-next-line no-console
    console.debug('[posthog-noop]', event.name, event.properties ?? {});
  }
  track(name: EventName, properties?: EventProperties): void {
    this.capture({ name, properties, distinctId: this.distinctId ?? 'anon' });
  }
  reset(): void {
    this.distinctId = undefined;
  }
}

export const posthog: PostHogFacade = new NoopPostHog();
