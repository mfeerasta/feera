import { describe, it, expect } from 'vitest';

/**
 * Verify that each courts page module exports a default function.
 * This catches broken imports at test time without needing to render.
 */

describe('courts page exports', () => {
  it('/courts exports a default function', async () => {
    const mod = await import('@/app/courts/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/courts/methodology exports a default function', async () => {
    const mod = await import('@/app/courts/methodology/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/courts/about exports a default function', async () => {
    const mod = await import('@/app/courts/about/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/courts/partners exports a default function', async () => {
    const mod = await import('@/app/courts/partners/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/courts/work exports a default function', async () => {
    const mod = await import('@/app/courts/work/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/courts/work/[slug] exports a default function', async () => {
    const mod = await import('@/app/courts/work/[slug]/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/courts/configure exports a default function', async () => {
    const mod = await import('@/app/courts/configure/page');
    expect(typeof mod.default).toBe('function');
  });

  it('/courts/thank-you exports a default function', async () => {
    const mod = await import('@/app/courts/thank-you/page');
    expect(typeof mod.default).toBe('function');
  });
});
