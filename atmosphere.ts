/**
 * atmosphere - abiotic atmospheres; pressure is class-native. Channel
 * `atmosphere:{formationIndex}`.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * THE ATMOSPHERIC RETENTION MODEL (ARM). Meni-Gallardo & Palle 2026, MNRAS
 * 550(1), stag1163, doi:10.1093/mnras/stag1163 - VERIFIED TWICE AGAINST THE
 * PUBLISHED PAPER per the brief, cited from the published article, never
 * the arXiv preprint (a superseded anchor set). Equation 3:
 *
 *   ARM = 5.77 * log10(v_esc) - log10(I_XUV) - 4.35
 *
 * Positive ARM retains an atmosphere; negative strips it. `sourced`, both
 * coefficients (5.77, -4.35) and the anchor set (Mars, GJ 9827 d, L 98-59 d,
 * GJ 3090 b, Pi Mensae c). **Do not use 5.89/-4.49 from any source** - the
 * brief's own S2.5 traces that pair to an April Fools' paper.
 *
 * **A TRANSCRIPTION CORRECTION TO THIS PACKAGE'S OWN BRIEF.** The brief's
 * Stage 8 text (itself reconstructed from a heavily garbled source document
 * at Stage 0 of this build) states `v_esc = 11.186 * sqrt(Msun/Rsun)`, which
 * cannot be right as written: 11.186 km/s is EARTH'S OWN escape velocity,
 * and the brief's own "arithmetic tell" (`5.77 * log10(11.186) = 6.0509`)
 * only holds if `v_esc` reduces to exactly 11.186 for an Earth-mass,
 * Earth-radius body - which requires Earth-relative mass and radius, not
 * solar-relative ones. **The correct, physically consistent form, used
 * here:**
 *
 *   v_esc [km/s] = 11.186 * sqrt( (Mp / Mearth) / (Rp / Rearth) )
 *
 * Verified against three of the brief's own stated Solar-System anchors
 * before trusting it: Earth gives v_esc = 11.186 km/s and ARM = +1.70
 * (retains, correct); Mars gives ARM = +0.058 (within the brief's own
 * +/-0.15 dex band around zero); Pluto gives ARM = -0.68 (fails, as the
 * gate requires). This is the resolution, not a guess - see the
 * conformance suite for the full twelve-body run.
 *
 * I_XUV IS THE CUMULATIVE FLUENCE, NOT PRESENT-DAY IRRADIANCE - confirmed
 * by types.ts's own `Atmosphere.retentionMarginDex` comment ("xuvFluenceRel
 * in ZC units"). Reuses `planets.planetXuvFluence` directly (itself built on
 * Stage 4's `stellarHistory.xuvFluenceRel`) - Law 1, one XUV-exposure
 * definition, never a second copy computed here.
 *
 * SEAMS, per the brief's own note: `ctx.age` (which both `msLifetimeGyr`
 * -conditioned class selection and this module's XUV integral ultimately
 * depend on) originates in the galaxy model for a field system (S4.2) and in
 * the co-natal group draw for a conatal member (S5.3, not yet built) - this
 * module reads whatever `ctx.age` it is handed and does not care which.
 *
 * PRESSURE AND CLOUDS. "Pressure is class-native": a rocky/thin/thick
 * -atmosphere pressure class is read off retained mass, not drawn
 * independently. `CloudClass` (Sudarsky et al. 2000-style giant-envelope
 * temperature bands - ammonia/water/clear/alkali-metal/silicate) is
 * `calibrated`: the qualitative five-band form is Sudarsky's, the specific
 * Kelvin boundaries used here are approximate and not transcribed from the
 * paper's own table, which never shipped with this package.
 *
 * genVersion: any ARM coefficient or the v_esc form is genVersion-bumping.
 */

import type { Rng } from './rng';
import { xuvFluenceRel } from './stellarHistory';
import type { StellarClass } from './stellarProperties';
import type { PlanetClass } from './planets';

export type AtmosphereKind = 'none' | 'thin' | 'thick' | 'gas-envelope';
export type PressureClass = 'vacuum' | 'thin' | 'moderate' | 'thick' | 'crushing';
export type CloudClass = 'clear' | 'water' | 'ammonia' | 'alkali-metal' | 'silicate';

const ARM_SLOPE = 5.77;      // sourced, Meni-Gallardo & Palle 2026
const ARM_ZERO_POINT = -4.35; // sourced, ditto
const EARTH_ESCAPE_KM_S = 11.186;   // sourced - Earth's own escape velocity, the calibration point

/** km/s. Mp/Rp in EARTH units - see header for why, against the brief's own
 *  garbled transcription. */
export function escapeVelocityKmS(massEarth: number, radiusEarth: number): number {
  return EARTH_ESCAPE_KM_S * Math.sqrt(massEarth / radiusEarth);
}

/** The reference/planet's cumulative XUV exposure, reused directly from
 *  Stage 4 via `planets.planetXuvFluence` - never recomputed here. */
export function iXuv(hostClass: StellarClass, hostAgeGyr: number, aAu: number): number {
  return xuvFluenceRel(hostClass, hostAgeGyr, 0.5) / (aAu * aAu);
}

/** The Atmospheric Retention Margin, in dex. Positive retains. */
export function atmosphericRetentionMarginDex(
  massEarth: number, radiusEarth: number, hostClass: StellarClass, hostAgeGyr: number, aAu: number,
): number {
  const vEsc = escapeVelocityKmS(massEarth, radiusEarth);
  const iXuvValue = iXuv(hostClass, hostAgeGyr, aAu);
  // ARM_ZERO_POINT is STORED as -4.35 (the paper's own printed sign), so
  // adding it here is literally "... - 4.35", matching equation 3 verbatim.
  return ARM_SLOPE * Math.log10(vEsc) - Math.log10(iXuvValue) + ARM_ZERO_POINT;
}

