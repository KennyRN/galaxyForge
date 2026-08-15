/**
 * conatal - co-natal remnant groups: young, chemically coherent. Channel
 * `conatalGroup`, seeded from (worldSeed, cell, parentOrdinal) - isolated so
 * conatal chemistry can never perturb positions (`placement` already owns
 * the spatial clustering mechanism entirely; this module answers WHICH
 * groups mean something and what they share, never where).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * COHERENCE WINDOW. 1.0 Gyr, `sourced (rounded)` - Kamdar, Conroy, Ting,
 * Bonaca, Smith & Brown 2019, ApJL 884, L42: conatal pairs are born in
 * clusters younger than ~1 Gyr; the published abstract replaces the
 * preprint's "high-mass" qualifier with clusters following the overall
 * cluster mass function (the brief's own C8/S2.2 correction - not
 * re-litigated here, just applied).
 *
 * SIGMA_INTRA. 0.02 dex, `derived (from an upper limit)` - Bovy 2016's own
 * element-banded 95% bound for iron ([Fe/H] < 0.02 dex), the tightest band,
 * deliberately NOT Kamdar's 0.03 dex (a mock OBSERVATIONAL uncertainty
 * applied to a simulation, a different quantity entirely - the brief's own
 * S5.3 reconciliation record #1/#2). This grade must never drift to
 * `sourced` - the true intrinsic scatter may be smaller; 0.02 is where a
 * generative model saturates an upper limit, not a measurement.
 *
 * REALISM RULING (already implemented structurally, not here). `placement`
 * places co-natal remnants as the ONLY clustered spatial structure, gated on
 * `Population.clusteredFraction`/`meanGroupSize` - this module does not
 * duplicate that spatial mechanism. Its job is the CHEMISTRY: given that a
 * cluster of systems shares a birth, what age and [Fe/H] do they share.
 *
 * AMR COUPLING AT GROUP LEVEL. The brief is explicit that the age
 * -metallicity relation must be applied to the GROUP as a unit, not
 * suppressed the way it is at member level (member-level AMR would double
 * -apply it). A `tunable` linear coupling, the same qualitative direction
 * `age.ts`'s own `AMR_RHO` uses (older -> more metal-poor) but NOT the same
 * mechanism - `age.ts` couples a fresh star's age draw to a shared latent;
 * this module couples an ALREADY-DRAWN group age to that same population's
 * own metallicity spread, because the group's age is drawn first and its
 * chemistry must respect it, not the other way around.
 *
 * EXACT AGE SHARING. Every member of a group shares the group's stored age
 * EXACTLY - not an approximation. Bovy's own C/O abundance argument implies
 * formation within ~6 Myr (0.006 Gyr), far below the project's 2-decimal
 * -place Gyr storage precision, so "exactly" is what the physics implies at
 * this project's own precision, not a shortcut (S5.3's own framing).
 *
 * genVersion: any constant here changing is genVersion-bumping.
 */

import { channelRng, type Rng } from './rng';
import { Phi, probit, truncGaussQuantile } from './mathStats';
import type { Population, PopulationKey } from './galaxyModel';

export const COHERENCE_WINDOW_GYR = 1.0;   // sourced (rounded), Kamdar et al. 2019
export const SIGMA_INTRA_DEX = 0.02;       // derived (from an upper limit), Bovy 2016

export interface ConatalGroupDraw {
  readonly groupId: string;
  readonly population: PopulationKey;
  readonly ageGyr: number;
  readonly fehMeanDex: number;
  readonly formationRank: number;
}

/**
 * P(age < COHERENCE_WINDOW_GYR | population) - the closed-form Phi ratio
 * over the population's own truncated-Gaussian age interval, NOT a draw.
 * Zero for populations whose age interval never reaches below the window
 * (a derivation, not a hand-set flag - S5.3's own "belt and braces" point).
 */
export function conatalProbability(pop: Population): number {
  const [lo, hi] = pop.ageGyr;
  if (lo >= COHERENCE_WINDOW_GYR) return 0;
  const alpha = (lo - pop.ageMeanGyr) / pop.ageSigmaGyr;
  const beta = (hi - pop.ageMeanGyr) / pop.ageSigmaGyr;
  const windowZ = (Math.min(hi, COHERENCE_WINDOW_GYR) - pop.ageMeanGyr) / pop.ageSigmaGyr;
  const Fa = Phi(alpha), Fb = Phi(beta), Fw = Phi(windowZ);
  const denom = Fb - Fa;
  if (denom <= 0) return 0;
  return Math.min(1, Math.max(0, (Fw - Fa) / denom));
}

