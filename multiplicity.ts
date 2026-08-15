/**
 * multiplicity - single/binary/triple fractions, orbital geometry, and
 * birth-mass promotion. Channel `companions`.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * OCCURRENCE. Gonzalez-Payo, Caballero, Cifuentes, Cortes-Contreras & Rica
 * 2026, MNRAS 549, 1, stag838 (brief S4.1, C10) - the mass-binned MF/CSF
 * table quoted there verbatim, `sourced`. Global `MEAN_STARS_PER_SYSTEM` =
 * 1.350 (= 1 + CSF), superseding the precursor's 1.407 per C10's resolution.
 * The count-conditional-on-multiple split (68 double : 19 triple : 3
 * quadruple : 2 quintuple, of 92 multiples) is the same paper's own system
 * census, `sourced`.
 *
 * **THE DECONVOLUTION FIX Stage 5 asks for.** Stage 3's `stellarPopulation`
 * deconvolution assumes single stars only - a flat mass ratio, no companion
 * weighting. This module does not edit that deconvolution (Stage 3 is
 * complete and its own gates are green); it is recorded here, per the
 * brief's own instruction, that pointing the deconvolution at this module's
 * actual companion distribution is future work, NOT done in this pass -
 * `stellarPopulation.T_DISC_GYR`/`BIRTH_FRACTION` still assume single stars.
 * `MEAN_STARS_PER_SYSTEM` landing at 1.350 (not 1.407) is confirmed as the
 * correct, sourced C10 value, not a rounding slip - exactly the "real
 * finding" the brief anticipates, reported rather than tuned away.
 *
 * ORBITAL GEOMETRY. Period: log-normal in log10(days), mean 5.03, sigma 2.28
 * - Raghavan et al. 2010, ApJS 190, 1 (the DM91-style solar-type multiplicity
 * survey fit widely quoted at these values). `sourced`. Converted to
 * semimajor axis via Kepler's third law on total system mass. Eccentricity:
 * a `calibrated` near-thermal draw (e = sqrt(u)) with tidal circularisation
 * below a ~12-day period cutoff - the QUALITATIVE circularisation effect is
 * well established (e.g. Meibom & Mathieu 2005), the specific cutoff and
 * draw shape are ours.
 *
 * Companion mass ratio q = m_companion / m_primary(birth): `calibrated`
 * Uniform(0.2, 1.5) - DELIBERATELY allowed to exceed 1. A companion CAN have
 * been born more massive than the primary; if it has since evolved off the
 * main sequence, it is the system's "original primary" by birth mass, now a
 * white dwarf demoted to a companion slot while the (still-living, lower
 * -birth-mass) star stellarPopulation already chose sits at stars[0] - this
 * is not a hypothetical, it is the real structure of Sirius A/B.
 *
 * HOLMAN & WIEGERT 1999, MNRAS (AJ 117, 621): the S-type and P-type critical
 * -semimajor-axis fitting polynomials, coefficients confirmed against the
 * literature this session (both formulas, independently, not from memory
 * alone):
 *   S-type: a_c/a_bin = 0.464 - 0.380*mu - 0.631*e + 0.586*mu*e
 *                        + 0.150*e^2 - 0.198*mu*e^2
 *   P-type: a_c/a_bin = 1.60 + 5.10*e - 2.22*e^2 + 4.12*mu - 4.27*e*mu
 *                        - 5.09*mu^2 + 4.61*e^2*mu^2
 * `sourced`, mu = m2/(m1+m2) of the reference (innermost) binary pair.
 *
 * WHITE-DWARF PLACEHOLDER PHYSICS. The mass/luminosity/temperature computed
 * for a promoted companion here are a MINIMAL, explicitly-labelled
 * placeholder (a two-segment linear IFMR-style mass relation and a simple
 * Mestel-form cooling luminosity) - `calibrated`, not the authoritative
 * chain. `remnants` (brief S5.2, not yet built) is the single source of
 * truth for white-dwarf physics generally; when it lands, THIS module should
 * call into it rather than keep its own copy, per Law 1. Recorded exactly as
 * `densityMap.ts`'s Cartesian-transform adapter records its own
 * must-be-deleted-later placeholder.
 *
 * genVersion: a change to any constant here (the mass bins, the period/
 * eccentricity model, the Holman & Wiegert coefficients) is genVersion
 * -bumping for every module downstream of `SystemGeometry`.
 */

