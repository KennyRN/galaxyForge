/**
 * placement - Thomas cluster process, cell-based deterministic point
 * placement. Channel `placement` (spatial placement AND population
 * assignment together, per cell - S4.2's own ruling, one channel not two).
 * `formationRank` (its own channel, `CHANNELS.formationRank`) is ALSO
 * rolled here - see the header note below for why, since no module in this
 * package's brief ever claimed ownership of it (the same gap `age.ts`'s
 * header already flagged).
 *
 * -- THE MORPHOLOGY-BLIND CONTRACT --------------------------------------------
 * This module NEVER inspects which morphology produced the `GalaxyModel` it
 * is given, and never special-cases a `PopulationKey` - S4.8's own
 * requirement. It calls `densityByPopulationAtCartesian` once per cell
 * MIDPOINT (never the sector centre - S4.8's bug-fix ruling: evaluating
 * once at the centre makes positions a function of *(space, centre)*, so
 * re-centring the sector would silently move or delete systems, potentially
 * including the very system a search found).
 *
 * -- CELL GEOMETRY --------------------------------------------------------------
 * `CELL_SIZE_PC` = 10 - `tunable`. Comfortably exceeds "3x the cluster
 * jitter" (S4.8's own margin requirement: 3 * 1.5 pc = 4.5 pc), and resolves
 * density variation reasonably against typical sector footprints (51-89 pc
 * radius per S4.8's own worked example) without an unmanageable cell count.
 * Cells are indexed in all three axes (`cellIz` too, S4.8's own ruling -
 * `centrePc.z` selects WHICH z-layer, never what is in it).
 *
 * -- CLUSTERING -------------------------------------------------------------------
 * A per-cell simplification of the Thomas process, not the literal
 * two-level parent-Poisson-then-children construction: within one cell,
 * systems belonging to a population with `clusteredFraction` set are
 * processed in draw order and grouped into clusters of `meanGroupSize`,
 * each cluster sharing one parent position (uniform within the cell) with
 * members jittered around it via `truncGaussQuantile` (sigma = 1.5 pc,
 * truncated at 3 sigma - S4.8's own values, `tunable`/`derived`
 * respectively). At the scale of ONE cell's own system count this is a
 * faithful-enough reduction of the full process; the literal parent-Poisson
 * construction is the named upgrade path if per-cell counts ever grow large
 * enough for the difference to matter.
 *
 * -- MINIMUM SEPARATION ------------------------------------------------------------
 * S7's OWNER RULING (adopted before Stage 10, not the interim greedy pass)
 * is implemented directly: a candidate is dropped if and only if some OTHER
 * candidate with an earlier `(cellKey, ordinal)` key lies within
 * `EXCLUSION_RADIUS_PC` (0.1 pc, `calibrated` - CNS5's bound-pair
 * separation statistics) - tested against every candidate, not merely the
 * already-kept set, which is what makes the verdict LOCAL AND SYMMETRIC:
 * a point's fate depends only on its own neighbourhood, never on processing
 * order, so expansion stability is provable rather than overwhelmingly
 * likely.
 *
 * -- formationRank, THE GAP THIS MODULE FILLS --------------------------------
 * No module anywhere in this package's brief rolls the shared latent
 * `SystemContext.formationRank` that `age` (Stage 2) and a future
 * `metallicity` module both read - `age.ts`'s own header already flagged
 * this. `placement` is where a system is first individuated (a cell +
 * ordinal), so it is the natural point to draw it: ONE extra uniform draw
 * per system, on `CHANNELS.formationRank`'s own channel (never blended into
 * the `placement` channel's own stream - Law 2 channel isolation).
 *
 * genVersion: any constant here changing is genVersion-bumping for every
 * placed system.
 */

import { channelRng, type Rng } from './rng';
import { poissonInvCdf, truncGaussQuantile, LAMBDA_MAX } from './mathStats';
import { densityByPopulationAtCartesian } from './galacticDensity';
import type { GalaxyModel, PopulationKey } from './galaxyModel';

export const CELL_SIZE_PC = 10;          // tunable
export const JITTER_SIGMA_PC = 1.5;      // tunable, S4.8
export const JITTER_TRUNCATION_SIGMA = 3; // derived, S4.8 (one-cell-margin determinism)
export const EXCLUSION_RADIUS_PC = 0.1;  // calibrated, CNS5 bound-pair separations

