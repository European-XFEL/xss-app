import { untrack } from 'svelte';

import { getSolventIQ } from '$lib/sample/solvent.remote';
import type { QRange } from '$lib/shared/contracts';

import { type ScatteringSeries, createQGrid, interpolateLinear } from './math';
import { getDebyeResult } from './simulation.remote';

export type ResourceState<T> =
  | { status: 'idle' }
  // `value` carries the last successful result through a refetch so
  // consumers (e.g. the dashboard plot) keep rendering the previous data
  // instead of clearing and replaying their enter animation on every
  // input change (initial-dev-opx).
  | { status: 'loading'; value: T | null }
  | { status: 'success'; value: T }
  | { status: 'error'; error: Error };

export type ScatteringResource<T> = {
  readonly state: ResourceState<T>;
  readonly value: T | null;
  readonly loading: boolean;
  readonly error: Error | null;
  refetch: () => Promise<void>;
};

// Cohesive closure: fetch, effect, and getters all share `state`/`requestId`;
// the overage is mostly the reactivity comments, which are worth their lines.
// eslint-disable-next-line max-lines-per-function
export function createScatteringResource<T>(
  fetcher: () => Promise<T>,
  ready: () => boolean,
): ScatteringResource<T> {
  let state = $state<ResourceState<T>>({ status: 'idle' });
  let requestId = 0;

  const runFetch = async () => {
    // Reading `ready()` synchronously (before any await) is what registers the
    // resource's reactive dependencies, so callers must read every input they
    // depend on inside `ready` for the fetch to re-run when they change.
    if (!ready()) {
      state = { status: 'idle' };
      return;
    }

    const currentRequest = (requestId += 1);
    // `untrack`: runFetch runs inside $effect, so an untracked read keeps
    // `state` itself out of the effect's dependencies (reading it tracked
    // would make the write below re-trigger the effect in a loop).
    const previous = untrack(() =>
      state.status === 'success' || state.status === 'loading'
        ? state.value
        : null,
    );
    state = { status: 'loading', value: previous };

    try {
      const value = await fetcher();
      if (currentRequest !== requestId) return;
      state = { status: 'success', value };
    } catch (err) {
      if (currentRequest !== requestId) return;
      state = {
        status: 'error',
        error:
          err instanceof Error
            ? err
            : new Error('Scattering fetch failed', { cause: err }),
      };
    }
  };

  $effect(() => {
    void runFetch();
  });

  return {
    get state() {
      return state;
    },
    get value() {
      return state.status === 'success' || state.status === 'loading'
        ? state.value
        : null;
    },
    get loading() {
      return state.status === 'loading';
    },
    get error() {
      return state.status === 'error' ? state.error : null;
    },
    refetch: runFetch,
  };
}

export async function fetchDeltaSSolute(
  qRange: QRange,
  groundId: string,
  excitedId: string,
): Promise<ScatteringSeries> {
  const [ground, excited] = await Promise.all([
    getDebyeResult({ fileId: groundId, qRange }),
    getDebyeResult({ fileId: excitedId, qRange }),
  ]);

  if (ground.q.length !== excited.q.length) {
    throw new Error('Ground/excited Q ranges do not match.');
  }

  const deltaI = ground.i.map((value, index) => excited.i[index] - value);
  return { q: ground.q, i: deltaI };
}

export async function fetchDeltaSSolvent(
  qRange: QRange,
  solventId: string,
  ratioSolventSolute: number,
  deltaT: number,
): Promise<ScatteringSeries> {
  const solvent = await getSolventIQ(solventId);
  const targetQ = createQGrid(qRange);
  const solventQ = solvent.q.map((value) => Number(value));
  const solventDSdT = solvent.dSdT.map((value) => Number(value));

  const interpolated = interpolateLinear(solventQ, solventDSdT, targetQ);
  const scaled = interpolated.map((value) => {
    if (!Number.isFinite(value)) return Number.NaN;
    return value * ratioSolventSolute * deltaT;
  });

  return { q: targetQ, i: scaled };
}
