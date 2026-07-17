# Debye I(q) kernel

Two implementations of the Debye scattering I(q) computation exist in this repo.

## Why two

- **Python calculator** (`backend/calculator.py`) — the original, torch-backed via
  `debyecalculator`. Parity ground truth and fixture/table codegen oracle only; it has
  **no runtime role** (the gRPC serving layer was retired in `initial-dev-u44`).
- **TS kernel** (`debye.ts`) — a pure-TypeScript port of exactly what
  `calculator.py::calc_debye` exercises (xray, `biso=0.3`, `include_self_scattering=True`,
  `(elements, xyz)` structure source; no CIF/ASE, batching, or UI paths).

The port exists so simulation can eventually run with **no backend at all** — a fully
static, local-only build where the browser tab does upload + compute + store with zero
network (see epic `initial-dev-ej2` and bead `initial-dev-ej2.8`). The only heavy backend
dependency on this path is torch, used purely for a pairwise-distance + sinc-weighted sum
(O(N_pairs × N_q), no real linear algebra) — cheap enough to run natively in JS with typed
arrays. Pyodide (bundling WASM CPython + numpy), WebGPU (no matmul-shaped work), and
Rust+wasm (needs wasm threads / SharedArrayBuffer infra) were all rejected as
over-provisioned for a few hundred atoms × low-thousands q-points; plain TS wins until
profiling proves otherwise. Full rationale lives in the epic's design notes.

## Which the app uses

The **TS kernel is the only compute path**, and it runs **client-side**: on a cache miss
`computeDebyeClient` (`src/lib/simulation/simulation-local.ts`) parses the .xyz and runs
`computeDebyeIq` in the browser (results cached in IndexedDB, or written back to the shared
Postgres cache on the node build). There is **no gRPC fallback** any more (removed in
`initial-dev-pbx`/`initial-dev-u44`), so a parse/kernel failure — e.g. an element absent from
`FORM_FACTOR_COEFFICIENTS` — now propagates to the caller instead of falling back to Python.

## Parity workflow

The port is validated against fixtures generated from the Python kernel
(`tests/fixtures/debye-parity/`, ~1e-4 relative tolerance for float32 rounding).

- Run the parity suite: `pnpm exec vitest run src/lib/simulation/kernel/debye.parity.test.ts`
- Regenerate fixtures: `cd backend && .venv/bin/python scripts/generate_parity_fixtures.py`
  (details in [`tests/fixtures/debye-parity/README.md`](../../../../tests/fixtures/debye-parity/README.md))

The fixtures are the ground truth and go stale if `calculator.py`'s behavior changes —
regenerate **and** re-run parity together whenever the Python kernel is touched.

## eslint boundary exception

The server tree (`src/lib/server`) is normally forbidden from importing features. A single
scoped `server → feature(simulation)` allow rule in `eslint.config.js` (see its inline
comment) exists solely so the data source can call this kernel; deep imports stay banned, so
consume the kernel via `$lib/simulation`'s public `index.ts`.
