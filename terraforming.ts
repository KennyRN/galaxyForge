/**
 * terraforming - deliberate agency, separate from `biosphere` by ruling.
 *
 * -- THIS MODULE AUTHORS FICTION, NOT SCIENCE. -------------------------------
 * Stated first, per the brief's explicit instruction, because it is the one
 * genuinely load-bearing fact about this module: nothing below is a
 * measurement, a rate from a paper, or an extrapolation of one. It is a
 * WORLDBUILDING MECHANISM - a deterministic-scoring gate on physical
 * plausibility (`terraformability`), selected by TWO independent AUTHORED
 * settings a user chooses at galaxy creation: `terraformScale`
 * (`SystemContext.terraformScale`, 0-6, COVERAGE) and `terraformIntensity`
 * (`SystemContext.terraformIntensity`, 0-6, REACH). Every constant below is
 * `tunable`. There is no ledger row graded `sourced` in this file, and there
 * should never be one - a citation here would be dishonest in the specific
 * way Law 4 exists to prevent.
 *
 * REACH AND COVERAGE, NOT PLACEMENT-ROLL-AND-PROGRESS (16 Aug 2026, a
 * user-found gap in this SAME session's own earlier redesign): the first
 * pass built `terraformIntensity` as "how far a SELECTED world's terraforming
 * has progressed" - a random completeness roll (planned/partial/substantial/
 * complete). The user rejected this directly: a world either has been
 * terraformed or hasn't, there is no meaningful spectrum of partial
 * completion for a binary fact. Their actual model, confirmed:
 *
 *   - INTENSITY is a civilisation's REACH - how difficult a world can be
 *     (measured by `terraformabilityOf().score`, the existing "how easy is
 *     this" figure) and still be attempted AT ALL. Low intensity: only
 *     worlds needing minimal modification are even candidates. High
 *     intensity: the reach extends to worlds needing heavy modification too.
 *     This defines the ELIGIBLE POOL.
 *   - COVERAGE is how much of that eligible pool actually gets used, filled
 *     from the EASIEST world upward. Low coverage: only the handful of
 *     easiest-in-pool worlds are terraformed. Max coverage: the entire
 *     eligible pool is.
 *   - Selection is FULLY DETERMINISTIC - score vs. two thresholds, no dice
 *     roll, matching "either has or hasn't". `completeness` is REMOVED
 *     entirely, not reshaped: a terraformed world is simply, completely
 *     terraformed.
 *
 * This is a genuine simplification, not just a correction: the module is now
 * RNG-FREE END TO END. `terraformabilityOf` already took no `Rng`; with the
 * placement decision now a pure threshold comparison and `completeness`
 * gone, `evaluateTerraforming` needs no `Rng` either, so this whole module
 * consumes no randomness and owns no PRNG channel (see `CHANNELS` in
 * `types.ts` - `terraforming` was removed from it, 16 Aug 2026, since
 * `systemConductor.ts` was its only caller and that call site is gone too).
 *
 * `agentRef` is UNSET on every procedural placement (types.ts's own ruling)
 * - it exists only for a user's authored frontmatter to attach a
 * civilisation to later; this module never invents one.
 *
 * genVersion: any constant/formula here changing is genVersion-bumping.
 */

import type { SpeciesFraction, PressureClass } from './types';

export type TerraformType = 'atmospheric' | 'thermal' | 'hydrological' | 'biological' | 'ecological';

export interface Terraformability {
  readonly feasible: boolean;
  readonly score: number;
  readonly blockers: string[];
}

