/**
 * Data source factory.
 *
 * Selects the appropriate data source implementation based on PUBLIC_TARGET.
 * - `node` (production): uses Postgres/Drizzle via db-source.ts
 * - `static` (demo) / `local` (client-side): use the committed demo JSON via
 *   static-source.ts. Both are serverless `adapter-static` builds with no DB;
 *   these sources run at build time to prerender the demo dataset. The `local`
 *   build additionally computes simulation client-side (see
 *   `$lib/simulation/simulation-source`), bypassing `simulationSource` entirely.
 */
import { PUBLIC_TARGET } from '$app/env/public';

import {
  dbMoleculeSource,
  dbSimulationSource,
  dbSolventSource,
} from './db-source';
import {
  staticMoleculeSource,
  staticSimulationSource,
  staticSolventSource,
} from './static-source';
import type {
  MoleculeDataSource,
  SimulationDataSource,
  SolventDataSource,
} from './types';

const STATIC = PUBLIC_TARGET === 'static' || PUBLIC_TARGET === 'local';

export const moleculeSource: MoleculeDataSource = STATIC
  ? staticMoleculeSource
  : dbMoleculeSource;

export const solventSource: SolventDataSource = STATIC
  ? staticSolventSource
  : dbSolventSource;

export const simulationSource: SimulationDataSource = STATIC
  ? staticSimulationSource
  : dbSimulationSource;
