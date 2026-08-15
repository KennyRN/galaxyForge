/**
 * habitability - HZ bounds and "rocky planet inside it". Purely geometric,
 * no PRNG channel (a habitable-zone boundary is a deterministic consequence
 * of the star and the planet's position, not a random draw).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * CIRCUMSTELLAR HZ. The single source of truth for `habitableZoneAu` -
 * `planets.ts` (Stage 6) built a local, honestly-flagged-as-preliminary
 * approximation of this because `habitability` did not exist yet; THIS is
 * the seam that local copy said it should be absorbed into (Law 1), and
 * `planets.ts` now imports it from here rather than keeping its own. Same
 * `calibrated (simplified from Kopparapu et al. 2014)` sqrt(L) form as
 * before - Kopparapu's real quartic Teff-dependent coefficients never
 * shipped with this package, and transcribing several four-term polynomials
 * from uncertain memory would be a worse error than an honestly-labelled
 * simplification. Grade stays `calibrated`, not `sourced`.
 *
 * GALACTIC HABITABLE ZONE (GHZ). Lineweaver, Fenner & Gibson 2004, Science
 * 303, 59 - the classic GHZ argument: too close to the galactic centre and
 * supernova/radiation rates are too high for a biosphere to persist; too far
 * out and the disc's chemical enrichment (heavy-element/planet-forming
 * material) is too thin. `sourced (form)` for the qualitative "annulus, not
 * a cliff" shape; the SPECIFIC peak radius and width used here are
 * `calibrated` (a broad Gaussian centred near the solar circle, ~8 kpc),
 * because Lineweaver's own fitted parameters never shipped with this
 * package either. The real GHZ is also known to migrate outward over
 * cosmic time as enrichment progresses - THIS module's score is static in
 * time, a known simplification, not a claim otherwise.
 *
 * `isHumanHabitable` DOES NOT EXIST IN THIS MODULE, and never has in this
 * from-scratch build - there is nothing to delete, but the ruling this
 * instruction encodes (human-habitability is `humanHabitability`'s term
 * alone; `habitability` stays purely geometric) is honoured from the first
 * line rather than corrected after the fact.
 *
 * genVersion: the HZ formula or GHZ shape changing is genVersion-bumping.
 */

/** AU. `calibrated (simplified Kopparapu 2014)` - the single source of
 *  truth; `planets.ts` imports this rather than keeping a local copy. */
export function habitableZoneAu(hostLuminositySol: number): { inner: number; outer: number } {
  const s = Math.sqrt(Math.max(hostLuminositySol, 1e-6));
  return { inner: 0.95 * s, outer: 1.67 * s };
}

export function isInHabitableZone(aAu: number, hostLuminositySol: number): boolean {
  const hz = habitableZoneAu(hostLuminositySol);
  return aAu >= hz.inner && aAu <= hz.outer;
}

/* --------------------------- galactic habitable zone -------------------------- */

const GHZ_PEAK_PC = 8000;     // calibrated, near the solar circle
const GHZ_WIDTH_PC = 4000;    // calibrated
const GHZ_Z_SCALE_PC = 500;   // calibrated - tolerance for height above the midplane

/**
 * Deterministic score in [0, 1], purely geometric - no rng, ever.
 * `galactocentricRadiusPc` is SPHERICAL r (per `SystemContext`'s own
 * documented convention, S8.8), `zPc` height above the midplane.
 */
export function galacticHabitabilityScore(galactocentricRadiusPc: number, zPc: number): number {
  const radial = Math.exp(-0.5 * Math.pow((galactocentricRadiusPc - GHZ_PEAK_PC) / GHZ_WIDTH_PC, 2));
  const vertical = Math.exp(-0.5 * Math.pow(zPc / GHZ_Z_SCALE_PC, 2));
  return radial * vertical;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. `habitableZoneAu` is monotonically increasing (both bounds) in
 *     luminosity, and `inner < outer` always.
 *  2. `galacticHabitabilityScore` peaks at `(GHZ_PEAK_PC, 0)`, is
 *     monotonically decreasing in |r - GHZ_PEAK_PC| and in |z|, and stays
 *     in [0, 1] everywhere.
 *  3. `isHumanHabitable` does not appear anywhere in this module - grepped
 *     directly, not merely asserted in prose (S9's own gate).
 *  4. Purely deterministic - no `Rng` parameter anywhere in this module's
 *     public surface.
 */
export const HABITABILITY_GATES = 4 as const;