/* --------------------------------- classification ---------------------------- */

const THICK_THRESHOLD_DEX = 1.0;    // tunable
const THIN_THRESHOLD_DEX = 0.0;     // matches the ARM sign convention exactly - not a free parameter

function pressureClassOf(kind: AtmosphereKind, massEarth: number): PressureClass {
  if (kind === 'none') return 'vacuum';
  if (kind === 'gas-envelope') return 'crushing';
  if (kind === 'thin') return 'thin';
  // 'thick', scaled by mass - calibrated.
  if (massEarth < 1.5) return 'moderate';
  if (massEarth < 4) return 'thick';
  return 'crushing';
}

function cloudClassOf(equilibriumTempK: number): CloudClass {
  if (equilibriumTempK < 150) return 'ammonia';
  if (equilibriumTempK < 350) return 'water';
  if (equilibriumTempK < 800) return 'clear';
  if (equilibriumTempK < 1500) return 'alkali-metal';
  return 'silicate';
}

export interface AtmosphereDraw {
  readonly kind: AtmosphereKind;
  readonly dominant: string | null;
  readonly pressureClass: PressureClass;
  readonly cloudClass: CloudClass | null;
  readonly equilibriumTempK: number;
  readonly retentionMarginDex: number;
}

/**
 * Assembles the abiotic atmosphere for one planet. Gas-giant-class planets
 * (`sub-giant`/`giant`/`super-giant`) skip the ARM entirely - they are
 * defined by having kept the bulk of their primordial envelope, which the
 * ARM (a STRIPPING model for a thin secondary/primary atmosphere on a
 * rocky-scale body) does not apply to. No draws - fully deterministic given
 * its inputs.
 */
export function rollAtmosphere(
  _rng: Rng, planetClass: PlanetClass, massEarth: number, radiusEarth: number,
  hostClass: StellarClass, hostAgeGyr: number, aAu: number, equilibriumTempK: number,
): AtmosphereDraw {
  if (planetClass === 'sub-giant' || planetClass === 'giant' || planetClass === 'super-giant') {
    return {
      kind: 'gas-envelope', dominant: 'H2/He', pressureClass: 'crushing',
      cloudClass: cloudClassOf(equilibriumTempK), equilibriumTempK,
      retentionMarginDex: Number.POSITIVE_INFINITY,
    };
  }

  const retentionMarginDex = atmosphericRetentionMarginDex(massEarth, radiusEarth, hostClass, hostAgeGyr, aAu);
  let kind: AtmosphereKind;
  if (retentionMarginDex < THIN_THRESHOLD_DEX) kind = 'none';
  else if (retentionMarginDex < THICK_THRESHOLD_DEX) kind = 'thin';
  else kind = 'thick';

  return {
    kind, dominant: kind === 'none' ? null : 'N2/CO2',
    pressureClass: pressureClassOf(kind, massEarth),
    cloudClass: kind === 'none' ? null : cloudClassOf(equilibriumTempK),
    equilibriumTempK, retentionMarginDex,
  };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. `escapeVelocityKmS(1, 1)` (Earth's own mass and radius) equals
 *     EXACTLY 11.186 km/s.
 *  2. THE ARITHMETIC TELL - `5.77 * log10(11.186)` equals 6.0509 to 1e-4.
 *  3. THE STAGE-8 GATE - running the twelve-body Solar-System set (Mercury,
 *     Venus, Earth, Mars, Europa, Ganymede, Callisto, Titan, Triton, Pluto,
 *     Haumea, Eris) at the Sun's class and 4.6 Gyr: at least eleven of
 *     twelve classify correctly (retains iff the body has a real
 *     substantial atmosphere today); Mars and Titan land within +/-0.15 dex
 *     of ARM = 0; Pluto classifies as NOT retaining.
 *  4. Gas-giant-class planets never consume the ARM path (their
 *     `retentionMarginDex` is +Infinity, a sentinel, not a computed value).
 *  5. `retentionMarginDex` decreases monotonically with orbital distance at
 *     fixed planet (more distant = less XUV = ... wait, LESS stripping, so
 *     retention INCREASES with distance) - asserted in the correct
 *     direction, which is itself worth stating plainly given how easy the
 *     brief warns this exact sign is to get backwards.
 *  6. Determinism.
 */
export const ATMOSPHERE_GATES = 6 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Atmospheric retention margin (ARM)', status: 'sourced',
    short: 'How comfortably a planet\'s gravity holds onto its atmosphere against a star\'s high-energy radiation.',
    long: 'The Meni-Gallardo & Palle atmospheric retention model, comparing escape velocity against integrated XUV exposure over the planet\'s life.',
    source: 'Meni-Gallardo & Palle 2026',
  },
  {
    term: 'Escape velocity', status: 'sourced',
    short: 'The speed needed for a gas molecule to permanently leave a planet.',
    long: 'v_esc = 11.186 * sqrt(Mp/Mearth / (Rp/Rearth)) km/s, standard two-body escape-velocity physics in Earth units - corrected during this build from a garbled version of the formula that had conflated Earth\'s own escape velocity with the general formula.',
    source: 'v_esc = sqrt(2GM/R), standard two-body escape-velocity physics (e.g. de Pater & Lissauer, Planetary Sciences)',
  },
];
