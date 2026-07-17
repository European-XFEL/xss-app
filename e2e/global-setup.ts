/**
 * Runs once before the whole E2E suite: ensures the isolated `xss-app-e2e`
 * database exists on the shared Postgres server, then applies the schema
 * (`drizzle-kit push` — this repo has no migrations folder) and seed data
 * (`scripts/seed.ts`) to it via the existing scripts, with `DB_NAME`
 * overridden for the spawned child processes only.
 *
 * Never touches any other database name — see e2e/db.ts's module note.
 */
import { execFileSync } from 'node:child_process';

import { E2E_DB_NAME, connect } from './db';

async function ensureDatabaseExists(): Promise<void> {
  const admin = connect('postgres');
  try {
    const rows =
      await admin`SELECT 1 FROM pg_database WHERE datname = ${E2E_DB_NAME}`;
    if (rows.length === 0) {
      // Database names can't be parameterized; `unsafe` is fine here since
      // E2E_DB_NAME is a hardcoded constant, never user/env input.
      await admin.unsafe(`CREATE DATABASE "${E2E_DB_NAME}"`);
    }
  } finally {
    await admin.end();
  }
}

export default async function globalSetup(): Promise<void> {
  await ensureDatabaseExists();

  const env = { ...process.env, DB_NAME: E2E_DB_NAME };
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, { env, stdio: 'inherit' });

  // Idempotent: drizzle-kit push is a no-op on an already-current schema,
  // and seed.ts upserts (onConflictDoUpdate) — safe to rerun every suite run.
  run('pnpm', ['exec', 'drizzle-kit', 'push', '--force']);
  run('pnpm', ['exec', 'tsx', './scripts/seed.ts']);

  // Clear cached solute results so the dashboard spec exercises the worker
  // compute path every run — a warm intensities cache serves results without
  // ever invoking the worker, silently masking compute regressions (the
  // per-series assertions would pass against stale cached data).
  const sql = connect(E2E_DB_NAME);
  try {
    await sql`DELETE FROM intensities`;
  } finally {
    await sql.end();
  }
}
