/**
 * Wall-clock benchmark + CI regression guard for `computeDebyeIq`
 * (initial-dev-ej2.5 / bd-8, finding #7).
 * Run: pnpm bench  (alias for `tsx src/lib/simulation/kernel/debye.bench.ts`)
 *
 * Measures the interactive-recompute cost (e.g. dragging a q-range slider) and
 * ASSERTS the shipped demo molecules stay under a time budget — exit code 1 on
 * a regression, so CI can call `pnpm bench` as a gate. The synthetic 300/500-
 * atom cases are stress reference only (above the SOFT_ATOM_CAP) and are NOT
 * asserted. Not a vitest test — a plain tsx runner keeps it out of the unit
 * suite and lets it own the process exit code.
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

/**
 * Per-case CI budget for the shipped demo molecules. Local median for the
 * worst demo case (febpy3-hs, 899 pts) is ~33 ms; 250 ms leaves ~7x headroom
 * for slower/noisier CI runners while still catching a real regression (a lost
 * optimization or an accidental O(N³) would blow past this by an order of
 * magnitude). Only `demo` cases are asserted.
 */
const DEMO_BUDGET_MS = 250;

const cases: { label: string; fix: Fixture; q: QRange; demo: boolean }[] = [];
for (const [name, atoms] of [
  ['febpy3-hs', 61],
  ['feterpy2-ls', 59],
  ['ptpop-gs', 38],
] as const) {
  const fix = loadFixture(`${name}-narrow`);
  cases.push({ label: `${name} (${atoms} atoms)`, fix, q: NARROW, demo: true });
  cases.push({ label: `${name} (${atoms} atoms)`, fix, q: README, demo: true });
}
for (const n of [300, 500]) {
  cases.push({
    label: `synthetic (${n} atoms)`,
    fix: synthetic(n),
    q: README,
    demo: false,
  });
}

console.log(
  'case'.padEnd(30),
  'nQ'.padStart(5),
  'atoms'.padStart(6),
  'ms'.padStart(9),
);
const failures: string[] = [];
for (const c of cases) {
  const nQ = Math.ceil((c.q.max - c.q.min) / c.q.step);
  const ms = timeMs(() => computeDebyeIq(c.fix.elements, c.fix.xyz, c.q));
  const over = c.demo && ms > DEMO_BUDGET_MS;
  console.log(
    c.label.padEnd(30),
    String(nQ).padStart(5),
    String(c.fix.elements.length).padStart(6),
    ms.toFixed(3).padStart(9),
    over ? '  OVER BUDGET' : '',
  );
  if (over) {
    failures.push(
      `${c.label} @ ${nQ} pts: ${ms.toFixed(1)}ms > ${DEMO_BUDGET_MS}ms`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    `\nDebye bench regression — demo cases exceeded ${DEMO_BUDGET_MS}ms:`,
  );
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
