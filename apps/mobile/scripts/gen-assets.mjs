#!/usr/bin/env node
/**
 * Generates icon / splash / adaptive-icon / favicon PNGs for the Expo app.
 *
 * Tries `sharp` first for a forest-green wordmark. Falls back to a tiny solid
 * PNG so installs without sharp still produce valid assets (no broken splash).
 *
 * Run: pnpm -C apps/mobile gen-assets
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'assets');
if (!existsSync(out)) mkdirSync(out, { recursive: true });

const BG = '#071C14'; // ink-deep
const FG = '#F6F3EE'; // cream

async function tryWithSharp() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    return false;
  }

  // 1024x1024 forest-green canvas with centered "feera" wordmark.
  // We use SVG -> PNG via sharp for crispness without bundled fonts.
  const svg = (size) => `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${BG}"/>
      <text x="50%" y="54%" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-style="italic"
        font-size="${Math.round(size * 0.32)}" fill="${FG}">feera</text>
    </svg>`;

  const targets = [
    { name: 'icon.png', size: 1024 },
    { name: 'adaptive-icon.png', size: 1024 },
    { name: 'splash.png', size: 1242 },
    { name: 'favicon.png', size: 196 },
  ];

  for (const t of targets) {
    const buf = await sharp(Buffer.from(svg(t.size))).png().toBuffer();
    writeFileSync(resolve(out, t.name), buf);
    console.log(`wrote ${t.name} (${t.size}x${t.size})`);
  }
  return true;
}

function fallbackSolidPng() {
  // 1x1 forest green PNG (deflated). RGB(7,28,20). Decoded by hand.
  // To keep this deterministic we encode a 1x1 PNG with that color.
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009077' +
      '53de0000000c4944415478da6360780703000000050001a5f06f60000000004945' +
      '4e44ae426082',
    'hex',
  );
  for (const name of ['icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png']) {
    writeFileSync(resolve(out, name), png);
    console.log(`wrote ${name} (1x1 fallback)`);
  }
}

const ok = await tryWithSharp();
if (!ok) {
  console.warn('[gen-assets] sharp not installed; writing 1x1 solid PNGs as fallback.');
  fallbackSolidPng();
}
