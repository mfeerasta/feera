-- 0008 — Enable pgcrypto for column-level PII encryption.
--
-- Wraps sensitive columns via pgp_sym_encrypt/pgp_sym_decrypt in the @feera/db
-- crypto helper. Keys live in env (PII_ENCRYPTION_KEY_CURRENT, PII_ENCRYPTION_KEY_PREV)
-- and rotate per quarter. New writes encrypt; the backfill plan is documented
-- in docs/decisions/0012-pii-encryption.md.

create extension if not exists pgcrypto;
