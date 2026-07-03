import type {
  FileNoContent,
  QRange,
  SolventFile,
  StructureFile,
} from './shared/contracts.ts';

export type { FileNoContent, QRange, SolventFile, StructureFile };

export * from './detector/types.ts';
export * from './molecule/types.ts';
export * from './probe/types.ts';
export * from './pump/types.ts';
export * from './sample/types.ts';
export * from './server/types.ts';

export type RealismFlags = {
  applyGeometryMask: boolean;
  applyBadPixelMask: boolean;
  applyNoise: boolean;
  solidAngleCorrection: boolean;
  polarizationCorrection: boolean;
  detectorEfficiencyCorrection: boolean;
  backgroundSubtraction: boolean;
};

/** A numeric interval with the invariant `min <= max`. */
export interface Range {
  min: number;
  max: number;
}
