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
  MutationResult,
  SimRequest,
  SolventIQ,
  SolventInfo,
  UploadMoleculeResult,
} from '$lib/shared/contracts';

// ─── Molecule types ─────────────────────────────────────────────────────────

export interface UploadMoleculeInput {
  moleculeName: string;
  description: string;
  reference: string | null;
  structures: { state: number; atomCount: number; file: File }[];
}

export interface EditMoleculeFileInput {
  id: string;
  filename: string;
  description: string;
  state: number;
  reference: string | null;
}

/**
 * Header fields shared by all structure files of a molecule. Atom count is
 * per-file derived data (see `extractAtomCount` in db-source.ts), not a
 * header field, so it's not editable here.
 */
export interface EditMoleculeInput {
  originalName: string;
  moleculeName: string;
}

export interface EditMoleculeFileContentsInput {
  id: string;
  contents: string;
}

export interface ReplaceMoleculeFileInput {
  id: string;
  file: File;
}

export interface MoleculeDataSource {
  listMolecules(): Promise<MoleculeInfo[]>;
  getMoleculeFileContent(id: string): Promise<MoleculeFileContent>;
  uploadMolecule(input: UploadMoleculeInput): Promise<UploadMoleculeResult>;
  editMoleculeFile(input: EditMoleculeFileInput): Promise<MutationResult>;
  editMolecule(input: EditMoleculeInput): Promise<MutationResult>;
  deleteMoleculeFile(id: string): Promise<MutationResult>;
  deleteMolecule(originalName: string): Promise<MutationResult>;
  editMoleculeFileContents(
    input: EditMoleculeFileContentsInput,
  ): Promise<MutationResult>;
  replaceMoleculeFile(input: ReplaceMoleculeFileInput): Promise<MutationResult>;
}

// ─── Solvent types ──────────────────────────────────────────────────────────

export interface SolventDataSource {
  listSolvents(): Promise<SolventInfo[]>;
  getSolventIQ(id: string): Promise<SolventIQ>;
}

// ─── Simulation types ───────────────────────────────────────────────────────

export interface SimulationDataSource {
  /** Read the shared Debye cache. `null` on a miss — the client computes. */
  getDebyeResult(request: SimRequest): Promise<DebyeResult | null>;
  /** Persist a client-computed result into the shared cache. */
  cacheDebyeResult(request: SimRequest, result: DebyeResult): Promise<void>;
}
