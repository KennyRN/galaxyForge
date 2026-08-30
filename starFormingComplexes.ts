/**
 * starFormingComplexes - the meso-scale star-forming-complex tier, patch
 * v2.3 S4/S5. Channel `complexField`, cell-scoped at `complexTier.cellSizePc`
 * (1200 pc by default) - a coarser, separate grid from `placement`'s own
 * 10 pc cells, so a complex-tier parameter change can never move an
 * already-placed system's fine position (Law 4, same isolation reasoning as
 * `remnantPlacement`/`conatalGroup`).
 *
 * REARCHITECTED 16 Aug 2026, ported from a sibling build (`galaxyforge`)
 * that has already solved the problem this module's own header used to
 * flag as an honest, interpretive gap. Previously this module was a
 * CONTINUOUS density-field multiplier, composed into `galaxyModel.ts`'s
 * `discTerm` - which meant complexes only ever ADDED expected density on
 * top of an already-complete smooth field, with no compensating
 * subtraction anywhere (a real double-counting bug, not a style choice).
 * This module is now a DISCRETE PLACEMENT-TIME mechanism, composed at
 * `sectorFootprint.assembleSector`'s level, exactly parallel to
 * `placement.ts`'s own Thomas process one level down:
 *
 *   complex centres (Poisson, intensity proportional to the arm-modulated
 *   young surface density) -> each centre spawns
 *   nGroups ~ Poisson(meanGroupsPerComplex) co-natal-style groups -> each
 *   group spawns nOffspring ~ Poisson(meanSystemsPerGroup - 1) members,
 *   jittered around the group centre.
 *
 * COUNT CONSERVATION - the correction the previous architecture lacked. `w`
 * (this population's `complexParticipation`) scales BOTH the complex-tier
 * intensity AND reduces the smooth background's youngThin density by
 * `(1 - w)` (done at the `sectorFootprint.ts` call site, via a wrapped
 * `GalaxyModel` whose `densityByPopulation` scales youngThin down before
 * `placement.rollCell` ever sees it - Law 1, no second copy of the smooth
 * field). The two partition the population's own total, they do not add.
 *
 * EXPANSION INVARIANCE - `placeYoungClustered` generates every complex-tier
 * cell within a `guardBandSigma`-wide guard band and clips afterwards; every
 * offspring is DRAWN then clipped, so the PRNG stream advances identically
 * regardless of which final footprint is requested (draw-then-clip, the
 * same discipline `placement.ts`'s own Thomas process and
 * `sectorFootprint.ts`'s exclusion pass already use).
 *
 * -- SOURCES --------------------------------------------------------------------
 * Efremov 1978, Sov. Astron. Lett. 4, 66 - ~35 Milky Way star complexes,
 * mean diameter ~600 pc -> sigmaComplexPc = 150 (+/-2 sigma spans 600 pc),
 * `sourced`. Efremov & Elmegreen 1998, MNRAS 299, 588 - size range
 * ~300-700 pc, corroborating. `meanGroupsPerComplex`, `complexFraction`,
 * the age-decay window and every grid/guard-band constant remain
 * `calibrated` narrative-scale tunables - the patch's own ledger, unchanged
 * by this rearchitecture.
 *
 * AGE-WEIGHT BUG FIX, carried over from the sibling build's own audit note
 * (their "AUDIT B2"): a population's complex-tier participation must be the
 * EXPECTATION of the age-decay weight over that population's own age
 * DISTRIBUTION (`expectationOverAgePdf`), not the weight evaluated at the
 * population's mean age. youngThin's `ageMeanGyr` (1.5 Gyr) sits well above
 * `ageDecayEndGyr` (0.5 Gyr) - evaluating at the mean would give a weight of
 * exactly ZERO, silently disabling the whole tier for the one population it
 * exists for. This module was never wired into a real generator before this
 * rearchitecture, so it never shipped that specific bug, but the correct
 * (expectation, not point-evaluation) form is adopted directly rather than
 * risk introducing it now.
 *
 * P17 (30 Aug 2026): `placeYoungClustered`'s two isotropic scatters (group
 * around complex, offspring around group) are now drawn from a per-complex
 * `nebulaMorphology.NebulaField` (isotropic Efremov envelope, fractal-
 * sculpted). Count conservation is untouched (`nGroups` still drawn before
 * any position, bit-identical to pre-P17; `nOff`/positions fork but stay
 * Poisson/uniform). Ionisation PHASE is a separate downstream concern owned
 * by `nebulaMorphology` and not wired into placement.
 *
 * genVersion: any constant or formula change here (or in `nebulaMorphology`)
 * is genVersion-bumping for every spiral/barredSpiral-generated youngThin
 * system.
 */

