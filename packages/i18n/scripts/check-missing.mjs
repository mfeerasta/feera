#!/usr/bin/env node
/**
 * CI guard: every key present in en.json must exist in ur.json and ar.json
 * with a non-empty string value. Exits non-zero on the first failure so PRs
 * cannot land partial translations.
 *
 * Phase 2 locales (es / fr / it / pt) are intentionally skipped here. They
 * are not shipped yet and fall back to English at runtime.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(here, '..', 'src', 'locales');

const SHIPPED = ['en', 'ur', 'ar'];

function load(locale) {
  const path = resolve(localesDir, `${locale}.json`);
  if (!existsSync(path)) {
    console.error(`Missing locale file: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

const dicts = Object.fromEntries(SHIPPED.map((l) => [l, flatten(load(l))]));
const enKeys = Object.keys(dicts.en);

let failures = 0;
for (const locale of SHIPPED) {
  if (locale === 'en') continue;
  const keys = dicts[locale];
  for (const key of enKeys) {
    if (!(key in keys)) {
      console.error(`[${locale}] missing key: ${key}`);
      failures++;
      continue;
    }
    const val = keys[key];
    if (typeof val !== 'string' || val.trim().length === 0) {
      console.error(`[${locale}] empty value for key: ${key}`);
      failures++;
    }
  }
  // Surface extras so reviewers know to clean up.
  for (const key of Object.keys(keys)) {
    if (!(key in dicts.en)) {
      console.warn(`[${locale}] extra key not in en: ${key}`);
    }
  }
}

if (failures > 0) {
  console.error(`\ni18n check failed with ${failures} missing or empty keys.`);
  process.exit(1);
}

console.log(
  `i18n check passed: ${enKeys.length} keys across ${SHIPPED.length} locales.`
);
