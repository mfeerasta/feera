import { describe, expect, it } from 'vitest';
import { apiRouteCount, buildOpenApiDocument } from '../src/lib/api/openapi';

describe('openapi document', () => {
  const doc = buildOpenApiDocument();

  it('declares OpenAPI 3.1.0', () => {
    expect(doc.openapi).toBe('3.1.0');
  });

  it('has identifying info', () => {
    expect(doc.info.title).toBe('Feera API');
    expect(doc.info.version).toMatch(/\d+\.\d+\.\d+/);
    expect(doc.info.contact?.email).toBe('hello@feera.ai');
    expect(doc.info.license?.name).toBe('MIT');
  });

  it('lists production and local servers', () => {
    const urls = (doc.servers ?? []).map((s) => s.url);
    expect(urls).toContain('https://www.feera.ai');
    expect(urls).toContain('http://localhost:3000');
  });

  it('registers both auth schemes', () => {
    const schemes = doc.components?.securitySchemes ?? {};
    expect(schemes).toHaveProperty('sessionCookie');
    expect(schemes).toHaveProperty('devAdmin');
  });

  it('contains a path for every registered route', () => {
    const paths = Object.keys(doc.paths ?? {});
    // 1 health route can collapse with itself; we expect at least the
    // unique-path count to equal the registry, minus duplicates that share
    // the same path (different methods).
    const uniqueRoutePaths = new Set(
      (Object.values(doc.paths ?? {}) as object[]).flatMap((node) => Object.keys(node ?? {})),
    );
    // Each registered route adds at least one method entry under its path.
    let totalMethods = 0;
    for (const node of Object.values(doc.paths ?? {})) {
      totalMethods += Object.keys(node ?? {}).filter((k) =>
        ['get', 'post', 'put', 'patch', 'delete'].includes(k),
      ).length;
    }
    expect(totalMethods).toBe(apiRouteCount);
    expect(paths.length).toBeGreaterThanOrEqual(30);
    expect(uniqueRoutePaths.has('get') || uniqueRoutePaths.has('post')).toBe(true);
  });

  it('every operation has a 200 or 201 response', () => {
    for (const [pathKey, node] of Object.entries(doc.paths ?? {})) {
      for (const [method, op] of Object.entries(node as Record<string, unknown>)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
        const responses = (op as { responses: Record<string, unknown> }).responses;
        const hasSuccess = ['200', '201', '204'].some((s) => s in responses);
        if (!hasSuccess) throw new Error(`No success response on ${method.toUpperCase()} ${pathKey}`);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  it('headline routes from each tag are present', () => {
    const paths = Object.keys(doc.paths ?? {});
    expect(paths).toContain('/api/v1/clubs');
    expect(paths).toContain('/api/v1/bookings');
    expect(paths).toContain('/api/v1/matches/{id}/score');
    expect(paths).toContain('/api/v1/tournaments');
    expect(paths).toContain('/api/v1/coaches');
    expect(paths).toContain('/api/v1/chats');
    expect(paths).toContain('/api/health');
  });
});