import { channelRng } from './rng';
import { LAMBDA_MAX, Phi, poissonInvCdf, truncGaussQuantile, smootherstep } from './mathStats';
import type { GalaxyParameters, ComplexTierParams } from './galaxyParameters';
import type { Population } from './galaxyModel';
import { nebulaFieldFor, type NebulaParams } from './nebulaMorphology';

/**
 * Per-star complex participation weight. Coherence survives ~100 Myr and
 * fades to near-Poisson by a few hundred Myr - 1 at age <= startGyr, 0 at
 * age >= endGyr, smootherstep between. `calibrated`, the patch's own
 * ageDecayStartGyr/ageDecayEndGyr, NOT sourced.
 */
export function complexAgeWeight(ageGyr: number, startGyr: number, endGyr: number): number {
  return 1 - smootherstep(startGyr, endGyr, ageGyr);
}

/**
 * Expectation of `f(age)` over a population's own truncated-Gaussian age
 * PDF - a quantile average (each of `samples` equal-probability slices
 * contributes equally). Deterministic, no PRNG - this is a property of the
 * population's DEFINITION, not a draw.
 */
export function expectationOverAgePdf(
  pop: Pick<Population, 'ageGyr' | 'ageMeanGyr' | 'ageSigmaGyr'>,
  f: (ageGyr: number) => number,
  samples = 64,
): number {
  const [lo, hi] = pop.ageGyr;
  if (!(hi > lo)) return f(pop.ageMeanGyr);
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const u = (i + 0.5) / samples;
    const age = truncGaussQuantile(u, pop.ageMeanGyr, pop.ageSigmaGyr, lo, hi);
    sum += f(age);
  }
  return sum / samples;
}

/**
 * Per-population complex participation weight - the EXPECTATION of
 * `complexAgeWeight` over the population's own age distribution, not the
 * weight at its mean age (see header - this is the correctness property
 * that matters here).
 */
export function complexAgeWeightForBin(
  pop: Pick<Population, 'ageGyr' | 'ageMeanGyr' | 'ageSigmaGyr'>,
  startGyr: number,
  endGyr: number,
): number {
  return expectationOverAgePdf(pop, (age) => complexAgeWeight(age, startGyr, endGyr));
}

/**
 * Complex-centre intensity, centres per pc^2. `derived`, not invented: if a
 * fraction `w` of a population's systems end up bound in complexes, and
 * each complex holds on average (groups per complex) x (systems per group)
 * systems, then lambda = w * youngSurfacePc2 / (meanGroupsPerComplex *
 * meanSystemsPerGroup).
 */
export function complexIntensityAt(
  youngSurfacePc2: number, w: number, meanGroupsPerComplex: number, meanSystemsPerGroup: number,
): number {
  if (!(w > 0) || !(meanGroupsPerComplex > 0) || !(meanSystemsPerGroup > 0)) return 0;
  return (w * youngSurfacePc2) / (meanGroupsPerComplex * meanSystemsPerGroup);
}

/**
 * Effective complex participation for a population, under this galaxy's own
 * pinned complex-tier block. Zero for a population with no clustering at
 * all; old/thick/halo land near zero via the age-decay weight even if they
 * were clustered, since they are far too old to still be in a complex's
 * coherence window; youngThin lands near its own `complexFraction` (0.6 by
 * default), scaled down by how much of its age DISTRIBUTION still falls
 * inside the decay window.
 */
