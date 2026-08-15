/**
 * galacticDensity - PARTIAL FILE. STAGE-0 DECLARATIONS ONLY.
 *
 * This is NOT the finished module. It contains only the two declarations that
 * `types.ts` imports, so the tree compiles at stage 0. Everything else this
 * module owes - the Upsilon derivation (0.11, per-population via upsilonFor),
 * the Reyle re-anchor (0.1), the per-cell density evaluation (8.3), the lambda
 * guard and K_MAX (8.4), the merge pass (8.5), the halo/bar fix (0.9) - is
 * built at its own stage. ADD to this file; do not treat it as complete.
 *
 * R15: `SectorCentreCriteria` is DECLARED HERE, beside the search it
 * documents (8.9a), and re-exported through `types.ts`.
 */

import type { HabTier } from './humanHabitability';

/**
 * A PREFERENCE, not a physical requirement. The pipeline models circumbinary
 * habitable planets deliberately, so the UI reads as taste (8.9a).
 * `solo` is listed first and is the default.
 */
export type MultiplicityPreference = 'solo' | 'binary' | 'any';

/**
 * Why the sector centre is where it is - PROVENANCE, NOT GENERATION INPUT.
 *
 * Once the search resolves and `centrePc` is written, these have done their
 * work: regenerating from that stored centre yields the identical sector
 * regardless of what found it. They therefore live in `SectorRecipe` but
 * OUTSIDE `galaxyConfigHash`, so a user may revise their criteria later
 * without invalidating a single note (8.9a, and the hash test in 0.7).
 */
export interface SectorCentreCriteria {
  multiplicity: MultiplicityPreference;

  /** Minimum acceptable tier, or null for "no habitability requirement".
   *
   *  TYPED FROM THE `humanHabitability` TAXONOMY, NEVER A PARALLEL LIST. This
   *  is the Law 2 seam the project already fought over once: a new tier must
   *  appear in the dropdown automatically, and `assertNever` must catch any
   *  unhandled case at compile time (8.9a). Do not reopen it. */
  minHabTier: HabTier | null;

  /** The point the USER actually pointed at, before the search moved the
   *  centre onto a qualifying system.
   *
   *  Without this the sheet cannot explain the displacement at all, because
   *  `SectorRecipe.centrePc` has been overwritten with the found system's
   *  position. "148 pc from your chosen point" is the thing the user needs to
   *  know, and "a match 400 pc out is a different region of the galaxy and
   *  must not be accepted silently" (8.9a). Distance is deliberately not
   *  stored: it is derived at display from this and `centrePc`, as true 3D
   *  from stored coordinates (8.9, Law 2). */
  requestedCentrePc: { x: number; y: number; z: number };
}

/* ============================================================================
 * REAL IMPLEMENTATION, continued past Stage 0's declarations-only content:
 * Upsilon (S4.3), the polar<->Cartesian transform (S4.8: "belongs to
 * galacticDensity... it already computes R = hypot(x,y) internally"), and
 * the per-cell density evaluation entry point placement (S4.8) calls.
 *
 * NOT built here: the full interactive sector-centring SEARCH (S4.8's
 * cheapest-first multiplicity/class/planets/habitability walk). That
 * requires a "generate one candidate system end to end" entry point this
 * package does not yet have wired together as a single conductor function -
 * every science module up to Stage 9 exists, but nothing yet composes them
 * into one call. Flagged here rather than faked with a stub that only
 * checks one criterion. `resolvePolarToCartesian`/`cartesianToPolar` are the
 * geometric primitive that search will need; it is not the search itself.
 * ==========================================================================*/

import { kroupaImfDensity } from './stellarPopulation';
import { msLifetimeGyr } from './stellarProperties';
import { MEAN_STARS_PER_SYSTEM } from './multiplicity';
import type { Population, GalaxyModel, DensityByPopulation } from './galaxyModel';

/* --------------------------------- Upsilon ------------------------------------ */

const IMF_MIN_MSUN = 0.08, IMF_MAX_MSUN = 100;   // sourced, Kroupa 2001's own truncation

