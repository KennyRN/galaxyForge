/**
 * prugnielSimien - analytic 3D approximation to a deprojected Sersic
 * spheroid, free Sersic index. Ported 16 Aug 2026 from a sibling build
 * (`galaxyforge`) that already uses it for exactly the population this
 * closes a real gap for: `galaxyModel.ts`'s lenticular classical bulge
 * previously reused the spiral halo's own `hernquist.ts`-style profile
 * (Hernquist, n~4) for its classical bulge - the SAME literature this
 * module's own header cites (Terzic & Graham 2005) says is a poor fit at
 * low Sersic index, which is exactly where Erwin's own mean bulge index
 * (n=1.52, composite configuration) sits. Channel: none (a pure shape, like
 * `hernquistMassDensity` in `galaxyModel.ts` - a formula, not a draw).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * Prugniel & Simien 1997, A&A 321, 111: analytic 3D density
 * rho(r) proportional to (r/Re)^(-p) * exp(-b*(r/Re)^(1/n)) - `sourced`
 * (form). Lima Neto, Gerbal & Marquez 1999, MNRAS 309, 481: refined
 * p(n) = 1 - 0.6097/n + 0.05463/n^2 - `sourced`, adopted verbatim. Ciotti &
 * Bertin 1999, A&A 352, 447: the asymptotic b_n series for the projected
 * Sersic half-light condition gamma(2n,b) = 0.5*Gamma(2n) - `calibrated`,
 * the series is accurate to <~1e-4 for n>~0.5, not an exact root solve at
 * runtime. Terzic & Graham 2005 / Terzic & Sprague 2007: the sourced reason
 * this form exists at all here - Hernquist fails at low Sersic index (dwarf
 * ellipticals, most spiral/S0 bulges).
 *
 * ENCLOSED-MASS FRACTION is an exact incomplete-gamma identity once rho_0
 * is mass-normalised: M(<r)/M_tot = P(s, b*(r/Re)^(1/n)) where
 * s = n*(3-p) - `sourced` (a property of the profile form, not fitted).
 *
 * genVersion: any constant or formula change here is genVersion-bumping for
 * every lenticular-generated classical-bulge system.
 */

import { gammaincLower, lnGamma } from './mathStats';

/** Numerical guard against the r^-p cusp diverging at r=0 - the same
 *  10 pc floor `galaxyModel.ts`'s own `CORE_FLOOR_PC` uses, for the same
 *  reason (a shared numerical convention, not two independent choices). */
export const CORE_FLOOR_PC = 10;

/**
 * Sersic half-light coefficient b_n - Ciotti & Bertin 1999 asymptotic
 * series. Anchors: b(1) ~ 1.678, b(4) ~ 7.669.
 */
export function sersicB(n: number): number {
  if (!(n > 0)) throw new Error(`sersicB: n must be > 0, got ${n}`);
  const inv = 1 / n;
  return 2 * n - 1 / 3
    + (4 / 405) * inv
    + (46 / 25515) * inv * inv
    + (131 / 1148175) * inv * inv * inv;
}

/**
 * Inner power-law index p(n) - Lima Neto, Gerbal & Marquez 1999. Valid for
 * the Sersic indices this project ships (~0.9-4).
 */
export function prugnielP(n: number): number {
  if (!(n > 0)) throw new Error(`prugnielP: n must be > 0, got ${n}`);
  return 1 - 0.6097 / n + 0.05463 / (n * n);
}

/** Shape parameter s = n(3 - p) of the incomplete-gamma mass integral. */
export function prugnielShape(n: number): number {
  return n * (3 - prugnielP(n));
}

/**
 * Enclosed-mass fraction M(<r)/M_tot = P(s, b*(r/Re)^(1/n)). Exact for the
 * Prugniel-Simien density once rho_0 is mass-normalised.
 */
export function prugnielEnclosedMassFraction(rPc: number, rePc: number, n: number): number {
  if (rPc <= 0) return 0;
  if (!(rePc > 0)) throw new Error(`prugnielEnclosedMassFraction: rePc must be > 0`);
  const b = sersicB(n);
  const s = prugnielShape(n);
  const x = b * Math.pow(rPc / rePc, 1 / n);
  return gammaincLower(s, x);
}

/**
 * Central density rho_0 such that INT rho dV = totalMassSol.
 *
 * M_inf = 4*pi * rho_0 * Re^3 * n * Gamma(s) / b^s  =>
 * rho_0 = M_inf * b^s / (4*pi * Re^3 * n * Gamma(s)).
 * Evaluated in logs so Gamma(s) and b^s do not overflow near n~4.
 */
