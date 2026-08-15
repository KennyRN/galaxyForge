/**
 * stellarHistory - rotation and activity class, per star. Includes the
 * activity stamp (Build 3): the Rossby number this module already computes
 * is classified once, here, at the source (Law 1 - a concern is not split
 * across files).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * CONVECTIVE TURNOVER TIME. Noyes, Hartmann, Baliunas, Duncan & Vaughan 1984,
 * ApJ 279, 763 - the classic empirical fit, confirmed this session against
 * the literature: for x = 1-(B-V) > 0, log10(tau_c) = 1.362 - 0.166x +
 * 0.025x^2 - 5.323x^3 (days); for x <= 0, log10(tau_c) = 1.362 - 0.14x.
 * `sourced (form)`, valid over the range it was calibrated on (roughly F-K
 * dwarfs). **THE HEADER TRAP THIS PASS FOUND:** evaluated at the Sun's own
 * Mamajek-table B-V (0.65), this formula gives tau_c ~ 12.0 days, not the
 * brief's stated "near 14.5 d" - and searched literature citing this exact
 * formula commonly quotes a similar ~12-13 day solar value, so 12.0 looks
 * like the CORRECT reading of the named source, not a bug to force toward
 * 14.5. Recorded and kept, the same resolution as Stage 1's absMagV trap:
 * don't bend a sourced number to match an unverified target. The
 * conformance gate below asserts against the literature's own ~10-16 day
 * scatter for this quantity, not against 14.5 specifically.
 *
 * The formula is NOT calibrated for fully-convective M dwarfs (B-V beyond
 * about 1.3-1.4) - extrapolating its x<=0 branch to M5V (B-V=1.83) gives
 * ~30 days, well under real M-dwarf turnover times. **A `calibrated`
 * cool-star extension** (continuous with Noyes at B-V=1, a single power law
 * in B-V) is used beyond that boundary, fit to land at 87 days for M5V - the
 * brief's own stated anchor, and consistent with the wider literature's
 * order-of-magnitude for deep-convective-envelope turnover times. Named
 * upgrade path, exactly as the brief instructs: Johnstone et al. 2021 (or a
 * successor grid) replaces BOTH branches with a real interpolated track.
 *
 * ROTATION EVOLUTION. Barnes 2007, ApJ 669, 1167: the "I-sequence"
 * gyrochronology relation P(B-V, t) = a*((B-V)-c)^b * t^n, t in Myr,
 * a=0.7725, b=0.601, c=0.40 (a colour singularity, not a typo), n=0.5189.
 * `sourced`. Verified this session: evaluated at the Sun's B-V and 4.6 Gyr,
 * this gives P ~ 26.7 d, close to the brief's "near 25 d" target.
 *
 * Barnes' I-sequence is calibrated on F-K dwarfs and is not meant to apply
 * during pre-main-sequence contraction/disk-locking; `T_ZAMS_GYR` floors the
 * age fed into it. It is ALSO known to under-predict how long fully
 * -convective M dwarfs stay in the saturated (fast-rotating) regime - this is
 * exactly the phenomenon Pass, Charbonneau & Vanderburg 2025 (ApJL 986, L3,
 * already named in this brief at Stage 8 for the same reason) report: mid
 * -to-late M dwarfs stay saturated far longer than a naive spin-down law
 * predicts. `saturationFloorGyr` is a `tunable` correction in that DIRECTION
 * (mass-dependent, zero for FGK) rather than a sourced number - the
 * magnitude is invented, the qualitative behaviour it enforces is not.
 *
 * ACTIVITY / XUV. Wright, Drake, Mamajek & Henry 2011, ApJ 743, 48: `RO_SAT`
 * = 0.13 (sourced, unsaturated-regime boundary), the unsaturated power-law
 * slope `WRIGHT_BETA` = -2.70 (sourced), and the saturated X-ray luminosity
 * level `log10(LX/Lbol)_sat` = -3.13 (sourced - confirmed this session
 * against the paper's own abstract). `RO_QUIET` = 0.45 is `tunable` -
 * consumer convenience, no sharp physics underneath, exactly as the brief
 * says.
 *
 * genVersion: any change to a constant or formula here is a genVersion
 * -bumping event for every module reading `activityClass` or `xuvFluenceRel`.
 */

import type { Rng } from './rng';
import { colourBV, representativeMass, type StellarClass } from './stellarProperties';
import { probit } from './mathStats';

