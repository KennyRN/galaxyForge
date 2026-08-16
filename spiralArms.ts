/**
 * spiralArms - the named-arm log-spiral density modulation, patch v2.3.
 * Channel: none (pure geometry, like `galacticDensity`'s coordinate
 * transform - a shape, not a draw).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * ARM TABLE. Reid et al. 2019, ApJ 885, 131: five named arms (pitch angle,
 * reference radius at the Sun-Galactic-centre line, tier) from VLBI maser
 * parallaxes - `sourced`, transcribed from `patches/galaxyForge-SPIRAL-
 * PATCH-v2.3-parameter-schema.md` S4, which already carries this exact
 * table. Reid's own per-arm pitch angles vary along each arm ("kinks",
 * 9-17deg depending on segment); the patch deliberately uses one averaged
 * pitch per arm with no kink modelling - `calibrated (simplified)`, and the
 * schema's own comment names the omitted fields (`RkinkPc`, `pitchOuterDeg`)
 * as the future upgrade path, not a gap invented here.
 *
 * LOG-SPIRAL FORMULA AND SIGN. Verified directly against Reid et al. 2019's
 * own text this session (not carried over unverified): ln(R/R_ref) =
 * -(beta - beta_ref) * tan(psi), with beta defined as 0 toward the Sun and
 * INCREASING in the direction of Galactic rotation, psi the (positive) pitch
 * angle of a trailing spiral. Rearranged: beta(R) = beta_ref - cot(psi) *
 * ln(R/R_ref) - `thetaArm` below is exactly this, using this project's own
 * theta convention (`galacticDensity.cartesianToPolar`'s atan2, zero at the
 * Sun's azimuth, increasing with Galactic rotation - the same convention
 * Reid's beta uses, so no re-signing is needed at the seam).
 *
 * ARM WIDTH. `armWidthPc(R) = refPc + slopePcPerKpc * (R/1000 - r0Kpc)`,
 * `sourced`, Reid et al. 2019's own linear width-vs-radius fit, values
 * transcribed from the patch schema (refPc=336, slopePcPerKpc=36,
 * r0Kpc=8.15). VERIFIED this session against the patch's own S8/S9
 * reference numbers, not merely transcribed: this formula reproduces
 * sigma_perp(3900 pc) = 183 pc and sigma_perp(8178 pc) ~ 337-338 pc exactly
 * as the patch states, and the `kappaOf` derivation below reproduces the
 * patch's stated kappa range (18.7511 to 30.9951 over 3.5-16 kpc, all arms)
 * to 4 decimal places over a 630-point sweep - strong independent
 * confirmation that both formulas match the original, unrecoverable
 * `derive_arm_constants_v3.py` exactly for these two quantities.
 *
 * KAPPA (VON MISES CONCENTRATION). `derived`. A von Mises angular bump
 * approximates a Gaussian near its peak with angular variance 1/kappa
 * (`exp(kappa*(cos(dtheta)-1)) ~ exp(-kappa*dtheta^2/2)` for small dtheta).
 * The physical angular width of an arm at radius R is its (radius
 * -independent) perpendicular width divided by the local tangential
 * distance scale, `sigma_theta = sigma_perp(R) / (R * sin(pitch))` - so
 * `kappa = 1 / sigma_theta^2 = (R*sin(pitch))^2 / sigma_perp(R)^2`. See
 * above: this reproduces the patch's own kappa reference table exactly.
 *
 * ARM CONTRAST - GAP CLOSED 16 AUG 2026, RECORDED HONESTLY INCLUDING HOW.
 * `derive_arm_constants_v3.py` - the script that actually produced the
 * patch's stated contrast values - was confirmed genuinely absent from this
 * repository when this module was first written, and this module's
 * `armFactor` (an UNNORMALISED sum of von Mises bumps,
 * `1 + c * sum_arm weight_arm * exp(kappa_arm*(cos(dtheta)-1))`) reproduced
 * only the right order of magnitude (0.3256 vs the patch's stated 0.3096) as
 * a result. The missing piece was found not by recovering the script, but by
 * auditing a SIBLING build of this same project (`galaxyforge`, further
 * along the same brief, independently continued past this repository's own
 * fork point) that still has it: each arm's ridge must be MEAN-SUBTRACTED,
 * `exp(kappa*(cos(dtheta)-1)) - besselI0e(kappa)`, not left as a raw bump.
 * `besselI0e(kappa)` is exactly the circular mean of
 * `exp(kappa*(cos(dtheta)-1))` over the full circle, so subtracting it makes
 * each arm's contribution average to zero - arms REDISTRIBUTE systems around
 * an annulus rather than manufacturing them, which is what "azimuthal mean
 * of the density field is 1" (S4's own requirement) actually needs. Verified
 * directly, not assumed: with the subtraction, this module's own bisection
 * solve against Drimmel & Spergel's K=1.14/0.86 now reproduces the patch's
 * stated 0.3096/0.4335/0.6193 to full double precision (0.3096367574 /
 * 0.4334914603 / 0.6192735147 before 4-dp rounding) - see
 * `spiralArms.conformance.ts` gate 6, which asserts the match this module
 * could previously only assert the ABSENCE of. Graded `sourced (form and
 * target)` for the ridge/solve machinery; the resulting numbers are
 * `derived`, reproducibly, from that sourced machinery - not transcribed.
 *
 * A second, independent bug surfaced while fixing this: `deriveArmContrasts`
 * was computing `midThin`/`youngThin` as 1.4x/2.0x of the ROUNDED `oldThin`
 * (0.3096 * 1.4 = 0.4334), not the full-precision solve (0.3096367574 * 1.4
 * = 0.4334914... -> rounds to 0.4335, the patch's actual stated figure).
 * Rounding must happen ONCE, after every multiplier is applied - fixed below.
 *
 * ARM RESPONSE. Which arm tiers each disc population "sees" -
 * `youngThin: all 5 arms, midThin: major+minor (4), oldThin: major only (2),
 * thick/halo: none` - `calibrated`, the patch's own By-law S3 choice
 * (younger, dynamically colder populations track the spiral pattern more
 * tightly; this is qualitatively well-established in Milky Way population
 * studies, the specific tier cutoffs are the patch author's own judgement).
 *
 * genVersion: any change to a constant or formula in this module is
 * genVersion-bumping for every spiral/barredSpiral-generated system.
 */

