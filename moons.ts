/**
 * moons - moons per planet, own physical model. Channel `moons:{formationIndex}`.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * STABILITY LIMITS. The brief gives the two numbers directly: prograde
 * moons stable to 0.40 R_H (Rosario-Franco et al. 2020) and retrograde to
 * 0.70 R_H (Quarles et al. 2021), where R_H is the planet's Hill radius -
 * `sourced`, used as given, not re-derived (neither paper's own text
 * shipped with this package). The classical form these refine is Domingos,
 * Winter & Yokoyama 2006's fraction-of-Hill-radius result.
 *
 * "DOMINGOS ECCENTRICITY TERMS RESTORED." Domingos et al. 2006's own
 * correction reduces the stable zone as the PLANET'S orbital eccentricity
 * rises (a more eccentric planetary orbit perturbs its satellites' stability
 * more). The paper's exact coefficients never shipped with this package
 * either; what is implemented is a `calibrated` linear reduction,
 * `(1 - planetEccentricity)`, applied to both the prograde and retrograde
 * limits - the qualitative direction (eccentricity shrinks the stable zone)
 * is Domingos et al. 2006's, sourced; the specific linear form and its
 * coefficient of 1.0 are ours, and are the thing to replace if the paper's
 * own polynomial is obtained later.
 *
 * ORIGIN AND SENSE. Prograde moons are treated as co-accreted in the
 * planet's own circumplanetary disk (`origin: 'accretion'`) - the dominant
 * channel for regular satellite systems (Galilean-moon-like). Retrograde
 * moons are treated as captured (`origin: 'capture'`) - real irregular
 * retrograde moons (Triton being the archetype) are overwhelmingly capture
 * products, `sourced (form)`, a well-established qualitative pattern rather
 * than a specific citation. A small additional `origin: 'impact'` channel
 * (Earth's Moon being the archetype) is offered for large moons of ROCKY
 * planets specifically, `calibrated`, at a small tunable rate.
 *
 * COMPOSITION. From `formationAu`, per the brief - rocky inside the snow
 * line, icy beyond it, reusing `snowLineAu` from `planets` (Law 1: one
 * definition of the snow line, not a second copy here).
 *
 * genVersion: any constant here changing is genVersion-bumping.
 */

import type { Rng } from './rng';
import { snowLineAu } from './planets';
import { MEARTH_PER_MSUN, kmToAu, radiusEarthToKm } from './units';

export type MoonComposition = 'rock' | 'ice' | 'mixed';
export type MoonSense = 'prograde' | 'retrograde';
export type MoonOrigin = 'accretion' | 'capture' | 'impact';

export interface MoonDraw {
  radiusKm: number;
  orbitRp: number;          // planetary radii
  composition: MoonComposition;
  sense: MoonSense;
  origin: MoonOrigin;
  tidallyLocked: boolean;
}

const PROGRADE_HILL_FRACTION = 0.40;    // sourced, Rosario-Franco et al. 2020
const RETROGRADE_HILL_FRACTION = 0.70;  // sourced, Quarles et al. 2021

/** AU -> the same unit as `hillRadiusAu`'s inputs; kept in AU throughout,
 *  converted to planetary radii only at the very end via `planetRadiusAu`. */
export function hillRadiusAu(planetAu: number, planetMassEarth: number, starMassSol: number): number {
  return planetAu * Math.pow(planetMassEarth / (3 * starMassSol * MEARTH_PER_MSUN), 1 / 3);
}

/** Stable semimajor axis limit for a moon, in the SAME units as `hillAu`
 *  (AU), with the Domingos-style eccentricity reduction applied. */
export function stableMoonLimitAu(hillAu: number, sense: MoonSense, planetEccentricity: number): number {
  const base = sense === 'prograde' ? PROGRADE_HILL_FRACTION : RETROGRADE_HILL_FRACTION;
  const eccentricityFactor = Math.max(0, 1 - planetEccentricity);   // calibrated - see header
  return hillAu * base * eccentricityFactor;
}