const AMR_GROUP_COUPLING = 0.3;   // tunable - same qualitative direction as age.ts's AMR_RHO

/**
 * Draws ONE co-natal group. EXACTLY THREE draws: group age (truncated at
 * the coherence window, never the population's full interval), group
 * formationRank (the shared latent this group's members inherit, alongside
 * age and [Fe/H]), and the group's own AMR-coupled [Fe/H] offset draw.
 * Population selection is the CALLER's concern (weighted by
 * `clusteredFraction * conatalProbability(pop)`, per S5.3's "effective
 * group rate" - `placement` already does exactly this weighting for spatial
 * clustering; this function does not re-select a population).
 */
export function drawGroup(
  rng: Rng, cellKey: { ix: number; iy: number; iz: number }, parentOrdinal: number, population: Population,
): ConatalGroupDraw {
  const groupId = `conatal.${cellKey.ix}.${cellKey.iy}.${cellKey.iz}.${parentOrdinal}`;
  const windowHi = Math.min(population.ageGyr[1], COHERENCE_WINDOW_GYR);
  const ageGyr = truncGaussQuantile(rng(), population.ageMeanGyr, population.ageSigmaGyr, population.ageGyr[0], windowHi);

  const formationRank = rng();

  const uFehOffset = rng();
  const ageZ = (ageGyr - population.ageMeanGyr) / population.ageSigmaGyr;
  const coupledOffset = -AMR_GROUP_COUPLING * ageZ * population.fehSigmaDex;
  const scatterOffset = (1 - AMR_GROUP_COUPLING) * population.fehSigmaDex * probit(Math.min(Math.max(uFehOffset, 1e-9), 1 - 1e-9)) * 0.3;
  const fehMeanDex = population.fehMeanDex + coupledOffset + scatterOffset;

  return { groupId, population: population.key, ageGyr, fehMeanDex, formationRank };
}

/**
 * A member's own [Fe/H], scattered around the group's shared value by
 * SIGMA_INTRA - EXACTLY ONE draw, on the member's own `metallicity` channel
 * (never this module's `conatalGroup` channel - S5.3's own isolation rule).
 */
export function memberFeh(rng: Rng, groupFehDex: number): number {
  const u = Math.min(Math.max(rng(), 1e-9), 1 - 1e-9);
  return groupFehDex + SIGMA_INTRA_DEX * probit(u);
}

/**
 * Convenience: seed a group's own `conatalGroup`-channel rng from
 * (worldSeed, cell, parentOrdinal) - the one place this channel name is
 * turned into a stream, so a caller never has to know the key convention.
 */
export function groupRng(worldSeed: string, cellKey: { ix: number; iy: number; iz: number }, parentOrdinal: number): Rng {
  return channelRng(worldSeed, 'conatalGroup', cellKey.ix, cellKey.iy, cellKey.iz, parentOrdinal);
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. conatalProbability is 0 for a population whose age interval never
 *     dips below the coherence window (e.g. `thick`, `halo`), and strictly
 *     positive for one that does (e.g. `youngThin`).
 *  2. Every drawn group's age is STRICTLY below COHERENCE_WINDOW_GYR -
 *     never merely close, always strictly under, regardless of the
 *     population's own mean/sigma.
 *  3. drawGroup consumes EXACTLY THREE draws; memberFeh consumes EXACTLY ONE.
 *  4. [Fe/H] scatter from `memberFeh` is consistent with SIGMA_INTRA
 *     (0.02 dex) and INCONSISTENT with the population's own much broader
 *     `fehSigmaDex` (a 7-12x contrast, per S5.3's own gate) - i.e. the
 *     scatter has real teeth, not just a plausible-looking number.
 *  5. Determinism.
 *  6. `groupRng` never collides with `placement`'s own channel for the same
 *     key (different channel name, per Law 2 isolation).
 */
export const CONATAL_GATES = 6 as const;