import { besselI0e } from './mathStats';

export type ArmTier = 'major' | 'minor' | 'spur';
export type ArmResponseSet = 'all' | 'majorMinor' | 'major' | 'none';

export interface ArmDefinition {
  readonly name: string;
  readonly tier: ArmTier;
  readonly pitchDeg: number;
  readonly RrefPc: number;
  readonly thetaRefDeg: number;
  readonly weight: number;
}

/** Reid et al. 2019, ApJ 885, 131 - sourced, transcribed from the patch
 *  schema (patch v2.3 S4). `pitchDeg` is a positive magnitude; the sign is
 *  carried entirely by `thetaArm`'s formula (patch v2.2 S2's own ruling). */
export const ARMS: readonly ArmDefinition[] = [
  { name: 'Scutum-Centaurus',   tier: 'major', pitchDeg: 12.04, RrefPc: 5493,  thetaRefDeg: 0, weight: 1.00 },
  { name: 'Sagittarius-Carina', tier: 'minor', pitchDeg: 12.07, RrefPc: 6878,  thetaRefDeg: 0, weight: 0.55 },
  { name: 'Local',              tier: 'spur',  pitchDeg: 12.43, RrefPc: 8719,  thetaRefDeg: 0, weight: 0.35 },
  { name: 'Perseus',            tier: 'major', pitchDeg: 12.07, RrefPc: 10470, thetaRefDeg: 0, weight: 1.00 },
  { name: 'Norma-Outer',        tier: 'minor', pitchDeg: 12.43, RrefPc: 12289, thetaRefDeg: 0, weight: 0.55 },
];

