/**
 * Shared health/capability types.
 *
 * Reported by the server (see `$lib/server/health`) and consumed by client
 * components that gate features on availability (e.g. upload gates on DB
 * health). Lives in shared since both sides need it.
 */
export interface BaseHealth {
  configured: boolean;
  healthy: boolean;
  reason?: string;
  detail?: string;
}

export type DbHealth =
  | (BaseHealth & {
      configured: false;
      healthy: false;
      reason: 'NOT_CONFIGURED';
    })
  | (BaseHealth & { configured: true; healthy: true })
  | (BaseHealth & {
      configured: true;
      healthy: false;
      reason: 'NO_ROWS' | 'ERROR';
      detail?: string;
    });

export interface Health {
  db: DbHealth;
}

export type Capability =
  { available: true } | { available: false; reason: string };

export type Capabilities = {
  upload: Capability;
  simulation: Capability;
  share: Capability;
};
