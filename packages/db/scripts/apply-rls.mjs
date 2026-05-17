import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

const files = [
  ['packages/auth/src/sql/auth-helpers.sql', 'auth-helpers'],
  ['packages/db/src/rls/users.sql', 'users'],
  ['packages/db/src/rls/clubs.sql', 'clubs'],
  ['packages/db/src/rls/bookings.sql', 'bookings'],
  ['packages/db/src/rls/matches.sql', 'matches'],
  ['packages/db/src/rls/club-staff.sql', 'club-staff'],
  ['packages/db/src/rls/chats.sql', 'chats'],
  ['packages/db/src/rls/payments.sql', 'payments'],
  ['packages/db/src/rls/edition.sql', 'edition'],
  ['packages/db/src/rls/audit.sql', 'audit'],
];

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

// `users.sql` defines a `users_select_public` policy referencing the
// not-yet-shipped `friendships` table. Skip just that policy at apply time;
// everything else in users.sql is valid. Tracked separately for re-apply
// once `friendships` lands.
function patchUsersSql(content) {
  return content.replace(
    /DROP POLICY IF EXISTS users_select_public ON users;[\s\S]*?\);\s*\n/,
    '-- SKIPPED: users_select_public policy depends on friendships table (not yet shipped)\n'
  );
}

try {
  for (const [rel, name] of files) {
    const path = join(repoRoot, rel);
    let content = readFileSync(path, 'utf8');
    if (name === 'users') content = patchUsersSql(content);
    console.log(`Applying ${name} (${rel})`);
    await sql.unsafe(content);
  }
  console.log('All RLS files applied.');
} finally {
  await sql.end();
}
