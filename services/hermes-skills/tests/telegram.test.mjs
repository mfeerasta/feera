import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendTelegram, escapeMarkdown } from '../lib/telegram.mjs';

test('sendTelegram is no-op when DRY_RUN=1', async () => {
  process.env.DRY_RUN = '1';
  process.env.TELEGRAM_BOT_TOKEN = 'fake';
  process.env.TELEGRAM_CHAT_ID = '123';
  const result = await sendTelegram('hello');
  assert.equal(result.sent, false);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'dry_run');
  delete process.env.DRY_RUN;
});

test('sendTelegram is no-op when token missing', async () => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  const result = await sendTelegram('hello', { chatId: '123' });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'no_token');
});

test('escapeMarkdown escapes special chars', () => {
  assert.equal(escapeMarkdown('a_b*c`d[e]'), 'a\\_b\\*c\\`d\\[e\\]');
});
