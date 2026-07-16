/**
 * Wall-clock benchmark for `computeDebyeIq` (initial-dev-ej2.5).
 * Run: pnpm exec tsx src/lib/simulation/kernel/debye.bench.ts
 *
 * Measures the interactive-recompute cost (e.g. dragging a q-range slider).
 * Not a vitest test — this repo has no `bench` script, so a plain tsx runner
 * is the idiomatic option.
 */
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import type { QRange } from '$lib/shared/contracts';

import { computeDebyeIq } from './debye.ts';

type Fixture = {
  elements: string[];
  xyz: [number, number, number][];
};

const FIXTURE_DIR = 'tests/fixtures/debye-parity';
const NARROW: QRange = { min: 0.5, max: 3.0, step: 0.1 }; // 25 pts
const README: QRange = { min: 0.01, max: 9.0, step: 0.01 }; // 899 pts

function loadFixture(name: string): Fixture {
  const d = JSON.parse(readFileSync(`${FIXTURE_DIR}/${name}.json`, 'utf8'));
  return { elements: d.elements, xyz: d.xyz };
}

/** Median wall-clock ms over `iters` runs after `warmup` untimed runs. */
function timeMs(fn: () => void, iters = 15, warmup = 3): number {
  for (let i = 0; i < warmup; i += 1) fn();
  const samples: number[] = [];
  for (let i = 0; i < iters; i += 1) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

/** Synthetic structure: `n` atoms on a loose lattice, cycling a few elements. */
function synthetic(n: number): Fixture {
  const els = ['Fe', 'C', 'N', 'H', 'Pt'];
  const elements: string[] = [];
  const xyz: [number, number, number][] = [];
  const side = Math.ceil(Math.cbrt(n));
  for (let k = 0; k < n; k += 1) {
    elements.push(els[k % els.length]);
    xyz.push([
      (k % side) * 1.5,
      (Math.floor(k / side) % side) * 1.5,
      Math.floor(k / (side * side)) * 1.5,
    ]);
  }
  return { elements, xyz };
}

const cases: { label: string; fix: Fixture; q: QRange }[] = [];
for (const [name, atoms] of [
  ['febpy3-hs', 61],
  ['feterpy2-ls', 59],
  ['ptpop-gs', 38],
] as const) {
  const fix = loadFixture(`${name}-narrow`);
  cases.push({ label: `${name} (${atoms} atoms)`, fix, q: NARROW });
  cases.push({ label: `${name} (${atoms} atoms)`, fix, q: README });
}
for (const n of [300, 500]) {
  cases.push({ label: `synthetic (${n} atoms)`, fix: synthetic(n), q: README });
}

console.log(
  'case'.padEnd(30),
  'nQ'.padStart(5),
  'atoms'.padStart(6),
  'ms'.padStart(9),
);
for (const c of cases) {
  const nQ = Math.ceil((c.q.max - c.q.min) / c.q.step);
  const ms = timeMs(() => computeDebyeIq(c.fix.elements, c.fix.xyz, c.q));
  console.log(
    c.label.padEnd(30),
    String(nQ).padStart(5),
    String(c.fix.elements.length).padStart(6),
    ms.toFixed(3).padStart(9),
  );
}
