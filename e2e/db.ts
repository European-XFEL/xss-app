/**
 * Direct Postgres access for E2E setup/assertions — deliberately independent
 * of `$lib/server/db` (that module is Vite/SvelteKit-aliased and reads
 * `DB_NAME` from the environment at import time; Playwright's own process
 * runs outside Vite, and tests need to pin the database name explicitly
 * rather than trust whatever `.env`/webServer happens to have set).
 *
 * CRITICAL: this suite is the only thing allowed to touch `E2E_DB_NAME` on
 * the shared Postgres server (one instance serves every git worktree). Never
 * add a helper here that takes a database name from an env var — every
 * caller must pass `E2E_DB_NAME` or `'postgres'` (the admin db, read-only
 * here) explicitly.
 */
import postgres from 'postgres';

export const E2E_DB_NAME = 'xss-app-e2e';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} — run via \`pnpm e2e\` (loads .env via dotenv-cli).`,
    );
  }
  return value;
}

/** Connect to a specific database on the shared server. `database` is always
 * an explicit argument (see module note) — never sourced from `DB_NAME`. */
export function connect(database: string) {
  return postgres({
    host: requireEnv('DB_HOST'),
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database,
  });
}
