import type { CartesianPoint, DetectorModule } from '../../types';

import type { QRange } from '$lib/shared/contracts';

type RectPx = { x0: number; y0: number; x1: number; y1: number };

// Distance from point (cx,cy) to axis-aligned rectangle [x0,x1]×[y0,y1]
// (pixel coordinates); 0 if the point lies inside.
function distancePointToRectPx(cx: number, cy: number, rect: RectPx): number {
  const dx = Math.max(rect.x0 - cx, 0, cx - rect.x1);
  const dy = Math.max(rect.y0 - cy, 0, cy - rect.y1);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Min/max radius (in pixels) from the beam centre to the union of module
 * pixels. Min is 0 when the beam centre lies inside a module; max occurs at
 * one of the module corners.
 */
function radiusBoundsPx(
  modules: DetectorModule[],
  bc: CartesianPoint,
): { rMinPx: number; rMaxPx: number } {
  let rMinPx = Number.POSITIVE_INFINITY;
  let rMaxPx = 0;

  for (const m of modules) {
    if (!(m.shape.width > 0) || !(m.shape.height > 0)) {
      throw new Error(
        `Invalid module size: width/height must be > 0 (got ${m.shape.width}×${m.shape.height})`,
      );
    }

    const rect: RectPx = {
      x0: m.position.x,
      y0: m.position.y,
      x1: m.position.x + m.shape.width,
      y1: m.position.y + m.shape.height,
    };

    rMinPx = Math.min(rMinPx, distancePointToRectPx(bc.x, bc.y, rect));

    const corners: Array<[number, number]> = [
      [rect.x0, rect.y0],
      [rect.x1, rect.y0],
      [rect.x0, rect.y1],
      [rect.x1, rect.y1],
    ];
    for (const [cx, cy] of corners) {
      const r = Math.hypot(cx - bc.x, cy - bc.y);
      if (r > rMaxPx) rMaxPx = r;
    }
  }

  if (!Number.isFinite(rMinPx)) rMinPx = 0;

  return { rMinPx, rMaxPx };
}

/**
 * Compute q-range and a reasonable q-step from detector geometry by using
 * min/max radii (in pixels) from beam centre to the union of module pixels.
 *
 * Geometry assumption: flat detector perpendicular to the beam;
 * tan(2θ) = r / D, θ = 0.5 * atan(r/D), q = (4π/λ) * sin(θ)
 */
export function computeQRangeFromModules(params: {
  distance: number;
  pixelSize: number;
  beamCenter: CartesianPoint;
  wavelength: number;
  modules: DetectorModule[];
}): QRange & { rMinPx: number; rMaxPx: number } {
  const {
    distance: Dmm,
    pixelSize,
    beamCenter: bc,
    wavelength: lambdaA,
    modules,
  } = params;

  if (!(Dmm > 0)) throw new Error('sampleDetectorDistanceMm must be > 0');
  if (!(pixelSize > 0)) throw new Error('pixelSizeMm must be > 0');
  if (!(lambdaA > 0)) throw new Error('wavelengthAngstrom must be > 0');
  if (!modules?.length) throw new Error('modules must be a non-empty list');

  const qFromRadiusPx = (rPx: number): number => {
    const rMm = rPx * pixelSize;
    const theta = 0.5 * Math.atan(rMm / Dmm);
    return ((4 * Math.PI) / lambdaA) * Math.sin(theta);
  };

  const { rMinPx, rMaxPx } = radiusBoundsPx(modules, bc);

  const min = qFromRadiusPx(rMinPx);
  const max = qFromRadiusPx(rMaxPx);

  // Suggested q step: q increment corresponding to ~1 pixel at the largest
  // radius (conservative: smallest dq tends to be at larger radii here).
  let step = qFromRadiusPx(rMaxPx) - qFromRadiusPx(Math.max(0, rMaxPx - 1));

  // Fallbacks / sanity
  if (!(step > 0) || !Number.isFinite(step)) {
    // If rMaxPx < 1 or something degenerate, pick a small fraction of range
    step = (max - min) / 1000;
  }
  if (!(step > 0)) step = 1e-4;

  return { min, max, step, rMinPx, rMaxPx };
}