function integrate(f: (m: number) => number, lo: number, hi: number, steps = 2000): number {
  if (hi <= lo) return 0;
  const logLo = Math.log(lo), logHi = Math.log(hi);
  const h = (logHi - logLo) / steps;
  let acc = 0;
  for (let i = 0; i < steps; i++) {
    const m0 = Math.exp(logLo + i * h), m1 = Math.exp(logLo + (i + 1) * h);
    const mMid = Math.sqrt(m0 * m1);
    acc += f(mMid) * (m1 - m0);
  }
  return acc;
}

/** Turnover mass: the mass whose main-sequence lifetime equals `ageGyr` at
 *  `fehDex` - by bisection, since `msLifetimeGyr` has no closed-form
 *  inverse. Monotonically decreasing in mass, so the root is unique. */
function turnoffMassSol(ageGyr: number, fehDex: number): number {
  if (ageGyr <= 0) return IMF_MAX_MSUN;
  let lo = IMF_MIN_MSUN, hi = IMF_MAX_MSUN;
  if (msLifetimeGyr(hi, fehDex) > ageGyr) return hi;   // even the most massive IMF star hasn't died yet
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (msLifetimeGyr(mid, fehDex) > ageGyr) lo = mid; else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/**
 * Systems per solar mass OF LIVING STARS (S4.3's own definition), composed
 * from the Kroupa IMF, `msLifetimeGyr` and `MEAN_STARS_PER_SYSTEM` -
 * `derived`, never a constant typed into a morphology.
 *
 * Upsilon = 1 / (meanLivingStarMassSol * MEAN_STARS_PER_SYSTEM), where
 * meanLivingStarMassSol is the IMF-weighted mean mass among stars STILL
 * ALIVE at this population's age (mass below the turnoff) - the algebra
 * collapses to this because both "living stars per unit formed mass" and
 * "living mass per unit formed mass" share the same formed-mass
 * denominator, which cancels. See the header for why no separate
 * living-mass-fraction correction is needed on top of this.
 */
export function upsilonFor(pop: Population): number {
  const turnoff = Math.min(turnoffMassSol(pop.ageMeanGyr, pop.fehMeanDex), IMF_MAX_MSUN);
  const numberOfLiving = integrate(kroupaImfDensity, IMF_MIN_MSUN, turnoff);
  const massOfLiving = integrate((m) => m * kroupaImfDensity(m), IMF_MIN_MSUN, turnoff);
  const meanLivingStarMassSol = massOfLiving / numberOfLiving;
  return 1 / (meanLivingStarMassSol * MEAN_STARS_PER_SYSTEM);
}

/* ------------------------------ coordinate transform --------------------------- */

/**
 * Owns the polar<->Cartesian transform (S4.8's own ruling: "galacticDensity
 * already computes R = hypot(x, y) internally, so it owns the inverse").
 * `theta` is galactocentric azimuth, radians - S4.2's own convention (zero
 * at the Sun's azimuth, increasing with galactic rotation).
 */
export function cartesianToPolar(x: number, y: number, z: number): { R: number; theta: number; z: number } {
  return { R: Math.hypot(x, y), theta: Math.atan2(y, x), z };
}

export function polarToCartesian(R: number, theta: number, z: number): { x: number; y: number; z: number } {
  return { x: R * Math.cos(theta), y: R * Math.sin(theta), z };
}

/* ---------------------------- per-cell density evaluation ---------------------- */

/**
 * Evaluates a `GalaxyModel` at a Cartesian point - the entry point
 * `placement` calls once per cell MIDPOINT (S4.8's "evaluate at the cell's
 * own centre" ruling; never at the sector centre - see `placement.ts`'s own
 * header for why that distinction is load-bearing).
 */
export function densityAtCartesian(model: GalaxyModel, x: number, y: number, z: number): number {
  const { R, theta } = cartesianToPolar(x, y, z);
  return model.densityAt(R, theta, z);
}

export function densityByPopulationAtCartesian(model: GalaxyModel, x: number, y: number, z: number): DensityByPopulation {
  const { R, theta } = cartesianToPolar(x, y, z);
  return model.densityByPopulation(R, theta, z);
}
