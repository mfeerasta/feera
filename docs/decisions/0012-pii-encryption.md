# ADR 0012: Column-level PII encryption with pgcrypto

Date: 2026-05-17
Status: accepted

## Context

CLAUDE.md mandates that PII (phone, email, payment details) is encrypted at rest in Postgres using `pgcrypto`, with the symmetric key rotated quarterly. Neon storage is encrypted at rest already, but the project policy requires application-controlled keys so a compromised database snapshot is not enough to read PII.

## Decision

Use the `pgcrypto` extension with `pgp_sym_encrypt(plain, key, 'cipher-algo=aes256')` for column-level encryption. The key material lives in two env vars on the box: `PII_ENCRYPTION_KEY_CURRENT` (writes + first-try reads) and `PII_ENCRYPTION_KEY_PREV` (decrypt fallback during the rotation window).

Wrappers live in `packages/db/src/crypto.ts`:

- `encryptColumn(plain, keyName?)`
- `decryptColumn(cipher, keyName?)`
- `enablePgcrypto()`

The encrypt/decrypt happens server-side in Postgres so rotation only touches env + a re-encrypt script, never the Node runtime.

### PII columns

Designated PII surfaces:

| Table | Column | Notes |
|---|---|---|
| users | phone | E.164. Currently plaintext; encrypted in new writes from M8. |
| users | email | Currently plaintext; encrypted in new writes from M8. |
| payments | metadata | Includes payment method last4 + brand. Encrypt the whole jsonb as text. |
| federation_player_links | federation_player_id | National ID-equivalent in some federations. |
| edition_memberships | application_answers | Free-text answers; may contain home address, occupation. |
| user_deletion_requests | ip | Captured for audit; encrypt before storage in M8 polish. |
| user_deletion_requests | user_agent | Same. |

## Backfill plan

New writes from M8 onwards are encrypted. Existing rows stay plaintext until a maintenance window:

1. M8 polish week: snapshot Neon. Run a one-off script that reads each row, calls `encryptColumn`, and writes back. Wrap each batch (1000 rows) in a SERIALIZABLE tx.
2. Verify with sample decrypts.
3. Flip a feature flag (`PII_ENFORCE_ENCRYPTED=1`) that makes reads assume the column is cipher text. Until then, reads probe both.
4. Drop the dual-read code in M9.

## Rotation policy

- Quarterly. Calendar reminder on the M operations runbook.
- Generate a new 32 byte random key via `openssl rand -base64 32`.
- Move CURRENT to PREV, set new CURRENT.
- Run a re-encrypt script over the PII columns within 14 days.
- Once verified, drop PREV.

## Key escape hatches

- Dev (no key set): wrapper logs a warning and passes through, so local development without secrets still works.
- Production (no key set): wrapper throws, so we never silently store plaintext where it should be encrypted.

## Trade offs accepted

- Encrypted columns are not indexable for substring search. Email lookup uses a separate `lower(email)` hash column (added in M8 polish) for login flows; the cipher column is the source of truth.
- Decryption adds a round trip to Postgres. Acceptable because every read happens inside an existing tx.