export function complexParticipation(pop: Population, p: ComplexTierParams): number {
  if (pop.clusteredFraction === undefined || pop.clusteredFraction <= 0) return 0;
  const ageW = complexAgeWeightForBin(pop, p.ageDecayStartGyr, p.ageDecayEndGyr);
  return p.complexFraction * ageW;
}

export interface ComplexCell {
  readonly cellIx: number;
  readonly cellIy: number;
  readonly x0: number;
  readonly y0: number;
  readonly widthPc: number;
  readonly heightPc: number;
  /** Exact cell mean of `youngSurfaceAt` by sub-grid quadrature. */
  readonly meanYoungSurface: number;
}

/**
 * Exact mean of `youngSurfaceAt` over a square cell by sub-grid quadrature.
 * `cellMeanSubGridN` must resolve sigma_perp/4 at the narrowest arm radius
 * in the gate band - `galaxyParameters.conformance.ts`'s own gate 30 checks
 * this against `spiralArms.armWidthPc`.
 */
export function meanYoungSurfaceInCell(
  x0: number, y0: number, widthPc: number, heightPc: number,
  youngSurfaceAt: (x: number, y: number) => number, subGridN: number,
): number {
  const n = Math.max(1, Math.floor(subGridN));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) / n) * widthPc;
    for (let j = 0; j < n; j++) {
      const y = y0 + ((j + 0.5) / n) * heightPc;
      sum += youngSurfaceAt(x, y);
    }
  }
  return sum / (n * n);
}

/** Complex-tier cells overlapping a footprint, expanded by a guard band. */
export function complexCellsOverlapping(
  centreX: number, centreY: number, radiusPc: number, cellSizePc: number, guardPc: number,
  youngSurfaceAt: (x: number, y: number) => number, subGridN: number,
): ComplexCell[] {
  const reach = radiusPc + guardPc;
  const reach2 = reach * reach;
  const i0 = Math.floor((centreX - reach) / cellSizePc);
  const i1 = Math.floor((centreX + reach) / cellSizePc);
  const j0 = Math.floor((centreY - reach) / cellSizePc);
  const j1 = Math.floor((centreY + reach) / cellSizePc);
  const out: ComplexCell[] = [];
  for (let ix = i0; ix <= i1; ix++) {
    for (let iy = j0; iy <= j1; iy++) {
      const x0 = ix * cellSizePc, y0 = iy * cellSizePc;
      const nx = Math.min(Math.max(centreX, x0), x0 + cellSizePc);
      const ny = Math.min(Math.max(centreY, y0), y0 + cellSizePc);
      if ((nx - centreX) ** 2 + (ny - centreY) ** 2 > reach2) continue;
      out.push({
        cellIx: ix, cellIy: iy, x0, y0, widthPc: cellSizePc, heightPc: cellSizePc,
        meanYoungSurface: meanYoungSurfaceInCell(x0, y0, cellSizePc, cellSizePc, youngSurfaceAt, subGridN),
      });
    }
  }
  out.sort((a, b) => (a.cellIx - b.cellIx) || (a.cellIy - b.cellIy));
  return out;
}

export interface ComplexCentre {
  readonly x: number;
  readonly y: number;
  readonly sigmaPc: number;
}

function peakYoungSurface(cell: ComplexCell, youngSurfaceAt: (x: number, y: number) => number, n: number): number {
  let peak = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = cell.x0 + ((i + 0.5) / n) * cell.widthPc;
      const y = cell.y0 + ((j + 0.5) / n) * cell.heightPc;
      peak = Math.max(peak, youngSurfaceAt(x, y));
    }
  }
  return peak;
}

/**
 * Deterministic complex centres for one complex-tier cell. Thinned Poisson
 * with intensity proportional to the arm-modulated young surface density.
 * When the cell's expected count would exceed `LAMBDA_MAX`, the cell splits
 * into a fixed sub-tile grid (each under the ceiling) - sum-of-Poissons
 * equals Poisson(sum-of-lambdas), so parent-cell statistics are preserved.
 */