export interface TerraformedRecord {
  readonly types: TerraformType[];
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

/**
 * `CAP` - the score a "least needed to be modified" world would have,
 * `tunable`, not 1.0: `terraformabilityOf`'s own scoring rarely if ever
 * reaches exactly 1 even for a genuinely ideal world (it is a mean of three
 * sub-scores, each itself capped below 1 in practice), so pinning the cap at
 * 1.0 would make `coverage=0` select almost nothing, ever, regardless of how
 * ideal the easiest available world actually is. 0.95 keeps the "only the
 * very best" end of the coverage dial reachable by a genuinely excellent
 * candidate while still sitting comfortably above ordinary feasible worlds.
 */
const CAP = 0.95;

/**
 * The REACH threshold (16 Aug 2026) - how difficult a world can be (in
 * `terraformabilityOf().score` terms, where LOWER score means HARDER/more
 * modification needed) and still be a candidate at all, as a function of
 * `terraformIntensity` (0-6). Linear, `tunable` - this module's own header
 * explains why a curve would be unearned precision for an invented dial.
 *
 * intensity=6 (max reach) -> FEASIBILITY_THRESHOLD (0.3): every physically
 *   feasible world is a candidate, the widest this dial can ever go (the
 *   physical floor `terraformabilityOf` itself sets is never exceeded no
 *   matter how far intensity is pushed - see `requiredScoreThreshold`'s own
 *   header for why this bound holds even after coverage is folded in).
 * intensity=0 (min reach) -> CAP (0.95): only a near-ideal world is even a
 *   candidate - "least needed to be modified".
 */
function reachThreshold(terraformIntensity: number): number {
  return FEASIBILITY_THRESHOLD + (1 - terraformIntensity / 6) * (CAP - FEASIBILITY_THRESHOLD);
}

/**
 * The full selection threshold (16 Aug 2026) - folds COVERAGE in on top of
 * `reachThreshold`'s own eligible-pool boundary. `tunable`, linear, same
 * reasoning as `reachThreshold`.
 *
 * At fixed intensity, this interpolates between `CAP` (coverage=0: only the
 * very easiest world in the whole possible range clears the bar) and
 * `reachThreshold(intensity)` itself (coverage=6: EVERY world the reach
 * allows is used, filling the entire eligible pool) - "starting with the
 * fewest which are easiest to terraform, to all what could be terraformed"
 * is exactly this interpolation, expressed as a single score cutoff rather
 * than a literal rank-and-cut over every candidate world (this module never
 * sees more than one world at a time - see `evaluateTerraforming`'s own
 * header for why a cutoff, not a global ranking pass, is what "easiest
 * first" has to mean here).
 *
 * BOUNDED IN `[FEASIBILITY_THRESHOLD, CAP]` FOR EVERY (coverage, intensity)
 * PAIR - both endpoints of the interpolation (`CAP` and `reachThreshold`,
 * which is itself always `>= FEASIBILITY_THRESHOLD`) sit inside that range,
 * so the interpolated result never leaves it either. This is what guarantees
 * `evaluateTerraforming`'s `feasible &&` check is never the thing doing the
 * work - `score >= requiredScoreThreshold(...)` on its own already implies
 * `score >= FEASIBILITY_THRESHOLD`, so the physical floor can never be
 * bypassed by any slider combination. Verified directly, not assumed - see
 * `terraforming.conformance.ts` gates 3/8.
 */
export function requiredScoreThreshold(terraformCoverage: number, terraformIntensity: number): number {
  const reach = reachThreshold(terraformIntensity);
  return reach + (1 - terraformCoverage / 6) * (CAP - reach);
}

/** Every terraformed world gets the identical, full set - `completeness`'s
 *  removal (16 Aug 2026) means there is no partial-progress state left to
 *  vary this by; a terraformed world is engineered across the board. Kept as
 *  a real field (not dropped entirely) because it is still informative in a
 *  generated note - WHAT was engineered - even though it no longer varies. */
const FULL_TERRAFORM_TYPES: readonly TerraformType[] = ['atmospheric', 'thermal', 'hydrological', 'biological', 'ecological'];

/** The realised state of a terraformed world - fixed constants (16 Aug
 *  2026), not a progress-blended value: a terraformed world simply HAS
 *  Earth-like conditions now, matching "either has or hasn't". The prior
 *  version blended toward this target by a random `progress` fraction;
 *  there is no `progress` left to blend by. */
const EARTH_LIKE_COMPOSITION: readonly SpeciesFraction[] = [
  { species: 'N2', fraction: 0.78 }, { species: 'O2', fraction: 0.21 }, { species: 'other', fraction: 0.01 },
];
const EARTH_LIKE_TEMP_K = 288;
const EARTH_LIKE_PRESSURE_CLASS: PressureClass = 'moderate';

/**
 * Deterministic - no `Rng` parameter at all (16 Aug 2026; see this module's
 * own header for why). A world is terraformed if and only if it is
 * physically feasible AND its ease score clears the combined reach/coverage
 * threshold - no draw, no roll, the same fact every time for the same
 * physical state and the same two GUI dials.
 *
 * NOT a global rank-and-cut over every world in a sector: this function only
 * ever sees ONE world's own score. "Fill from easiest to hardest" is
 * expressed as a SCORE CUTOFF (`requiredScoreThreshold`) rather than a
 * literal ranking pass over a population this module has no visibility
 * into - a world clears the bar or it doesn't, and because harder worlds
 * always have a lower score than easier ones, a fixed cutoff naturally
 * admits exactly "the easiest ones" as coverage rises, without this module
 * needing to know what any OTHER world's score is.
 */
export function evaluateTerraforming(
  terraformability: Terraformability, terraformCoverage: number, terraformIntensity: number,
): TerraformingDraw {
  const isTerraformed = terraformability.feasible
    && terraformability.score >= requiredScoreThreshold(terraformCoverage, terraformIntensity);

  if (!isTerraformed) {
    return {
      terraformability, terraformed: null,
      realisedComposition: null, realisedPressureClass: null, realisedMeanTempK: null,
    };
  }

  return {
    terraformability,
    terraformed: { types: [...FULL_TERRAFORM_TYPES], agentRef: undefined },
    realisedComposition: EARTH_LIKE_COMPOSITION.map((s) => ({ ...s })),
    realisedPressureClass: EARTH_LIKE_PRESSURE_CLASS,
    realisedMeanTempK: EARTH_LIKE_TEMP_K,
  };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. `terraformabilityOf` is PURELY DETERMINISTIC - no `Rng` parameter in
 *     its signature at all.
 *  2. `evaluateTerraforming` is PURELY DETERMINISTIC too (16 Aug 2026) - same
 *     inputs, same output, always, no `Rng` parameter at all.
 *  3. `requiredScoreThreshold` always lands in `[FEASIBILITY_THRESHOLD, CAP]`,
 *     for every (coverage, intensity) pair in the GUI's own 0-6 range.
 *  4. `requiredScoreThreshold` is monotonically NON-INCREASING in coverage at
 *     fixed intensity - higher coverage never shrinks the terraformed set.
 *  5. `requiredScoreThreshold` is monotonically NON-INCREASING in intensity
 *     at fixed coverage - higher intensity (reach) never shrinks it either.
 *  6. `coverage=6, intensity=6` gives `requiredScoreThreshold ===
 *     FEASIBILITY_THRESHOLD` exactly - the "every feasible world" boundary.
 *  7. `coverage=0` gives `requiredScoreThreshold === CAP` regardless of
 *     intensity - the "only the very best, no matter the reach" boundary.
 *  8. A world with `feasible === false` is NEVER terraformed, at ANY
 *     coverage/intensity combination - the physical floor always wins over
 *     both authoring dials.
 *  9. `agentRef` is `undefined` on EVERY procedurally-placed record, always.
 *  10. Every terraformed world gets the identical, full `types` set.
 */
export const TERRAFORMING_GATES = 10 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Terraformability', status: 'tunable',
    short: 'How plausible it would be to engineer a given world toward human habitability.',
    long: 'An explicitly fictional, world-building-oriented score - this module\'s own header states it authors fiction, not science. Deterministic and pure given a planet\'s physical state, but carries no literature source: there is none for a subject that does not yet exist.',
  },
  {
    term: 'Terraforming reach vs coverage', status: 'tunable',
    short: 'Two separate authoring dials: how DIFFICULT a world can be and still be attempted, and how much of what\'s reachable actually gets used.',
    long: 'Reach (`terraformIntensity`) sets the hardest world that is a candidate at all, from "only near-ideal worlds" to "everything physically feasible". Coverage (`terraformScale`) then fills that eligible range from the easiest world upward, from "only the handful of easiest" to "the entire eligible pool". Both fold into a single deterministic score cutoff (`requiredScoreThreshold`) - a world is terraformed if and only if its own ease score clears that cutoff, no dice roll. Redesigned 16 Aug 2026 after a user rejected this module\'s own first-pass "how far along has this world\'s terraforming progressed" framing as not matching a binary, either-has-or-hasn\'t fact.',
  },
];
