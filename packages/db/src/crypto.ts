import { sql } from 'drizzle-orm';
import { db } from './client';

/**
 * pgcrypto column-level PII encryption.
 *
 * Symmetric AES-256 via Postgres `pgp_sym_encrypt(plain, key, 'cipher-algo=aes256')`.
 * Keys live in env (PII_ENCRYPTION_KEY_CURRENT / PII_ENCRYPTION_KEY_PREV) and rotate
 * quarterly. Decryption tries CURRENT first, falls back to PREV during the
 * rotation window so reads never break.
 *
 * Design notes (see docs/decisions/0012-pii-encryption.md):
 *   - The encrypt/decrypt happens server-side in Postgres, not in Node, so key
 *     rotation only touches env vars on the box plus the pgcrypto extension.
 *   - In dev (no key set) the wrapper passes through plaintext and warns once,
 *     so local development without secrets still works.
 *   - In production, an unset CURRENT key throws on first call so we fail
 *     loudly rather than silently storing plaintext.
 */

export type KeyName = 'pii-current' | 'pii-prev';

let warnedNoKey = false;

function resolveKey(name: KeyName): string | null {
  const envName =
    name === 'pii-current' ? 'PII_ENCRYPTION_KEY_CURRENT' : 'PII_ENCRYPTION_KEY_PREV';
  const v = process.env[envName];
  return v && v.length > 0 ? v : null;
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Enable the pgcrypto extension. Idempotent. Migration 0008 also runs this;
 * call from a one-shot script if you forgot.
 */
export async function enablePgcrypto(): Promise<void> {
  await db.execute(sql`create extension if not exists pgcrypto`);
}

/**
 * Encrypt a string with the named key. Returns the armored cipher text suitable
 * for storage in a text column. Throws in production if the key is unset.
 */
export async function encryptColumn(plain: string, keyName: KeyName = 'pii-current'): Promise<string> {
  const key = resolveKey(keyName);
  if (!key) {
    if (isProd()) {
      throw new Error(`[db/crypto] ${keyName} is unset; refusing to encrypt in production.`);
    }
    if (!warnedNoKey) {
      warnedNoKey = true;
      console.warn(
        `[db/crypto] ${keyName} unset; storing plaintext in dev. Set PII_ENCRYPTION_KEY_CURRENT to encrypt.`,
      );
    }
    return plain;
  }
  const rows = await db.execute<{ cipher: string }>(
    sql`select pgp_sym_encrypt(${plain}::text, ${key}::text, 'cipher-algo=aes256')::text as cipher`,
  );
  const row = (rows as unknown as { cipher: string }[])[0];
  if (!row?.cipher) {
    throw new Error('[db/crypto] pgp_sym_encrypt returned no row.');
  }
  return row.cipher;
}

/**
 * Decrypt a cipher text with the named key. Falls back to the PREV key if
 * CURRENT throws (typical mid-rotation case). Returns null on total failure
 * so callers can render '[encrypted]' rather than crashing.
 */
export async function decryptColumn(cipher: string, keyName: KeyName = 'pii-current'): Promise<string | null> {
  const key = resolveKey(keyName);
  if (!key) {
    if (isProd()) {
      throw new Error(`[db/crypto] ${keyName} is unset; refusing to decrypt in production.`);
    }
    return cipher;
  }
  try {
    const rows = await db.execute<{ plain: string }>(
      sql`select pgp_sym_decrypt(${cipher}::bytea, ${key}::text)::text as plain`,
    );
    const row = (rows as unknown as { plain: string }[])[0];
    return row?.plain ?? null;
  } catch (err) {
    if (keyName === 'pii-current') {
      const prev = resolveKey('pii-prev');
      if (prev) return decryptColumn(cipher, 'pii-prev');
    }
    console.warn('[db/crypto] decrypt failed', { keyName, err: (err as Error).message });
    return null;
  }
}
