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
 * roll scaled by the AUTHORED `terraformScale` setting a user chooses at
 * galaxy creation (`SystemContext.terraformScale`, 0-6). Every constant
 * below is `tunable`. There is no ledger row graded `sourced` in this file,
 * and there should never be one - a citation here would be dishonest in the
 * specific way Law 4 exists to prevent.
 *
 * `terraformability.score` is a deterministic function of physical state
 * (temperature proximity to human-tolerable range, gravity, whether an
 * atmosphere already exists to work from) - PURELY GEOMETRIC/PHYSICAL, no
 * draw, so two systems with identical physical states always get identical
 * scores regardless of terraformScale. `terraformScale` only affects WHETHER
 * a feasible candidate actually gets terraformed (the placement roll), never
 * the feasibility score itself - keeping the "physically plausible" and
 * "an author chose to put people here" questions structurally separate.
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
 * EXACTLY TWO draws when feasible (placement roll, then type/completeness
 * roll if placed), ONE draw when infeasible (the placement roll still
 * happens for a fixed budget, but is guaranteed to miss since
 * `placementProbability` is 0).
 */
export function rollTerraforming(
  rng: Rng, terraformability: Terraformability, terraformScale: number,
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

  const uCompleteness = rng();
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
 */
export const TERRAFORMING_GATES = 7 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Terraformability', status: 'tunable',
    short: 'How plausible it would be to engineer a given world toward human habitability.',
    long: 'An explicitly fictional, world-building-oriented score - this module\'s own header states it authors fiction, not science. Deterministic and pure given a planet\'s physical state, but carries no literature source: there is none for a subject that does not yet exist.',
  },
];
