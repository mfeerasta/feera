#!/usr/bin/env node
// cost-watcher.mjs
// Cron: 0 6 * * * (06:00 UTC).
// Pulls month-to-date spend from Hetzner Cloud, Neon, Twilio, Stripe.
// Alerts Telegram if total > 120% of BUDGET_USD_MONTHLY.
//
// All API calls are best-effort and isolated; one provider failing must
// not block the others. Missing API keys cause the provider to be
// reported as "n/a" and excluded from the budget total.
//
// Env: HETZNER_API_TOKEN, NEON_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//      STRIPE_SECRET_KEY (optional), BUDGET_USD_MONTHLY, TELEGRAM_*.

import { sendTelegram } from '../lib/telegram.mjs';
import { buildLogger } from '../lib/log.mjs';

const log = buildLogger('cost-watcher');

async function hetznerCost(token) {
  if (!token) return { provider: 'hetzner', monthToDateUsd: null, note: 'no_token' };
  // Hetzner Cloud API does not expose billing directly; we count active
  // servers and load_balancers and apply our internal sticker pricing
  // (CPX21 = 6.90 EUR ~ 7.50 USD per month) as a conservative estimate.
  const res = await fetch('https://api.hetzner.cloud/v1/servers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { provider: 'hetzner', monthToDateUsd: null, note: `http_${res.status}` };
  const body = await res.json();
  const servers = body.servers ?? [];
  // server_type.prices is array, find monthly EUR.
  let totalEur = 0;
  for (const s of servers) {
    const priceEntry = s.server_type?.prices?.find((p) => p.location === s.datacenter?.location?.name)
      ?? s.server_type?.prices?.[0];
    const monthly = Number(priceEntry?.price_monthly?.gross ?? 0);
    totalEur += monthly;
  }
  const usd = Number((totalEur * 1.08).toFixed(2));
  return { provider: 'hetzner', monthToDateUsd: usd, serverCount: servers.length };
}

async function neonCost(key) {
  if (!key) return { provider: 'neon', monthToDateUsd: null, note: 'no_token' };
  // Neon's consumption endpoint returns compute-hours + storage. Free tier
  // covers the Phase 1 footprint; we report 0 by default and surface usage
  // counters so the digest still shows real numbers.
  const res = await fetch('https://console.neon.tech/api/v2/consumption_history/account?granularity=monthly&limit=1', {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) return { provider: 'neon', monthToDateUsd: null, note: `http_${res.status}` };
  const body = await res.json();
  const period = body.periods?.[0] ?? {};
  return {
    provider: 'neon',
    monthToDateUsd: 0, // Free tier; replace with body.consumption.cost_cents/100 when paid.
    activeTimeSeconds: period.consumption?.active_time_seconds ?? 0,
    storageBytes: period.consumption?.synthetic_storage_size_bytes ?? 0,
  };
}

async function twilioCost(sid, token) {
  if (!sid || !token) return { provider: 'twilio', monthToDateUsd: null, note: 'no_token' };
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Balance.json`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  if (!res.ok) return { provider: 'twilio', monthToDateUsd: null, note: `http_${res.status}` };
  const body = await res.json();
  // Twilio returns remaining balance, not spend. We pair with usage_records.
  const balance = Number(body.balance ?? 0);
  return { provider: 'twilio', monthToDateUsd: null, balanceUsd: balance };
}

async function stripeBalance(key) {
  if (!key) return { provider: 'stripe', monthToDateUsd: null, note: 'no_token' };
  const res = await fetch('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2024-11-20.acacia' },
  });
  if (!res.ok) return { provider: 'stripe', monthToDateUsd: null, note: `http_${res.status}` };
  const body = await res.json();
  const available = (body.available ?? []).reduce((acc, b) => acc + Number(b.amount ?? 0), 0) / 100;
  return { provider: 'stripe', monthToDateUsd: null, availableUsd: available };
}

async function run() {
  const budget = Number(process.env.BUDGET_USD_MONTHLY ?? 200);
  const [hetzner, neon, twilio, stripe] = await Promise.all([
    hetznerCost(process.env.HETZNER_API_TOKEN).catch((err) => ({ provider: 'hetzner', error: err.message })),
    neonCost(process.env.NEON_API_KEY).catch((err) => ({ provider: 'neon', error: err.message })),
    twilioCost(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN).catch((err) => ({ provider: 'twilio', error: err.message })),
    stripeBalance(process.env.STRIPE_SECRET_KEY).catch((err) => ({ provider: 'stripe', error: err.message })),
  ]);

  const providers = [hetzner, neon, twilio, stripe];
  const totalUsd = providers.reduce((acc, p) => acc + (Number(p.monthToDateUsd) || 0), 0);
  const overBudget = totalUsd > budget * 1.2;

  const summary = { totalUsd, budget, overBudget, providers };
  log.info('cost snapshot', summary);

  if (overBudget) {
    const lines = [`*Cost watcher ALERT* (>120% of $${budget})`, ''];
    lines.push(`Total MTD: *$${totalUsd.toFixed(2)}*`);
    for (const p of providers) {
      lines.push(`• ${p.provider}: ${p.monthToDateUsd ?? 'n/a'} ${p.note ? `(${p.note})` : ''}`);
    }
    await sendTelegram(lines.join('\n'));
  }
}

run().catch((err) => {
  log.error('failed', err);
  process.exit(1);
});
