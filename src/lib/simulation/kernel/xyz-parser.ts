/**
 * Parser for `.xyz` structure files, producing the `(elements, xyz)` tuple the
 * {@link computeDebyeIq} kernel consumes.
 *
 * Mirrors the Python backend's `_pre_parse_structure_contents`
 * (`backend/src/simex_debye_grpc/calculator.py`), which does
 * `np.genfromtxt(StringIO(contents), dtype=str, skip_header=2)` then splits
 * column 0 (element symbols) from columns 1: (Cartesian coordinates): skip the
 * two-line xyz header (atom count + comment), then read each remaining line as
 * whitespace-separated `element x y z`. Blank lines are ignored, matching
 * `genfromtxt`'s default handling.
 */

export type ParsedStructure = {
  elements: string[];
  xyz: [number, number, number][];
};

/**
 * Parse `.xyz` file contents into per-atom element symbols and coordinates.
 *
 * @throws if a data line does not have exactly four whitespace-separated fields
 *   (element + three coordinates) or a coordinate is not a finite number.
 */
export function parseXyz(contents: string): ParsedStructure {
  const lines = contents.split(/\r?\n/).slice(2);

  const elements: string[] = [];
  const xyz: [number, number, number][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    const fields = trimmed.split(/\s+/);
    if (fields.length !== 4) {
      throw new Error(
        `Expected "element x y z" (4 fields) but got ${fields.length}: "${trimmed}"`,
      );
    }

    const [element, xs, ys, zs] = fields;
    const x = Number(xs);
    const y = Number(ys);
    const z = Number(zs);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error(`Non-numeric coordinate in line: "${trimmed}"`);
    }

    elements.push(element);
    xyz.push([x, y, z]);
  }

  return { elements, xyz };
}
