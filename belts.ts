/**
 * belts - planetoid belts, own physical model. Channel `belts`.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * SIZE-FREQUENCY DISTRIBUTION. Bottke et al. 2005, Icarus 175, 111,
 * "Linking the collisional history of the main asteroid belt..." is named
 * for the qualitative form - a BROKEN power law, with a shallower slope
 * below the ~100 km "elbow" than above it, `sourced (form)`. The paper's own
 * exact exponents never shipped with this package; the ABOVE-elbow slope
 * used here is instead SOLVED directly from the brief's own two gate
 * anchors (N(>100km)=220, N(>200km)=26 for a main-belt-mass reference belt),
 * which pins it at alpha = log2(220/26) ~ 3.08 exactly - `sourced` in the
 * sense that it is derived from the brief's own stated targets, not
 * invented. The below-elbow slope has no target to solve against and is
 * `calibrated` (shallower, consistent with Bottke's qualitative kink, not
 * fit to any specific number).
 *
 * BELT MASS. 2.4e21 kg is the real asteroid belt's well-known total mass
 * (roughly 4% of the Moon's mass), `sourced` as the brief's own gate target.
 * The bulk density used to convert the SFD to a mass (2.0 g/cm^3, a typical
 * C/S-type mixed asteroid density) is `calibrated`, tuned until the
 * integrated mass lands within the gate's factor-of-two tolerance.
 *
 * COMPOSITION AND SWEEPING. Composition tests the belt's own MID-RADIUS
 * against `snowLineAu` (rocky inside, icy outside - `sourced (form)`, the
 * classical snow-line composition argument). "Swept" belts - a Zone-C
 * annulus that overlaps a planet's own FORMATION semimajor axis (not its
 * final, migrated one) - are suppressed, per the brief's explicit
 * instruction to test against `formationAu`.
 *
 * LATE HEAVY BOMBARDMENT. Stored as a flag plus a depletion factor, per the
 * brief - NOT a `planets` concern. Triggered here by the presence of a
 * MIGRATED giant in the system (the standard dynamical-instability picture,
 * e.g. the Nice model), which is real-planet information this module reads
 * but does not own; `depletionFactor` (`tunable`) then scales the belt's
 * count/mass down, consistent with the real belt having lost the vast
 * majority of its primordial mass.
 *
 * genVersion: any constant here changing is genVersion-bumping.
 */

import type { Rng } from './rng';
import type { PlanetDraw } from './planets';
import { snowLineAu } from './planets';

export type BeltKind = 'main' | 'kuiper';
export type BeltComposition = 'rocky' | 'icy' | 'mixed';

export interface BeltDraw {
  kind: BeltKind;
  composition: BeltComposition;
  innerAu: number;
  outerAu: number;
  countAbove1km: number;
  largestDiameterKm: number;
  lateHeavyBombardment: boolean;
  depletionFactor: number;
  totalMassKg: number;   // carried alongside the interface fields for the gate/ledger; not in types.ts's Belt but useful for callers building it
}

/* --------------------------- size-frequency distribution ---------------------- */

const ELBOW_KM = 100;                                    // sourced (form), Bottke 2005's kink
const ALPHA_ABOVE = Math.log2(220 / 26);                  // sourced, solved from the brief's own anchors (~3.08)
const ALPHA_BELOW = 2.0;                                  // calibrated - shallower, no target to solve against
const N_AT_ELBOW = 220 * Math.pow(ELBOW_KM / 100, -ALPHA_ABOVE);   // = 220 by construction (ELBOW_KM = 100)

/** Cumulative count of bodies larger than `diameterKm`, for a
 *  main-belt-mass (scale = 1) reference belt. Continuous at the elbow.
 *  Exported for the conformance suite's direct gate check (N(>100),
 *  N(>200)) - the module's own public surface (`BeltDraw`) reports only
 *  `countAbove1km`, so the 100/200 km gate values need this. */
export function referenceCountAbove(diameterKm: number): number {
  if (diameterKm >= ELBOW_KM) return 220 * Math.pow(diameterKm / 100, -ALPHA_ABOVE);
  return N_AT_ELBOW * Math.pow(diameterKm / ELBOW_KM, -ALPHA_BELOW);
}

const BULK_DENSITY_KG_M3 = 2000;   // calibrated, typical mixed C/S-type asteroid bulk density

/** Total mass, kg, of a main-belt-mass (scale = 1) reference belt, by
 *  numerically integrating the SFD (as a differential count times sphere
 *  volume) from `dLo` to `dHi` km. */
