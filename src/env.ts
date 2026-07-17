/**
 * Explicit environment variable declarations
 * (https://svelte.dev/docs/kit/environment-variables).
 *
 * Every environment variable the app reads through SvelteKit must be declared
 * here; import them from `$app/env/private` or `$app/env/public`. Node-only
 * code paths (drizzle.config.ts, scripts/) still read `process.env` directly
 * via `getDbUrl()` and are unaffected.
 *
 * All variables carry an `.optional()` schema: without one, SvelteKit refuses
 * to start when a declared variable is unset, but this app deliberately
 * degrades (health checks report NOT_CONFIGURED) when the DB or backend is
 * not configured.
 */
import z from 'zod';

import { defineEnvVars } from '@sveltejs/kit/hooks';

const optional = z.string().optional();

export const variables = defineEnvVars({
  // --- Public (exposed to the browser) --------------------------------------
  PUBLIC_TARGET: {
    public: true,
    // Inlined at build time so the static/node data-source split is
    // dead-code-eliminated (previously imported from $env/static/public).
    static: true,
    schema: optional,
    description:
      'Build target: "node" (SSR server; runtime storage toggle) or ' +
      '"static" (backendless client-side build, GitHub Pages)',
  },
  PUBLIC_SENTRY_DSN: {
    public: true,
    schema: optional,
    description: 'Sentry DSN; error reporting is disabled when unset',
  },
  // Per-feature Sentry toggles: every feature is ON by default when the DSN
  // is set; set a variable to "false" to disable that feature.
  PUBLIC_SENTRY_TRACES: {
    public: true,
    schema: optional,
    description: 'Set to "false" to disable Sentry performance tracing',
  },
  PUBLIC_SENTRY_REPLAY: {
    public: true,
    schema: optional,
    description: 'Set to "false" to disable Sentry session replay',
  },
  PUBLIC_SENTRY_PROFILING: {
    public: true,
    schema: optional,
    description: 'Set to "false" to disable Sentry browser profiling',
  },
  PUBLIC_SENTRY_LOGS: {
    public: true,
    schema: optional,
    description: 'Set to "false" to disable Sentry log forwarding',
  },
  PUBLIC_SENTRY_METRICS: {
    public: true,
    schema: optional,
    description: 'Set to "false" to disable Sentry metrics',
  },
  PUBLIC_SENTRY_FEEDBACK: {
    public: true,
    schema: optional,
    description: 'Set to "false" to disable the Sentry feedback widget',
  },
  PUBLIC_PRERENDER_ALL: {
    public: true,
    schema: optional,
    description: 'Set to "true" to prerender all pages (static builds)',
  },

  // --- Private (server only) -------------------------------------------------
  DB_USER: { schema: optional, description: 'PostgreSQL user' },
  DB_PASSWORD: { schema: optional, description: 'PostgreSQL password' },
  DB_HOST: {
    schema: optional,
    description: 'PostgreSQL host, optionally host:port',
  },
  DB_NAME: { schema: optional, description: 'PostgreSQL database name' },
  BACKEND_URL: {
    schema: optional,
    description: 'URL of the Python gRPC backend service',
  },
});
