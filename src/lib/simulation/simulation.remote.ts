/**
 * Remote function for the Debye scattering computation
 * (https://svelte.dev/docs/kit/remote-functions#query).
 *
 * Replaces POST /api/simulation. A plain `query` (not `prerender`): the
 * q-range argument is a continuous float range, so results are not
 * enumerable at build time, and the computation needs the live gRPC
 * backend anyway. On the static target that backend does not exist and the
 * dashboard's simulation capability is reported unavailable — a call there
 * fails exactly like the previous client-side fetch('/api/simulation') did
 * (see initial-dev-4dy), so no STATIC guard is added.
 */
import * as Sentry from '@sentry/sveltekit';

import { query } from '$app/server';

import { simulationSource } from '$lib/server/data';
import { simulationSchema } from '$lib/shared/api/validation';

export const getDebyeResult = query(simulationSchema, async (request) => {
  const start = Date.now();
  try {
    const result = await simulationSource.getDebyeResult(request);
    Sentry.metrics.count('simulation.runs', 1, {
      attributes: { status: 'ok' },
    });
    Sentry.metrics.distribution('simulation.duration', Date.now() - start, {
      unit: 'millisecond',
    });
    Sentry.logger.info('Debye simulation completed', {
      fileId: request.fileId,
      qPoints: result.q.length,
      durationMs: Date.now() - start,
    });
    return result;
  } catch (err) {
    Sentry.metrics.count('simulation.runs', 1, {
      attributes: { status: 'error' },
    });
    Sentry.logger.error('Debye simulation failed', {
      fileId: request.fileId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
});
