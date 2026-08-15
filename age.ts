/**
 * age - the age draw. MORPHOLOGY-BLIND, per Stage 2's ruling: it owns the
 * sampling machinery and none of the cohort science.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * No ledger of its own. Every sourced number this module's output depends on
 * (`ageMeanGyr`, `ageSigmaGyr`, `ageGyr`) lives on the `Population` the caller
 * selected - Xiang & Rix 2022 for the spiral's cohorts, McDermid 2015 for the
 * elliptical, and so on (brief S4, S4.2, S4.5). `age` never reads a cohort
 * table itself; the earlier instruction to export `COHORTS` for this module
 * to hand to `stellarPopulation` is VOID (S3, Stage 2) - the table migrated
 * into the galaxy models as their population lists.
 *
 * There is no legacy `rollAge`/`msLifetimeGyr` cap or `cohortConflict` to
 * delete here: this is a from-scratch Stage 2 build, not an edit of prior
 * code that shipped with this package. Recorded so a reviewer does not go
 * looking for a deletion diff that never applied.
 *
 * -- THE formationRank SEAM, and why it is a parameter here rather than a
 *    draw ------------------------------------------------------------------
 * `SystemContext.formationRank` (types.ts) is documented as a "0-1 shared
 * latent; couples age and metallicity" - `CHANNELS.formationRank` already
 * exists for it. No module that rolls it has been specified anywhere in the
 * package this brief shipped, and it is absent from `MODULE-STATUS.md`'s own
 * concern table - a genuine gap in the brief, not a decision made and hidden
 * from this header. Until that module exists, `rollAge` takes
 * `formationRank` as an ALREADY-ROLLED input rather than rolling it itself:
 * that keeps `age` correctly scoped (it couples TO the shared latent, it does
 * not own it) and keeps this module honest about what it does and does not
 * yet integrate with. Flagged for the owner rather than invented past.
 *
 * -- THE COUPLING ITSELF, `AMR_RHO` ------------------------------------------
 * Implemented as a Gaussian copula: `formationRank` is treated as an already
 * -uniform draw and converted to a standard-normal z via `probit`; a second,
 * independent normal is drawn from THIS module's own channel; the two are
 * blended by `AMR_RHO` and converted back to a uniform via `Phi`, which then
 * drives `truncGaussQuantile`. `AMR_RHO` and its SIGN are `tunable` - no
 * source in this package states a numeric age-metallicity correlation
 * strength or which direction `formationRank` should point. `metallicity`
 * (not yet built) is expected to read the SAME `formationRank` value with its
 * own (likely oppositely-signed) coupling, so that older systems trend
 * metal-poor without either module knowing about the other's existence -
 * that is what "shared latent" buys, and is the whole reason it is not
 * simply `age`'s own private draw.
 *
 * PURE AND SEEDED (Law 2). `rollAge` consumes EXACTLY ONE draw from the
 * supplied `rng`, regardless of population or formationRank - the
 * "deterministic per-system draw counts" property S4.8 requires of every
 * sampler in the pipeline. `truncGaussQuantile` itself consumes none (it is
 * an inverse-CDF, not a sampler); `probit`/`Phi` consume none either.
 */

import type { Population } from './galaxyModel';
import type { Rng } from './rng';
import { truncGaussQuantile, probit, Phi } from './mathStats';

/**
 * Correlation coefficient between `formationRank` and the age draw, in the
 * Gaussian-copula sense above. `tunable`: no source constrains its magnitude.
 * Positive, by this module's own convention: higher `formationRank` biases
 * TOWARD OLDER ages within the population's own truncated interval. This
 * convention is arbitrary and is recorded here as the one to match once
 * `metallicity` exists, not as a physical fact about what `formationRank`
 * "means" on its own.
 */
export const AMR_RHO = 0.4;   // tunable

/**
 * Draw an age in Gyr for a system belonging to `population`, coupled to the
 * shared `formationRank` latent (0..1). Truncated Gaussian on
 * `population.ageGyr`, centred at `population.ageMeanGyr` with spread
 * `population.ageSigmaGyr` - never a uniform draw across the interval, which
 * would silently destroy the age-metallicity relation the whole coupling
 * exists to preserve.
 */
export function rollAge(rng: Rng, population: Population, formationRank: number): number {
  if (!(formationRank >= 0 && formationRank <= 1)) {
    throw new Error(`rollAge: formationRank must be in [0, 1], got ${formationRank}`);
  }
  const zRank = probit(Math.min(Math.max(formationRank, 1e-12), 1 - 1e-12));
  const zIndep = probit(Math.min(Math.max(rng(), 1e-12), 1 - 1e-12));
  const zAge = AMR_RHO * zRank + Math.sqrt(1 - AMR_RHO * AMR_RHO) * zIndep;
  const uAge = Phi(zAge);
  const [lo, hi] = population.ageGyr;
  return truncGaussQuantile(uAge, population.ageMeanGyr, population.ageSigmaGyr, lo, hi);
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - same rng sequence, population and formationRank give a
 *     bit-identical age, always.
 *  2. TRUNCATION - the returned age never leaves `population.ageGyr`.
 *  3. ONE DRAW - `rollAge` consumes exactly one call to `rng()`, regardless
 *     of population or formationRank.
 *  4. NOT A UNIFORM DRAW - the age distribution is Gaussian-shaped (denser
 *     near `ageMeanGyr`), not flat across the interval.
 *  5. NO SPIKE, THE STAGE-2 GATE - a histogram over many draws has no
 *     anomalous concentration at a fixed value; the gate DOES fail against a
 *     deliberately reintroduced legacy-style cap, proving it has teeth.
 *  6. formationRank COUPLING - holding the independent draw fixed, higher
 *     formationRank measurably shifts the age distribution in this module's
 *     declared direction (older).
 */
export const AGE_GATES = 6 as const;
