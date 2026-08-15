/**
 * stellarPopulation - how common each spectral class is, and the age/
 * metallicity cohort draw. Owns `pickClass`, the deconvolution from observed
 * to birth fractions, and nothing about WHERE a system sits (that is the
 * galaxy model's and `age`'s concern).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * OBSERVED CLASS FRACTIONS. Golovin et al. 2023 (CNS5), A&A 670, A19,
 * doi:10.1051/0004-6361/202244250: **72 % of the 25 pc sample are M dwarfs**
 * - confirmed directly against the published abstract this session
 * (retrieved 2026-08-15). The per-letter breakdown for O/B/A/F/G/K (the
 * remaining 28 %) could NOT be retrieved from the paper's own tables in this
 * pass - grade those six `calibrated`, a widely-cited general solar
 * -neighbourhood consensus (RECONS-style percentages) rescaled to fill the
 * CNS5-confirmed 28 % non-M remainder in the literature's usual relative
 * proportions, **not** a verbatim CNS5 table. Revisit and replace with
 * Golovin's own per-type table if a future pass can retrieve it - flagged
 * here exactly as S2.3 flags the still-unrun Reyle query, an honest partial
 * source rather than an invented one.
 *
 * WITHIN-LETTER WEIGHTING. Each letter class's observed fraction is split
 * across its subtypes by the Kroupa 2001 IMF (MNRAS 322, 231), a continuous
 * broken power law dN/dM ~ M^-alpha (alpha = 1.3 for 0.08-0.5 Msun, 2.3 above
 * - the canonical Kroupa breakpoints), evaluated at each subtype's
 * `representativeMass`. `derived` from a sourced form; the specific
 * consequence of using the FULL IMF here rather than a flat per-subtype split
 * is that the low-mass end of each class dominates its letter's weight, which
 * is physically correct and NOT an arbitrary choice.
 *
 * THE LOCAL STAR-FORMATION HISTORY. Deconvolving observed fractions into
 * birth fractions requires knowing how long each class has had to accumulate
 * observable representatives. Assumed **constant star-formation rate over a
 * `T_DISC_GYR` = 10 Gyr window** - a simplifying assumption, `tunable`, not a
 * measured local SFH. It is a reasonable order-of-magnitude figure for a
 * disk-dominated 25 pc sample (consistent with the spiral's own
 * thin/thick-disc seam at 8 Gyr, S4, Xiang & Rix 2022) but is explicitly NOT
 * a sourced star-formation-history reconstruction. Named upgrade path: a
 * measured local SFH (e.g. from white-dwarf cooling-sequence ages) would
 * replace the flat window with a real function of lookback time.
 *
 * THE IMF IS ASSUMED METALLICITY- AND AGE-INVARIANT for this deconvolution -
 * standard practice in this kind of population synthesis, and explicitly
 * `tunable (simplification)`, not a claim that the real IMF never varies.
 *
 * -- Amendment A2 ---------------------------------------------------------
 * `pickClass(rng, ctx)` (rather than the Law-1-implied `pickClass(rng)`) is
 * the project's SINGLE SANCTIONED EXCEPTION to Law 5's additive-only-growth
 * rule, because class selection is genuinely conditional on when the system
 * formed - a pure function of an rng and NOTHING ELSE cannot express "this
 * star's class must still be on the main sequence at its own drawn age".
 * **This is not to be extended**: no other module may widen its own
 * interface by appealing to this precedent. The literal comment block the
 * brief instructs be copied here verbatim was never part of the material
 * this package received (same gap as Stage 1's Hansen & Kawaler citation);
 * this paragraph is the from-scratch equivalent, and states the same ruling.
 *
 * -- A CLARIFICATION beyond what Stage 3's own text says, forced by its very
 *    next paragraph -----------------------------------------------------
 * The brief's stage text says "draw class conditional on `ctx.age`"; its OWN
 * gate two sentences later requires "the halo cohort produces K and M
 * primaries only" - which is NOT achievable from age alone at this module's
 * `T_DISC_GYR`-scale lifetimes (a solar-metallicity G9V survives ~16 Gyr, well
 * past a 12 Gyr halo age). It IS achievable once the metallicity-dependent
 * term in `stellarProperties.msLifetimeGyr` is included, because the halo's
 * fehMeanDex = -1.6 (stage0.conformance.ts) shortens every lifetime enough to
 * exclude G dwarfs at halo ages. **`pickClass` therefore takes `ctx.feh` as
 * well as `ctx.age`**, resolving the brief's own internal tension in the
 * direction its gate demands rather than the direction its prose states.
 * `metallicity` (not yet built - see the `age.ts` header for the parallel gap
 * around `formationRank`) is expected to have populated `ctx.feh` by the time
 * `pickClass` runs; this module's own conformance suite supplies `feh`
 * directly rather than depending on that module existing.
 */