function moonComposition(formationAu: number, hostLuminositySol: number): MoonComposition {
  const sl = snowLineAu(hostLuminositySol);
  if (formationAu < sl * 0.9) return 'rock';
  if (formationAu > sl * 1.1) return 'ice';
  return 'mixed';
}

export interface MoonHostInputs {
  readonly planetAu: number;
  readonly planetFormationAu: number;
  readonly planetMassEarth: number;
  readonly planetRadiusEarth: number;
  readonly planetEccentricity: number;
  readonly planetKind: 'rocky' | 'giant';
  readonly starMassSol: number;
  readonly hostLuminositySol: number;
}

const CAPTURE_RATE = 0.5;         // tunable - fraction of moon slots that are retrograde/captured
const IMPACT_RATE_ROCKY = 0.15;   // calibrated - Moon-like impact-origin rate, rocky planets only
const TIDAL_LOCK_LIMIT_RP = 8;    // tunable - a simplified proxy, not a real tidal-timescale calculation

/**
 * Draws `count` moons for one planet. EXACTLY FOUR draws per moon (sense,
 * semimajor-axis-fraction-of-the-stable-limit, radius, origin-tiebreak).
 */
export function rollMoons(rng: Rng, inputs: MoonHostInputs, count: number): MoonDraw[] {
  const planetRadiusAu = kmToAu(radiusEarthToKm(inputs.planetRadiusEarth));
  const hillAu = hillRadiusAu(inputs.planetAu, inputs.planetMassEarth, inputs.starMassSol);
  const composition = moonComposition(inputs.planetFormationAu, inputs.hostLuminositySol);

  const out: MoonDraw[] = [];
  for (let i = 0; i < count; i++) {
    const uSense = rng(), uAxis = rng(), uRadius = rng(), uOrigin = rng();
    const sense: MoonSense = uSense < CAPTURE_RATE ? 'retrograde' : 'prograde';
    const limitAu = stableMoonLimitAu(hillAu, sense, inputs.planetEccentricity);
    // Placed somewhere within the stable zone, log-uniform from just outside
    // the planet's own radius to the limit - never inside the planet.
    const lo = Math.max(planetRadiusAu * 1.5, limitAu * 0.02);
    const hi = Math.max(limitAu, lo * 1.0001);
    const orbitAu = Math.exp(Math.log(lo) + uAxis * (Math.log(hi) - Math.log(lo)));
    const orbitRp = orbitAu / planetRadiusAu;

    // Radius: bigger planets host bigger moons on average - a `calibrated`
    // scaling, not a citation.
    const maxMoonRadiusKm = Math.max(50, 0.05 * radiusEarthToKm(inputs.planetRadiusEarth));
    const radiusKm = 20 + uRadius * maxMoonRadiusKm;

    let origin: MoonOrigin = sense === 'retrograde' ? 'capture' : 'accretion';
    if (sense === 'prograde' && inputs.planetKind === 'rocky' && uOrigin < IMPACT_RATE_ROCKY) origin = 'impact';

    out.push({
      radiusKm, orbitRp, composition, sense, origin,
      tidallyLocked: orbitRp < TIDAL_LOCK_LIMIT_RP,
    });
  }
  return out;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. No moon's `orbitRp` ever places it beyond `stableMoonLimitAu` for its
 *     own sense (converted to the same unit) - the stability limit is
 *     enforced at draw time.
 *  2. Prograde limit exceeds retrograde limit's own fraction only in the
 *     sense that 0.40 < 0.70 - i.e. PROGRADE_HILL_FRACTION <
 *     RETROGRADE_HILL_FRACTION, asserted directly (a transposition guard,
 *     same idea as S6.2's truncGaussQuantile argument-order gate).
 *  3. Raising planetEccentricity strictly shrinks `stableMoonLimitAu` for
 *     both senses.
 *  4. `rollMoons` consumes EXACTLY FOUR draws per moon.
 *  5. Composition is rock inside the snow line, ice beyond it, using
 *     FORMATION Au (not current Au).
 *  6. Every retrograde moon has origin `'capture'`; impact-origin moons only
 *     ever occur for prograde moons of rocky planets.
 *  7. Determinism.
 */
export const MOONS_GATES = 7 as const;
