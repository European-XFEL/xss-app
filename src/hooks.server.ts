import * as Sentry from '@sentry/sveltekit';

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER } from '$app/env/private';
import { PUBLIC_SENTRY_DSN, PUBLIC_TARGET } from '$app/env/public';
import { dev } from '$app/environment';

import { initDb } from '$lib/server/db';
import { getCapabilities, getHealth } from '$lib/server/health';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  enabled: Boolean(PUBLIC_SENTRY_DSN),
  environment: dev ? 'development' : 'production',
  tracesSampleRate: 1.0,
});

// Initialize the database connection at server startup.
// Skip for static builds and for environments without DB credentials.
const STATIC = PUBLIC_TARGET === 'static';
const HAS_DB_CREDS = Boolean(DB_USER && DB_PASSWORD && DB_HOST && DB_NAME);

if (!STATIC && HAS_DB_CREDS) {
  initDb();
}

const appHandle: Handle = async ({ event, resolve }) => {
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