export type RotationClass = 'slow' | 'fast';
export type ActivityClass = 'flare-active' | 'moderate' | 'quiet';
export type Confidence = 'sourced' | 'extrapolated' | 'out-of-range';

/* -------------------------- convective turnover time ----------------------- */

/** Days. Noyes 1984 within its calibrated range; a calibrated cool-star
 *  extension beyond B-V = 1 (see header). Continuous at the join. */
export function tauConvectiveDays(c: StellarClass): number {
  const bv = colourBV(c);
  if (bv <= 1) {
    const x = 1 - bv;
    const logTau = x > 0
      ? 1.362 - 0.166 * x + 0.025 * x * x - 5.323 * x * x * x
      : 1.362 - 0.14 * x;
    return Math.pow(10, logTau);
  }
  // Cool-star extension, calibrated: continuous with Noyes at B-V = 1
  // (tau_c = 10^1.362 = 23.02 d there), power law in B-V fit to land at
  // 87 d for M5V (B-V = 1.83) - see header.
  const tauAtJoin = Math.pow(10, 1.362);
  const P_EXP = 2.2;   // calibrated
  return tauAtJoin * Math.pow(bv, P_EXP);
}

/* ------------------------------ rotation period ----------------------------- */

const BARNES_A = 0.7725, BARNES_B = 0.601, BARNES_C = 0.40, BARNES_N = 0.5189;   // sourced, Barnes 2007

/** Gyr. Floor on the age fed into Barnes' g(t) = t^n: the I-sequence is
 *  post-disk-locking, not a pre-main-sequence law. `tunable`. */
export const T_ZAMS_GYR = 0.030;

/** Median (unscattered) rotation period, Barnes 2007, days. Guards the
 *  B-V = 0.40 colour singularity with a small positive floor rather than
 *  letting hot, radiative-envelope stars (which this whole mechanism does
 *  not apply to) produce NaN or Infinity. */
function barnesPeriodDaysMedian(c: StellarClass, ageGyrRaw: number): number {
  const ageGyr = Math.max(ageGyrRaw, T_ZAMS_GYR);
  const base = Math.max(colourBV(c) - BARNES_C, 0.05);
  const tMyr = ageGyr * 1000;
  return BARNES_A * Math.pow(base, BARNES_B) * Math.pow(tMyr, BARNES_N);
}

/** Star-to-star rotation scatter at fixed class and age, log-normal in
 *  period. `tunable` - order-of-magnitude consistent with the spread seen in
 *  open-cluster rotation-period sequences at fixed colour, not a specific
 *  citation. Applied identically to `initialPeriodDays` and
 *  `presentPeriodDays` so a star is consistently "fast/slow for its mass"
 *  across its life, rather than independently re-scattered at every query. */
const ROTATION_SCATTER_SIGMA_DEX = 0.10;   // tunable

function scatterMultiplier(rotationPercentile: number): number {
  const p = Math.min(Math.max(rotationPercentile, 1e-9), 1 - 1e-9);
  return Math.pow(10, ROTATION_SCATTER_SIGMA_DEX * probit(p));
}

export function presentPeriodDays(c: StellarClass, ageGyr: number, rotationPercentile: number): number {
  return barnesPeriodDaysMedian(c, ageGyr) * scatterMultiplier(rotationPercentile);
}

export function initialPeriodDays(c: StellarClass, rotationPercentile: number): number {
  return barnesPeriodDaysMedian(c, T_ZAMS_GYR) * scatterMultiplier(rotationPercentile);
}

export function rossbyNumber(c: StellarClass, ageGyr: number, rotationPercentile: number): number {
  return presentPeriodDays(c, ageGyr, rotationPercentile) / tauConvectiveDays(c);
}

/* ------------------------------ activity class ------------------------------- */

export const RO_SAT = 0.13;      // sourced, Wright et al. 2011
export const RO_QUIET = 0.45;    // tunable

/**
 * Extra flare-active floor for fully-convective, cool stars, Gyr. Zero for
 * FGK (mass >= 0.6 Msun); rises toward lower mass. `tunable` magnitude, real
 * direction - see header (Pass, Charbonneau & Vanderburg 2025).
 */
function saturationFloorGyr(c: StellarClass): number {
  const K = 7;   // tunable
  return Math.max(0, (0.6 - representativeMass(c)) * K);
}

