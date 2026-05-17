import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const skill = resolve(here, '..', 'skills', 'sentry-to-pr.mjs');

test('sentry-to-pr handles a synthetic webhook payload', async () => {
  const payload = JSON.stringify({
    action: 'created',
    data: {
      issue: {
        title: 'TypeError: cannot read payment.id',
        project: 'feera-web',
        level: 'error',
        web_url: 'https://sentry.io/issues/123/',
      },
    },
  });
  const child = spawn(process.execPath, [skill], {
    env: {
      ...process.env,
      DRY_RUN: '1',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
      SENTRY_WEBHOOK_SECRET: '', // disable signature check
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.end(payload);
  let out = '';
  let err = '';
  child.stdout.on('data', (c) => { out += c.toString(); });
  child.stderr.on('data', (c) => { err += c.toString(); });
  const code = await new Promise((r) => child.on('exit', r));
  assert.equal(code, 0);
  const combined = out + err;
  assert.ok(combined.includes('"category":"payments"'),
    `expected classification, got: ${combined.slice(0, 400)}`);
});
