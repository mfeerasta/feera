import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub Expo Constants + auth client BEFORE importing the module under test.
vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiUrl: 'https://example.test' } } },
}));

vi.mock('../src/auth/client', () => ({
  authClient: { getCookie: () => 'better-auth.session_token=abc' },
}));

import { apiFetch, ApiError } from '../src/lib/api';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches cookie header and parses JSON', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const json = await apiFetch<{ ok: boolean }>('/api/v1/me');
    expect(json.ok).toBe(true);
    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers as Headers;
    expect(headers.get('cookie')).toContain('better-auth.session_token');
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://example.test/api/v1/me');
  });

  it('retries once on 5xx then succeeds', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('boom', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const json = await apiFetch<{ ok: boolean }>('/api/x');
    expect(json.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError on 4xx without retrying', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'nope' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      );
    await expect(apiFetch('/api/x')).rejects.toBeInstanceOf(ApiError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