export function complexCentresInCell(
  cell: ComplexCell, worldSeed: string, w: number,
  youngSurfaceAt: (x: number, y: number) => number, p: ComplexTierParams,
  meanSystemsPerGroup: number, channelSuffix = '',
): ComplexCentre[] {
  if (!(w > 0)) return [];
  const areaPc2 = cell.widthPc * cell.heightPc;
  const meanN = areaPc2 * complexIntensityAt(cell.meanYoungSurface, w, p.meanGroupsPerComplex, meanSystemsPerGroup);
  if (!(meanN > 0)) return [];

  if (meanN >= LAMBDA_MAX) {
    const div = Math.max(2, Math.ceil(Math.sqrt(meanN / (LAMBDA_MAX * 0.25))));
    const dw = cell.widthPc / div, dh = cell.heightPc / div;
    const out: ComplexCentre[] = [];
    for (let i = 0; i < div; i++) {
      for (let j = 0; j < div; j++) {
        const x0 = cell.x0 + i * dw, y0 = cell.y0 + j * dh;
        const sub: ComplexCell = {
          cellIx: cell.cellIx, cellIy: cell.cellIy, x0, y0, widthPc: dw, heightPc: dh,
          meanYoungSurface: meanYoungSurfaceInCell(x0, y0, dw, dh, youngSurfaceAt, p.cellMeanSubGridN),
        };
        out.push(...complexCentresInCell(sub, worldSeed, w, youngSurfaceAt, p, meanSystemsPerGroup, `${channelSuffix}:${i}:${j}`));
      }
    }
    return out;
  }

  const rng = channelRng(worldSeed, 'complexField', cell.cellIx, cell.cellIy, channelSuffix);
  const n = poissonInvCdf(meanN, rng());
  const out: ComplexCentre[] = [];
  const peak = peakYoungSurface(cell, youngSurfaceAt, 8);
  for (let i = 0; i < n; i++) {
    let x = cell.x0, y = cell.y0;
    for (let attempt = 0; attempt < 200; attempt++) {
      const sx = cell.x0 + rng() * cell.widthPc;
      const sy = cell.y0 + rng() * cell.heightPc;
      const s = youngSurfaceAt(sx, sy);
      if (peak <= 0 || rng() * peak <= s) { x = sx; y = sy; break; }
    }
    out.push({ x, y, sigmaPc: p.sigmaComplexPc });
  }
  return out;
}

/** One system drawn by the complex-tier fill (pre-clip). */
export interface ComplexPlacedCandidate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly cellIx: number;
  readonly cellIy: number;
  readonly ordinal: number;
  readonly parentOrdinal?: number;
  readonly isOffspring: boolean;
}

/**
 * Count-conserving young clustered placement over a footprint. Generates
 * every complex-tier cell within a `guardBandSigma`-wide guard band and
 * clips afterwards; fill uses a per-centre PRNG stream so centres that
 * cannot reach the footprint may be skipped without advancing a shared
 * stream - expanding the region then fills newly-reachable centres under
 * stable keys, preserving expansion invariance. The smooth `(1 - w)`
 * remainder is NOT placed here - the caller (`sectorFootprint.
 * assembleSector`) scales the smooth youngThin density in the ordinary
 * cell-based path instead.
 *
 * -- P17: NEBULAR SCULPTING ----------------------------------------------
 * The group-around-complex and offspring-around-group scatters are NO LONGER
 * isotropic truncated Gaussians - they are drawn from a per-complex
 * `nebulaMorphology.NebulaField`, an isotropic Efremov-scale envelope
 * fractal-sculpted by the ISM fractal dimension D. Stars land in the
 * filaments and at the pillar tips. (Ionisation PHASE is a separate
 * downstream read of the co-natal age - it does not move stars; see
 * `nebulaMorphology.ts`'s own "structure is not phase" ruling.)
 *
 * COUNT CONSERVATION is untouched: `nGroups` is drawn from `rng()` BEFORE any
 * position draw, so it is bit-identical to the pre-P17 stream. `nOff` and
 * every position then fork (a shape break, Amendment P) - `nGroups`/`nOff`
 * are still Poisson deviates off a uniform, so the placed-count DISTRIBUTION
 * (hence its mean) is statistically unchanged.
 *
 * DRAW BUDGET / EXPANSION INVARIANCE: each `sampleGroupPos` /
 * `sampleOffspringPos` consumes EXACTLY `nebulaMorphology.SAMPLE_DRAWS`
 * `rng()` calls (a fixed accept/reject budget), on the same per-`ci`
 * `fill:{ci}` stream. A centre that cannot reach the footprint is still
 * skipped without advancing anything shared.
 *
 * The envelope proposals are still CLAMPED here to the guard band
 * (`+/- guardBandSigma * sigmaComplexPc` per axis for groups, `3 * jitter`
 * for offspring) - the same truncation the old `truncGaussQuantile` bounds
 * enforced, so the reach cull below stays exact.
 */
