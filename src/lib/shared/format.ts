/**
 * Shared display-precision formatting.
 *
 * The app's convention is 3 significant figures for any measured/computed
 * value shown to a user (detector Q ranges, solvent properties, dashboard
 * stat chips, etc). This is a *display-layer* concern only — never format a
 * value before writing it to state, a URL, or an API request; the full
 * precision must always survive round-trips (see `simulation-url.ts` and its
 * tests). Pair with `RevealableValue`/`RevealableInput` so the full value
 * stays reachable for copying.
 */

const DEFAULT_SIG_FIGS = 3;

/**
 * Format a number to `sigFigs` significant figures for display.
 *
 * Uses `toPrecision` for the rounding, then round-trips through `Number` to
 * strip trailing zeros it introduces (e.g. `(8.498164).toPrecision(3)` ->
 * `"8.50"` -> `8.5` -> `"8.5"`). That round-trip also defers to JS's native
 * `Number` -> `String` conversion for picking fixed vs. exponential
 * notation, so mid-range values stay in plain decimal (`0.005253` ->
 * `"0.00525"`, not `"5.25e-3"`) while only genuinely extreme magnitudes
 * (roughly outside `1e-6`..`1e21`) fall back to exponential.
 *
 * `null`/`undefined`/non-finite values format as `'—'` so callers don't need
 * their own guard before calling this.
 */
export function formatSigFigs(
  value: number | null | undefined,
  sigFigs = DEFAULT_SIG_FIGS,
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return +value.toPrecision(sigFigs) + '';
}
