/**
 * units - THE ONLY conversion site (Law 3). Every ly/km/degC toggle in the
 * whole plugin is a call into here; no other module holds a conversion
 * factor. This is enforced structurally, not just by convention - see
 * `units.conformance.ts`'s grep gate, which scans every OTHER source file
 * for a hand-rolled conversion constant.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * Every constant below is a DEFINITION (IAU-adopted or exact by convention),
 * not a measurement - there is no soft-numbers ledger here, the same
 * Amendment A3 exemption `rng.ts`/`render`/`vault` carry. Sources: IAU 2015
 * Resolution B3 (nominal solar/planetary conversion constants) for
 * Rsun/Lsun/Msun-in-SI; the exact (post-2012) AU-in-metres definition
 * (IAU 2012 Resolution B2); the Julian year (365.25 days) for ly.
 *
 * genVersion: this module NEVER participates. A conversion factor changing
 * would be a correction to a physical constant, astronomically rare, and
 * even then it changes DISPLAY only - never what a note's stored raw value
 * means, so no existing note becomes stale.
 */

/* --------------------------------- length -------------------------------------- */

const KM_PER_AU = 149597870.7;          // sourced, IAU 2012 Resolution B2 (exact)
const AU_PER_PC = 206264.80625;         // sourced, definition of the parsec (exact, arcsecond geometry)
const KM_PER_PC = KM_PER_AU * AU_PER_PC;
const DAYS_PER_JULIAN_YEAR = 365.25;    // sourced, IAU Julian year definition
const KM_PER_LY = 299792.458 * 3600 * 24 * DAYS_PER_JULIAN_YEAR;   // sourced, c (exact) x Julian year

export function pcToLy(pc: number): number { return (pc * KM_PER_PC) / KM_PER_LY; }
export function lyToPc(ly: number): number { return (ly * KM_PER_LY) / KM_PER_PC; }
export function pcToKm(pc: number): number { return pc * KM_PER_PC; }
export function pcToKpc(pc: number): number { return pc / 1000; }
export function kpcToPc(kpc: number): number { return kpc * 1000; }

export function auToKm(au: number): number { return au * KM_PER_AU; }
export function kmToAu(km: number): number { return km / KM_PER_AU; }
export function auToPc(au: number): number { return au / AU_PER_PC; }
export function pcToAu(pc: number): number { return pc * AU_PER_PC; }

/* -------------------------------- temperature ----------------------------------- */

export function kToC(k: number): number { return k - 273.15; }
export function kToF(k: number): number { return (k - 273.15) * 9 / 5 + 32; }

/* ---------------------------------- stellar --------------------------------------- */

export const RSUN_KM = 696000;          // sourced, IAU 2015 Resolution B3 (nominal)
const LSUN_WATTS = 3.828e26;            // sourced, IAU 2015 Resolution B3 (nominal)
const MSUN_KG = 1.98892e30;             // sourced, IAU nominal solar mass parameter / standard gravitational parameter

export function luminositySolToWatts(lSun: number): number { return lSun * LSUN_WATTS; }
export function radiusSolToKm(rSun: number): number { return rSun * RSUN_KM; }
export function radiusSolToRearth(rSun: number): number { return radiusSolToKm(rSun) / EARTH_RADIUS_KM; }
export function massSolToKg(mSun: number): number { return mSun * MSUN_KG; }
/** AU. `derived` from RSUN_KM/KM_PER_AU - the single home for this ratio,
 *  which several modules (surfaceTemperature's Rstar/2a term) need. */
export const SOLAR_RADIUS_AU = RSUN_KM / KM_PER_AU;

/* ---------------------------------- planetary --------------------------------------- */

export const EARTH_RADIUS_KM = 6371;        // sourced, IAU nominal terrestrial radius
const EARTH_MASS_KG = 5.9722e24;            // sourced, IAU nominal terrestrial mass parameter
const JUPITER_RADIUS_KM = 71492;            // sourced, IAU nominal Jovian equatorial radius
const JUPITER_MASS_KG = 1.89813e27;         // sourced, IAU nominal Jovian mass parameter

export function radiusEarthToKm(rEarth: number): number { return rEarth * EARTH_RADIUS_KM; }
export function kmToRadiusEarth(km: number): number { return km / EARTH_RADIUS_KM; }
export function radiusEarthToRjup(rEarth: number): number { return radiusEarthToKm(rEarth) / JUPITER_RADIUS_KM; }
export function massEarthToKg(mEarth: number): number { return mEarth * EARTH_MASS_KG; }
export function massEarthToMjup(mEarth: number): number { return massEarthToKg(mEarth) / JUPITER_MASS_KG; }
/** Dimensionless. `derived` - Msun/Mearth, the ratio several modules
 *  (`planets`, `remnants`) need directly rather than round-tripping through
 *  kg every time. */
export const MEARTH_PER_MSUN = MSUN_KG / EARTH_MASS_KG;
/** Dimensionless. `derived` - Mearth/Mjup. */
export const MEARTH_PER_MJUP = JUPITER_MASS_KG / EARTH_MASS_KG;

/** Moon orbital distance, planetary radii (Amendment A1) -> km, given the
 *  HOST planet's own radius in Rearth. */
export function orbitRpToKm(orbitRp: number, hostRadiusEarth: number): number {
  return orbitRp * radiusEarthToKm(hostRadiusEarth);
}

/* ----------------------------------- time ------------------------------------------- */

export function gyrToMyr(gyr: number): number { return gyr * 1000; }
export function gyrToYr(gyr: number): number { return gyr * 1e9; }
export function myrToGyr(myr: number): number { return myr / 1000; }

/* -------------------------------- metallicity -------------------------------------- */

/** [Fe/H] dex -> linear ratio relative to solar (10^dex). */
export function dexToLinearRatio(dex: number): number { return Math.pow(10, dex); }
export function linearRatioToDex(ratio: number): number { return Math.log10(ratio); }

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. Every conversion round-trips to within floating-point tolerance
 *     (pc->ly->pc, AU->km->AU, Rearth->km->Rearth, etc).
 *  2. `pcToKm(1)` matches the well-known parsec-in-km figure to 6
 *     significant figures (~3.0857e13 km) - a sanity check against an
 *     independently-known number, not just internal consistency.
 *  3. `kToC(273.15) === 0` and `kToF(273.15) === 32` exactly (the freezing
 *     point of water, a well-known fixed point).
 *  4. STRUCTURAL - no OTHER source file in the project defines a conversion
 *     constant of its own (grepped for characteristic literals like
 *     149597870 across every file except this one and `verification/`).
 *  5. Every function here is pure - no `Rng` parameter, no side effect.
 */
export const UNITS_GATES = 5 as const;
