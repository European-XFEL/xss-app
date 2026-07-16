import * as Sentry from '@sentry/sveltekit';

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { dev, version } from '$app/env';
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER } from '$app/env/private';
import {
  PUBLIC_SENTRY_DSN,
  PUBLIC_SENTRY_LOGS,
  PUBLIC_SENTRY_METRICS,
  PUBLIC_SENTRY_PROFILING,
  PUBLIC_SENTRY_TRACES,
  PUBLIC_TARGET,
} from '$app/env/public';

import { initDb } from '$lib/server/db';
import { getCapabilities, getHealth } from '$lib/server/health';

// Feature toggles default to on; set the env var to "false" to disable.
const on = (flag: string | undefined) => flag !== 'false';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  enabled: Boolean(PUBLIC_SENTRY_DSN),
  environment: dev ? 'development' : 'production',
  // kit.version.name — "<target>-<git describe>" (svelte.config.js).
  release: version,
  tracesSampleRate: on(PUBLIC_SENTRY_TRACES) ? 1.0 : 0,
  enableLogs: on(PUBLIC_SENTRY_LOGS),
  enableMetrics: on(PUBLIC_SENTRY_METRICS),
});

// Initialize the database connection at server startup.
// Skip for static builds and for environments without DB credentials.
const STATIC = PUBLIC_TARGET === 'static';
const HAS_DB_CREDS = Boolean(DB_USER && DB_PASSWORD && DB_HOST && DB_NAME);

if (!STATIC && HAS_DB_CREDS) {
  initDb();
}

const appHandle: Handle = async ({ event, resolve }) => {
  // Browser profiling (hooks.client.ts) only runs when the document response
  // carries this header.
  if (on(PUBLIC_SENTRY_PROFILING)) {
    event.setHeaders({ 'Document-Policy': 'js-profiling' });
  }

  const [health, capabilities] = await Promise.all([
    getHealth(event.fetch),
    getCapabilities(event.fetch),
  ]);

  event.locals.health = health;
  event.locals.capabilities = capabilities;

  return await resolve(event);
};

export const handle = sequence(Sentry.sentryHandle(), appHandle);

export const handleError = Sentry.handleErrorWithSentry();
