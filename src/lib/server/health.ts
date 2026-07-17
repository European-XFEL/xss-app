import { sql } from 'drizzle-orm';

import { DB_HOST, DB_PASSWORD, DB_USER } from '$app/env/private';
import { PUBLIC_TARGET } from '$app/env/public';

import { db } from './db';
import type { Capabilities, Capability, DbHealth, Health } from './types';

const HEALTH_TTL_MS = 10_000;
let healthCache: { value: Health; expiresAt: number } | null = null;
let healthInFlight: Promise<Health> | null = null;

const DB_CONFIGURED = Boolean(DB_HOST && DB_USER && DB_PASSWORD);

function normalizeErrorDetail(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name;
  }
  return String(err);
}

async function checkDbHealth(): Promise<DbHealth> {
  if (!DB_CONFIGURED) {
    return {
      configured: false,
      healthy: false,
      reason: 'NOT_CONFIGURED',
      detail: 'Database connection not configured',
    };
  }

  try {
    const res = await db.execute(sql`SELECT 1`);
    const hasRows = Array.isArray(res) ? res.length > 0 : Boolean(res);
    return hasRows
      ? { configured: true, healthy: true }
      : { configured: true, healthy: false, reason: 'NO_ROWS' };
  } catch (err) {
    console.error('Database health check failed', err);
    return {
      configured: true,
      healthy: false,
      reason: 'ERROR',
      detail: normalizeErrorDetail(err),
    };
  }
}

async function computeHealthFlags(): Promise<Health> {
  return { db: await checkDbHealth() };
}

export async function getHealth(): Promise<Health> {
  const now = Date.now();
  if (healthCache && healthCache.expiresAt > now) {
    return healthCache.value;
  }

  if (!healthInFlight) {
    healthInFlight = (async () => {
      try {
        const value = await computeHealthFlags();
        healthCache = { value, expiresAt: Date.now() + HEALTH_TTL_MS };
        return value;
      } finally {
        healthInFlight = null;
      }
    })();
  }

  return healthInFlight;
}

const DB_UNAVAILABLE_REASON = 'Database connection unavailable';

function capability(available: boolean, reason: string): Capability {
  return available ? { available: true } : { available: false, reason };
}

export async function getCapabilities(
  clientStorage = false,
): Promise<Capabilities> {
  // Simulation always runs client-side now (TS kernel; the gRPC backend was
  // retired in bd-6), so it's available on every build. Upload depends on the
  // storage backend: client IndexedDB (always available) vs Postgres.
  const simulation: Capability = { available: true };

  // Static (backendless) build, or node with the backendless-storage toggle:
  // upload goes to client IndexedDB, available with no server.
  if (PUBLIC_TARGET === 'static' || clientStorage) {
    return { upload: { available: true }, simulation };
  }

  // Node with Postgres storage: upload depends on DB health.
  const health = await getHealth();
  return {
    upload: capability(health.db.healthy, DB_UNAVAILABLE_REASON),
    simulation,
  };
}
