-- 0007 — GDPR Article 17 right-to-erasure request log.
--
-- Two-step delete: request row inserted on first POST, confirmed by the user
-- via a token within 7 days. Nightly worker (account-purge) honours confirmed
-- requests where will_delete_at < now() and purged_at is null.

create table if not exists user_deletion_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  requested_at        timestamptz not null default now(),
  confirmation_token  text not null unique,
  confirmed_at        timestamptz,
  will_delete_at      timestamptz not null,
  purged_at           timestamptz,
  ip                  text,
  user_agent          text
);

create index if not exists user_deletion_requests_user_idx
  on user_deletion_requests(user_id);
create index if not exists user_deletion_requests_pending_idx
  on user_deletion_requests(will_delete_at)
  where purged_at is null and confirmed_at is not null;

alter table user_deletion_requests enable row level security;

-- Owners can see their own pending request. Service role bypasses RLS.
drop policy if exists user_deletion_requests_owner_select on user_deletion_requests;
create policy user_deletion_requests_owner_select
  on user_deletion_requests
  for select
  using (user_id = auth.user_id());

drop policy if exists user_deletion_requests_owner_insert on user_deletion_requests;
create policy user_deletion_requests_owner_insert
  on user_deletion_requests
  for insert
  with check (user_id = auth.user_id());

drop policy if exists user_deletion_requests_owner_update on user_deletion_requests;
create policy user_deletion_requests_owner_update
  on user_deletion_requests
  for update
  using (user_id = auth.user_id())
  with check (user_id = auth.user_id());