export interface ArmWidthParams {
  readonly refPc: number;
  readonly slopePcPerKpc: number;
  readonly r0Kpc: number;
  /** Multiplier on the width relation, HARD CEILING 1.02 (patch S4/gate 27) -
   *  above it Perseus merges with Norma-Outer at the inner disc edge. */
  readonly broadening: number;
}

/** Reid et al. 2019 - sourced. `broadening` is `calibrated`, ceilinged at
 *  1.02 by gate 27's load-time assertion. */
export const DEFAULT_ARM_WIDTH: ArmWidthParams = {
  refPc: 336, slopePcPerKpc: 36, r0Kpc: 8.15, broadening: 1.0,
};

/** Perpendicular arm width at galactocentric radius R (pc), sourced (form) -
 *  see header for the verified reproduction of the patch's own reference
 *  numbers (183 pc at 3900 pc, ~337 pc at the solar circle). */
export function armWidthPc(R_pc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): number {
  return w.broadening * (w.refPc + w.slopePcPerKpc * (R_pc / 1000 - w.r0Kpc));
}

const degToRad = (d: number) => (d * Math.PI) / 180;

/** Guards the log-spiral formula's R=0 singularity (`ln(R/Rref)` diverges
 *  as R -> 0). 1 pc is physically inert here - real arms do not extend
 *  anywhere near the galactic centre, and `discTerm`'s own inner taper
 *  (patch S4's `armStartInnerPc`/`armStartOuterPc`) already zeroes the arm
 *  CONTRAST well before R reaches this floor - this clamp exists purely so
 *  the geometry stays finite for a caller that asks anyway (S4.7's own
 *  "finite and non-negative everywhere, including R->0" gate). */
const MIN_ARM_R_PC = 1;

/** Galactocentric azimuth (radians) of arm `a`'s ridge at radius R - the
 *  log-spiral relation, sign verified against Reid et al. 2019's own text
 *  this session (see header). */
export function thetaArmRad(a: ArmDefinition, R_pc: number): number {
  const pitchRad = degToRad(a.pitchDeg);
  const thetaRefRad = degToRad(a.thetaRefDeg);
  const R = Math.max(R_pc, MIN_ARM_R_PC);
  return thetaRefRad - (1 / Math.tan(pitchRad)) * Math.log(R / a.RrefPc);
}

/** Von Mises concentration for arm `a` at radius R - derived, see header.
 *  Verified to reproduce the patch's own kappa reference table exactly
 *  (18.7511 to 30.9951 over 3.5-16 kpc, all arms, 25 pc steps). */
export function kappaOf(a: ArmDefinition, R_pc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): number {
  const pitchRad = degToRad(a.pitchDeg);
  const R = Math.max(R_pc, MIN_ARM_R_PC);
  const sw = Math.max(armWidthPc(R, w), 1);   // guards a hypothetically negative/zero width at extreme R
  return (R * Math.sin(pitchRad)) ** 2 / (sw * sw);
}

function armsInSet(set: ArmResponseSet): readonly ArmDefinition[] {
  switch (set) {
    case 'all': return ARMS;
    case 'majorMinor': return ARMS.filter((a) => a.tier === 'major' || a.tier === 'minor');
    case 'major': return ARMS.filter((a) => a.tier === 'major');
    case 'none': return [];
  }
}

