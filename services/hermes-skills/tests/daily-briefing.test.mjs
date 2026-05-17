import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const skill = resolve(here, '..', 'skills', 'daily-briefing.mjs');

// Smoke test: invoking the skill with DRY_RUN=1 and a stubbed DATABASE_URL
// fails on the DB connect, but the script must (a) start, (b) log JSON, and
// (c) exit non-zero. We just verify it emits structured JSON before failing.
test('daily-briefing emits structured JSON', async () => {
  const child = spawn(process.execPath, [skill], {
    env: { ...process.env, DRY_RUN: '1', DATABASE_URL_POOLED: '', DATABASE_URL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let err = '';
  child.stdout.on('data', (c) => { out += c.toString(); });
  child.stderr.on('data', (c) => { err += c.toString(); });
  const code = await new Promise((r) => child.on('exit', r));
  const combined = out + err;
  // At minimum, one JSON line should be present with our skill name.
  assert.ok(
    combined.split('\n').some((l) => l.includes('"skill":"daily-briefing"')),
    `expected structured log line, got: ${combined.slice(0, 400)}`,
  );
  assert.notEqual(code, 0, 'should fail without DB');
});