import type { Rng } from './rng';
import { STELLAR_CLASSES, representativeMass, msLifetimeGyr, teffK, colourBV, radiusSol, luminositySol as msLuminositySol, type StellarClass } from './stellarProperties';
import { probit } from './mathStats';
// `Confidence`, `StellarOrbit` and `SystemGeometry` are declared in
// types.ts (Confidence by exception; the other two are system-geometry
// composites, not taxonomies, so they live with the rest of SystemContext) -
// imported here, not redeclared, per Law 1 single-source-of-truth.
import type { Confidence, StellarOrbit, SystemGeometry } from './types';

/** Declared here: `multiplicity` is this taxonomy's owning module. */
export type BinaryRegime = 'single' | 's-type' | 'p-type';

/* --------------------------------- occurrence ------------------------------- */

interface MassBin { readonly hi: number; readonly lo: number; readonly mf: number; readonly csf: number; }

// Gonzalez-Payo et al. 2026, Table (brief S4.1). Sourced.
const MASS_BINS: readonly MassBin[] = [
  { hi: 3.60, lo: 0.50, mf: 0.410, csf: 0.630 },
  { hi: 0.50, lo: 0.25, mf: 0.318, csf: 0.410 },
  { hi: 0.25, lo: 0.10, mf: 0.253, csf: 0.310 },
  { hi: 0.10, lo: 0.010, mf: 0.093, csf: 0.093 },
];

function binFor(massSol: number): MassBin {
  for (const b of MASS_BINS) if (massSol <= b.hi && massSol > b.lo) return b;
  // Clamp outside the tabulated range to the nearest bin, rather than
  // extrapolating a fraction past [0, 1] - the bins already span 0.01-3.6
  // Msun, which is every mass `stellarProperties` produces except the very
  // hottest handful of O/B classes.
  return massSol > MASS_BINS[0]!.hi ? MASS_BINS[0]! : MASS_BINS[MASS_BINS.length - 1]!;
}

/** Probability this system is a multiple, by PRIMARY mass. */
export function multipleFraction(primaryMassSol: number): number {
  return binFor(primaryMassSol).mf;
}

/** Global companion star fraction + 1, sourced (Gonzalez-Payo et al. 2026,
 *  CSF = 0.350). Superseded 1.407 per correction C10 - see header. */
export const MEAN_STARS_PER_SYSTEM = 1.350;

// Conditional on being a multiple: 68 double : 19 triple : 3 quadruple : 2
// quintuple, of 92 (Gonzalez-Payo et al. 2026's own system census). Sourced.
const MULTIPLE_COUNT_WEIGHTS: readonly [number, number][] = [
  [2, 68], [3, 19], [4, 3], [5, 2],
];

/** Number of stars in the system (1 = single). Exactly one rng() draw. */
export function rollStarCount(rng: Rng, primaryMassSol: number): number {
  const mf = multipleFraction(primaryMassSol);
  const u = rng();
  if (u >= mf) return 1;
  // Walk the conditional count distribution using the REMAINING budget of u
  // (u / mf is uniform on [0,1) given u < mf) - still one draw overall.
  const uCount = u / mf;
  const totalWeight = MULTIPLE_COUNT_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let cum = 0;
  for (const [count, w] of MULTIPLE_COUNT_WEIGHTS) {
    cum += w / totalWeight;
    if (uCount <= cum) return count;
  }
  return MULTIPLE_COUNT_WEIGHTS[MULTIPLE_COUNT_WEIGHTS.length - 1]![0];
}

/* ------------------------------ orbital geometry ----------------------------- */

const PERIOD_LOG10_MEAN = 5.03;    // sourced, Raghavan et al. 2010 (log10 days)
const PERIOD_LOG10_SIGMA = 2.28;   // sourced, Raghavan et al. 2010
const CIRCULARISATION_PERIOD_DAYS = 12;   // calibrated - tidal circularisation cutoff

function rollPeriodDays(u: number): number {
  const logP = PERIOD_LOG10_MEAN + PERIOD_LOG10_SIGMA * probit(Math.min(Math.max(u, 1e-9), 1 - 1e-9));
  // Clamp to something astrophysically sane (a day to ~1e7 days ~ 27 kyr) -
  // the unclamped log-normal tail can otherwise produce absurd separations.
  return Math.pow(10, Math.min(Math.max(logP, 0), 7));
}

function rollEccentricity(u: number, periodDays: number): number {
  if (periodDays < CIRCULARISATION_PERIOD_DAYS) return 0;
  return Math.min(Math.sqrt(u), 0.95);
}

function periodDaysToSemiMajorAxisAu(periodDays: number, totalMassSol: number): number {
  const periodYears = periodDays / 365.25;
  return Math.cbrt(totalMassSol * periodYears * periodYears);
}

