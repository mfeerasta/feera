#!/usr/bin/env node
// support-triage.mjs
// Trigger: Twilio WhatsApp webhook (POST application/x-www-form-urlencoded).
//
// Reads the inbound message body, classifies it by keyword rules into one
// of {booking, payment, rating, edition, general}, then:
//   1. Creates a Linear issue in the triage queue when LINEAR_API_KEY is set.
//   2. Always logs the classified event (for Sentry breadcrumbs).
//   3. Returns a TwiML reply auto-acking the user so Twilio sends it back.
//
// Hermes pipes the raw body to stdin and exposes the X-Twilio-Signature header
// via HERMES_WEBHOOK_SIGNATURE so we can verify it.
//
// Env: TWILIO_AUTH_TOKEN, LINEAR_API_KEY (opt), LINEAR_TEAM_ID (opt).

import { createHmac, timingSafeEqual } from 'node:crypto';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('support-triage');

const CATEGORIES = [
  { key: 'booking', words: ['book', 'reservation', 'slot', 'court', 'cancel'] },
  { key: 'payment', words: ['payment', 'paid', 'refund', 'charge', 'invoice', 'stripe', 'jazzcash', 'easypaisa', 'raast'] },
  { key: 'rating', words: ['rating', 'glicko', 'elo', 'rank', 'score'] },
  { key: 'edition', words: ['edition', 'membership', 'invite'] },
];

function classify(text) {
  const t = (text ?? '').toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.words.some((w) => t.includes(w))) return cat.key;
  }
  return 'general';
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function verifyTwilio(rawBody, url, signature, authToken) {
  if (!authToken) return true;
  if (!signature || !url) return false;
  // Twilio signs: url + sorted (key+value)... concatenated.
  const params = new URLSearchParams(rawBody);
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const stringToSign = url + sorted.map(([k, v]) => k + v).join('');
  const expected = createHmac('sha1', authToken).update(stringToSign).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function createLinearIssue(category, body, from) {
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_TEAM_ID;
  if (!apiKey || !teamId) return { skipped: 'no_linear_env' };
  const mutation = {
    query: `mutation ($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { id identifier url } }
    }`,
    variables: {
      input: {
        teamId,
        title: `[${category}] WhatsApp from ${from ?? 'unknown'}`,
        description: body?.slice(0, 4000) ?? '',
        labelIds: [],
        priority: category === 'payment' ? 1 : 3,
      },
    },
  };
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mutation),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.data?.issueCreate?.success) {
    return { error: `linear ${res.status}: ${JSON.stringify(json).slice(0, 200)}` };
  }
  return { issue: json.data.issueCreate.issue };
}

function twiml(text) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</Message></Response>`;
}

async function main() {
  const raw = await readStdin();
  if (!raw) {
    log.error('no payload');
    process.exit(2);
  }
  const url = process.env.HERMES_WEBHOOK_URL ?? '';
  const sig = process.env.HERMES_WEBHOOK_SIGNATURE ?? '';
  if (!verifyTwilio(raw, url, sig, process.env.TWILIO_AUTH_TOKEN)) {
    log.error('twilio signature verification failed');
    process.exit(3);
  }

  const params = new URLSearchParams(raw);
  const body = params.get('Body') ?? '';
  const from = params.get('From') ?? null;
  const category = classify(body);

  const linear = await createLinearIssue(category, body, from).catch((err) => ({
    error: err.message,
  }));

  log.info('triaged', {
    category,
    from: from ? from.replace(/\d(?=\d{4})/g, '•') : null,
    linear,
  });

  const reply = `Thanks — we have your message and routed it to the *${category}* queue. We will reply within 24h.`;
  process.stdout.write(twiml(reply));
}

main().catch((err) => {
  log.error('failed', err);
  process.exit(1);
});
