# Debye I(q) parity fixtures

Reference fixtures for parity-testing the TypeScript port of the Debye
scattering compute kernel (epic `initial-dev-ej2`) against the current Python
implementation.

Each JSON file is one case: a real molecule structure run through a given
q-range via the same code path as `simex_debye_grpc.calculator.calc_debye`
(`DebyeCalculator(qmin, qmax, qstep).iq(structure_source=(elements, xyz))`, all
other params at their library defaults: `radiation_type='xray'`, `biso=0.3`,
`batch_size=10000`, `include_self_scattering=True`, no partial masks).

## File schema

```jsonc
{
  "name": "ptpop-gs-narrow",
  "source_file": "data/molecules/PtPOP/PtPOP_GS-0.xyz",
  "n_atoms": 38,
  "elements": ["Pt", "Pt", "P", ...],   // per-atom element symbols
  "xyz": [[x, y, z], ...],              // parsed coordinates (Ångström)
  "q_range": { "min": 0.5, "max": 3.0, "step": 0.1 },
  "q": [ ... ],                          // expected q values
  "i": [ ... ],                          // expected I(q) values (ground truth)
  "note": "..."
}
```

`elements` + `xyz` are inlined so the TS parity test needs no .xyz parser — feed
them straight into the port as the structure source.

## Cases

Three structures, one q-range each (3 files), q-range 0.5–3.0 step 0.1:

| structure   | source                                      | atoms | fixture                   |
| ----------- | ------------------------------------------- | ----- | ------------------------- |
| ptpop-gs    | `data/molecules/PtPOP/PtPOP_GS-0.xyz`       | 38    | `ptpop-gs-narrow.json`    |
| feterpy2-ls | `data/molecules/FeTerpy2/FeTerpy2_LS-0.xyz` | 59    | `feterpy2-ls-narrow.json` |
| febpy3-hs   | `data/molecules/FeBpy3/FeBpy3_HS-1.xyz`     | 61    | `febpy3-hs-narrow.json`   |

A wider "readme-range" q-range (0.01–9.0, step 0.01) was previously generated
per structure too, but was redundant with these narrow fixtures plus the
half-open-endpoint unit test in `debye.parity.test.ts`, so it was dropped.

## Precision note

The Python kernel is torch-backed and runs at **float32**, so `q`/`i` carry only
~7 significant digits (visible as e.g. `q[0] = 0.009999999776…`). Parity tests
should compare with a tolerance (relative ~1e-4), not exact equality.

## Regenerating

```
cd backend && .venv/bin/python scripts/generate_parity_fixtures.py
```

These were generated from the **current** Python implementation as of this
commit. They are the ground truth for the port — **not** independently verified
against any third source. If the Python kernel changes, regenerate and re-review.