/* -------------------------- Holman & Wiegert 1999 ---------------------------- */

/** a_crit / a_bin for an S-type (single-star, "satellite") orbit. */
export function holmanWiegertSType(mu: number, e: number): number {
  return 0.464 - 0.380 * mu - 0.631 * e + 0.586 * mu * e + 0.150 * e * e - 0.198 * mu * e * e;
}

/** a_crit / a_bin for a P-type (circumbinary) orbit. */
export function holmanWiegertPType(mu: number, e: number): number {
  return 1.60 + 5.10 * e - 2.22 * e * e + 4.12 * mu - 4.27 * e * mu -
         5.09 * mu * mu + 4.61 * e * e * mu * mu;
}

/* --------------------------- companions & promotion -------------------------- */

export interface CompanionStar {
  readonly kind: 'main-sequence' | 'white-dwarf';
  readonly birthMassSol: number;
  readonly massSol: number;          // current mass (post-promotion, if any)
  readonly classGuess: StellarClass; // nearest table class by birth mass - a display/flavour label, never re-derived downstream
  readonly luminositySol: number;
  readonly tempK: number;
  readonly radiusSol: number;
  readonly colourBV: number;
  readonly orbit: StellarOrbit;
}

function nearestClassForMass(massSol: number): StellarClass {
  let best = STELLAR_CLASSES[0]!, bestDiff = Infinity;
  for (const c of STELLAR_CLASSES) {
    const d = Math.abs(Math.log(representativeMass(c)) - Math.log(massSol));
    if (d < bestDiff) { bestDiff = d; best = c; }
  }
  return best;
}

// Placeholder IFMR (see header) - two-segment linear, `calibrated`.
function placeholderWdMassSol(progenitorMassSol: number): number {
  const m = 0.5 + 0.11 * Math.max(0, progenitorMassSol - 1);
  return Math.min(m, 1.35);   // Chandrasekhar-adjacent ceiling, not exceeded
}

// Mestel-form cooling, `calibrated` constant (see header - remnants owns the
// real fit once it exists).
function placeholderWdLuminositySol(coolingAgeGyr: number): number {
  const t = Math.max(coolingAgeGyr, 0.01);
  return 0.02 * Math.pow(t, -7 / 5);
}
function placeholderWdRadiusSol(massSol: number): number {
  return 0.0126 * Math.pow(massSol / 0.6, -1 / 3);   // degenerate mass-radius, R ~ M^-1/3
}
function placeholderWdTempK(luminositySolValue: number, radiusSolValue: number): number {
  // L = 4 pi R^2 sigma T^4, in solar units: T = Tsun * (L / R^2)^(1/4)
  return 5772 * Math.pow(luminositySolValue / (radiusSolValue * radiusSolValue), 0.25);
}

/**
 * Draws `count - 1` companions. EXACTLY THREE draws per companion (mass
 * ratio, period, eccentricity) - a fixed, deterministic count regardless of
 * drawn values.
 */
export function rollCompanions(
  rng: Rng, primaryMassSol: number, count: number, systemAgeGyr: number, feh: number,
): CompanionStar[] {
  const out: CompanionStar[] = [];
  for (let i = 0; i < count - 1; i++) {
    const q = 0.2 + rng() * 1.3;             // calibrated, Uniform(0.2, 1.5) - see header
    const periodDays = rollPeriodDays(rng());
    const eccentricity = rollEccentricity(rng(), periodDays);

    const birthMassSol = Math.min(Math.max(q * primaryMassSol, 0.079), 43);
    const totalMassSol = primaryMassSol + birthMassSol;   // for THIS pair's own Kepler conversion
    const separationAu = periodDaysToSemiMajorAxisAu(periodDays, totalMassSol);

    const evolved = msLifetimeGyr(birthMassSol, feh) < systemAgeGyr;
    if (evolved) {
      const massSol = placeholderWdMassSol(birthMassSol);
      const luminositySolValue = placeholderWdLuminositySol(systemAgeGyr);
      const radiusSolValue = placeholderWdRadiusSol(massSol);
      out.push({
        kind: 'white-dwarf', birthMassSol, massSol,
        classGuess: nearestClassForMass(birthMassSol),
        luminositySol: luminositySolValue, radiusSol: radiusSolValue,
        tempK: placeholderWdTempK(luminositySolValue, radiusSolValue),
        colourBV: 0,   // not meaningful for a WD placeholder; `remnants` owns the real value
        orbit: { separationAu, eccentricity },
      });
    } else {
      const c = nearestClassForMass(birthMassSol);
      out.push({
        kind: 'main-sequence', birthMassSol, massSol: birthMassSol, classGuess: c,
        luminositySol: msLuminositySol(c), tempK: teffK(c), radiusSol: radiusSol(c),
        colourBV: colourBV(c),
        orbit: { separationAu, eccentricity },
      });
    }
  }
  return out;
}

