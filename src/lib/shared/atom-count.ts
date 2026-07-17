/**
 * Atom-count parsing for uploaded .xyz structure files, shared by the server
 * data source (`$lib/server/data/db-source`) and the client-side store
 * (`$lib/shared/molecule-store`) so both derive and cap the count identically.
 */
import { MAX_UPLOAD_ATOM_COUNT } from './contracts';

const atomCountLine = /^(\s*\d+)/;

/** Read the atom count from an .xyz file's first line, or null if unparseable. */
export function extractAtomCount(contents: string): number | null {
  const firstLine = contents.split(/\r?\n/, 1)[0]?.trim();
  if (!firstLine) return null;
  const match = atomCountLine.exec(firstLine);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Derive the atom count for new file contents, falling back to `fallback` (the
 * client-declared value, upload only) when the first line can't be parsed. The
 * contents-mutation callers pass no fallback and error instead.
 */
export function deriveAtomCount(
  contents: string,
  fallback: number | null = null,
): { ok: true; atomCount: number } | { ok: false; error: string } {
  const resolved = extractAtomCount(contents) ?? fallback;
  if (resolved === null) {
    return {
      ok: false,
      error: 'Unable to read the atom count from this file.',
    };
  }
  if (resolved > MAX_UPLOAD_ATOM_COUNT) {
    return {
      ok: false,
      error: `Structure has too many atoms (${resolved}); the maximum is ${MAX_UPLOAD_ATOM_COUNT}.`,
    };
  }
  return { ok: true, atomCount: resolved };
}