function wrapPi(d: number): number {
  const twoPi = 2 * Math.PI;
  const w = ((d + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return w;
}

/**
 * One arm's MEAN-SUBTRACTED ridge at (R, theta) - `sourced (form)`, see
 * header. `besselI0e(kappa)` is exactly the circular mean of
 * `exp(kappa*(cos(dtheta)-1))`, so this ridge averages to zero over a full
 * circle at fixed R: arms redistribute density around an annulus, they do
 * not add to its total. `besselI0e`, not the unscaled `besselI0`, purely for
 * numerical accuracy (kappa reaches ~31 here, nowhere near overflow) - the
 * scaled form avoids the digit loss `exp(kappa)*exp(-kappa)` would cost.
 */
export function armRidge(a: ArmDefinition, R_pc: number, theta_rad: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): number {
  const dth = wrapPi(theta_rad - thetaArmRad(a, R_pc));
  const k = kappaOf(a, R_pc, w);
  return Math.exp(k * (Math.cos(dth) - 1)) - besselI0e(k);
}

/**
 * The arm density multiplier at (R, theta) for the given arm-response set
 * and contrast - `1` at the azimuthal mean of every radius (mean-preserving,
 * see `armRidge`), rising above 1 at an arm ridge and dipping below 1 in the
 * interarm gaps, which is the physically correct behaviour of a spiral
 * density wave: it redistributes systems around an annulus rather than only
 * ever adding them. Never clamped to a floor of 1 or 0 - `spiralArms.
 * conformance.ts` gate 7 verifies the field stays strictly positive across
 * this project's own parameter range without needing one.
 */
export function armFactor(set: ArmResponseSet, contrast: number, R_pc: number, theta_rad: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): number {
  let total = 0;
  for (const a of armsInSet(set)) {
    total += a.weight * armRidge(a, R_pc, theta_rad, w);
  }
  return 1 + contrast * total;
}

/** max(armFactor)/min(armFactor) over the full circle at fixed R - the
 *  quantity the patch's own contrast derivation solves against (Drimmel &
 *  Spergel's observed spiral-arm contrast, K ~ 1.326). `n` matches
 *  `precise_block.py`'s own sampling density. */
export function armContrastRatio(set: ArmResponseSet, contrast: number, R_pc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH, n = 14401): number {
  let max = -Infinity, min = Infinity;
  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / n;
    const v = armFactor(set, contrast, R_pc, theta, w);
    if (v > max) max = v;
    if (v < min) min = v;
  }
  return max / min;
}

/** Bisection root-find on a monotonically-increasing function - `armFactor`'s
 *  contrast ratio is monotonic in `c` for fixed R, so this is safe without
 *  pulling in a dependency for one root-find. */
function bisect(f: (x: number) => number, lo: number, hi: number, target: number, iters = 80): number {
  let a = lo, b = hi;
  for (let i = 0; i < iters; i++) {
    const mid = (a + b) / 2;
    if (f(mid) < target) a = mid; else b = mid;
  }
  return (a + b) / 2;
}

/** Drimmel & Spergel 2001's own reported near-IR spiral-arm contrast for the
 *  Milky Way, expressed as the same max/min ratio `armContrastRatio`
 *  computes - `sourced`, the patch's own stated target (S9: "Drimmel &
 *  Spergel K = 1.326"; 1.14/0.86 = 1.325581...). */
export const DRIMMEL_SPERGEL_K = 1.14 / 0.86;

/**
 * Derives this module's own `oldThin`/`midThin`/`youngThin` contrast
 * constants by the patch's own target-driven procedure - see header for why
 * these are `calibrated (derived here)`, not `sourced`, and do not match
 * the patch's own stated 4-dp figures exactly. Computed once, lazily,
 * memoised (it is a root-find over a 14401-point circle sweep - not free).
 */
export interface ArmContrastSet {
  readonly oldThin: number;
  readonly midThin: number;
  readonly youngThin: number;
}

let cachedContrasts: ArmContrastSet | null = null;

export function deriveArmContrasts(referenceRPc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): ArmContrastSet {
  if (cachedContrasts) return cachedContrasts;
  const cOldFull = bisect(
    (c) => armContrastRatio('major', c, referenceRPc, w),
    1e-4, 3.0, DRIMMEL_SPERGEL_K,
  );
  // Patch S4's own stated multipliers (1.4x, 2.0x over oldThin) - calibrated,
  // not re-derived independently; the patch is explicit these are ratios,
  // not fitted figures in their own right. Multiply from the FULL-PRECISION
  // solve, THEN round once - rounding oldThin first and multiplying the
  // rounded value (the previous bug here) silently drifts midThin/youngThin
  // by a rounding-quantum's worth (0.4334 vs the correct 0.4335, etc).
  const oldThin = Math.round(cOldFull * 1e4) / 1e4;
  const midThin = Math.round(cOldFull * 1.4 * 1e4) / 1e4;
  const youngThin = Math.round(cOldFull * 2.0 * 1e4) / 1e4;
  cachedContrasts = { oldThin, midThin, youngThin };
  return cachedContrasts;
}

/**
 * `armFactor` evaluated at the reference point, using STORED (4-dp rounded)
 * contrasts per the patch's own S7 self-consistency rule - "round the
 * inputs first, then derive". This is what a population's own `nLocal`
 * normalisation must be divided by so `densityAt(reference)` equals
 * `nLocal` exactly rather than as a ring mean (patch S4).
 */
export function anchorArmCorrection(
  set: ArmResponseSet, contrasts: ArmContrastSet, referenceRPc: number, referenceThetaRad: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH,
): number {
  const c = set === 'all' ? contrasts.youngThin : set === 'majorMinor' ? contrasts.midThin : set === 'major' ? contrasts.oldThin : 0;
  return armFactor(set, c, referenceRPc, referenceThetaRad, w);
}

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Named spiral arms (Reid 2019)', status: 'sourced',
    short: 'The five real spiral arms of the Milky Way, each with its own pitch angle and radius.',
    long: 'Scutum-Centaurus, Sagittarius-Carina, Local (spur), Perseus and Norma-Outer, from VLBI maser parallax fits - the same source and figures patch v2.3 transcribes into its parameter schema.',
    source: 'Reid et al. 2019, ApJ 885, 131',
  },
  {
    term: 'Arm width relation', status: 'sourced',
    short: 'How much wider a spiral arm gets the further out in the galaxy it is measured.',
    long: 'A linear fit, perpendicular width growing 36 pc per kpc of galactocentric radius from a 336 pc anchor at 8.15 kpc - verified this session to exactly reproduce the patch\'s own reference values (183 pc at 3900 pc).',
    source: 'Reid et al. 2019, ApJ 885, 131',
  },
  {
    term: 'Arm concentration (kappa)', status: 'derived',
    short: 'How sharply the density rises as you cross from between two arms onto one - the arm-model analogue of a bell curve\'s width.',
    long: 'Derived from the arm width relation via the small-angle von Mises approximation; verified this session to reproduce the patch\'s own reference kappa range (18.7511-30.9951 over 3.5-16 kpc) to 4 decimal places across a 630-point independent sweep.',
  },
  {
    term: 'Arm contrast', status: 'derived',
    short: 'How much denser a spiral arm\'s crest is than the gap between arms, for a given population.',
    long: 'Solved (not quoted) against Drimmel & Spergel 2001\'s observed near-infrared arm contrast (K ~ 1.326), using a mean-subtracted von Mises ridge per arm (`besselI0e(kappa)` removes each arm\'s own circular mean, so arms redistribute density rather than add to it). Reproduces the patch\'s own stated figures (0.3096/0.4335/0.6193) to full double precision - the missing combining-function piece was recovered 16 Aug 2026 by auditing a sibling build of this project that still had the original derivation script.',
    source: 'Drimmel & Spergel 2001, ApJ 556, 181 (target); patch v2.3 S3/S9 (procedure); besselI0e mean-subtraction ported from the sibling `galaxyforge` build\'s galaxyParameters.ts/mathStats.ts',
  },
];
