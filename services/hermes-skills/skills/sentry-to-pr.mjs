#!/usr/bin/env node
// sentry-to-pr.mjs
// Trigger: Sentry webhook (issue.created / issue.resolved / event.alert).
//
// Phase 1: parses the payload, classifies the issue, posts a Telegram digest.
// PR creation is a stretch goal; we surface the GitHub repo + the suggested
// branch name, but actual PR creation only fires when GITHUB_TOKEN is set AND
// the env var ENABLE_GITHUB_PR=1 is present.
//
// Env: SENTRY_WEBHOOK_SECRET (HMAC verification), TELEGRAM_BOT_TOKEN,
//      TELEGRAM_CHAT_ID, GITHUB_TOKEN (optional), GITHUB_REPO (optional, owner/repo).
//
// Invocation modes:
//   1. As hermes webhook handler: hermes pipes raw body to stdin, signature
//      in env HERMES_WEBHOOK_SIGNATURE.
//   2. CLI: SENTRY_PAYLOAD_FILE=./fixture.json node sentry-to-pr.mjs

import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { sendTelegram, escapeMarkdown } from '../lib/telegram.mjs';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('sentry-to-pr');

function verifySignature(rawBody, signature, secret) {
  if (!secret) return true; // no secret configured -> accept
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function classify(issue) {
  const title = (issue?.title ?? '').toLowerCase();
  if (title.includes('payment') || title.includes('stripe')) return 'payments';
  if (title.includes('auth') || title.includes('session')) return 'auth';
  if (title.includes('db') || title.includes('postgres')) return 'db';
  if (title.includes('chat') || title.includes('soketi')) return 'realtime';
  return 'other';
}

async function maybeCreateGithubIssue(issue, category) {
  if (process.env.ENABLE_GITHUB_PR !== '1') return { skipped: 'feature_off' };
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // "owner/repo"
  if (!token || !repo) return { skipped: 'missing_env' };
  const body = {
    title: `[sentry/${category}] ${issue?.title ?? 'unknown'}`,
    body: [
      `Sentry issue: ${issue?.web_url ?? issue?.permalink ?? 'n/a'}`,
      ``,
      '```',
      (issue?.metadata?.value ?? issue?.culprit ?? '').slice(0, 1500),
      '```',
    ].join('\n'),
    labels: ['sentry', `area:${category}`, 'auto'],
  };
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'feera-hermes-sentry-to-pr',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { error: `github ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const created = await res.json();
  return { number: created.number, url: created.html_url };
}

async function main() {
  let raw;
  if (process.env.SENTRY_PAYLOAD_FILE) {
    raw = await readFile(process.env.SENTRY_PAYLOAD_FILE, 'utf8');
  } else {
    raw = await readStdin();
  }
  if (!raw) {
    log.error('no payload');
    process.exit(2);
  }

  const sig = process.env.HERMES_WEBHOOK_SIGNATURE;
  if (!verifySignature(raw, sig, process.env.SENTRY_WEBHOOK_SECRET)) {
    log.error('signature verification failed');
    process.exit(3);
  }

  const payload = JSON.parse(raw);
  const issue = payload.data?.issue ?? payload.issue ?? {};
  const action = payload.action ?? 'unknown';
  const category = classify(issue);

  const text = [
    `*Sentry: ${escapeMarkdown(action)}* [${category}]`,
    `*Title:* ${escapeMarkdown(issue.title ?? 'unknown')}`,
    `*Project:* ${escapeMarkdown(issue.project ?? payload.project_slug ?? 'unknown')}`,
    `*Level:* ${escapeMarkdown(issue.level ?? 'error')}`,
    issue.web_url ? `*Link:* ${issue.web_url}` : '',
  ].filter(Boolean).join('\n');

  const tg = await sendTelegram(text);
  const gh = await maybeCreateGithubIssue(issue, category).catch((err) => ({
    error: err.message,
  }));
  log.info('handled', { action, category, telegram: tg, github: gh });
}

main().catch((err) => {
  log.error('failed', err);
  process.exit(1);
});
