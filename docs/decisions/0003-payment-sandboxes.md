# 0003. Payment sandbox strategy for Pakistan providers

- Status: accepted
- Date: 2026-05-17
- Deciders: M, Claude
- Tags: payments, testing

## Context

Phase 1 ships with four live payment adapters: Stripe, JazzCash, Easypaisa, Raast (via 1Link). Stripe's test mode is excellent. The Pakistan providers ship limited or no sandbox.

## Options considered

### Option A: Real low-value transactions on production credentials
Pros: highest fidelity.
Cons: real money on every CI run. Requires Pakistan corporate signups that take weeks.

### Option B: Mock servers replaying captured responses + property-based tests
Pros: deterministic, fast, no money, runs everywhere.
Cons: drift between mock and reality is possible; must be reconciled monthly.

### Option C: Wait for real merchant accounts before writing adapters
Pros: zero drift risk.
Cons: blocks the entire bookings milestone.

## Decision

**Option B for CI + dev. Option A in a separate `payment-smoke` workflow** triggered manually before production deploys, hitting real provider sandboxes (Stripe always; JazzCash + Easypaisa once SQ Enterprises walks us through merchant onboarding) with the smallest billable amount.

## Implementation

- Adapters live in `packages/payments/src/providers/{stripe,jazzcash,easypaisa,raast}/`.
- Each provider exposes the same `PaymentProvider` interface (`createCheckout`, `verifyWebhook`, `refund`, `getTransaction`, optional `capturePayment`, optional `createPayout`).
- Mock servers under `packages/payments/test/mocks/` are MSW handlers that replay captured fixtures from the real sandboxes (when available) or the published API contract.
- Real-sandbox tests live in `packages/payments/test/integration/` and only run when `RUN_INTEGRATION_PAYMENTS=1` is set.
- `payment-smoke` GitHub Actions workflow runs the integration suite on schedule (weekly) and on demand before any prod deploy that touched `packages/payments`.

## Consequences

- Positive: CI fast, deterministic, zero cost.
- Positive: a single switch (`RUN_INTEGRATION_PAYMENTS=1`) elevates confidence pre-deploy.
- Negative: mock drift is possible. Mitigation: weekly scheduled `payment-smoke` run, plus required `payment-smoke` check on any prod deploy of `packages/payments`.
- Follow-up: when Pakistan merchant accounts are live, record real sandbox fixtures into `packages/payments/test/fixtures/` and update mocks.
