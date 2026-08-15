/**
 * humanHabitability - HabTier and support level. SOLE OWNER of the term
 * "human-habitable" in this project (S9 ruling) - `habitability` stays
 * purely geometric and never answers this question. No PRNG channel:
 * human-habitability is a deterministic consequence of physical state, not
 * a random draw.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * No external source: this is an authored GRADING SCALE over physical
 * quantities other modules already compute (temperature, pressure,
 * gravity), not a measurement. Every threshold is `tunable`. The tier
 * taxonomy itself is the thing S4.8's sector-centring habitability dropdown
 * must be GENERATED FROM, never a parallel hand-written list - satisfied
 * structurally here by `HAB_TIER_LABELS` being the one place a tier's
 * display name is written down.
 *
 * genVersion: a threshold changing here is genVersion-bumping (it changes
 * which stored tier a planet carries).
 */

import type { PressureClass } from './types';

/** 0 = uninhabitable even with full life support, 4 = shirt-sleeves Earth
 *  -like. Numeric union, not a string enum: `stage0.conformance.ts`'s own
 *  seam stub already compiles against `0|1|2|3|4` (S3.0's documented
 *  "stub seam" - this is that seam landing for real, not a coincidence). */
export type HabTier = 0 | 1 | 2 | 3 | 4;
export type SupportLevel = 'none' | 'shelter' | 'unassisted';

/** The ONE place a tier's display name is written - S4.8's dropdown reads
 *  this, never a parallel list. */
export const HAB_TIER_LABELS: Readonly<Record<HabTier, string>> = {
  0: 'Uninhabitable',
  1: 'Hostile (full life support required)',
  2: 'Marginal (sealed habitat required)',
  3: 'Tolerable (shelter and assistance required)',
  4: 'Earth-like (unassisted)',
};

export interface HumanHabitabilityResult {
  readonly tier: HabTier;
  readonly liveable: boolean;
  readonly support: SupportLevel;
  readonly gravityG: number;
  readonly blockers: string[];
  readonly notes: string[];
}

const TEMP_TOLERABLE_LO_K = 255, TEMP_TOLERABLE_HI_K = 320;   // tunable
const GRAVITY_TOLERABLE_LO = 0.3, GRAVITY_TOLERABLE_HI = 1.8;  // tunable

function tempScore(tempK: number): number {
  if (tempK < TEMP_TOLERABLE_LO_K || tempK > TEMP_TOLERABLE_HI_K) return 0;
  const mid = (TEMP_TOLERABLE_LO_K + TEMP_TOLERABLE_HI_K) / 2;
  const half = (TEMP_TOLERABLE_HI_K - TEMP_TOLERABLE_LO_K) / 2;
  return 1 - Math.abs(tempK - mid) / half;
}

function gravityScore(gravityG: number): number {
  if (gravityG < GRAVITY_TOLERABLE_LO || gravityG > GRAVITY_TOLERABLE_HI) return 0;
  return gravityG <= 1 ? gravityG / 1 : Math.max(0, 1 - (gravityG - 1) / (GRAVITY_TOLERABLE_HI - 1));
}

const BREATHABLE_PRESSURE: readonly PressureClass[] = ['moderate', 'thick'];

/**
 * Deterministic - PURELY a function of already-computed physical state
 * (`surfaceTemperature`, `atmosphere`, and a mass-derived `gravityG` the
 * caller supplies). No `Rng` parameter anywhere in this module.
 */
export function assessHumanHabitability(
  meanTempK: number, pressureClass: PressureClass, oxygenated: boolean, gravityG: number,
): HumanHabitabilityResult {
  const blockers: string[] = [];
  const notes: string[] = [];

  const t = tempScore(meanTempK);
  if (t === 0) blockers.push('surface temperature outside any tolerable range');
  const g = gravityScore(gravityG);
  if (g === 0) blockers.push('gravity outside any tolerable range');
  const breathable = BREATHABLE_PRESSURE.includes(pressureClass) && oxygenated;
  if (!breathable) notes.push('atmosphere is not breathable unassisted');

  let tier: HabTier;
  if (t === 0 || g === 0) tier = 0;
  else if (t > 0.7 && g > 0.7 && breathable) tier = 4;
  else if (t > 0.4 && g > 0.4 && (breathable || pressureClass !== 'vacuum')) tier = 3;
  else if (t > 0.15 && g > 0.15) tier = 2;
  else tier = 1;

  const support: SupportLevel = tier >= 4 ? 'unassisted' : tier >= 2 ? 'shelter' : 'none';

  return { tier, liveable: isHumanHabitable(tier), support, gravityG, blockers, notes };
}

/**
 * THE single definition of "human-habitable" in the project (S9 ruling,
 * gated structurally - grep for this identifier across every source file
 * and it must appear as a definition exactly once, here). `habitability`
 * deliberately has none: it stays purely geometric and never answers this
 * question. Anything that used to compute its own `tier >= 2` inline
 * (render, the sector-centring search's `minHabTier` comparison) should call
 * THIS rather than repeat the threshold.
 */
export function isHumanHabitable(tier: HabTier): boolean {
  return tier >= 2;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. Tier is monotonically non-decreasing as temperature and gravity both
 *     move toward Earth-like values, at fixed atmosphere.
 *  2. Tier 0 always has `liveable === false` and `support === 'none'`; tier
 *     4 always has `liveable === true` and `support === 'unassisted'`.
 *  3. `HAB_TIER_LABELS` has exactly one entry per `HabTier` value (0-4),
 *     the structural guarantee behind "generated from this module's tier
 *     taxonomy, never a parallel list".
 *  4. No `Rng` parameter anywhere in this module's public surface.
 *  5. Determinism (trivial for a pure function, asserted anyway).
 */
export const HUMAN_HABITABILITY_GATES = 5 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Human habitability tier', status: 'tunable',
    short: 'A coarse, narrative-facing bucket (from uninhabitable to Earth-like) summarising how survivable a world would be for unaided humans.',
    long: 'HAB_TIER_LABELS and the tier thresholds are a deliberate simplification of the many upstream physical scores (temperature, atmosphere, biosphere) into one storytelling-facing number - the isHumanHabitable(tier) >= 2 cutoff is the single sanctioned definition site for that boolean, per the brief\'s Law 1.',
  },
];
