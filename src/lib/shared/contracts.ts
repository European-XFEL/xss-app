/**
 * Shared client/server contracts.
 *
 * The single sanctioned crossing point for types that flow between the
 * browser and the server: request/response DTOs used by the `*.remote.ts`
 * functions and `$lib/server/data`, plus the type-only surface derived from
 * the generated gRPC protos. Nothing outside `$lib/server` should import
 * from `$lib/server` directly, even for types — import from here instead.
 */
import type * as protoFiles from '$lib/server/grpc/gen/files_pb';
import type * as protoSim from '$lib/server/grpc/gen/simulation_pb';

// ─── Molecule ───────────────────────────────────────────────────────────────

export interface MoleculeInfo {
  id: string;
  filename: string;
  sha: string;
  moleculeName: string;
  description: string;
  state: number;
  reference: string | null;
  atomCount: number;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface MoleculeFileContent {
  contents: string;
}

export type UploadMoleculeResult =
  | { success: true; result: MoleculeInfo; error?: undefined }
  | { success: false; result: null; error: string };

/**
 * Upload limits enforced on both sides: client-side for a friendly error,
 * server-side as the authoritative check. The Debye computation is
 * O(N² × |Q|), so an unbounded atom count can pin the backend.
 */
export const MAX_UPLOAD_ATOM_COUNT = 1000;
export const MAX_UPLOAD_FILE_BYTES = 1024 * 1024; // 1 MiB

// ─── Solvent ────────────────────────────────────────────────────────────────

export interface SolventInfo {
  id: string;
  name: string;
  rhom: number;
  cpm: number;
  filename: string;
  sha: string;
  createdAt: Date;
  updatedAt: Date | undefined;
  qMin: number;
  qMax: number;
  qStep: number;
}

export interface SolventIQ {
  q: number[];
  dSdT: number[];
}

// ─── Simulation ─────────────────────────────────────────────────────────────

// `simulationSchema` in $lib/shared/api/validation is pinned to this shape
// with a `satisfies` check, so the two cannot silently drift.
export interface SimRequest {
  fileId: string;
  qRange: {
    min: number;
    max: number;
    step: number;
  };
}

export interface DebyeResult {
  q: number[];
  i: number[];
}

// ─── Feedback ───────────────────────────────────────────────────────────────

// `feedbackSchema` in $lib/shared/api/validation is pinned to this shape
// with a `satisfies` check, so the two cannot silently drift.
export interface FeedbackInput {
  url: string;
  comment?: string;
  categories: string[];
  region?: string;
  regionImage?: string;
}

export interface FeedbackResult {
  id: string;
}

// ─── Proto-derived types ────────────────────────────────────────────────────

export type FileNoContent = Omit<protoFiles.File, 'contents' | '$typeName'>;

export type StructureFile = Omit<FileNoContent, 'type'>;

export type SolventFile = Omit<FileNoContent, 'type'>;

export type QRange = Omit<protoSim.QRange, '$typeName'>;

export type Pump = Omit<protoSim.Pump, '$typeName'>;
