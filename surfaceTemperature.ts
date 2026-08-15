/**
 * surfaceTemperature - OWNS equilibrium temperature, the single source of
 * truth. Channel `surfaceTemperature:{formationIndex}`.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * EQUILIBRIUM TEMPERATURE. The classical radiative-balance formula,
 * `sourced (form)`, textbook physics (Pogson-adjacent to no one - this is
 * the same equation everywhere it appears):
 *
 *   T_eq = T_star * sqrt(R_star / (2a)) * (1 - A)^(1/4)
 *
 * with `R_star` and `a` in the SAME length unit before the ratio is taken
 * (this module converts internally; a caller never has to).
 *
 * ALBEDO. `tunable` - a composition-informed RANGE (icy bodies reflect more
 * than rocky ones, which reflect more than a dark, weathered gas-giant
 * cloud deck), sampled once per planet on this module's own channel. No
 * citation: bond albedo genuinely varies by a factor of several even within
 * one composition class, and nothing in this package's source register
 * pins a distribution.
 *
 * genVersion: a change to the formula or the albedo ranges is
 * genVersion-bumping for `atmosphere` and everything downstream of surface
 * temperature.
 */

import type { Rng } from './rng';
import type { PlanetClass } from './planets';
import { SOLAR_RADIUS_AU } from './units';

/** Kelvin. `a_AU` and `hostRadiusSol` combine internally; `albedo` is [0,1). */
export function equilibriumTempK(hostTempK: number, hostRadiusSol: number, aAu: number, albedo: number): number {
  const rStarAu = hostRadiusSol * SOLAR_RADIUS_AU;
  return hostTempK * Math.sqrt(rStarAu / (2 * aAu)) * Math.pow(1 - albedo, 0.25);
}

/** `tunable` bond-albedo ranges by broad composition. */
function albedoRange(cls: PlanetClass, icy: boolean): [number, number] {
  if (cls === 'sub-giant' || cls === 'giant' || cls === 'super-giant') return [0.25, 0.55];
  if (icy) return [0.4, 0.8];
  return [0.1, 0.35];
}

export interface SurfaceTemperatureDraw {
  readonly albedo: number;
  readonly equilibriumTempK: number;
}

/** EXACTLY ONE draw (the albedo). */
export function rollSurfaceTemperature(
  rng: Rng, cls: PlanetClass, icy: boolean, hostTempK: number, hostRadiusSol: number, aAu: number,
): SurfaceTemperatureDraw {
  const [lo, hi] = albedoRange(cls, icy);
  const albedo = lo + rng() * (hi - lo);
  return { albedo, equilibriumTempK: equilibriumTempK(hostTempK, hostRadiusSol, aAu, albedo) };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. equilibriumTempK(Sun, Earth's orbit, albedo=0.3) lands near 255 K -
 *     the well-known textbook Earth blackbody-equilibrium figure (NOT
 *     Earth's actual ~288 K surface temperature, which includes the
 *     greenhouse effect this module deliberately does not model).
 *  2. Monotonicity: temperature decreases with distance, increases with
 *     host temperature and radius, decreases with albedo - all at fixed
 *     everything else.
 *  3. `rollSurfaceTemperature` consumes EXACTLY ONE draw.
 *  4. Determinism.
 */
export const SURFACE_TEMPERATURE_GATES = 4 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Equilibrium temperature', status: 'sourced',
    short: 'The blackbody temperature a planet would settle at from starlight alone, ignoring any atmosphere.',
    long: 'T_eq = T_star * sqrt(R_star / (2a)) * (1-A)^(1/4), the standard radiative-balance formula used throughout exoplanet characterisation literature.',
    source: 'Standard radiative-equilibrium derivation, e.g. Seager 2010, Exoplanet Atmospheres',
  },
];
