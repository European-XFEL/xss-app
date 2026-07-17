"""Generate reference fixtures for the Debye I(q) TypeScript parity port.

Runs the CURRENT Python compute kernel (the same code path as
`simex_debye_grpc.calculator.calc_debye`) over a set of real structure files and
q-ranges, and writes one JSON fixture per case to `tests/fixtures/debye-parity/`
at the repo root. A later bead consumes these from a TypeScript/vitest parity
suite as ground truth.

Regenerate with:

    cd backend && .venv/bin/python scripts/generate_parity_fixtures.py

These fixtures are the ground truth for the port; they are NOT independently
verified against any third source.
"""

from __future__ import annotations

import json
from io import StringIO
from pathlib import Path

import numpy as np
from debyecalculator import DebyeCalculator

# Repo root = two levels up from this script (backend/scripts/ -> backend/ -> root).
REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = REPO_ROOT / "tests" / "fixtures" / "debye-parity"


def pre_parse_structure_contents(contents: bytes) -> tuple[list[str], np.ndarray]:
    """Mirror `calculator._pre_parse_structure_contents` exactly."""
    text = np.genfromtxt(StringIO(contents.decode("utf-8")), dtype=str, skip_header=2)
    elements = text[:, 0].tolist()
    xyz = text[:, 1:].astype(float)
    return elements, xyz


def calc_debye(
    qmin: float,
    qmax: float,
    qstep: float,
    structure_source: tuple[list[str], np.ndarray],
):
    """Mirror `calculator._calc_debye` exactly (all other params at defaults)."""
    calculator = DebyeCalculator(qmin=qmin, qmax=qmax, qstep=qstep)
    return calculator.iq(structure_source=structure_source)


# (name, repo-relative .xyz path)
STRUCTURES = [
    ("ptpop-gs", "data/molecules/PtPOP/PtPOP_GS-0.xyz"),
    ("feterpy2-ls", "data/molecules/FeTerpy2/FeTerpy2_LS-0.xyz"),
    ("febpy3-hs", "data/molecules/FeBpy3/FeBpy3_HS-1.xyz"),
]

# (suffix, qmin, qmax, qstep)
# Only "narrow" is kept: the wider "readme-range" q-range fixtures were
# redundant with narrow + the half-open-endpoint unit test in
# debye.parity.test.ts and were dropped (~6.4k lines) to trim fixture size.
Q_RANGES = [
    ("narrow", 0.5, 3.0, 0.1),
]


def to_list(arr) -> list[float]:
    """Convert a torch tensor / numpy array to a plain python float list."""
    np_arr = np.asarray(arr.detach().cpu().numpy() if hasattr(arr, "detach") else arr)
    return np_arr.astype(float).ravel().tolist()


def main() -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    for struct_name, rel_path in STRUCTURES:
        xyz_path = REPO_ROOT / rel_path
        contents = xyz_path.read_bytes()
        elements, xyz = pre_parse_structure_contents(contents)

        for suffix, qmin, qmax, qstep in Q_RANGES:
            result = calc_debye(qmin, qmax, qstep, (elements, xyz))
            q = to_list(result.q)
            i = to_list(result.i)

            non_finite = [
                v for v in (*q, *i) if not (float("-inf") < v < float("inf"))
            ]
            if non_finite:
                raise ValueError(
                    f"Non-finite value(s) in {struct_name}-{suffix}: "
                    f"{non_finite[:5]} (count={len(non_finite)}). "
                    "JSON cannot represent NaN/Inf — refusing to write."
                )

            fixture = {
                "name": f"{struct_name}-{suffix}",
                "source_file": rel_path,
                "n_atoms": len(elements),
                "elements": elements,
                "xyz": xyz.tolist(),
                "q_range": {"min": qmin, "max": qmax, "step": qstep},
                "q": q,
                "i": i,
                "note": (
                    "Generated from the current Python Debye implementation "
                    "(simex_debye_grpc.calculator). Ground truth, not "
                    "independently verified. Regenerate: cd backend && "
                    ".venv/bin/python scripts/generate_parity_fixtures.py"
                ),
            }

            out_path = FIXTURE_DIR / f"{struct_name}-{suffix}.json"
            out_path.write_text(json.dumps(fixture, indent=2) + "\n")
            written.append(out_path.name)
            print(
                f"  {out_path.name}: {len(elements)} atoms, "
                f"{len(q)} q-points, I(q) range [{min(i):.4g}, {max(i):.4g}]"
            )

    print(f"\nWrote {len(written)} fixtures to {FIXTURE_DIR}")


if __name__ == "__main__":
    main()