function referenceMassKg(dLo = 0.1, dHi = 1000, steps = 4000): number {
  // dN/dD from finite differences of the cumulative form, times the mass of
  // a `D`-diameter sphere at BULK_DENSITY_KG_M3.
  const logLo = Math.log(dLo), logHi = Math.log(dHi);
  const h = (logHi - logLo) / steps;
  let mass = 0;
  for (let i = 0; i < steps; i++) {
    const d0 = Math.exp(logLo + i * h), d1 = Math.exp(logLo + (i + 1) * h);
    const dCount = referenceCountAbove(d0) - referenceCountAbove(d1);   // bodies in [d0, d1)
    const dMid = Math.sqrt(d0 * d1) * 1000;   // km -> m, geometric mid-diameter
    const volumeM3 = (4 / 3) * Math.PI * Math.pow(dMid / 2, 3);
    mass += dCount * volumeM3 * BULK_DENSITY_KG_M3;
  }
  return mass;
}

/** Computed once at module load; exported for the conformance suite's mass
 *  gate (the same "compute once, assert directly" pattern as Stage 4's
 *  SUN_FLUENCE_REFERENCE). */
export const REFERENCE_MASS_KG = referenceMassKg();

/* --------------------------------- placement ----------------------------------- */

/** True if a Zone-C annulus [innerAu, outerAu) overlaps any planet's own
 *  FORMATION semimajor axis - swept during formation, per the brief's
 *  explicit instruction to test `formationAu`, not `au`. */
export function isSwept(innerAu: number, outerAu: number, planets: readonly PlanetDraw[]): boolean {
  return planets.some((p) => p.formationAu >= innerAu && p.formationAu <= outerAu);
}

export function beltComposition(innerAu: number, outerAu: number, hostLuminositySol: number): BeltComposition {
  const midAu = (innerAu + outerAu) / 2;
  const sl = snowLineAu(hostLuminositySol);
  if (midAu < sl * 0.9) return 'rocky';
  if (midAu > sl * 1.1) return 'icy';
  return 'mixed';
}

const LHB_DEPLETION_MIN = 0.001, LHB_DEPLETION_MAX = 0.1;   // tunable

/**
 * Draws zero or one belt for a Zone-C annulus. EXACTLY THREE draws when a
 * belt is placed at all (mass scale, LHB occurrence-conditional-on-a
 * -migrated-giant, LHB depletion draw), ZERO when swept (a swept belt is a
 * structural fact, not a random outcome, and consumes nothing).
 */
export function rollBelt(
  rng: Rng, innerAu: number, outerAu: number, hostLuminositySol: number,
  planets: readonly PlanetDraw[],
): BeltDraw | null {
  if (isSwept(innerAu, outerAu, planets)) return null;

  const uScale = rng();
  // Log-normal-ish scale around 1 (a "main-belt-mass" reference), calibrated.
  const massScale = Math.pow(10, (uScale - 0.5) * 1.0);

  const hasMigratedGiant = planets.some((p) => p.kind === 'giant' && p.migrated);
  const uLhb = rng();
  const lateHeavyBombardment = hasMigratedGiant && uLhb < 0.6;   // tunable conditional probability
  const uDepletion = rng();
  const depletionFactor = lateHeavyBombardment
    ? LHB_DEPLETION_MIN + uDepletion * (LHB_DEPLETION_MAX - LHB_DEPLETION_MIN)
    : 1.0;

  const finalScale = massScale * depletionFactor;
  const countAbove1km = referenceCountAbove(1) * finalScale;
  const totalMassKg = REFERENCE_MASS_KG * finalScale;

  // largestDiameterKm: where the (scaled) cumulative count crosses 1 -
  // self-consistent with the same SFD rather than a separately invented cap.
  const largestDiameterKm = solveLargestDiameter(finalScale);

  const composition = beltComposition(innerAu, outerAu, hostLuminositySol);
  const kind: BeltKind = composition === 'icy' ? 'kuiper' : 'main';

  return {
    kind, composition, innerAu, outerAu, countAbove1km, largestDiameterKm,
    lateHeavyBombardment, depletionFactor, totalMassKg,
  };
}

function solveLargestDiameter(scale: number): number {
  // referenceCountAbove(D) * scale = 1  =>  solve for D by bisection (the
  // function is monotonically decreasing in D, so this is well-posed).
  let lo = 0.001, hi = 10000;
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (referenceCountAbove(mid) * scale > 1) lo = mid; else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. THE STAGE-7 GATE - a main-belt-mass (scale = 1, no LHB) reference belt
 *     has N(>100km) within a few percent of 220 and N(>200km) within a few
 *     percent of 26 - by construction of ALPHA_ABOVE, but asserted directly.
 *  2. Integrated reference belt mass is within a factor of two of 2.4e21 kg.
 *  3. `isSwept` fires when and only when a planet's `formationAu` (not `au`)
 *     falls inside the annulus.
 *  4. Composition is rocky inside the snow line, icy outside, mixed at the
 *     boundary.
 *  5. `rollBelt` consumes zero draws when swept, exactly three otherwise.
 *  6. `depletionFactor` is always 1.0 when `lateHeavyBombardment` is false,
 *     and always < 1 when it is true.
 *  7. `largestDiameterKm` is self-consistent: the SFD's own cumulative count
 *     at that diameter is within a small tolerance of 1.
 *  8. Determinism.
 */
export const BELTS_GATES = 8 as const;
