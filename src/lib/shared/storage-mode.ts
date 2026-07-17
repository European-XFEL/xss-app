/**
 * Where molecule + simulation data is stored: the shared Postgres backend, or
 * client-side IndexedDB ("backendless" mode).
 *
 * - `static` build: always client-side — a serverless adapter-static deploy has
 *   no backend. `STATIC` is a build-time constant (PUBLIC_TARGET is inlined), so
 *   callers guarding on it dead-code-eliminate their Postgres/remote branch.
 * - `node` build: a RUNTIME choice via the Settings popover toggle
 *   (`clientStorage`), read here from its cookie. Default off = Postgres.
 *
 * The cookie name mirrors what the settings store writes
 * (`$lib/widgets/settings/settings.svelte.ts`). This is the CLIENT reader
 * (`document.cookie`); the server reads the same cookie from the request in
 * `hooks.server.ts` for capability reporting.
 */
import { PUBLIC_TARGET } from '$app/env/public';

const STATIC = PUBLIC_TARGET === 'static';
const COOKIE = 'settings.clientStorage';

export function useClientStorage(): boolean {
  if (STATIC) return true;
  if (typeof document === 'undefined') return false; // SSR: Postgres default
  // ponytail: inline cookie read — the widget's readCookie is behind the
  // feature→widget boundary fence, so a 1-line regex here beats a cross-layer
  // refactor. Upgrade to a shared cookie util if a third reader appears.
  return new RegExp(`(?:^|; )${COOKIE}=true(?:;|$)`).test(document.cookie);
}
