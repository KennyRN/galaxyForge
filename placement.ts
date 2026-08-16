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
 * -- CLUSTERING, THE GENUINE TWO-LEVEL THOMAS PROCESS (16 Aug 2026) ---------------
 * `lambda = density * cellVolume` draws the PARENT count, one uniform
 * position per parent (population-weighted). If a parent's own population
 * has `clusteredFraction` set and a bernoulli roll (its own draw) succeeds,
 * that parent ALSO spawns offspring: `nOffspring ~ Poisson(max(0,
 * meanGroupSize - 1))` - a genuinely stochastic count, not
 * `Math.round(meanGroupSize)` forced members - each independently jittered
 * around the parent via `truncGaussQuantile` (sigma = 1.5 pc, truncated at 3
 * sigma - S4.8's own values, `tunable`/`derived` respectively). This is the
 * literal two-level construction (previously a per-cell approximation that
 * grouped consecutive draws into fixed-size clusters instead of drawing an
 * offspring count) - ported from a sibling build of this project
 * (`galaxyforge`) that already implements it this way. Consequence, stated
 * plainly: offspring are ADDITIONAL to the parent count, so a cell's total
 * system count is no longer bounded by `poissonInvCdf(lambda, ...)` alone
 * for populations with `clusteredFraction > 0` - `lambda` prices the
 * PARENTS, not the final census, which is the correct reading of "clustered
 * survivors" (S4.8's own framing: the field density already represents
 * where cluster CORES form; offspring are the excess population those cores
 * produce, not a redistribution of an already-fixed total).
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
  /** True for a Thomas-process offspring (jittered around `parentOrdinal`'s
   *  own position); omitted (not merely false) for a parent, so a JSON
   *  comparison between two parents doesn't need to agree on a value nobody
   *  cares about. */
  readonly isOffspring?: boolean;
  /** Set only when `isOffspring` is true - the ordinal of the parent this
   *  system was jittered around, within the SAME cell. */
  readonly parentOrdinal?: number;
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
 * model's density evaluated at the cell's own midpoint. The genuine
 * two-level Thomas process (see header, 16 Aug 2026): `lambda` draws the
 * PARENT count; each parent may additionally spawn a Poisson-distributed
 * offspring count if its population is clustered. Draw budget is therefore
 * variable per parent (a real property of a stochastic offspring count, not
 * a bug) - the only FIXED budget left is one Poisson draw for the parent
 * count, and per parent: population + 3 position draws, plus (for a
 * clustered population) one bernoulli + one offspring-count draw, plus 3
 * jitter draws per actual offspring. All on the `placement` channel; every
 * placed system (parent or offspring) additionally draws one
 * `formationRank` value on its OWN channel.
 */