export function prugnielRho0(totalMassSol: number, rePc: number, n: number): number {
  if (!(totalMassSol > 0) || !(rePc > 0) || !(n > 0)) {
    throw new Error(`prugnielRho0: require positive mass, Re, n`);
  }
  const b = sersicB(n);
  const s = prugnielShape(n);
  const lnRho0 = Math.log(totalMassSol)
    + s * Math.log(b)
    - Math.log(4 * Math.PI)
    - 3 * Math.log(rePc)
    - Math.log(n)
    - lnGamma(s);
  return Math.exp(lnRho0);
}

/**
 * Prugniel-Simien mass density (Msun pc^-3).
 * rho(r) = rho_0 * (r/Re)^(-p) * exp(-b*(r/Re)^(1/n)).
 * `r` is floored at `CORE_FLOOR_PC` - a bare call never returns Infinity
 * from the r^(-p) cusp.
 */
export function prugnielSimienMassDensity(rPc: number, totalMassSol: number, rePc: number, n: number): number {
  const r = Math.max(rPc, CORE_FLOOR_PC);
  const rho0 = prugnielRho0(totalMassSol, rePc, n);
  const p = prugnielP(n);
  const b = sersicB(n);
  const x = r / rePc;
  return rho0 * Math.pow(x, -p) * Math.exp(-b * Math.pow(x, 1 / n));
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. sersicB(1) and sersicB(4) land near their well-known anchors (~1.678,
 *     ~7.669).
 *  2. prugnielP is positive and finite over this project's own Sersic-index
 *     range (~0.9-4).
 *  3. prugnielEnclosedMassFraction(0, ...) === 0; the fraction is
 *     monotonically non-decreasing in r and approaches 1 at large r/Re.
 *  4. INTEGRATING prugnielSimienMassDensity numerically over a sphere
 *     reproduces totalMassSol to within a few percent (quadrature
 *     tolerance, not the exact incomplete-gamma identity, which
 *     `prugnielEnclosedMassFraction` already verifies analytically) - the
 *     two independent checks (closed-form and numerical) must agree.
 *  5. prugnielSimienMassDensity never returns Infinity or NaN, including at
 *     r=0 (the floor guard).
 *  6. prugnielP (the inner power-law cusp index) is monotonically
 *     increasing in n - a higher Sersic index gives a genuinely steeper
 *     inner cusp, the structural property this profile exists for
 *     (Terzic & Graham 2005). NOT the same claim as "smaller enclosed-mass
 *     fraction at fixed r/Re for higher n" - verified numerically to be
 *     false for this profile family (the exponential term's own b_n grows
 *     with n too, so deprojected 3D enclosed mass at fixed r/Re is not a
 *     simple proxy for cuspiness).
 */
export const PRUGNIEL_SIMIEN_GATES = 6 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Prugniel-Simien profile', status: 'sourced',
    short: 'An analytic 3D density shape that (unlike Hernquist) fits real bulges across a wide range of central concentration, not just the most massive ones.',
    long: 'rho(r) = rho_0 * (r/Re)^(-p) * exp(-b*(r/Re)^(1/n)), with p(n) from Lima Neto et al. 1999 and b_n from Ciotti & Bertin 1999. Enclosed mass is an incomplete-gamma fraction, so mass normalisation is closed-form once rho_0 is set. Used for the lenticular classical bulge (Erwin n~1.52); massive ellipticals remain on the Hernquist profile, which is the correct regime for it.',
    source: 'Prugniel & Simien 1997, A&A 321, 111; Lima Neto, Gerbal & Marquez 1999, MNRAS 309, 481; Ciotti & Bertin 1999, A&A 352, 447',
  },
  {
    term: 'Why not Hernquist for every bulge', status: 'sourced',
    short: 'Hernquist (a fixed n~4 shape) is the wrong tool for a bulge with a shallower, less-concentrated profile.',
    long: 'Terzic & Graham 2005 (sample of 8 ellipticals) and Terzic & Sprague 2007 find Hernquist inadequate at low Sersic index - exactly the regime most spiral/S0 bulges occupy, including this project\'s own lenticular classical bulge (Erwin n~1.52).',
    source: 'Terzic & Graham 2005; Terzic & Sprague 2007',
  },
];
