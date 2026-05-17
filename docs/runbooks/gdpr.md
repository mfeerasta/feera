# GDPR runbook

Feera honours the EU General Data Protection Regulation for every user, regardless of region. This runbook covers the operational side of the data subject rights surfaces.

## Data export (Article 20)

Endpoint: `GET /api/v1/me/export`
UI: `/me/export`

Returns a ZIP byte stream with one JSON file per data category. Reads run inside the standard request-context tx so RLS still applies. The archive contains:

- `profile.json`: users row, user_ratings row, user_social_scores row.
- `bookings.json`: every booking the user organized, every booking_participants row touching them, every booking_join_requests they raised.
- `matches.json`: every match they appear in (as player or recorder).
- `payments.json`: payments + payouts where they are payer or payee.
- `chats.json`: chat_members rows plus the last 200 messages per chat they belong to.
- `edition.json`: edition_memberships row if any.
- `audit.json`: audit_log entries where actor_user_id is them, last 90 days.

Sensitive surfaces stay in JSON, not CSV, to preserve nested structure. The README.txt inside the archive explains the layout for non-technical users.

## Account deletion (Article 17)

Endpoint: `POST /api/v1/me/delete`
UI: `/me/delete`

Two step flow.

1. **Request**: client POSTs `{ "confirm": false }`. Server inserts a row in `user_deletion_requests` with a 32 byte random base64url token and `will_delete_at = now() + 7 days`. A confirmation email goes out via the Resend magic-link helper (dev mode logs the link instead). Response: `{ confirmationToken, willDeleteAt, graceDays }`.
2. **Confirm**: client POSTs `{ "confirmationToken": "..." }` within 7 days. Server marks the row `confirmed_at = now()`. Response includes the scheduled purge time.

The actual purge happens in `services/workers/jobs/account-purge.ts`, scheduled at `0 3 * * *` Europe/Berlin. The job selects requests where `confirmed_at is not null and will_delete_at < now() and purged_at is null`, opens a SERIALIZABLE tx per user, and:

- Sets `users.deleted_at = now()`.
- Nullifies PII columns: email, phone, city, bio, profile_photo_url, gender.
- Replaces display_name with the tombstone `[deleted account]`.
- Marks all chat memberships `left_at = now()`.
- Sets `user_deletion_requests.purged_at = now()`.

Bookings, matches, payments, payouts, and audit_log rows are intentionally retained for legal + data-integrity reasons (other parties rely on them). The anonymised user row preserves referential integrity.

### Why a 7 day grace period

Industry best practice. Matches Apple ID and Google account deletion policies. Gives users a window to recover after impulse deletion or hostile account compromise. The grace period is documented to the user in the UI.

### Cancelling a pending deletion

Currently manual: user contacts privacy@feera.ai before `will_delete_at`. The on-call engineer sets `confirmed_at = null` on the request row. A self-serve cancel button is planned for M8 polish.

### Auditing purge runs

The worker emits one structured log line per purge attempt. Sentry breadcrumbs roll up failed purges (`status: partial`). Manual reconciliation: `select * from user_deletion_requests where purged_at is null and confirmed_at is not null and will_delete_at < now()` should return zero rows after every nightly run.

## Privacy contact

privacy@feera.ai for any data subject request that the self-serve flow does not cover (rectification, restriction, objection).