export function rollCell(worldSeed: string, model: GalaxyModel, k: CellKey): PlacedSystem[] {
  const centre = cellCentrePc(k);
  const cellVolumePc3 = CELL_SIZE_PC ** 3;
  const densityByPop = densityByPopulationAtCartesian(model, centre.x, centre.y, centre.z);
  const totalDensity = Object.values(densityByPop).reduce((a, b) => a + (b ?? 0), 0);
  const lambda = Math.min(totalDensity * cellVolumePc3, LAMBDA_MAX - 1e-6);

  const placementRng = channelRng(worldSeed, 'placement', k.ix, k.iy, k.iz);
  const formationRankRng = channelRng(worldSeed, 'formationRank', k.ix, k.iy, k.iz);

  const nParents = poissonInvCdf(lambda, placementRng());
  const popKeys = Object.keys(densityByPop) as PopulationKey[];
  const weights = popKeys.map((pk) => densityByPop[pk] ?? 0);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const uniformInCell = (): { x: number; y: number; z: number } => {
    const ux = placementRng(), uy = placementRng(), uz = placementRng();
    return {
      x: k.ix * CELL_SIZE_PC + ux * CELL_SIZE_PC,
      y: k.iy * CELL_SIZE_PC + uy * CELL_SIZE_PC,
      z: k.iz * CELL_SIZE_PC + uz * CELL_SIZE_PC,
    };
  };

  const out: PlacedSystem[] = [];
  let ordinal = 0;

  for (let parentIdx = 0; parentIdx < nParents; parentIdx++) {
    const population = drawPopulation(placementRng, popKeys, weights, weightSum);
    const parentPos = uniformInCell();
    const parentOrdinal = ordinal++;
    out.push({
      cellKey: k, ordinal: parentOrdinal, sysid: sysidOf(k, parentOrdinal),
      positionPc: parentPos, population, formationRank: formationRankRng(),
    });

    const meta = findPopulationMeta(model, population);
    const clusteredFraction = meta?.clusteredFraction ?? 0;
    if (clusteredFraction <= 0 || placementRng() >= clusteredFraction) continue;

    const offspringLambda = Math.max(0, (meta?.meanGroupSize ?? 1) - 1);
    const nOffspring = offspringLambda > 0 ? poissonInvCdf(offspringLambda, placementRng()) : 0;
    const jitterLo = -JITTER_TRUNCATION_SIGMA * JITTER_SIGMA_PC, jitterHi = -jitterLo;

    for (let o = 0; o < nOffspring; o++) {
      const dx = truncGaussQuantile(placementRng(), 0, JITTER_SIGMA_PC, jitterLo, jitterHi);
      const dy = truncGaussQuantile(placementRng(), 0, JITTER_SIGMA_PC, jitterLo, jitterHi);
      const dz = truncGaussQuantile(placementRng(), 0, JITTER_SIGMA_PC, jitterLo, jitterHi);
      const childOrdinal = ordinal++;
      out.push({
        cellKey: k, ordinal: childOrdinal, sysid: sysidOf(k, childOrdinal),
        positionPc: { x: parentPos.x + dx, y: parentPos.y + dy, z: parentPos.z + dz },
        population, formationRank: formationRankRng(),
        isOffspring: true, parentOrdinal,
      });
    }
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
 * The generic "merge pass" this module owns - S7's OWNER RULING:
 * local-and-symmetric exclusion. A candidate is dropped iff some OTHER
 * candidate that sorts EARLIER by `key` lies within `exclusionRadiusPc` -
 * tested against the FULL candidate set, not a running "kept" set, so the
 * verdict for any one point depends only on its own neighbourhood. O(n^2)
 * here (a spatial hash is the named optimisation for large candidate sets;
 * correctness, not performance, is this pass's concern).
 *
 * Exported generic (16 Aug 2026) so `sectorFootprint.ts` can merge the
 * stellar and remnant layers together (stellar wins on a tie, via a key
 * that sorts earlier) WITHOUT a second copy of this algorithm - Law 1. This
 * module remains the single owner of "what the merge pass is"; the string
 * `key` a caller supplies is entirely THEIR ordering convention.
 */
export interface MergeCandidate {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
export function mergeLocalSymmetric<T extends MergeCandidate>(
  candidates: readonly T[], exclusionRadiusPc: number = EXCLUSION_RADIUS_PC,
): T[] {
  const sorted = [...candidates].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const r2 = exclusionRadiusPc * exclusionRadiusPc;
  const dropped = new Array(sorted.length).fill(false);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = sorted[i]!, b = sorted[j]!;
      const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (d2 < r2) { dropped[i] = true; break; }
    }
  }
  return sorted.filter((_, i) => !dropped[i]);
}

/** `PlacedSystem`-specific wrapper over `mergeLocalSymmetric` - unchanged
 *  behaviour, now expressed via the shared generic core. */
export function applyExclusion(candidates: readonly PlacedSystem[]): PlacedSystem[] {
  const sorted = [...candidates].sort(keyOrder);
  const tagged = sorted.map((s, i) => ({
    key: String(i).padStart(12, '0'), x: s.positionPc.x, y: s.positionPc.y, z: s.positionPc.z,
  }));
  const keptKeys = new Set(mergeLocalSymmetric(tagged, EXCLUSION_RADIUS_PC).map((k) => k.key));
  return sorted.filter((_, i) => keptKeys.has(String(i).padStart(12, '0')));
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

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Cell-based Thomas-process sampling', status: 'calibrated',
    short: 'How individual systems are scattered in space so they cluster realistically instead of forming an artificial grid.',
    long: 'The genuine two-level construction (16 Aug 2026, ported from a sibling build): a Poisson-distributed PARENT count per cell, each parent independently spawning a Poisson-distributed OFFSPRING count (mean = meanGroupSize - 1) if its population is clustered, every offspring jittered around its own parent. CELL_SIZE_PC / JITTER_SIGMA_PC parameterise the geometry - a standard spatial-statistics technique for clustered point processes, the specific pc-scale values here tunable to taste, not read from a stellar-clustering survey.',
    source: 'Thomas 1949 (clustered point process), as used broadly in spatial statistics',
  },
  {
    term: 'Local-and-symmetric exclusion', status: 'tunable',
    short: 'The minimum-separation rule preventing two placed systems from landing implausibly close together.',
    long: 'EXCLUSION_RADIUS_PC enforced symmetrically between every pair in a local neighbourhood (not a greedy first-come-first-served pass), so placement order never biases which system "wins" a contested spot.',
  },
];
