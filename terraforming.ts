/**
 * terraforming - deliberate agency, separate from `biosphere` by ruling.
 * Channel `terraforming:{formationIndex}`.
 *
 * -- THIS MODULE AUTHORS FICTION, NOT SCIENCE. -------------------------------
 * Stated first, per the brief's explicit instruction, because it is the one
 * genuinely load-bearing fact about this module: nothing below is a
 * measurement, a rate from a paper, or an extrapolation of one. It is a
 * WORLDBUILDING MECHANISM - a deterministic-scoring gate on physical
 * plausibility (`terraformability`), combined with a procedural placement
 * roll scaled by TWO independent AUTHORED settings a user chooses at galaxy
 * creation: `terraformScale` (`SystemContext.terraformScale`, 0-6, COVERAGE
 * - how many feasible candidates actually get selected) and
 * `terraformIntensity` (`SystemContext.terraformIntensity`, 0-6, DEGREE -
 * how far a SELECTED planet's terraforming has progressed). Every constant
 * below is `tunable`. There is no ledger row graded `sourced` in this file,
 * and there should never be one - a citation here would be dishonest in the
 * specific way Law 4 exists to prevent.
 *
 * TWO AXES, NOT ONE (16 Aug 2026, a user-found gap): before this date a
 * single `terraformScale` conflated "how many planets are selected" with
 * "how far along the selected ones are" - the placement roll used it, but
 * `completeness` (planned/partial/substantial/complete) was drawn UNIFORMLY
 * regardless of scale, so there was no way to author "terraforming is
 * common but always shallow" or "rare but total" - only one knob for two
 * genuinely separate authorial questions. `terraformScale` keeps its exact
 * prior name and meaning (coverage only - no rename, Law 5); the new
 * `terraformIntensity` parameter is purely additive and governs completeness.
 *
 * `terraformability.score` is a deterministic function of physical state
 * (temperature proximity to human-tolerable range, gravity, whether an
 * atmosphere already exists to work from) - PURELY GEOMETRIC/PHYSICAL, no
 * draw, so two systems with identical physical states always get identical
 * scores regardless of either scale. `terraformScale` only affects WHETHER
 * a feasible candidate actually gets terraformed (the placement roll);
 * `terraformIntensity` only affects HOW FAR a selected one gets (the
 * completeness roll) - keeping "an author chose to put people here" and
 * "how much they've accomplished" structurally separate, the same way
 * feasibility and placement already were.
 *
 * `agentRef` is UNSET on every procedural placement (types.ts's own ruling)
 * - it exists only for a user's authored frontmatter to attach a
 * civilisation to later; this module never invents one.
 *
 * `realisedComposition` here starts from `biosphere`'s own output (S9: "not
 * final, because terraforming will read and further modify it") and applies
 * a further delta - never invents atmospheric chemistry from nothing.
 *
 * genVersion: any constant here changing is genVersion-bumping.
 */

import type { Rng } from './rng';
import type { SpeciesFraction, PressureClass } from './types';

export type TerraformType = 'atmospheric' | 'thermal' | 'hydrological' | 'biological' | 'ecological';
export type Completeness = 'planned' | 'partial' | 'substantial' | 'complete';

export interface Terraformability {
  readonly feasible: boolean;
  readonly score: number;
  readonly blockers: string[];
}

export interface TerraformedRecord {
  readonly types: TerraformType[];
  readonly completeness: Completeness;
  readonly agentRef?: string;
}

export interface TerraformingDraw {
  readonly terraformability: Terraformability;
  readonly terraformed: TerraformedRecord | null;
  readonly realisedComposition: SpeciesFraction[] | null;
  readonly realisedPressureClass: PressureClass | null;
  readonly realisedMeanTempK: number | null;
}

const FEASIBILITY_THRESHOLD = 0.3;   // tunable

/** Deterministic, purely physical - no rng. */
export function terraformabilityOf(
  surfaceTempK: number, gravityG: number, hasAtmosphere: boolean,
): Terraformability {
  const blockers: string[] = [];
  const tempScore = Math.max(0, 1 - Math.abs(surfaceTempK - 288) / 150);   // tunable, centred on Earth-like
  if (tempScore < 0.15) blockers.push('surface temperature far outside tolerable range');
  const gravityScore = Math.max(0, 1 - Math.abs(gravityG - 1) / 1.5);      // tunable
  if (gravityScore < 0.15) blockers.push('gravity far outside tolerable range');
  const atmosphereScore = hasAtmosphere ? 1.0 : 0.4;                       // tunable - vacuum worlds are harder, not impossible
  if (!hasAtmosphere) blockers.push('no pre-existing atmosphere to work from');

  const score = (tempScore + gravityScore + atmosphereScore) / 3;
  return { feasible: score >= FEASIBILITY_THRESHOLD, score, blockers };
}

const COMPLETENESS_LEVELS: readonly Completeness[] = ['planned', 'partial', 'substantial', 'complete'];

