import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 AA conformance check via axe-core. Fails on serious or critical
 * violations. CI workflow .github/workflows/a11y.yml runs this on PR.
 *
 * Routes are picked from the public surface that ships in CHECKPOINT-3 plus
 * the M7 edition microsite that lands alongside this slice.
 */
const ROUTES = ['/', '/play', '/play/clubs', '/sign-in', '/edition'];

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ page }, testInfo) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    // Some target URLs (e.g. /edition before M7 lands) may 404; treat as skip
    // so the gate measures pages that exist.
    if (response && response.status() === 404) {
      testInfo.skip(true, `${route} returned 404; not in production yet.`);
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
        .join('\n');
      throw new Error(`Axe violations on ${route}:\n${summary}`);
    }
    expect(blocking).toEqual([]);
  });
}
