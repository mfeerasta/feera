# @feera/notifications

Adapter layer for transactional and lifecycle notifications.

Phase 1 (M2) ships facades only: every channel returns `status: 'queued'` without
calling Twilio, Expo, Resend, or OneSignal. Real provider wiring lands in M6.

## Routing rules

Default routing per `CLAUDE.md`:

- PK users: WhatsApp first (with SMS fallback when WhatsApp opt-in is missing).
- Gulf users (AE, SA, QA, KW, BH, OM): push first, email fallback.
- Everyone else: push first, email fallback.
- Marketing urgency: email only, only when email opt-in is true.
- Opt-outs are never bypassed, even on high urgency.

## Interface

Every channel implements `NotificationChannel`:

```ts
interface NotificationChannel {
  readonly name: NotificationChannelName;
  send(req: NotificationRequest, rendered: RenderedTemplate): Promise<NotificationResult>;
}
```

`NotificationRouter.pickChannelChain()` returns an ordered list of channels for a
given request. Callers try them in order, accepting the first non-failure result.
