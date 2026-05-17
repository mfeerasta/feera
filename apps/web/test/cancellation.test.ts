import { describe, expect, it } from 'vitest';
import {
  computeCancellationOutcome,
  computeRefundMinor,
} from '../src/lib/bookings/cancellation';

const START = new Date('2026-06-01T18:00:00Z');

function nowFromHoursBeforeStart(hoursBefore: number): Date {
  return new Date(START.getTime() - hoursBefore * 60 * 60 * 1000);
}

describe('computeCancellationOutcome', () => {
  it('grants a full refund more than 24h before start', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'confirmed' },
      nowFromHoursBeforeStart(48),
    );
    expect(out.canCancel).toBe(true);
    expect(out.refundFraction).toBe(1);
  });

  it('grants a 50 percent refund inside the 4-24h window', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'confirmed' },
      nowFromHoursBeforeStart(12),
    );
    expect(out.canCancel).toBe(true);
    expect(out.refundFraction).toBe(0.5);
  });

  it('treats the 24h boundary as full refund (inclusive)', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'confirmed' },
      nowFromHoursBeforeStart(24),
    );
    expect(out.refundFraction).toBe(1);
  });

  it('treats the 4h boundary as 50 percent refund (inclusive)', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'pending' },
      nowFromHoursBeforeStart(4),
    );
    expect(out.refundFraction).toBe(0.5);
  });

  it('cancels but issues no refund inside the 4h window', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'confirmed' },
      nowFromHoursBeforeStart(1),
    );
    expect(out.canCancel).toBe(true);
    expect(out.refundFraction).toBe(0);
  });

  it('rejects cancellation after start', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'confirmed' },
      new Date(START.getTime() + 5 * 60 * 1000),
    );
    expect(out.canCancel).toBe(false);
    expect(out.refundFraction).toBe(0);
  });

  it('is idempotent on already-cancelled bookings', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'cancelled' },
      nowFromHoursBeforeStart(48),
    );
    expect(out.canCancel).toBe(false);
  });

  it('rejects cancellation on completed / no-show bookings', () => {
    const out = computeCancellationOutcome(
      { startAt: START, status: 'completed' },
      nowFromHoursBeforeStart(48),
    );
    expect(out.canCancel).toBe(false);
  });
});

describe('computeRefundMinor', () => {
  it('returns 0 for fraction 0', () => {
    expect(computeRefundMinor(10000, 0)).toBe(0);
  });
  it('returns full amount for fraction 1', () => {
    expect(computeRefundMinor(10000, 1)).toBe(10000);
  });
  it('rounds half-up for 50 percent of odd amounts', () => {
    expect(computeRefundMinor(75, 0.5)).toBe(38);
    expect(computeRefundMinor(10001, 0.5)).toBe(5001);
  });
});