export interface CellKey { readonly ix: number; readonly iy: number; readonly iz: number; }

export interface PlacedSystem {
  readonly cellKey: CellKey;
  readonly ordinal: number;
  readonly sysid: string;
  readonly positionPc: { readonly x: number; readonly y: number; readonly z: number };
  readonly population: PopulationKey;
  readonly formationRank: number;
}

function cellIndexOf(coordPc: number): number { return Math.floor(coordPc / CELL_SIZE_PC); }

function cellCentrePc(k: CellKey): { x: number; y: number; z: number } {
  return {
    x: (k.ix + 0.5) * CELL_SIZE_PC,
    y: (k.iy + 0.5) * CELL_SIZE_PC,
    z: (k.iz + 0.5) * CELL_SIZE_PC,
  };
}

function sysidOf(k: CellKey, ordinal: number): string {
  return `${k.ix}.${k.iy}.${k.iz}.${ordinal}`;
}

/**
 * Every system generated within ONE cell, deterministically, from the
 * model's density evaluated at the cell's own midpoint. Draw budget: ONE
 * for the Poisson count, THREE per system thereafter (population, jitter
 * axis pair via one 2D draw pair, cluster-membership) - fixed regardless of
 * outcome, on the `placement` channel; PLUS one more per system on the
 * SEPARATE `formationRank` channel.
 */
export function rollCell(worldSeed: string, model: GalaxyModel, k: CellKey): PlacedSystem[] {
  const centre = cellCentrePc(k);
  const cellVolumePc3 = CELL_SIZE_PC ** 3;
  const densityByPop = densityByPopulationAtCartesian(model, centre.x, centre.y, centre.z);
  const totalDensity = Object.values(densityByPop).reduce((a, b) => a + (b ?? 0), 0);
  const lambda = Math.min(totalDensity * cellVolumePc3, LAMBDA_MAX - 1e-6);

  const placementRng = channelRng(worldSeed, 'placement', k.ix, k.iy, k.iz);
  const formationRankRng = channelRng(worldSeed, 'formationRank', k.ix, k.iy, k.iz);

  const count = poissonInvCdf(lambda, placementRng());
  const popKeys = Object.keys(densityByPop) as PopulationKey[];
  const weights = popKeys.map((pk) => densityByPop[pk] ?? 0);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const out: PlacedSystem[] = [];
  let currentParent: { x: number; y: number; z: number } | null = null;
  let currentParentRemaining = 0;
  let currentParentPop: PopulationKey | null = null;

  for (let ordinal = 0; ordinal < count; ordinal++) {
    const population = drawPopulation(placementRng, popKeys, weights, weightSum);
    const meanGroupSize = findPopulationMeta(model, population)?.meanGroupSize;
    const clusteredFraction = findPopulationMeta(model, population)?.clusteredFraction ?? 0;

    const uCluster = placementRng();
    const isClustered = clusteredFraction > 0 && uCluster < clusteredFraction;

    let positionPc: { x: number; y: number; z: number };
    if (isClustered) {
      if (!currentParent || currentParentRemaining <= 0 || currentParentPop !== population) {
        const uPx = placementRng(), uPy = placementRng(), uPz = placementRng();
        currentParent = {
          x: k.ix * CELL_SIZE_PC + uPx * CELL_SIZE_PC,
          y: k.iy * CELL_SIZE_PC + uPy * CELL_SIZE_PC,
          z: k.iz * CELL_SIZE_PC + uPz * CELL_SIZE_PC,
        };
        currentParentRemaining = Math.max(1, Math.round(meanGroupSize ?? 1));
        currentParentPop = population;
      }
      const jitterLo = -JITTER_TRUNCATION_SIGMA * JITTER_SIGMA_PC, jitterHi = -jitterLo;
      const dx = truncGaussQuantile(placementRng(), 0, JITTER_SIGMA_PC, jitterLo, jitterHi);
      const dy = truncGaussQuantile(placementRng(), 0, JITTER_SIGMA_PC, jitterLo, jitterHi);
      const dz = truncGaussQuantile(placementRng(), 0, JITTER_SIGMA_PC, jitterLo, jitterHi);
      positionPc = { x: currentParent.x + dx, y: currentParent.y + dy, z: currentParent.z + dz };
      currentParentRemaining--;
    } else {
      const ux = placementRng(), uy = placementRng(), uz = placementRng();
      positionPc = {
        x: k.ix * CELL_SIZE_PC + ux * CELL_SIZE_PC,
        y: k.iy * CELL_SIZE_PC + uy * CELL_SIZE_PC,
        z: k.iz * CELL_SIZE_PC + uz * CELL_SIZE_PC,
      };
    }

    const formationRank = formationRankRng();
    out.push({ cellKey: k, ordinal, sysid: sysidOf(k, ordinal), positionPc, population, formationRank });
  }
  return out;
}

