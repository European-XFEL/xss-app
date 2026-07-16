/**
 * Data source abstraction interfaces.
 *
 * These interfaces define the operations used by the app for accessing
 * molecule, solvent, and simulation data. Two implementations exist:
 * - `db-source.ts`: Production implementation using Postgres/Drizzle
 * - `static-source.ts`: Static demo implementation reading from JSON files
 */
import type {
  DebyeResult,
  MoleculeFileContent,
  MoleculeInfo,
  SimRequest,
  SolventIQ,
  SolventInfo,
  UploadMoleculeResult,
} from '$lib/shared/contracts';

// ─── Molecule types ─────────────────────────────────────────────────────────

export interface UploadMoleculeInput {
  moleculeName: string;
  description: string;
  state: number;
  reference: string | null;
  atomCount: number;
  file: File;
}

export interface MoleculeDataSource {
  listMolecules(): Promise<MoleculeInfo[]>;
  getMoleculeFileContent(id: string): Promise<MoleculeFileContent>;
  uploadMolecule(input: UploadMoleculeInput): Promise<UploadMoleculeResult>;
}

// ─── Solvent types ──────────────────────────────────────────────────────────

export interface SolventDataSource {
  listSolvents(): Promise<SolventInfo[]>;
  getSolventIQ(id: string): Promise<SolventIQ>;
}

// ─── Simulation types ───────────────────────────────────────────────────────

export interface SimulationDataSource {
  getDebyeResult(request: SimRequest): Promise<DebyeResult>;
}
