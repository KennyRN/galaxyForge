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

/** pc <-> cm. `derived` from `KM_PER_PC` (no new literal - 1 km = 1e5 cm
 *  exactly, by SI definition). Added 30 Aug 2026 for `nebulaMorphology`'s
 *  Stromgren/Weaver radii, which are computed in cm (n in cm^-3, alpha_B in
 *  cm^3 s^-1) and reported in the project's canonical pc. */
const CM_PER_PC = KM_PER_PC * 1e5;
export function pcToCm(pc: number): number { return pc * CM_PER_PC; }
export function cmToPc(cm: number): number { return cm / CM_PER_PC; }

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

/** Surface gravity, in Earth g - g/g_earth = (M/Mearth)/(R/Rearth)^2, Newton's
 *  law of gravitation with both quantities already in Earth units so the
 *  constant cancels. `sourced (form)`, no free parameter. Added 15 Aug 2026
 *  for `terraforming.terraformabilityOf`/`humanHabitability
 *  .assessHumanHabitability`, both of which take `gravityG` as a caller
 *  -supplied value but neither of which computed it (a real, previously
 *  -unfilled gap - see `systemConductor.ts`'s own header). Lives here, not
 *  in either of those two modules, because it belongs to neither
 *  exclusively (Law 1) and is pure canonical-unit physics, `units.ts`'s own
 *  charter. */
export function surfaceGravityG(massEarth: number, radiusEarth: number): number {
  return massEarth / (radiusEarth * radiusEarth);
}

/* ----------------------------------- time ------------------------------------------- */

export function gyrToMyr(gyr: number): number { return gyr * 1000; }
export function gyrToYr(gyr: number): number { return gyr * 1e9; }
export function myrToGyr(myr: number): number { return myr / 1000; }
/** Myr <-> yr. Added 30 Aug 2026: `nebulaMorphology` declares the nebula
 *  DYNAMICAL timescale canonical in Myr (a DISTINCT quantity from stellar
 *  age/Gyr - the same different-quantity/different-unit precedent as
 *  R_sun / R_earth / km for radii), and the Weaver/Spitzer expansion laws
 *  need the time in seconds, reached via yr. */
export function myrToYr(myr: number): number { return myr * 1e6; }
export function yrToMyr(yr: number): number { return yr / 1e6; }
/** yr <-> s, Julian year (reuses `DAYS_PER_JULIAN_YEAR`, the same factor
 *  `KM_PER_LY` is already built from - no new literal). `nebulaMorphology`'s
 *  Weaver/Spitzer expansion laws are dimensionally in seconds. */
export function yrToSeconds(yr: number): number { return yr * DAYS_PER_JULIAN_YEAR * 24 * 3600; }
export function secondsToYr(s: number): number { return s / (DAYS_PER_JULIAN_YEAR * 24 * 3600); }

/* ------------------------- ionising photon rate ---------------------------------- */

/**
 * Ionising photon output is STORED as log10(Q / s^-1) (the form Martins,
 * Schaerer & Hillier 2005 Table 1 tabulates it in), and used linearly in the
 * Stromgren volume `Q / (n^2 alpha_B)`. Added 30 Aug 2026 for
 * `nebulaMorphology`. Functionally identical to `dexToLinearRatio` /
 * `linearRatioToDex` but kept as a separate named pair because the quantity
 * is a photon RATE, not a [Fe/H] abundance ratio - a shared name would make
 * one of the two call sites read wrong, the same reasoning Ruling 7 gives
 * for keeping degrees and radians as their own pair.
 */
export function ionisingRateLogToLinear(logQ: number): number { return Math.pow(10, logQ); }
export function ionisingRateLinearToLog(q: number): number { return Math.log10(q); }

/* -------------------------------- metallicity -------------------------------------- */

/** [Fe/H] dex -> linear ratio relative to solar (10^dex). */
export function dexToLinearRatio(dex: number): number { return Math.pow(10, dex); }
export function linearRatioToDex(ratio: number): number { return Math.log10(ratio); }

/* ----------------------------------- angle ------------------------------------------ */

/**
 * Ruling 7 (arms bundle R2, Prompt P2, 27 Aug 2026): degrees are canonical
 * for every azimuth/arc/pitch-angle quantity (`tracedSpanDeg`, `armTipArcDeg`,
 * `betaKink`, `pitchOuterDeg`, pitch angle generally) - matching every
 * sourced table this project draws from (Reid 2019, Honig & Reid 2015,
 * Hyland 2026 all report in degrees) and the existing `StarForge-
 * CONSOLIDATED-BUILD-BRIEF.md` law's own human-readability principle (the
 * same one that made AU and Rsun canonical over metres). Radians are a
 * MATH-ONLY intermediate, never stored - convert via these two functions,
 * and nowhere else. A sign-convention error has already lived in this
 * exact deg/rad seam once (Erratum 3, P3); routing every conversion
 * through one pure pair is the structural fix, enforced by gate 6 below.
 */
export function degToRad(deg: number): number { return deg * Math.PI / 180; }
export function radToDeg(rad: number): number { return rad * 180 / Math.PI; }

/* --------------------------------- density ------------------------------------------ */

/**
 * Ruling 7 (arms bundle R2, Prompt P2, 27 Aug 2026): `systems pc^-2` is
 * canonical for surface (column) density - `densityMap.ts`'s own
 * `DensitySurface` doc comment already named this exact unit and already
 * said the ly^-2 conversion "belongs in units.ts"; it did not yet exist.
 * Derived from the existing pc<->ly length conversion (no new literal), so
 * gate 4's existing literal-reuse check already guards it - a hand-rolled
 * copy elsewhere would still have to reproduce one of `KM_PER_AU`/
 * `KM_PER_LY`'s literals to get the ratio right.
 *
 * Volume density (`systems pc^-3`, the arms-bundle package-01 solar
 * anchor) was ALREADY canonical in the governing law's table before this
 * ruling - see `StarForge-CONSOLIDATED-BUILD-BRIEF.md` section 1, "stellar
 * density". No new function needed there; Ruling 7 only cross-references
 * an existing decision, it does not make a new one.
 */
export function surfaceDensityPc2ToLy2(systemsPerPc2: number): number {
  const pcPerLy = 1 / pcToLy(1);
  return systemsPerPc2 * pcPerLy * pcPerLy;
}
export function surfaceDensityLy2ToPc2(systemsPerLy2: number): number {
  const lyPerPc = pcToLy(1);
  return systemsPerLy2 * lyPerPc * lyPerPc;
}

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
 *  6. STRUCTURAL (Prompt P2, arms bundle R2) - no OTHER source file hand-
 *     rolls a degree/radian conversion (`Math.PI / 180` or `180 / Math.PI`
 *     in either spacing/order) instead of calling `degToRad`/`radToDeg`.
 *     Density conversions need no separate literal check: they are built
 *     from `pcToLy`, so gate 4's existing literal-reuse check already
 *     covers a hand-rolled copy.
 */
export const UNITS_GATES = 6 as const;
