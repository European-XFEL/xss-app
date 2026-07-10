import type { Handle } from '@sveltejs/kit';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER } from '$app/env/private';
import { PUBLIC_TARGET } from '$app/env/public';

import { initDb } from '$lib/server/db';
import { getCapabilities, getHealth } from '$lib/server/health';

// Initialize the database connection at server startup.
// Skip for static builds and for environments without DB credentials.
const STATIC = PUBLIC_TARGET === 'static';
const HAS_DB_CREDS = Boolean(DB_USER && DB_PASSWORD && DB_HOST && DB_NAME);

if (!STATIC && HAS_DB_CREDS) {
  initDb();
}

export const handle: Handle = async ({ event, resolve }) => {
  const [health, capabilities] = await Promise.all([
    getHealth(event.fetch),
    getCapabilities(event.fetch),
  ]);

  event.locals.health = health;
  event.locals.capabilities = capabilities;

  return await resolve(event);
};
