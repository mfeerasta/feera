import { NextResponse } from 'next/server';

/**
 * Health endpoint hit by Caddy (every 30s) and the deploy script.
 * Returns 200 if the process is alive. M2 will add a DB ping + Soketi ping.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'feera-web',
    ts: new Date().toISOString(),
  });
}
