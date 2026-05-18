import { describe, expect, it } from 'vitest';
import {
  computeBlockEdge,
  decideSendOutcome,
  type EdgeShape,
} from '../src/lib/friends/service';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

function edge(
  requester: string,
  addressee: string,
  status: EdgeShape['status'],
): EdgeShape {
  return { requesterUserId: requester, addresseeUserId: addressee, status };
}

describe('decideSendOutcome', () => {
  it('rejects sending to self', () => {
    expect(decideSendOutcome(A, A, null)).toBe('self');
  });

  it('creates a fresh pending edge when no prior edge exists', () => {
    expect(decideSendOutcome(A, B, null)).toBe('create');
  });

  it('is idempotent when the viewer already has a pending request out', () => {
    expect(decideSendOutcome(A, B, edge(A, B, 'pending'))).toBe('exists');
  });

  it('auto-accepts when there is a reverse-direction pending request', () => {
    // B already invited A; now A invites B back. Should collapse to accepted.
    expect(decideSendOutcome(A, B, edge(B, A, 'pending'))).toBe('auto_accept');
  });

  it('returns exists when the pair is already accepted (no duplicates)', () => {
    expect(decideSendOutcome(A, B, edge(A, B, 'accepted'))).toBe('exists');
    expect(decideSendOutcome(A, B, edge(B, A, 'accepted'))).toBe('exists');
  });

  it('blocks the send when the pair is in blocked state', () => {
    expect(decideSendOutcome(A, B, edge(A, B, 'blocked'))).toBe('blocked');
    expect(decideSendOutcome(A, B, edge(B, A, 'blocked'))).toBe('blocked');
  });

  it('reactivates a previously declined edge', () => {
    expect(decideSendOutcome(A, B, edge(A, B, 'declined'))).toBe('reactivate');
    expect(decideSendOutcome(A, B, edge(B, A, 'declined'))).toBe('reactivate');
  });
});

describe('computeBlockEdge', () => {
  it('produces a viewer-owned blocked edge when no prior edge existed', () => {
    const result = computeBlockEdge(A, B, null);
    expect(result.status).toBe('blocked');
    expect(result.requesterUserId).toBe(A);
    expect(result.addresseeUserId).toBe(B);
  });

  it('replaces a prior accepted friendship with a viewer-owned block', () => {
    // The block flow collapses any prior pair-state into a single blocked
    // row owned by the blocker. So a previously-accepted friendship is
    // effectively removed (no longer accepted) once block is applied.
    const result = computeBlockEdge(A, B, edge(B, A, 'accepted'));
    expect(result.status).toBe('blocked');
    expect(result.requesterUserId).toBe(A);
    expect(result.addresseeUserId).toBe(B);
  });

  it('replaces a prior pending request with a viewer-owned block', () => {
    const result = computeBlockEdge(A, B, edge(B, A, 'pending'));
    expect(result.status).toBe('blocked');
    expect(result.requesterUserId).toBe(A);
  });
});
