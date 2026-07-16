/**
 * Sentry tunnel: forwards browser envelope POSTs to Sentry's ingest API
 * server-side, same-origin. Firefox ETP and ad-blockers classify direct
 * browser -> ingest.sentry.io calls as third-party tracking and block them
 * with a CORS failure; routing through our own origin avoids that.
 * (hooks.client.ts sets `tunnel: '/monitoring'` to point the SDK here.)
 *
 * The upstream host/project come from our own PUBLIC_SENTRY_DSN, not from
 * the envelope body, so this can't be abused as an open relay to arbitrary
 * hosts.
 */
import { error } from '@sveltejs/kit';

import { PUBLIC_SENTRY_DSN } from '$app/env/public';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  if (!PUBLIC_SENTRY_DSN) {
    error(404, 'Sentry not configured');
  }

  const dsn = new URL(PUBLIC_SENTRY_DSN);
  const projectId = dsn.pathname.replace('/', '');
  const upstream = `https://${dsn.host}/api/${projectId}/envelope/`;

  const response = await fetch(upstream, {
    method: 'POST',
    body: await request.arrayBuffer(),
    headers: {
      'Content-Type':
        request.headers.get('content-type') ?? 'application/x-sentry-envelope',
    },
  });

  return new Response(null, { status: response.status });
};
