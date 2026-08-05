// Cookie-backed settings store. Add a new user setting by appending one
// entry to SETTINGS_SCHEMA below — the popover (SettingsButton.svelte)
// renders every entry generically, so nothing else needs to change.
//
// Cookies (not localStorage) so a future server-side read (e.g. during SSR)
// can see the same value; see initial-dev-95a / initial-dev-2qo.
import { PUBLIC_TARGET } from '$app/env/public';

export interface SettingDef {
  id: string;
  label: string;
  description: string;
  default: boolean;
}

export const SETTINGS_SCHEMA: SettingDef[] = [
  {
    id: 'sentryReplay',
    label: 'Session Replay',
    description:
      'Let Sentry record anonymized session replays (DOM + interactions) to help diagnose bugs. Off by default — this is the only telemetry category that captures user activity, so it needs your consent.',
    default: false,
  },
  // Node build only, below the static check: the static build always stores
  // uploads client-side (IndexedDB), so nothing uploaded is ever publicly
  // visible there — the notice would be false. (PUBLIC_TARGET is inlined, so
  // this const-folds the entry out per target, same as `clientStorage` below.)
  ...(PUBLIC_TARGET === 'static'
    ? []
    : [
        {
          id: 'uploadAcknowledged',
          label: 'No-auth upload notice acknowledged',
          description:
            'This app has no authentication — any molecule file or metadata you upload is visible to anyone who visits the site. Acknowledged once, on your first upload attempt.',
          default: false,
        },
      ]),
  // Node build only: the storage backend is a runtime choice. The static build
  // is always backendless, so the toggle would be an inert no-op there — omit it
  // (PUBLIC_TARGET is inlined, so this const-folds the entry out per target).
  ...(PUBLIC_TARGET === 'static'
    ? []
    : [
        {
          id: 'clientStorage',
          label: 'Backendless (local) storage',
          description:
            'Store molecules and simulation results in your browser (IndexedDB) instead of the shared database. Existing public data stays visible (read-only); nothing you add is sent to the server. Takes effect on reload.',
          default: false,
        },
      ]),
];

const COOKIE_PREFIX = 'settings.';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function cookieName(id: string) {
  return `${COOKIE_PREFIX}${id}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function initialValue(def: SettingDef): boolean {
  const raw = readCookie(cookieName(def.id));
  return raw === null ? def.default : raw === 'true';
}

// A pure (non-reactive) read, safe to call from module-load-time code that
// runs before any component exists — e.g. hooks.client.ts deciding whether
// to initialise Sentry's replay integration at all.
export function readSetting(id: string): boolean {
  const def = SETTINGS_SCHEMA.find((s) => s.id === id);
  return initialValue(
    def ?? { id, label: '', description: '', default: false },
  );
}

// Tracks whether the user has ever opened the Settings popover, independent
// of individual setting values — `uploadAcknowledged` in particular is only
// ever set from the upload flow (initial-dev-2qo), not by visiting the
// popover, so gating on "every setting has a cookie" would re-open the
// popover on every load for anyone who hasn't uploaded yet.
const SEEN_COOKIE = `${COOKIE_PREFIX}seen`;

export function hasSeenSettings(): boolean {
  return readCookie(SEEN_COOKIE) !== null;
}

export function markSettingsSeen() {
  writeCookie(SEEN_COOKIE, 'true');
}

class SettingsStore {
  values = $state<Record<string, boolean>>(
    Object.fromEntries(
      SETTINGS_SCHEMA.map((def) => [def.id, initialValue(def)]),
    ),
  );

  get(id: string): boolean {
    return this.values[id] ?? false;
  }

  set(id: string, value: boolean) {
    this.values[id] = value;
    writeCookie(cookieName(id), String(value));
  }
}

export const settings = new SettingsStore();