import {
  STELLAR_CLASSES, representativeMass, msLifetimeGyr, type StellarClass,
} from './stellarProperties';
import type { Rng } from './rng';

/* ------------------------- Kroupa IMF, within-letter weight ---------------- */

/**
 * Continuous broken power law, Kroupa 2001. Unnormalised (the overall scale
 * cancels out wherever this is used, always as a ratio within one letter
 * class), but continuous at both breakpoints so a letter class that straddles
 * 0.5 Msun (M does) does not pick up an artificial jump in relative weight.
 */
function kroupaImfDensity(massSol: number): number {
  if (massSol < 0.08) return Math.pow(massSol, -0.3);              // k1 = 1
  if (massSol < 0.5) return 0.08 * Math.pow(massSol, -1.3);        // k2 = k1 * 0.08^1.0
  return 0.04 * Math.pow(massSol, -2.3);                            // k3 = k2 * 0.5^1.0
}

/* ------------------------- observed fractions, by letter ------------------- */

type Letter = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

function letterOf(c: StellarClass): Letter { return c[0] as Letter; }

// Pre-normalisation weights; normalised to sum to 1 below. M is `sourced`
// (Golovin et al. 2023, confirmed 72% directly). The rest are `calibrated`
// - see the header.
const LETTER_FRACTION_RAW: Record<Letter, number> = {
  M: 72.0,      // sourced - Golovin et al. 2023 (CNS5)
  K: 14.4,      // calibrated
  G: 9.1,       // calibrated
  F: 3.6,       // calibrated
  A: 0.72,      // calibrated
  B: 0.16,      // calibrated
  O: 0.00004,   // calibrated
};

const LETTER_FRACTION: Record<Letter, number> = (() => {
  const sum = Object.values(LETTER_FRACTION_RAW).reduce((a, b) => a + b, 0);
  const out = {} as Record<Letter, number>;
  for (const k of Object.keys(LETTER_FRACTION_RAW) as Letter[]) out[k] = LETTER_FRACTION_RAW[k] / sum;
  return out;
})();

/** Observed (CNS5-anchored) fraction of each subtype among ALL main-sequence
 *  stars, summing to 1 across all 65 classes. */
const OBSERVED_FRACTION: ReadonlyMap<StellarClass, number> = (() => {
  const byLetter = new Map<Letter, StellarClass[]>();
  for (const c of STELLAR_CLASSES) {
    const l = letterOf(c);
    (byLetter.get(l) ?? byLetter.set(l, []).get(l)!).push(c);
  }
  const out = new Map<StellarClass, number>();
  for (const [letter, classes] of byLetter) {
    const weights = classes.map((c) => kroupaImfDensity(representativeMass(c)));
    const wSum = weights.reduce((a, b) => a + b, 0);
    classes.forEach((c, i) => out.set(c, LETTER_FRACTION[letter] * (weights[i]! / wSum)));
  }
  return out;
})();

/* ------------------------ deconvolution to birth fractions ----------------- */

/**
 * Assumed constant local star-formation window, Gyr. `tunable` - see header.
 */
export const T_DISC_GYR = 10.0;

