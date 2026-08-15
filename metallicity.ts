/**
 * metallicity - the [Fe/H] draw. Closes the gap `age.ts`'s own header has
 * flagged since Stage 2: "metallicity (not yet built) is expected to read
 * the same formationRank with an oppositely-signed coupling." Channel
 * `metallicity` (already reserved in `CHANNELS`, unused until now).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * Mirrors `age.ts` deliberately - same Gaussian-copula mechanism, same
 * "morphology-blind, reads the population's own sourced numbers" posture.
 * `Population.fehMeanDex`/`fehSigmaDex` are each morphology's own sourced
 * figures (Xiang & Rix 2022 for the spiral cohorts, McDermid 2015 for the
 * elliptical, Kuntschner 2010 for the gradient slope - see `galaxyModel.ts`'s
 * own population tables); this module never reads a metallicity table
 * itself, exactly as `age.ts` never reads an age table.
 *
 * THE GRADIENT. `fehGradientForm`/`fehGradient`/`fehGradientRefPc` (when
 * set) shift the truncated-Gaussian MEAN by galactocentric radius, before
 * the AMR coupling is applied - the population's own sourced spatial trend,
 * applied first, so the coupling only adds SCATTER around the radius
 * -appropriate mean rather than fighting it.
 *
 * THE COUPLING. `AMR_RHO` here is `age.ts`'s own `AMR_RHO`, imported rather
 * than re-declared (Law 1 - one correlation strength, one number), with the
 * SIGN FLIPPED per that module's own documented convention: higher
 * `formationRank` biases age OLDER and metallicity LOWER - the standard
 * qualitative age-metallicity relation (older stars are more metal-poor),
 * which is the entire reason `formationRank` is a SHARED latent rather than
 * each module's own private draw.
 *
 * PURE AND SEEDED (Law 2). `rollMetallicity` consumes EXACTLY ONE draw from
 * `rng`, regardless of population, radius or formationRank - matching
 * `age.rollAge`'s own contract exactly.
 *
 * TRUNCATION INTERVAL. The population table carries no explicit
 * `fehGyr`-style `[lo, hi]` the way `ageGyr` does - `sourced` numbers this
 * package ships for [Fe/H] spread are a mean and a sigma only. A wide,
 * `tunable` truncation window (+/-5 sigma-equivalent, generously outside
 * any physically plausible [Fe/H]) is used instead, wide enough that it
 * never actually binds - it exists only so `truncGaussQuantile` has a
 * well-posed interval, per its own signature.
 *
 * genVersion: a change to `AMR_RHO`'s sign or magnitude, or to the
 * truncation window, is genVersion-bumping for every module reading `feh`.
 */

import type { Population } from './galaxyModel';
import type { Rng } from './rng';
import { truncGaussQuantile, probit, Phi } from './mathStats';
import { AMR_RHO } from './age';

const FEH_TRUNCATION_HALF_WIDTH_DEX = 5;   // tunable - see header, deliberately non-binding

/**
 * Draw [Fe/H] in dex for a system belonging to `population` at
 * `galactocentricRadiusPc`, coupled to the SAME `formationRank` latent
 * `age.rollAge` already consumed (a different draw on this module's own
 * channel, but the same shared 0..1 input).
 */
export function rollMetallicity(rng: Rng, population: Population, galactocentricRadiusPc: number, formationRank: number): number {
  if (!(formationRank >= 0 && formationRank <= 1)) {
    throw new Error(`rollMetallicity: formationRank must be in [0, 1], got ${formationRank}`);
  }
  let meanDex = population.fehMeanDex;
  if (population.fehGradientForm && population.fehGradient !== undefined && population.fehGradientRefPc !== undefined) {
    const r = galactocentricRadiusPc;
    meanDex += population.fehGradientForm === 'linear'
      ? population.fehGradient * (r - population.fehGradientRefPc)
      : population.fehGradient * Math.log10(Math.max(r, 1) / population.fehGradientRefPc);
  }

  // Sign FLIPPED relative to age.rollAge's own use of AMR_RHO - see header.
  const zRank = probit(Math.min(Math.max(formationRank, 1e-12), 1 - 1e-12));
  const zIndep = probit(Math.min(Math.max(rng(), 1e-12), 1 - 1e-12));
  const zFeh = -AMR_RHO * zRank + Math.sqrt(1 - AMR_RHO * AMR_RHO) * zIndep;
  const uFeh = Phi(zFeh);

  const lo = meanDex - FEH_TRUNCATION_HALF_WIDTH_DEX * population.fehSigmaDex;
  const hi = meanDex + FEH_TRUNCATION_HALF_WIDTH_DEX * population.fehSigmaDex;
  return truncGaussQuantile(uFeh, meanDex, population.fehSigmaDex, lo, hi);
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - same rng sequence, population, radius and formationRank
 *     give a bit-identical [Fe/H], always.
 *  2. ONE DRAW - `rollMetallicity` consumes exactly one call to `rng()`.
 *  3. GRADIENT APPLIES - at fixed formationRank and rng draw, [Fe/H] varies
 *     with `galactocentricRadiusPc` whenever the population sets a gradient,
 *     and is CONSTANT in radius when it does not (halo).
 *  4. OPPOSITE-SIGN COUPLING - holding the independent draw fixed, higher
 *     formationRank measurably shifts [Fe/H] LOWER (the opposite direction
 *     from `age.rollAge`'s own documented convention).
 *  5. NO SPIKE - a histogram over many draws has no anomalous concentration
 *     at a fixed value.
 */
export const METALLICITY_GATES = 5 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Age-metallicity coupling (metallicity side)', status: 'tunable',
    short: 'How strongly a system\'s metallicity moves opposite to its age via the shared formationRank latent.',
    long: 'Reads age.ts\'s own AMR_RHO with the sign flipped - older systems trend metal-poor - closing the gap that module\'s own header named since Stage 2.',
    seeAlso: ['Age-metallicity coupling'],
  },
];
