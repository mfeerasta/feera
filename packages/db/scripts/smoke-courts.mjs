#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  Feera Courts: End-to-end smoke test against live site              */
/*  Usage: node packages/db/scripts/smoke-courts.mjs                   */
/*  Exit 0 = all pass, Exit 1 = any failure                            */
/* ------------------------------------------------------------------ */

const BASE = process.env.SMOKE_BASE_URL || 'https://www.feera.ai';

const results = [];

async function step(label, fn) {
  const t0 = Date.now();
  try {
    await fn();
    const ms = Date.now() - t0;
    results.push({ label, ok: true, ms });
    console.log(`  ✓ ${label} (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - t0;
    results.push({ label, ok: false, ms, error: err.message });
    console.log(`  ✗ ${label} (${ms}ms) -- ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

/* ------------------------------------------------------------------ */
/*  API endpoint tests                                                 */
/* ------------------------------------------------------------------ */

async function smokeApis() {
  console.log('\n--- API endpoints ---\n');

  // 1. POST /api/v1/courts/quote
  await step('POST /api/v1/courts/quote', async () => {
    const res = await fetch(`${BASE}/api/v1/courts/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test',
        email: 'smoke@test.local',
        targetCity: 'Windsor ON',
        projectStage: 'Idea',
        capexRange: 'Under $500K',
        message: 'Automated smoke test',
      }),
    });
    assert(res.ok, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.ok === true, `Expected { ok: true }, got ${JSON.stringify(body)}`);
  });

  // 2. GET /api/v1/courts/leads (may require auth, accept 200 or 401)
  await step('GET /api/v1/courts/leads', async () => {
    const res = await fetch(`${BASE}/api/v1/courts/leads`);
    assert(
      res.status === 200 || res.status === 401 || res.status === 403,
      `Expected 200/401/403, got ${res.status}`,
    );
  });

  // 3-8. GET endpoints (accept 200 or 401/403 for protected routes)
  const getEndpoints = [
    '/api/v1/courts/deals',
    '/api/v1/courts/projects',
    '/api/v1/courts/hardware',
    '/api/v1/courts/portfolio',
    '/api/v1/courts/financials/scenarios',
    '/api/v1/courts/docs',
  ];

  for (const ep of getEndpoints) {
    await step(`GET ${ep}`, async () => {
      const res = await fetch(`${BASE}${ep}`);
      assert(
        res.status === 200 || res.status === 401 || res.status === 403,
        `Expected 200/401/403, got ${res.status}`,
      );
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Public page tests                                                  */
/* ------------------------------------------------------------------ */

async function smokePages() {
  console.log('\n--- Public pages ---\n');

  const pages = [
    '/courts',
    '/courts/methodology',
    '/courts/about',
    '/courts/partners',
    '/courts/work',
    '/courts/work/project-alpha',
    '/courts/configure',
    '/courts/thank-you',
  ];

  for (const page of pages) {
    await step(`GET ${page}`, async () => {
      const res = await fetch(`${BASE}${page}`, { redirect: 'follow' });
      assert(res.ok, `Expected 200, got ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      assert(ct.includes('text/html'), `Expected text/html, got ${ct}`);
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Run and report                                                     */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\nFeera Courts smoke test against ${BASE}`);
  console.log(`Started at ${new Date().toISOString()}\n`);

  await smokeApis();
  await smokePages();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const total = results.length;

  console.log(`\n--- Summary: ${passed}/${total} passed, ${failed} failed ---\n`);

  if (failed > 0) {
    console.log('Failures:');
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  ${r.label}: ${r.error}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