/** Fraction of a class's formation-history window during which it is still
 *  observable on the main sequence, at the SOLAR-METALLICITY baseline this
 *  deconvolution uses (the CNS5 sample is disk-dominated and roughly solar on
 *  average). Capped at 1: a class that outlives the whole window is fully
 *  represented, never over-counted. */
function survivorship(c: StellarClass): number {
  return Math.min(msLifetimeGyr(representativeMass(c), 0), T_DISC_GYR) / T_DISC_GYR;
}

/** Birth (IMF-at-formation) fraction of each class, dividing survivorship out
 *  of the observed fractions, normalised to sum to 1. This is what `pickClass`
 *  actually draws from, restricted per-call to the classes that survive to
 *  the system's own drawn age. */
export const BIRTH_FRACTION: ReadonlyMap<StellarClass, number> = (() => {
  const raw = new Map<StellarClass, number>();
  for (const c of STELLAR_CLASSES) raw.set(c, OBSERVED_FRACTION.get(c)! / survivorship(c));
  const sum = [...raw.values()].reduce((a, b) => a + b, 0);
  const out = new Map<StellarClass, number>();
  for (const [c, v] of raw) out.set(c, v / sum);
  return out;
})();

/* --------------------------------- pickClass -------------------------------- */

export interface StellarPopulationCtx {
  readonly age: number;   // Gyr
  readonly feh: number;   // dex
}

/**
 * Amendment A2: `pickClass(rng, ctx)`, not `pickClass(rng)`. See the header.
 * Restricts to classes still on the main sequence at `ctx.age` and `ctx.feh`,
 * renormalises `BIRTH_FRACTION` among the survivors, and draws with EXACTLY
 * ONE call to `rng()` via a cumulative-weight walk.
 */
export function pickClass(rng: Rng, ctx: StellarPopulationCtx): StellarClass {
  const survivors = STELLAR_CLASSES.filter(
    (c) => msLifetimeGyr(representativeMass(c), ctx.feh) > ctx.age,
  );
  if (survivors.length === 0) {
    throw new Error(`pickClass: no class survives to age=${ctx.age} Gyr at feh=${ctx.feh} - ` +
      'this should not happen for any realistic galaxy age; check the caller.');
  }
  const weights = survivors.map((c) => BIRTH_FRACTION.get(c)!);
  const total = weights.reduce((a, b) => a + b, 0);
  const u = rng() * total;
  let cum = 0;
  for (let i = 0; i < survivors.length; i++) {
    cum += weights[i]!;
    if (u <= cum) return survivors[i]!;
  }
  return survivors[survivors.length - 1]!;   // floating-point fallback, never reached in practice
}

/** P(class = c | age, feh) as this module actually computes it internally -
 *  exported for the conformance suite's round-trip integration check, and
 *  usable by any future caller that wants the probability rather than a draw. */
export function classProbabilityGivenAgeFeh(c: StellarClass, age: number, feh: number): number {
  const survivors = STELLAR_CLASSES.filter((s) => msLifetimeGyr(representativeMass(s), feh) > age);
  if (!survivors.includes(c)) return 0;
  const total = survivors.reduce((a, s) => a + BIRTH_FRACTION.get(s)!, 0);
  return BIRTH_FRACTION.get(c)! / total;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. OBSERVED_FRACTION and BIRTH_FRACTION each sum to 1 across all 65 classes.
 *  2. pickClass never returns a class whose main-sequence lifetime (at
 *     ctx.feh) is shorter than ctx.age.
 *  3. pickClass consumes EXACTLY ONE call to rng().
 *  4. THE STAGE-3 GATE - integrating classProbabilityGivenAgeFeh over a
 *     uniform age distribution on [0, T_DISC_GYR] at feh=0 recovers
 *     OBSERVED_FRACTION within 3% for M, K and G; O/B/A are allowed to differ
 *     by up to ~25% (expected and documented, not a defect).
 *  5. THE HALO GATE - at age ~12 Gyr and feh = -1.6 (the halo population's
 *     own fehMeanDex), only K and M classes survive.
 *  6. Determinism - same rng draw and ctx give the same class, always.
 */
export const STELLAR_POPULATION_GATES = 6 as const;
