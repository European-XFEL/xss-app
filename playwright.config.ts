import { defineConfig, devices } from '@playwright/test';

// Dedicated port distinct from a human's interactive `pnpm dev` session (Vite
// auto-picks 5173+ for those — see CLAUDE.md's worktree section) and a
// dedicated Postgres database (`xss-app-e2e`, isolated from `xss-app` /
// `xss-app-dev` / `xss-app-preview` on the one shared server) so this suite
// never collides with a real dev session in this or any other worktree.
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const DB_NAME = 'xss-app-e2e';

export default defineConfig({
  testDir: 'e2e',
  // static.spec.ts belongs to the static-artifact smoke suite
  // (playwright.static.config.ts, `pnpm e2e:static`) — different webServer.
  testIgnore: '**/static.spec.ts',
  // Every spec shares the one `xss-app-e2e` database (upload/edit/delete,
  // share-URL restore against server-stored state) — sequential is the lazy
  // answer that's also correct here, per the research: no fixture isolation
  // to build for what's a handful of specs.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm dev --port ${PORT} --strictPort`,
    url: `${BASE_URL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Overrides whatever DB_NAME `.env` set (normally `xss-app`) for this
    // child process only — the dev server this suite drives must talk to
    // the isolated E2E database, never the shared dev one. Sentry is also
    // disabled here: this sandbox has no outbound network access to
    // Sentry's ingest host, so its telemetry would only fail/retry for
    // nothing (see e2e/helpers.ts's `waitUntilInteractive` for why cold
    // hydration, not Sentry, is the thing that actually needs waiting for).
    env: { DB_NAME, PUBLIC_SENTRY_DSN: '' },
  },
  globalSetup: './e2e/global-setup.ts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