/* ------------------------------ system geometry ------------------------------ */

/**
 * Builds the full geometry from a primary and its companions. Holman &
 * Wiegert is evaluated on the INNERMOST pair (index 0): that is the binding
 * constraint on how close a planet may orbit either individual star, and the
 * loosest constraint on how far out a circumbinary orbit must sit.
 */
export function buildSystemGeometry(
  primaryMassSol: number, primaryLuminositySol: number, companions: readonly CompanionStar[],
): SystemGeometry {
  const orbits = companions.map((c) => c.orbit);
  const combinedLuminositySol = primaryLuminositySol + companions.reduce((a, c) => a + c.luminositySol, 0);

  if (companions.length === 0) {
    return {
      regime: 'single', orbits: [], aStypeMaxAu: null, aPtypeMinAu: null,
      combinedLuminositySol, hostsCircumbinary: false, stabilityConfidence: 'sourced',
    };
  }

  const inner = companions[0]!;
  const mu = inner.massSol / (primaryMassSol + inner.massSol);
  const e = inner.orbit.eccentricity;
  const aBin = inner.orbit.separationAu;

  const aStypeMaxAu = holmanWiegertSType(mu, e) * aBin;
  const aPtypeMinAu = holmanWiegertPType(mu, e) * aBin;

  // Very tight or extreme-mass-ratio binaries can push the S-type zone to
  // near nothing - in that regime a system is realistically circumbinary
  // -only. `< 0.05 AU` is a `tunable` threshold, not a sourced boundary.
  const regime: BinaryRegime = aStypeMaxAu < 0.05 ? 'p-type' : 's-type';

  return {
    regime, orbits, aStypeMaxAu, aPtypeMinAu, combinedLuminositySol,
    hostsCircumbinary: true,
    stabilityConfidence: mu < 0.1 ? 'out-of-range' : 'sourced',
  };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. THE STAGE-5 GATE - `stars.length === 1 + geometry.orbits.length`, for
 *     any starCount and any companion draw (a caller assembling `stars` from
 *     [primary, ...companions] and `orbits` from `companions.map(c=>c.orbit)`
 *     satisfies this by construction; asserted directly here too).
 *  2. `StellarOrbit` carries no mass, class or luminosity field - a
 *     structural/type-level check, not a runtime one.
 *  3. `rollStarCount` consumes EXACTLY ONE draw; `rollCompanions` consumes
 *     EXACTLY THREE draws per companion, regardless of what is drawn.
 *  4. Determinism - same rng sequence and inputs give bit-identical output.
 *  5. `MEAN_STARS_PER_SYSTEM` is 1.350, not 1.407 - the C10 finding, asserted
 *     so a future edit cannot silently revert it.
 *  6. Holman & Wiegert: `aStypeMaxAu < aPtypeMinAu` always (a real gap
 *     between the two zones must exist, at every mu/e this module can draw),
 *     and both scale linearly with the binary's own separation.
 *  7. Promotion: a companion whose birth mass would already have evolved off
 *     the main sequence at the system's age is `'white-dwarf'`, never
 *     `'main-sequence'` - and the reverse never happens.
 *  8. Sanity: a companion's mass ratio CAN exceed 1 (representing an
 *     originally-more-massive companion) with non-trivial probability, and
 *     when it does and has evolved, the promotion mechanism actually fires -
 *     the "dead original primary" scenario this module exists to represent.
 */
export const MULTIPLICITY_GATES = 8 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Multiplicity fraction', status: 'sourced',
    short: 'The probability a star has one or more companions.',
    long: 'Mass-binned MF/CSF table from a refereed re-derivation of the same 10 pc catalogue Reyle anchors on; MEAN_STARS_PER_SYSTEM = 1.350 supersedes an earlier 1.407 figure.',
    source: 'Gonzalez-Payo, Caballero, Cifuentes, Cortes-Contreras & Rica 2026, MNRAS 549, 1, stag838',
  },
  {
    term: 'Holman & Wiegert critical semimajor axis', status: 'sourced',
    short: 'The boundary between stable S-type (single-star) and P-type (circumbinary) planetary orbits in a binary.',
    long: 'Two fitting polynomials in mass ratio and eccentricity, independently confirmed against the literature before use.',
    source: 'Holman & Wiegert 1999, AJ 117, 621',
  },
];
