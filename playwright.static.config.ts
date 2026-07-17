import { defineConfig, devices } from '@playwright/test';

// Static-build smoke suite (bead initial-dev-r1z.7), separate from
// playwright.config.ts on purpose: Playwright's `webServer` is config-global,
// not per-project, so folding this into the node config would run the full
// `vite build` (~40s) on every `pnpm e2e` node-flow run. A second small
// config keeps `pnpm e2e` untouched; run this one via `pnpm e2e:static`.
//
// Trailing slash on baseURL matters: specs use relative gotos ('dashboard',
// not '/dashboard') so URLs resolve UNDER the /xss-app base path — a
// leading-slash goto would resolve against the origin and escape it.
const BASE_URL = 'http://localhost:8080/xss-app/';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/static.spec.ts',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  // No globalSetup: the static target has no database — everything it needs
  // is baked into build-static/ by the build step below.
  webServer: {
    command: 'pnpm build:static && pnpm serve:static',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // The vite build alone takes ~40s before Caddy even starts.
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