export function activityClassOf(c: StellarClass, ageGyr: number, rotationPercentile: number): ActivityClass {
  if (ageGyr < saturationFloorGyr(c)) return 'flare-active';
  const Ro = rossbyNumber(c, ageGyr, rotationPercentile);
  if (Ro < RO_SAT) return 'flare-active';
  if (Ro < RO_QUIET) return 'moderate';
  return 'quiet';
}

/**
 * Age at which this star's OWN rotation track (same rotationPercentile
 * scatter) crosses out of the saturated regime. `Ro(age)` is monotonically
 * increasing in age (period grows via spin-down, tau_c is age-independent),
 * so the crossing is unique - found by bisection. Respects
 * `saturationFloorGyr`, which is what makes the CONSISTENCY INVARIANT hold:
 * any star with `ageGyr < saturatedUntilGyr` is `'flare-active'`, by
 * construction, not by coincidence.
 */
export function saturatedUntilGyr(c: StellarClass, rotationPercentile: number): number {
  const floor = saturationFloorGyr(c);
  let lo = floor, hi = Math.max(floor, T_ZAMS_GYR) + 40;   // 40 Gyr is comfortably past any Ro crossing
  // Guard: if already unsaturated at the search floor, the star was never
  // saturated past the floor at all (possible for hot/fast-spinning-down
  // classes) - the floor IS the crossing in that case.
  if (rossbyNumber(c, hi, rotationPercentile) < RO_SAT) return hi;   // pathological; never observed in-range
  if (rossbyNumber(c, Math.max(floor, T_ZAMS_GYR), rotationPercentile) >= RO_SAT) return floor;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (rossbyNumber(c, mid, rotationPercentile) < RO_SAT) lo = mid; else hi = mid;
  }
  return Math.max((lo + hi) / 2, floor);
}

/* ---------------------------------- XUV -------------------------------------- */

const RX_SAT = Math.pow(10, -3.13);   // sourced, Wright et al. 2011
const WRIGHT_BETA = -2.70;            // sourced, Wright et al. 2011

/** L_X / L_bol at a given age - the saturated/unsaturated Wright et al. 2011
 *  law, keyed on THIS star's own Rossby number. */
export function xuvLuminosityRel(c: StellarClass, ageGyr: number, rotationPercentile: number): number {
  const Ro = rossbyNumber(c, ageGyr, rotationPercentile);
  const floored = ageGyr < saturationFloorGyr(c);
  if (floored || Ro < RO_SAT) return RX_SAT;
  return RX_SAT * Math.pow(Ro / RO_SAT, WRIGHT_BETA);
}

const SUN_CLASS: StellarClass = 'G2V';
const SUN_AGE_GYR = 4.6;
const SUN_ROTATION_PERCENTILE = 0.5;   // the median (unscattered) track defines the reference

/** L_X/L_bol, solar today = 1 - the reference this whole module's XUV output
 *  is normalised against. */
export function xuvPresentRel(c: StellarClass, ageGyr: number, rotationPercentile: number): number {
  return xuvLuminosityRel(c, ageGyr, rotationPercentile) /
         xuvLuminosityRel(SUN_CLASS, SUN_AGE_GYR, SUN_ROTATION_PERCENTILE);
}

/** Simpson's rule, n even panels, over [lo, hi]. Small, local, and not
 *  reused elsewhere in this module tree (densityMap's z-quadrature is a
 *  distinct concern with its own reasons for existing) - kept private
 *  rather than promoted to `mathStats`, which is frozen by contract. */
function simpsonIntegral(f: (x: number) => number, lo: number, hi: number, n: number): number {
  const h = (hi - lo) / n;
  let acc = f(lo) + f(hi);
  for (let i = 1; i < n; i++) acc += f(lo + i * h) * (i % 2 ? 4 : 2);
  return (acc * h) / 3;
}

/** Cumulative XUV luminosity integral (dimensionless-relative, not yet
 *  distance-scaled), from `T_ZAMS_GYR` to `ageGyr`. */
function fluenceIntegral(c: StellarClass, ageGyr: number, rotationPercentile: number): number {
  const lo = T_ZAMS_GYR;
  if (ageGyr <= lo) return 0;
  return simpsonIntegral((t) => xuvLuminosityRel(c, t, rotationPercentile), lo, ageGyr, 200);
}

/** Computed ONCE at module load: the Sun's own cumulative XUV integral,
 *  T_ZAMS_GYR to 4.6 Gyr, at the median rotation track. This is the
 *  denominator EVERY `xuvFluenceRel` call divides by, which is what makes
 *  `xuvFluenceRel(G2V, 4.6 Gyr, median)` come out to EXACTLY 1.0 by
 *  construction rather than by tuning - dividing a number by itself. */
