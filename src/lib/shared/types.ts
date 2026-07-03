/** A numeric interval with the invariant `min <= max`. */
export interface Range {
  min: number;
  max: number;
}

export type RealismFlags = {
  applyGeometryMask: boolean;
  applyBadPixelMask: boolean;
  applyNoise: boolean;
  solidAngleCorrection: boolean;
  polarizationCorrection: boolean;
  detectorEfficiencyCorrection: boolean;
  backgroundSubtraction: boolean;
};
