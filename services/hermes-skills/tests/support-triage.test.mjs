import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const skill = resolve(here, '..', 'skills', 'support-triage.mjs');

async function runWithStdin(input, env = {}) {
  const child = spawn(process.execPath, [skill], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.end(input);
  let out = '';
  let err = '';
  child.stdout.on('data', (c) => { out += c.toString(); });
  child.stderr.on('data', (c) => { err += c.toString(); });
  const code = await new Promise((r) => child.on('exit', r));
  return { code, out, err };
}

test('support-triage classifies booking keywords and returns TwiML', async () => {
  // No TWILIO_AUTH_TOKEN -> verification is permissive.
  const body = new URLSearchParams({
    From: 'whatsapp:+923001234567',
    Body: 'I want to cancel my booking tomorrow',
  }).toString();
  const { code, out, err } = await runWithStdin(body, { TWILIO_AUTH_TOKEN: '' });
  assert.equal(code, 0);
  assert.ok(out.includes('<Response>'), 'expected TwiML response');
  assert.ok(out.includes('booking'), 'reply mentions category');
  // Structured log on stderr-or-stdout should include classified category.
  assert.ok(
    (out + err).includes('"category":"booking"'),
    'expected structured log entry',
  );
});

test('support-triage falls back to "general" when no keywords match', async () => {
  const body = new URLSearchParams({
    From: 'whatsapp:+923001234567',
    Body: 'hello world',
  }).toString();
  const { code, out } = await runWithStdin(body, { TWILIO_AUTH_TOKEN: '' });
  assert.equal(code, 0);
  assert.ok(out.includes('general'));
});