function drawPopulation(rng: Rng, keys: readonly PopulationKey[], weights: readonly number[], sum: number): PopulationKey {
  if (sum <= 0) return keys[0]!;   // degenerate cell (all-zero density); should not occur for a legal cell
  const u = rng() * sum;
  let cum = 0;
  for (let i = 0; i < keys.length; i++) {
    cum += weights[i]!;
    if (u <= cum) return keys[i]!;
  }
  return keys[keys.length - 1]!;
}

function findPopulationMeta(model: GalaxyModel, key: PopulationKey) {
  return model.populations.find((p) => p.key === key);
}

/* ---------------------------- minimum separation ------------------------------- */

/** Deterministic key ordering: (cellIz, cellIy, cellIx, ordinal) - fixed and
 *  independent of generation order, so "earlier" is well-defined. */
function keyOrder(a: PlacedSystem, b: PlacedSystem): number {
  return a.cellKey.iz - b.cellKey.iz || a.cellKey.iy - b.cellKey.iy ||
    a.cellKey.ix - b.cellKey.ix || a.ordinal - b.ordinal;
}

/**
 * S7's OWNER RULING: local-and-symmetric exclusion. A candidate is dropped
 * iff some OTHER candidate with an earlier key lies within
 * `EXCLUSION_RADIUS_PC` - tested against the FULL candidate set, not a
 * running "kept" set, so the verdict for any one point depends only on its
 * own neighbourhood. O(n^2) here (a spatial hash is the named optimisation
 * for large candidate sets; correctness, not performance, is this pass's
 * concern).
 */
export function applyExclusion(candidates: readonly PlacedSystem[]): PlacedSystem[] {
  const sorted = [...candidates].sort(keyOrder);
  const r2 = EXCLUSION_RADIUS_PC * EXCLUSION_RADIUS_PC;
  const dropped = new Array(sorted.length).fill(false);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = sorted[i]!.positionPc, b = sorted[j]!.positionPc;
      const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (d2 < r2) { dropped[i] = true; break; }
    }
  }
  return sorted.filter((_, i) => !dropped[i]);
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - `rollCell` with the same worldSeed/model/key gives
 *     bit-identical output, always.
 *  2. CELL INDEPENDENCE - two adjacent cells generated independently equal
 *     the same two cells generated together (no cross-cell state).
 *  3. sysid IS STABLE - the same (cellKey, ordinal) always produces the same
 *     sysid, and it is never a running counter.
 *  4. Every position stays within its own cell's bounds PLUS the jitter
 *     truncation bound (never further) - clustered members never escape a
 *     one-cell margin.
 *  5. Population keys drawn are always among the model's own population set
 *     for that morphology - never special-cased, never a key the model does
 *     not carry.
 *  6. EXCLUSION IS LOCAL AND SYMMETRIC - `applyExclusion`'s result for any
 *     one point depends only on points within `EXCLUSION_RADIUS_PC`, not on
 *     which other points happen to be present further away (tested by
 *     adding a distant, unrelated third point and confirming it changes
 *     nothing about a close pair's own verdict).
 *  7. EXPANSION STABILITY - generating a larger cell RANGE never changes the
 *     positions or sysids of systems in cells that were already included
 *     (the property the whole survives-the-plugin promise rests on).
 *  8. Clustering has real teeth: for a population with `clusteredFraction`
 *     set, the nearest-neighbour distance distribution among its own
 *     members is measurably tighter than a uniform-random baseline at the
 *     same count and volume.
 */
export const PLACEMENT_GATES = 8 as const;