const SUN_FLUENCE_REFERENCE = fluenceIntegral(SUN_CLASS, SUN_AGE_GYR, SUN_ROTATION_PERCENTILE);

/**
 * Cumulative XUV fluence AT THE FIXED 1 AU REFERENCE (types.ts: "Earth-at
 * -4.6-Gyr = 1", Zahnle & Catling units). `atmosphere` (not yet built)
 * rescales this by a planet's OWN semi-major axis via inverse-square; this
 * module never sees a planet's orbit.
 */
export function xuvFluenceRel(c: StellarClass, ageGyr: number, rotationPercentile: number): number {
  return fluenceIntegral(c, ageGyr, rotationPercentile) / SUN_FLUENCE_REFERENCE;
}

/* -------------------------------- assembly ----------------------------------- */

export interface StellarHistoryResult {
  rotationPercentile: number;
  rotationClass: RotationClass;
  activityClass: ActivityClass;
  initialPeriodDays: number;
  presentPeriodDays: number;
  xuvPresentRel: number;
  xuvFluenceRel: number;
  saturatedUntilGyr: number;
  preMainSequenceFactor: number;
  confidence: Confidence;
}

/**
 * Assembles the full `StellarHistoryResult` for one star. `rng` is consumed
 * for EXACTLY ONE draw (`rotationPercentile`) - "the only seeded quantity in
 * the module" (types.ts). `luminositySol <= 0` marks a remnant: classifies
 * `'quiet'` by definition, per the brief, with no rotation physics applied.
 */
export function rollStellarHistory(
  rng: Rng, c: StellarClass, ageGyr: number, luminositySol: number,
): StellarHistoryResult {
  const rotationPercentile = rng();
  const rotationClass: RotationClass = rotationPercentile < 0.5 ? 'fast' : 'slow';

  if (!(luminositySol > 0)) {
    return {
      rotationPercentile, rotationClass, activityClass: 'quiet',
      initialPeriodDays: 0, presentPeriodDays: 0,
      xuvPresentRel: 0, xuvFluenceRel: 0, saturatedUntilGyr: 0,
      preMainSequenceFactor: 1, confidence: 'out-of-range',
    };
  }

  const mass = representativeMass(c);
  const confidence: Confidence = mass >= 0.1 && mass <= 1.2 ? 'sourced' : 'out-of-range';
  const pmsFactor = ageGyr >= T_ZAMS_GYR ? 1 : Math.max(0, ageGyr / T_ZAMS_GYR);

  return {
    rotationPercentile, rotationClass,
    activityClass: activityClassOf(c, ageGyr, rotationPercentile),
    initialPeriodDays: initialPeriodDays(c, rotationPercentile),
    presentPeriodDays: presentPeriodDays(c, ageGyr, rotationPercentile),
    xuvPresentRel: xuvPresentRel(c, ageGyr, rotationPercentile),
    xuvFluenceRel: xuvFluenceRel(c, ageGyr, rotationPercentile),
    saturatedUntilGyr: saturatedUntilGyr(c, rotationPercentile),
    preMainSequenceFactor: pmsFactor,
    confidence,
  };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. Solar rotation at 4.6 Gyr lands near 25 d (Barnes 2007, median track).
 *  2. tau_c(Sun) and tau_c(M5V) land in defensible literature bands (see
 *     header for why 14.5 d is not asserted literally); tau_c(M5V) DOES hit
 *     the brief's own 87 d anchor, by construction of the cool-star fit.
 *  3. `xuvFluenceRel(G2V, 4.6 Gyr, median)` is EXACTLY 1.0 (self-normalising
 *     construction, not tuned).
 *  4. The Sun classifies `'quiet'`; a young (< 1 Gyr) M5V classifies
 *     `'flare-active'`.
 *  5. CONSISTENCY INVARIANT - for every class/rotationPercentile pair tested,
 *     ageGyr < saturatedUntilGyr implies activityClassOf is `'flare-active'`,
 *     and the converse holds just past the boundary.
 *  6. Remnants (`luminositySol <= 0`) always classify `'quiet'`.
 *  7. `rollStellarHistory` consumes EXACTLY ONE call to `rng()`.
 *  8. Rossby number is monotonically increasing in age at fixed class and
 *     rotationPercentile (the property `saturatedUntilGyr`'s bisection relies
 *     on being unique).
 */
export const STELLAR_HISTORY_GATES = 8 as const;
