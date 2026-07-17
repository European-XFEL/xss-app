/**
 * Data source factory.
 *
 * Selects the appropriate data source implementation based on PUBLIC_TARGET.
 * - `node` (SSR): uses Postgres/Drizzle via db-source.ts. (When the runtime
 *   backendless-storage toggle is on, uploads/sim stay client-side and this
 *   server source only serves read-only public data — see the molecule facade.)
 * - `static` (backendless): uses the committed demo JSON via static-source.ts.
 *   A serverless `adapter-static` build with no DB; these sources run at build
 *   time to prerender the demo dataset, and simulation is computed client-side
 *   (see `$lib/simulation/simulation-source`), bypassing `simulationSource`.
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

const STATIC = PUBLIC_TARGET === 'static';

export const moleculeSource: MoleculeDataSource = STATIC
  ? staticMoleculeSource
  : dbMoleculeSource;

export const solventSource: SolventDataSource = STATIC
  ? staticSolventSource
  : dbSolventSource;

export const simulationSource: SimulationDataSource = STATIC
  ? staticSimulationSource
  : dbSimulationSource;
