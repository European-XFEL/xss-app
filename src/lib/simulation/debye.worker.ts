/**
 * Web Worker wrapper around the Debye I(Q) kernel (initial-dev-ank / bd-8).
 *
 * The kernel is O(N² × |Q|) and blocked the main thread above ~300 atoms
 * (bench initial-dev-ej2.5). Running it here keeps slider-drag recompute off
 * the UI thread. The worker owns only the pure compute — contents resolution
 * and `.xyz` parsing stay on the main thread (cheap, and needs IndexedDB / the
 * read remote). Vite bundles this module (and its transitive kernel +
 * form-factor table imports) into a separate worker chunk for both the static
 * and node targets.
 */
/// <reference lib="webworker" />
import type { DebyeResult, QRange } from '$lib/shared/contracts';

import { computeDebyeIq } from './kernel/debye';

export type DebyeWorkerRequest = {
  id: number;
  elements: string[];
  xyz: [number, number, number][];
  qRange: QRange;
};

export type DebyeWorkerResponse =
  | { id: number; ok: true; result: DebyeResult }
  | { id: number; ok: false; error: string };

self.onmessage = ({ data }: MessageEvent<DebyeWorkerRequest>) => {
  const { id, elements, xyz, qRange } = data;
  try {
    const result = computeDebyeIq(elements, xyz, qRange);
    self.postMessage({ id, ok: true, result } satisfies DebyeWorkerResponse);
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies DebyeWorkerResponse);
  }
};