/**
 * Maps `terraformIntensity` (0-6) to a power-curve exponent applied to the
 * completeness draw, `tunable`. Exponent 1 at the midpoint (3) reproduces
 * the ORIGINAL uniform draw exactly - a deliberate continuity choice so a
 * galaxy authored before this axis existed (`terraformIntensity` defaulting
 * to 3) draws completeness the same way it always did. Below the midpoint
 * the exponent rises above 1, which pushes `u^exponent` DOWN (toward index
 * 0, `'planned'`) since raising a value in [0,1] to a power > 1 shrinks it;
 * above the midpoint the exponent falls below 1, pushing `u^exponent` UP
 * (toward index 3, `'complete'`) by the same logic in reverse. `2^x` was
 * chosen over a linear map purely because it keeps the extremes (intensity
 * 0 and 6) comfortably inside a still-mixed distribution rather than a
 * near-deterministic one - intensity 0 still occasionally lands on
 * `'partial'`, intensity 6 still occasionally lands on `'substantial'`,
 * which reads as "usually shallow" / "usually thorough" rather than "always
 * exactly one level", a more honest shape for a fictional authoring dial.
 */
function intensityExponent(terraformIntensity: number): number {
  return Math.pow(2, (3 - terraformIntensity) / 3);
}

/**
 * EXACTLY TWO draws when feasible (placement roll, then type/completeness
 * roll if placed), ONE draw when infeasible (the placement roll still
 * happens for a fixed budget, but is guaranteed to miss since
 * `placementProbability` is 0). `terraformIntensity` never changes this
 * draw COUNT - it reshapes the second draw's distribution, never adds one -
 * so gate 5's invariant holds unchanged for both parameters.
 */
export function rollTerraforming(
  rng: Rng, terraformability: Terraformability, terraformScale: number, terraformIntensity: number,
  baseComposition: SpeciesFraction[], baseTempK: number,
): TerraformingDraw {
  const placementProbability = terraformability.feasible
    ? Math.min(1, (terraformScale / 6) * terraformability.score)
    : 0;
  const uPlace = rng();
  if (uPlace >= placementProbability) {
    return {
      terraformability, terraformed: null,
      realisedComposition: null, realisedPressureClass: null, realisedMeanTempK: null,
    };
  }

  const uCompleteness = Math.pow(rng(), intensityExponent(terraformIntensity));
  const completeness = COMPLETENESS_LEVELS[Math.min(3, Math.floor(uCompleteness * 4))]!;
  const progress = (COMPLETENESS_LEVELS.indexOf(completeness) + 1) / COMPLETENESS_LEVELS.length;

  const types: TerraformType[] = ['atmospheric', 'thermal'];
  if (progress > 0.5) types.push('hydrological');
  if (progress > 0.75) types.push('biological', 'ecological');

  // A simple linear blend toward an Earth-like target, scaled by progress -
  // never invented from nothing; blends the SUPPLIED base composition.
  const target: SpeciesFraction[] = [{ species: 'N2', fraction: 0.78 }, { species: 'O2', fraction: 0.21 }, { species: 'other', fraction: 0.01 }];
  const realisedComposition = target.map((t) => ({
    species: t.species,
    fraction: t.fraction * progress + (baseComposition.find((b) => b.species === t.species)?.fraction ?? 0) * (1 - progress),
  }));
  const realisedMeanTempK = baseTempK * (1 - progress) + 288 * progress;
  const realisedPressureClass: PressureClass = progress > 0.75 ? 'moderate' : 'thin';

  return {
    terraformability,
    terraformed: { types, completeness, agentRef: undefined },
    realisedComposition, realisedPressureClass, realisedMeanTempK,
  };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. `terraformabilityOf` is PURELY DETERMINISTIC - no `Rng` parameter in
 *     its signature at all.
 *  2. `agentRef` is `undefined` on EVERY procedurally-placed record, always.
 *  3. `terraformScale = 0` NEVER places terraforming, regardless of how
 *     feasible the planet is.
 *  4. Higher `terraformScale` never DECREASES the placement rate, at fixed
 *     terraformability (measured over many draws).
 *  5. `rollTerraforming` consumes exactly one draw when infeasible or
 *     unplaced, exactly two when placed.
 *  6. `completeness` is monotonically related to which `types` are present
 *     - `'complete'` never has fewer types than `'planned'`.
 *  7. Determinism.
 *  8. Higher `terraformIntensity` never DECREASES the mean completeness rank
 *     among PLACED draws, at fixed `terraformScale`/terraformability
 *     (measured over many draws) - the two-axis design's own load-bearing
 *     property (16 Aug 2026): intensity must move the DEGREE distribution
 *     without touching the placement rate gate 4 already owns.
 */
export const TERRAFORMING_GATES = 8 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Terraformability', status: 'tunable',
    short: 'How plausible it would be to engineer a given world toward human habitability.',
    long: 'An explicitly fictional, world-building-oriented score - this module\'s own header states it authors fiction, not science. Deterministic and pure given a planet\'s physical state, but carries no literature source: there is none for a subject that does not yet exist.',
  },
  {
    term: 'Terraforming coverage vs intensity', status: 'tunable',
    short: 'Two separate authoring dials: how MANY worlds get terraformed, and how FAR each selected one has progressed.',
    long: 'Coverage (`terraformScale`, unchanged since first written) scales the placement roll only. Intensity (`terraformIntensity`, added 16 Aug 2026) reshapes the completeness draw via a power-curve exponent, biasing toward "planned" at low intensity and "complete" at high intensity while leaving the placement rate untouched - closing a gap where a single dial could not express "common but shallow" or "rare but total" terraforming.',
  },
];
