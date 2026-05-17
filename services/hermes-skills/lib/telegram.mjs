// Telegram bot helper. Used by every skill that posts a Telegram digest.
//
// Respects DRY_RUN=1 (returns { skipped:true } without hitting the network)
// and the absence of TELEGRAM_BOT_TOKEN (same behaviour).
//
// Splits messages > 4096 chars across multiple posts to stay inside the
// Bot API limit.

const TELEGRAM_API = 'https://api.telegram.org';
const MAX_LEN = 4000;

function chunkText(text) {
  if (text.length <= MAX_LEN) return [text];
  const out = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + MAX_LEN, text.length);
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n', end);
      if (breakAt > start + 100) end = breakAt;
    }
    out.push(text.slice(start, end));
    start = end;
  }
  return out;
}

export async function sendTelegram(text, { chatId, parseMode = 'Markdown' } = {}) {
  const dryRun = process.env.DRY_RUN === '1';
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const targetChat = chatId ?? process.env.TELEGRAM_CHAT_ID;
  if (dryRun || !token || !targetChat) {
    return {
      sent: false,
      skipped: true,
      reason: dryRun ? 'dry_run' : !token ? 'no_token' : 'no_chat',
      preview: text.slice(0, 500),
    };
  }
  const chunks = chunkText(text);
  const results = [];
  for (const chunk of chunks) {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChat,
        text: chunk,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`telegram ${res.status}: ${body.slice(0, 200)}`);
    }
    results.push(await res.json());
  }
  return { sent: true, chunks: results.length };
}

export function escapeMarkdown(text) {
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}