export function placeYoungClustered(
  worldSeed: string, centreX: number, centreY: number, centreZ: number,
  radiusPc: number, thicknessPc: number, w: number,
  youngSurfaceAt: (x: number, y: number) => number, p: ComplexTierParams,
  meanSystemsPerGroup: number, jitterSigmaPc: number,
  nebulaParams: NebulaParams,
): ComplexPlacedCandidate[] {
  if (!(w > 0)) return [];
  const guardPc = p.guardBandSigma * p.sigmaComplexPc;
  const cells = complexCellsOverlapping(centreX, centreY, radiusPc, p.cellSizePc, guardPc, youngSurfaceAt, p.cellMeanSubGridN);
  const placed: ComplexPlacedCandidate[] = [];
  const zLo = centreZ - thicknessPc / 2, zHi = centreZ + thicknessPc / 2;
  const complexHi = p.guardBandSigma * p.sigmaComplexPc;
  const offspringReachPc = 3 * Math.max(jitterSigmaPc, nebulaParams.offspringJitterSigmaPc);
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  // With both scatters clamped (groups to the guard band, offspring to
  // `offspringReachPc`), a centre farther than this cannot place a system
  // into the footprint - so the cull is exact and expansion-invariant.
  const reachPc = radiusPc + complexHi + offspringReachPc;
  const reach2 = reachPc * reachPc;

  for (const cell of cells) {
    const nearestX = Math.min(Math.max(centreX, cell.x0), cell.x0 + cell.widthPc);
    const nearestY = Math.min(Math.max(centreY, cell.y0), cell.y0 + cell.heightPc);
    if ((nearestX - centreX) ** 2 + (nearestY - centreY) ** 2 > reach2) continue;

    const centres = complexCentresInCell(cell, worldSeed, w, youngSurfaceAt, p, meanSystemsPerGroup);
    for (let ci = 0; ci < centres.length; ci++) {
      const cx = centres[ci]!;
      const dx = cx.x - centreX, dy = cx.y - centreY;
      if (dx * dx + dy * dy > reach2) continue;

      // One nebular field per complex - its fractal realisation seed rides
      // `CHANNELS.nebula`, isolated from this `complexField` stream. The
      // envelope scale is the complex's own extent (`cx.sigmaPc`, Efremov).
      const complexId = `${cell.cellIx}.${cell.cellIy}.${ci}`;
      const field = nebulaFieldFor(
        worldSeed, complexId, { x: cx.x, y: cx.y, z: centreZ }, cx.sigmaPc, nebulaParams,
      );

      const rng = channelRng(worldSeed, 'complexField', cell.cellIx, cell.cellIy, `fill:${ci}`);
      const nGroups = poissonInvCdf(p.meanGroupsPerComplex, rng());   // BEFORE any position draw - bit-identical to pre-P17
      for (let g = 0; g < nGroups; g++) {
        const gp = field.sampleGroupPos(rng);
        const gx = clamp(gp.x, cx.x - complexHi, cx.x + complexHi);
        const gy = clamp(gp.y, cx.y - complexHi, cx.y + complexHi);
        const gz = clamp(gp.z, zLo, zHi);
        const parentOrdinal = ci * 1024 + g;   // stable across region size - never a running counter
        placed.push({ x: gx, y: gy, z: gz, cellIx: cell.cellIx, cellIy: cell.cellIy, ordinal: parentOrdinal, isOffspring: false });

        const offspringLambda = Math.max(0, meanSystemsPerGroup - 1);
        const nOff = offspringLambda > 0 ? poissonInvCdf(offspringLambda, rng()) : 0;
        for (let k = 0; k < nOff; k++) {
          const op = field.sampleOffspringPos(rng, { x: gx, y: gy, z: gz });
          placed.push({
            x: clamp(op.x, gx - offspringReachPc, gx + offspringReachPc),
            y: clamp(op.y, gy - offspringReachPc, gy + offspringReachPc),
            z: clamp(op.z, zLo, zHi),
            cellIx: cell.cellIx, cellIy: cell.cellIy, ordinal: k, parentOrdinal, isOffspring: true,
          });
        }
      }
    }
  }
  return placed;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - same worldSeed/params/footprint gives a bit-identical result.
 *  2. complexAgeWeight is 1 at age 0, 0 at/after endGyr, monotonically
 *     non-increasing across the decay window.
 *  3. complexAgeWeightForBin uses the EXPECTATION over the population's own
 *     age distribution, not the weight at its mean - verified directly: a
 *     population whose mean age sits above the decay window but whose age
 *     RANGE dips below it still gets a strictly positive weight.
 *  4. complexParticipation is 0 for any unclustered population.
 *  5. COUNT CONSERVATION - complexIntensityAt(youngSurfacePc2, w, ...)
 *     integrated over a cell, times (meanGroupsPerComplex *
 *     meanSystemsPerGroup), reproduces w * youngSurfacePc2 * area to within
 *     quadrature tolerance - the complex layer's own expected system count
 *     matches what it claims to be drawing from the smooth field, not an
 *     arbitrary extra.
 *  6. EXPANSION INVARIANCE - a wider footprint's placeYoungClustered result
 *     is a strict superset of a narrower one's, for every already-included
 *     candidate (same position, same ordinal - no re-draw, no double-count).
 *  7. LAMBDA_MAX SPLITTING preserves the mean - a cell whose meanN exceeds
 *     LAMBDA_MAX, split into sub-tiles, has the same EXPECTED total centre
 *     count as the unsplit formula would give (checked via the sum of
 *     sub-tile means, not a single stochastic draw).
 *  8. P17 NEBULAR SCULPTING IS COUNT-CONSERVING - the nebula-field-sampled
 *     `placeYoungClustered` places the same MEAN young count per unit area
 *     (within statistical tolerance) as the pre-P17 isotropic version, and
 *     the field genuinely moved the stars (structured 3D positions, not an
 *     inert pass-through).
 */
export const STAR_FORMING_COMPLEXES_GATES = 8 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Star-forming complex', status: 'sourced',
    short: 'A patch of the disc ~600 pc across containing several open clusters, tracing the spiral pattern more loosely than any one cluster does.',
    long: 'sigmaComplexPc = 150 pc, from Efremov 1978\'s ~600 pc typical complex extent (+/-2 sigma spans the full diameter); Efremov & Elmegreen 1998\'s ~300-700 pc size range corroborates. A real, deterministic, seeded two-level Poisson hierarchy (complex centres -> groups -> members), ported 16 Aug 2026 from a sibling build - previously this module was a continuous density-field multiplier with no count-conservation guarantee.',
    source: 'Efremov 1978, Sov. Astron. Lett. 4, 66; Efremov & Elmegreen 1998, MNRAS 299, 588',
  },
  {
    term: 'Complex-tier count conservation', status: 'derived',
    short: 'A system is either in the smooth field or in a complex, never counted in both.',
    long: 'A population\'s complexParticipation fraction w scales BOTH the complex-tier intensity (this module) AND the smooth background\'s density (the caller reduces it by (1-w) before the ordinary Thomas-process path runs) - the two partition the population\'s own total rather than one adding on top of the other.',
  },
];
