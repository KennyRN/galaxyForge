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
