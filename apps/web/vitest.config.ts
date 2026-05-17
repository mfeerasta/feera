import { defineConfig } from 'vitest/config';

/**
 * Vitest covers unit + smoke tests under `test/`. Playwright lives in `e2e/`
 * and is excluded here so vitest does not try to import it.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
});
