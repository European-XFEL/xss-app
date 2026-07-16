// Cookie-backed settings store. Add a new user setting by appending one
// entry to SETTINGS_SCHEMA below — the popover (SettingsButton.svelte)
// renders every entry generically, so nothing else needs to change.
//
// Cookies (not localStorage) so a future server-side read (e.g. during SSR)
// can see the same value; see initial-dev-95a / initial-dev-2qo.

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
  {
    id: 'uploadAcknowledged',
    label: 'No-auth upload notice acknowledged',
    description:
      'This app has no authentication — any molecule file or metadata you upload is visible to anyone who visits the site. Acknowledged once, on your first upload attempt.',
    default: false,
  },
];

const COOKIE_PREFIX = 'settings.';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function cookieName(id: string) {
  return `${COOKIE_PREFIX}${id}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
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
  return initialValue(def ?? { id, label: '', description: '', default: false });
}

// True until the user has made a choice for every known setting — used to
// auto-open and emphasise the Settings popover on first visit.
export function hasStoredPreferences(): boolean {
  return SETTINGS_SCHEMA.every((def) => readCookie(cookieName(def.id)) !== null);
}

class SettingsStore {
  values = $state<Record<string, boolean>>(
    Object.fromEntries(SETTINGS_SCHEMA.map((def) => [def.id, initialValue(def)])),
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
