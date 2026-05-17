import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, '..', 'migrations', '0000_baseline.sql');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

try {
  const content = readFileSync(sqlFile, 'utf8');
  // Drizzle uses --> statement-breakpoint as separator
  const stmts = content
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`Applying ${stmts.length} statements from ${sqlFile}`);
  for (const stmt of stmts) {
    await sql.unsafe(stmt);
  }
  console.log('Baseline applied.');
} finally {
  await sql.end();
}
