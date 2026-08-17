/**
 * galaxyModel - the strategy interface every morphology implements, and the
 * population *concept* those morphologies supply instances of.
 *
 * CREATED AT STAGE 0. Nothing here is a change to existing code.
 *
 * R14: `Population` and `PopulationKey` are DECLARED HERE and re-exported
 * through `types.ts`. The population concept belongs to the model layer; each
 * morphology supplies its own instances.
 *
 * The generator is a CONDUCTOR. It asks a model a question and never reaches
 * inside it. The science underneath may be rewritten freely as long as this
 * interface holds.
 *
 * IMPORTS, 15 Aug 2026 (patch v2.3): `galaxyParameters`/`spiralArms`/
 * `starFormingComplexes` are pulled in for the spiral's real arm/complex
 * modulation. None of the three imports `galaxyModel` back as a VALUE (only
 * `galaxyParameters` takes a `type`-only import of `GalaxyModelName`, erased
 * at compile time) - the one-way direction this file's own R14/S4.5 comments
 * already establish (`galacticDensity -> galaxyModel`, never the reverse)
 * still holds.
 */

import type { GalaxyParameters, BulgeParams } from './galaxyParameters';
import { DEFAULT_GALAXY_PARAMETERS, anchorArmCorrectionFor } from './galaxyParameters';
import { armFactor, type ArmResponseSet } from './spiralArms';
import { smootherstep, lnGamma } from './mathStats';
import { prugnielSimienMassDensity } from './prugnielSimien';

export type GalaxyModelName = 'spiral' | 'barredSpiral' | 'elliptical' | 'lenticular';

/**
 * Every key any SHIPPED morphology uses. Widening it for a new morphology is
 * additive and sanctioned (0.5). Downstream code NEVER special-cases a key.
 *
 * -- NAMING CONVENTION, and it is binding -----------------------------------
 * New keys are MORPHOLOGY-PREFIXED camelCase, with NO EXCEPTIONS as of
 * Amendment A9 (17 Aug 2026, morphology patch v3.0) - see the rename note on
 * the spiral keys below for what changed and why now.
 *
 * WHY FROZEN ONCE SHIPPED, and it is stronger than Law 5: every key here is
 * STAMPED INTO GENERATED NOTES via `SystemContext.population`. A rename after
 * that has happened is silent corruption of stored user data, which is the
 * one thing the project promises never to do. That is precisely why the A9
 * rename below was only safe on the day it landed - the owner confirmed no
 * galaxy existed on disk yet - and why it is a closing window, not a
 * precedent for renaming freely later: the moment a key is written into a
 * real note, it is frozen exactly as hard as any of the others.
 *
 * WHY PREFIXED: a key identifies a population *instance definition*, not a
 * physical category. Two morphologies' classical bulges share a word and share
 * nothing else - different scale radius, mass fraction, age and metallicity -
 * so a shared key makes every glossary entry and every stamp wrong for one of
 * them.
 *
 * THE PREFIX NAMES THE MODEL THAT OWNS THE POPULATION SET, not the model
 * instance. `spiral` and `barredSpiral` share one set - 1.0 requires the bar
 * toggle to reproduce `spiral` BIT-IDENTICALLY, so a parallel
 * `barredSpiral*` family would break the Part 4 gate. One set, one prefix.
 *
 * camelCase, NOT a colon separator. The colon idiom is reserved for PRNG
 * channel names (`moons:{i}`, `atmosphere:{i}`), so keeping it out of keys
 * means a grep for `:` still finds streams and only streams. These identifiers
 * also reach note frontmatter, where an unquoted colon in a YAML value is a
 * parse hazard.
 */
export type PopulationKey =
  // spiral / barredSpiral - Xiang & Rix 2022, migrated from `age` (0.3).
  // RENAMED 17 Aug 2026 (Amendment A9, morphology patch v3.0): these five
  // were unprefixed by history (youngThin/midThin/oldThin/thick/halo),
  // carrying an explicit documented exception to the naming convention above.
  // No galaxy existed on disk yet, so the rename cost nothing and the
  // exception is retired outright rather than left open for a future
  // contributor to inherit - see the header comment's own reasoning.
  | 'spiralYoungThin'
  | 'spiralMidThin'
  | 'spiralOldThin'
  | 'spiralThick'
  | 'spiralHalo'
  // Boxy/peanut bulge (Amendment A4, morphology patch v3.0, 17 Aug 2026) -
  // additive, mass-normalised, NOT a disc-shaped population (see
  // `discGeometryFor`'s own `default: return null` branch) - its geometry
  // lives in `GalaxyParameters.bulge`, not on the `Population` record.
  | 'spiralBoxyPeanutBulge'
  // elliptical - 2.1, 2.3a
  | 'ellipticalInSitu'
  | 'ellipticalAccreted'
  // lenticular - 3.2, 3.3. `lenticularClassicalBulge` serves BOTH
  // configurations, carrying a different mass fraction in each: it is the same
  // physical object with a different mass share, so it is not two keys.
  //
  // THE DISC IS TWO POPULATIONS, RULED IN 3.3. Juric gives exactly two disc
  // components and the lenticular ledger commits to "disc structure as spiral,
  // Juric 2008", so two is what that source licenses. The spiral's
  // spiralMidThin/spiralOldThin boundary is an AGE-COHORT subdivision (Xiang &
  // Rix), not a structural one - Juric assigns both the same scale height and
  // length. A quenched galaxy has no ongoing formation laying down an age
  // sequence, so the thin disc is one old population. That is what "drop the
  // young cohort" means. Collapsing to a single disc would instead discard
  // the thick disc's distinct chemistry, which is the thing the AMR coupling
  // needs.
  | 'lenticularThinDisc'
  | 'lenticularThickDisc'
  | 'lenticularPseudoBulge'
  | 'lenticularClassicalBulge'
  // Added per 3.3a. Erwin decomposes S0s PHOTOMETRICALLY, and a stellar halo at
  // 28-30 mag/arcsec^2 is invisible to that - so his 0.61/0.33/0.06 are fractions
  // of decomposed light, and carrying them straight into massFractionGalaxy
  // asserts a zero-mass halo rather than omitting one. Without this key the S0 is
  // also the only morphology of four with no pressure-supported old component,
  // and its outskirts generate an empty sky.
  | 'lenticularHalo';

export interface Population {
  key: PopulationKey;
  label: string;

  /** Systems/pc^3 at THE MODEL'S OWN reference point. Each model documents
   *  what that point is: for disc models the solar circle (R0, z=0); for
   *  spheroid models the value is derived from total stellar mass, not
   *  measured. The name is historical and does not carry its unit - see
   *  ledger. NOT renamed: that would be an unsanctioned Law 5 break (0.2). */
  nLocal: number;

  /** TRUNCATION INTERVAL for the age draw, Gyr. NOT a uniform range - this is
   *  the [lo, hi] pair `truncGaussQuantile` already expects. A uniform draw
   *  here silently destroys the age-metallicity relation (0.2, 0.3). */
  ageGyr: [number, number];

  ageMeanGyr: number;         // truncated-Gaussian mean
  ageSigmaGyr: number;        // truncated-Gaussian sigma

  /** This population's share of galaxy stellar mass. Load-bearing for the
   *  mass-normalised morphologies (elliptical, lenticular, via Upsilon);
   *  carried but not consumed by the locally-anchored spiral (0.1, 3.4). */
  massFractionGalaxy: number;

  fehMeanDex: number;         // value at fehGradientRefPc
  fehSigmaDex: number;

  /** DISCRIMINATOR (0.4a). The two forms are different functional shapes, not
   *  two coefficients:
   *    linear:      feh(r) = fehMeanDex + fehGradient * (r - fehGradientRefPc)
   *    logarithmic: feh(r) = fehMeanDex + fehGradient * log10(r / fehGradientRefPc)
   *  `metallicity` switches on this and ends with `assertNever`. */
  fehGradientForm?: 'linear' | 'logarithmic';

  /** dex/pc when linear; dex per DECADE in radius when logarithmic. The field
   *  name deliberately carries no unit, because its unit is form-dependent -
   *  THIS COMMENT is the unit. Never `fehGradientDexPerPc`, the pre-correction
   *  name whose embedded unit is valid for only one of the two forms (0.4a). */
  fehGradient?: number;

  /** R0 for discs, the effective radius for spheroids - the same "each model
   *  states its own reference point" principle as `nLocal` (0.4a). */
  fehGradientRefPc?: number;

  /** Hernquist scale radius. SPHEROID POPULATIONS ONLY; disc populations leave
   *  it unset, the same optionality pattern as `armAmplitude` (2.4).
   *
   *  Load-bearing rather than tidy: two Hernquist components sharing one scale
   *  radius have a radially CONSTANT mass ratio, so the ex-situ fraction could
   *  not rise with radius as 2.3a requires. Per-population radii are what make
   *  the accreted halo expressible at all. */
  scaleRadiusPc?: number;

  /** Sersic index for a Prugniel-Simien spheroid (16 Aug 2026) - set
   *  alongside `scaleRadiusPc` ONLY for `lenticularClassicalBulge`.
   *  UNSET means "use the Hernquist profile at `scaleRadiusPc`" (the
   *  spiral halo and both elliptical populations); SET means "use
   *  `prugnielSimien.prugnielSimienMassDensity` with this index instead" -
   *  Terzic & Graham 2005's own reason the lenticular classical bulge
   *  needs a free-index profile Hernquist cannot give it (see
   *  `prugnielSimien.ts`'s own header). `Re` here is the actual
   *  Prugniel-Simien effective radius, unlike Hernquist's `scaleRadiusPc`
   *  which needs `hernquistK()`'s own conversion to relate to a half-light
   *  radius. */
  sersicN?: number;

  /** 0..~1, discs only. S0s set 0 on EVERY population, structurally rather
   *  than by remembering to leave a flag off (3.4). */
  armAmplitude?: number;

  /** BUILD 2, REALISM RULING (owner, 1 Aug). Base clustered fraction -
   *  MIGRATED FROM the sampler's 8.6 constants. A SURVIVAL-statistic tunable,
   *  never LL03's 70-90% birth figure. Set ONLY by populations whose age
   *  interval reaches below the co-natal coherence window (~1 Gyr): the
   *  sampler's effective group rate is this times conatalProbability(pop),
   *  so leaving it unset and the Phi-ratio vanishing are belt and braces.
   *  Unset = 0; no special-casing anywhere downstream. */
  clusteredFraction?: number;

  /** BUILD 2, same ruling. Mean co-natal remnant size - a REMNANT multiplicity,
   *  not a birth population (LL03: 90% of clustered stars form in >=100-member
   *  clusters; a dozen members is the surviving fragment). Tunable, unsourced -
   *  nothing in the literature gives a remnant multiplicity. Same set-only-if
   *  rule as clusteredFraction. */
  meanGroupSize?: number;
}

/**
 * Density contributions keyed by population.
 *
 * PARTIAL BY CONTRACT, not by accident. 2.1: the elliptical "returns a shorter
 * set than the spiral's, which is precisely why the population list belongs to
 * the model". A full `Record<PopulationKey, number>` would oblige every
 * morphology to report every other morphology's populations, and would break
 * every existing model the moment the union is widened - which 0.5 explicitly
 * sanctions as additive.
 *
 * INVARIANT: the keys present are EXACTLY `populations.map(p => p.key)`.
 * Asserted in the stage-0 gates.
 */
export type DensityByPopulation = Readonly<Partial<Record<PopulationKey, number>>>;

/**
 * The strategy interface. Four members.
 *
 * ON THE COUNT - worth stating, because the package says both things: 1.5 lists
 * four exports (`densityAt`, `densityByPopulation`, `populations`, `morphology`)
 * while Part 7 and 9.5 say "three members", and the 1.6 law table names three
 * (`densityAt` / `densityByPopulation` / `populations`). The three are the ones
 * the CONDUCTOR CALLS; `morphology` is a self-identifying label the model
 * carries, not a question the generator asks. Both statements are true of
 * different things. The prohibition that matters is unchanged and absolute:
 * DO NOT ADD A FIFTH, and do not add `starFormationHistory()` - it has no
 * consumer (0.2, Part 7).
 */
export interface GalaxyModel {
  /** Self-identifying label. `barredSpiral` when the bar is enabled, `spiral`
   *  otherwise - ONE implementation, one flag (1.3). Not a question the
   *  conductor asks; it is how the model names itself in provenance. */
  readonly morphology: GalaxyModelName;

  /** The model's own populations, in FIXED ORDER.
   *
   *  This order is the single source of truth for iteration. Any seeded draw
   *  over populations walks THIS array - never `Object.keys` on a density
   *  record, whose order is an implementation detail of how the object was
   *  built. Getting that wrong makes population assignment depend on
   *  construction order rather than on the model, which is exactly the class
   *  of bug channel isolation exists to prevent. */
  readonly populations: readonly Population[];

  /** Total stellar-system density at a point, systems/pc^3.
   *
   *  R and z in pc, theta in radians. Axisymmetric models IGNORE theta, and a
   *  gate confirms varying it gives bit-identical output. Must be finite,
   *  non-negative and continuous everywhere, including R -> 0. */
  densityAt(R: number, theta: number, z: number): number;

  /** The same quantity, split by population. Sums to `densityAt` within
   *  floating-point tolerance - the invariant most likely to drift, so it is
   *  asserted directly rather than assumed (Part 4). */
  densityByPopulation(R: number, theta: number, z: number): DensityByPopulation;
}

/* ============================================================================
 * REAL MORPHOLOGY IMPLEMENTATIONS - brief S4.4-4.6.
 *
 * Everything below this line is the concrete GalaxyModel factories: one
 * shared spiral/barredSpiral implementation (S4.4), elliptical (S4.5),
 * lenticular (S4.6). The population data was ORIGINALLY duplicated as local
 * test fixtures inside stage0.conformance.ts (that file's own docstring:
 * "the point is the CONTRACT, not the science"); it is migrated HERE as the
 * canonical, single-sourced data those fixtures were always meant to
 * become, and stage0.conformance.ts now imports it rather than keeping a
 * second copy (Law 1). Its own 35 gates are the safety net this migration
 * was checked against - unchanged output, unchanged pass/fail.
 *
 * ARM STRUCTURE (patch v2.3), 15 Aug 2026: now implemented. `discTerm` takes
 * `theta` and multiplies by `spiralArms.armFactor` for whichever arm set
 * `params.armResponse` assigns each population, divided by
 * `anchorArmCorrectionFor` so the reference point still reads exactly
 * `nLocal` rather than a ring mean (patch S4/S7). `youngThin`'s meso-scale
 * complex-tier boost is NOT part of this continuous field (removed 16 Aug
 * 2026 - see `createSpiralModel`'s own comment) - it is a discrete
 * placement-time mechanism now, `starFormingComplexes.placeYoungClustered`,
 * composed at the sector level, not the density-field level.
 * `Population.armAmplitude` (S4.2's original field) is UNCHANGED and still
 * carried on every population, but is now the SUPERSEDED, pre-patch
 * mechanism - never read by `discTerm` below. It remains only because (a)
 * it is stamped into no generated note (safe to leave inert, nothing to
 * corrupt) and (b) the lenticular's own S4.7 gate ("no population has
 * armAmplitude > 0") checks the FIELD's stored value, not its effect on
 * output - removing the field would be gratuitous churn, not a fix. See
 * `galaxyParameters.ts`'s own header for exactly what else patch v2.3 still
 * leaves unwired (disc/halo geometry for the other two morphologies,
 * `placement`/`remnants` cell geometry).
 * ==========================================================================*/

/* ------------------------------- shared anchors ----------------------------- */

export const R0_PC = 8178;          // sourced, GRAVITY Collaboration 2019
const F_HALO = 0.01;                // tunable, S4.6 - MW is a low outlier
const ERWIN = { disc: 0.61, pseudo: 0.33, classical: 0.06 };   // sourced, Erwin et al. 2015

// Licquia & Newman 2015 (ApJ 806, 96), "Improved Estimates of the Milky
// Way's Stellar Mass and Star Formation Rate from Hierarchical Bayesian
// Meta-Analysis" - bulge mass 0.91e10 Msol, total stellar mass 6.08e10 Msol
// (disc 5.17e10). `sourced`. `BULGE_MASS_FRACTION_OF_GALAXY` is `derived`
// from the two (not independently transcribed, so it cannot drift out of
// sync with them); `BulgeParams.totalStellarMassSol`
// (`galaxyParameters.ts`) carries the SAME 6.08e10 figure as the actual
// Tier G anchor `spiralBoxyPeanutBulge.massFractionGalaxy` multiplies
// against - this module-level constant exists only to derive that fraction
// once, honestly, rather than a bare 0.15 literal with no shown working.
const LICQUIA_NEWMAN_BULGE_MASS_SOL = 0.91e10;
const LICQUIA_NEWMAN_TOTAL_MASS_SOL = 6.08e10;
const BULGE_MASS_FRACTION_OF_GALAXY = LICQUIA_NEWMAN_BULGE_MASS_SOL / LICQUIA_NEWMAN_TOTAL_MASS_SOL;
const NON_BULGE_MASS_FRACTION = 1 - BULGE_MASS_FRACTION_OF_GALAXY;   // 0.10/0.30/0.30/0.25/0.05 renormalised against it, so all SIX populations sum to 1 (stage0.conformance.ts's own gate)

/** `calibrated` fallback Upsilon (mass-to-count conversion), used only when
 *  `createSpiralModel`'s `upsilonFor` parameter is omitted - S4.3's own
 *  "should land near 2 systems per solar mass" sanity anchor. A caller with
 *  access to `galacticDensity.upsilonFor` (population-accurate, age/feh
 *  -dependent) should inject the real function instead - this module cannot
 *  import it directly (the one-way `galacticDensity -> galaxyModel`
 *  direction, same reason `createEllipticalModel`/`createLenticularModel`
 *  already take `upsilonFor` as an injected parameter rather than a default
 *  import). */
const DEFAULT_BULGE_UPSILON = 2.0;

/** Hernquist k = R_e/a, computed by numerical integration of the projected
 *  profile - never quoted (S4.5's own ruling). See stage0.conformance.ts's
 *  gate asserting this lands at 1.815271. */
function simpson(f: (x: number) => number, lo: number, hi: number, n: number): number {
  const h = (hi - lo) / n;
  let acc = f(lo) + f(hi);
  for (let i = 1; i < n; i++) acc += f(lo + i * h) * (i % 2 ? 4 : 2);
  return (acc * h) / 3;
}
function hernquistSigma(R: number, n = 800): number {
  const g = (th: number) => {
    const t = Math.tan(th), r = Math.hypot(R, t);
    return (1 / (r * (r + 1) ** 3)) * (1 / Math.cos(th)) ** 2;
  };
  return simpson(g, 0, Math.PI / 2 - 1e-9, n) / Math.PI;
}
function hernquistProjectedMass(R: number, n = 120): number {
  const f = (u: number) => {
    const x = u * u;
    return x === 0 ? 0 : hernquistSigma(x) * x * 2 * u;
  };
  return 2 * Math.PI * simpson(f, 0, Math.sqrt(R), n);
}
export function hernquistK(): number {
  let lo = 1.0, hi = 3.0;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (hernquistProjectedMass(mid) < 0.5) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Juric et al. 2008, bias-corrected. sourced. */
export const JURIC = { f: 0.12, lThin: 2600, hThin: 300, lThick: 3600, hThick: 900 };

function juricThickNumberFraction(r0: number): number {
  const { f, lThin, hThin, lThick, hThick } = JURIC;
  const ratio = f * Math.exp(r0 / lThick - r0 / lThin) * (lThick / lThin) ** 2 * (hThick / hThin);
  return ratio / (1 + ratio);
}
export const THICK_FRAC = juricThickNumberFraction(R0_PC);
const A_IN_SITU_PC = 2400;   // a = R_e/k, Shen (S4.5)

/* --------------------------------- populations ------------------------------- */

export const SPIRAL_POPULATIONS: Population[] = [
  { key: 'spiralYoungThin', label: 'Young thin disc', nLocal: 0.018, ageGyr: [0, 3],
    ageMeanGyr: 1.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.10 * NON_BULGE_MASS_FRACTION,
    fehMeanDex: 0.0, fehSigmaDex: 0.15,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    clusteredFraction: 0.6, meanGroupSize: 12, armAmplitude: 0.35 },
  { key: 'spiralMidThin', label: 'Mid thin disc', nLocal: 0.030, ageGyr: [3, 6],
    ageMeanGyr: 4.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.30 * NON_BULGE_MASS_FRACTION,
    fehMeanDex: -0.05, fehSigmaDex: 0.18,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    armAmplitude: 0.25 },
  { key: 'spiralOldThin', label: 'Old thin disc', nLocal: 0.024, ageGyr: [6, 8],
    ageMeanGyr: 7.0, ageSigmaGyr: 0.8, massFractionGalaxy: 0.30 * NON_BULGE_MASS_FRACTION,
    fehMeanDex: -0.15, fehSigmaDex: 0.20,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    armAmplitude: 0.15 },
  { key: 'spiralThick', label: 'Thick disc', nLocal: 0.006, ageGyr: [8, 12],
    ageMeanGyr: 10.0, ageSigmaGyr: 1.2, massFractionGalaxy: 0.25 * NON_BULGE_MASS_FRACTION,
    fehMeanDex: -0.55, fehSigmaDex: 0.25,
    fehGradientForm: 'linear', fehGradient: -0.000015, fehGradientRefPc: R0_PC,
    armAmplitude: 0.0 },
  { key: 'spiralHalo', label: 'Stellar halo', nLocal: 0.0002, ageGyr: [11, 13.5],
    ageMeanGyr: 12.0, ageSigmaGyr: 0.9, massFractionGalaxy: 0.05 * NON_BULGE_MASS_FRACTION,
    fehMeanDex: -1.6, fehSigmaDex: 0.4, armAmplitude: 0.0 },
  // Boxy/peanut bulge (Amendment A4, morphology patch v3.0, 17 Aug 2026) -
  // an ADDITIVE, mass-normalised population, not `barFactor`'s old
  // multiplier on the disc. nLocal: 0 (unused placeholder, matching the
  // elliptical/lenticular convention for every other mass-normalised
  // population here) - this population has no solar-neighbourhood anchor;
  // its geometry lives in `GalaxyParameters.bulge`
  // (`createSpiralModel`/`boxyPeanutBulgeMassDensity` below), the same
  // separation `barFactor` used before it (galaxy-level geometry off the
  // Population record, demographic data on it). Old, metal-rich per Wegg &
  // Gerhard's own characterisation of the structure; `calibrated` age/feh
  // distribution (W&G13 gives geometry only, no stellar population),
  // deliberately similar to `lenticularClassicalBulge`'s numbers as the
  // closest already-modelled analogue of "an old, centrally concentrated
  // spheroidal component" - NOT claimed as the same physical object (a
  // classical bulge forms by mergers, a boxy/peanut bulge by bar buckling;
  // this project does not model formation channel, only age/feh output).
  { key: 'spiralBoxyPeanutBulge', label: 'Boxy/peanut bulge', nLocal: 0, ageGyr: [8, 13],
    ageMeanGyr: 10.0, ageSigmaGyr: 1.5, massFractionGalaxy: BULGE_MASS_FRACTION_OF_GALAXY,
    fehMeanDex: 0.05, fehSigmaDex: 0.30, armAmplitude: 0 },
];

export const ELLIPTICAL_POPULATIONS: Population[] = [
  { key: 'ellipticalInSitu', label: 'In-situ spheroid', nLocal: 0, ageGyr: [9, 13.5],
    ageMeanGyr: 11.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.60,
    fehMeanDex: 0.15, fehSigmaDex: 0.20,
    fehGradientForm: 'logarithmic', fehGradient: -0.2, fehGradientRefPc: A_IN_SITU_PC,
    scaleRadiusPc: A_IN_SITU_PC },
  { key: 'ellipticalAccreted', label: 'Accreted metal-poor halo', nLocal: 0,
    ageGyr: [10, 13.5], ageMeanGyr: 12.2, ageSigmaGyr: 1.0, massFractionGalaxy: 0.40,
    fehMeanDex: -0.60, fehSigmaDex: 0.30,
    fehGradientForm: 'logarithmic', fehGradient: -0.05, fehGradientRefPc: A_IN_SITU_PC,
    scaleRadiusPc: A_IN_SITU_PC * 8 },
];

export const LENTICULAR_POPULATIONS: Population[] = [
  { key: 'lenticularThinDisc', label: 'Quenched thin disc', nLocal: 0, ageGyr: [7, 13],
    ageMeanGyr: 9.5, ageSigmaGyr: 1.5, massFractionGalaxy: ERWIN.disc * (1 - F_HALO) * (1 - THICK_FRAC),
    fehMeanDex: -0.10, fehSigmaDex: 0.20,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC, armAmplitude: 0 },
  { key: 'lenticularThickDisc', label: 'Quenched thick disc', nLocal: 0, ageGyr: [8, 13.5],
    ageMeanGyr: 11.0, ageSigmaGyr: 1.2, massFractionGalaxy: ERWIN.disc * (1 - F_HALO) * THICK_FRAC,
    fehMeanDex: -0.55, fehSigmaDex: 0.25,
    fehGradientForm: 'linear', fehGradient: -0.000015, fehGradientRefPc: R0_PC, armAmplitude: 0 },
  { key: 'lenticularPseudoBulge', label: 'Discy pseudo-bulge', nLocal: 0, ageGyr: [8, 13],
    ageMeanGyr: 10.0, ageSigmaGyr: 1.2, massFractionGalaxy: ERWIN.pseudo * (1 - F_HALO),
    fehMeanDex: 0.05, fehSigmaDex: 0.18, armAmplitude: 0 },
  { key: 'lenticularClassicalBulge', label: 'Classical bulge', nLocal: 0, ageGyr: [9, 13.5],
    ageMeanGyr: 11.0, ageSigmaGyr: 1.0, massFractionGalaxy: ERWIN.classical * (1 - F_HALO),
    fehMeanDex: 0.10, fehSigmaDex: 0.20,
    fehGradientForm: 'logarithmic', fehGradient: -0.2, fehGradientRefPc: 143,
    // Prugniel-Simien (16 Aug 2026), not Hernquist - see Population.sersicN's
    // own doc comment. scaleRadiusPc IS the effective radius directly here
    // (no hernquistK() conversion needed); this is Erwin's own composite-
    // configuration Re/n. The 'classical' (Gao) bulgeType below overrides
    // both to a different Re/n, matching the sibling build's own two
    // configurations.
    scaleRadiusPc: 143, sersicN: 1.52, armAmplitude: 0 },
  { key: 'lenticularHalo', label: 'Stellar halo', nLocal: 0, ageGyr: [11, 13.5],
    ageMeanGyr: 12.0, ageSigmaGyr: 0.9, massFractionGalaxy: F_HALO,
    fehMeanDex: -1.6, fehSigmaDex: 0.4, armAmplitude: 0 },
];

/* --------------------------------- disc + halo -------------------------------- */

const CORE_FLOOR_PC = 10;     // tunable, numerical guard against 1/r divergence

/** Standard double-exponential disc, sourced (form). Per-population
 *  geometry: the three thin cohorts share Juric's thin-disc scale length/
 *  height (they are an age subdivision of ONE structural disc, S4.6's own
 *  reasoning applied back to the spiral); thick uses Juric's thick-disc
 *  values; halo is NOT a disc term (see haloTerm). */
function discGeometryFor(key: PopulationKey): { scaleLengthPc: number; scaleHeightPc: number } | null {
  switch (key) {
    case 'spiralYoungThin': case 'spiralMidThin': case 'spiralOldThin':
    case 'lenticularThinDisc':
      return { scaleLengthPc: JURIC.lThin, scaleHeightPc: JURIC.hThin };
    case 'spiralThick': case 'lenticularThickDisc':
      return { scaleLengthPc: JURIC.lThick, scaleHeightPc: JURIC.hThick };
    default:
      return null;
  }
}

/**
 * Which `spiralArms.ArmResponseSet` a disc population sees - only the five
 * spiral/barredSpiral keys carry one (patch S4's `armResponse` table);
 * every other key (lenticular's own disc-shaped populations included) gets
 * `'none'`, since arm modulation is spiral-only in this pass.
 */
function armResponseFor(key: PopulationKey, params: GalaxyParameters): ArmResponseSet {
  switch (key) {
    case 'spiralYoungThin': return params.armResponse.spiralYoungThin;
    case 'spiralMidThin': return params.armResponse.spiralMidThin;
    case 'spiralOldThin': return params.armResponse.spiralOldThin;
    case 'spiralThick': return params.armResponse.spiralThick;
    case 'spiralHalo': return params.armResponse.spiralHalo;
    default: return 'none';
  }
}

/** 0 at/below `armStartInnerPc`, 1 at/above `armStartOuterPc` - patch S4's
 *  "inner-disc taper" (By-law S4), calibrated on the Wegg 2015 bar
 *  half-length: arms do not meaningfully extend into the barred inner disc.
 *  Reuses the same `smootherstep` the bar's own taper window already uses
 *  (Law 1 - one smooth-window primitive, not two). This is ALSO what keeps
 *  the arm contrast finite and well-behaved as R -> 0 (S4.7's own gate) -
 *  `spiralArms`'s own `MIN_ARM_R_PC` clamp guards the geometry itself, this
 *  taper is what makes the PHYSICS agree that near-zero R should carry no
 *  arm signal in the first place, not merely avoid a NaN. */
function armInnerTaper(R: number, params: GalaxyParameters): number {
  return smootherstep(params.armStartInnerPc, params.armStartOuterPc, R);
}

function discTerm(pop: Population, R: number, theta: number, z: number, params: GalaxyParameters): number {
  const geom = discGeometryFor(pop.key);
  if (!geom) return 0;
  const smooth = pop.nLocal * Math.exp(-(R - params.R0Pc) / geom.scaleLengthPc) * Math.exp(-Math.abs(z) / geom.scaleHeightPc);
  const set = armResponseFor(pop.key, params);
  if (set === 'none') return smooth;
  const contrasts = params.armContrast();
  // NOTE: `contrasts` is `spiralArms.ArmContrastSet`, a contrast-TIER record
  // (oldThin/midThin/youngThin name which cohort's arm response each tier
  // matches), not `PopulationKey` - Amendment A9 (17 Aug 2026) renamed the
  // five POPULATION keys, not this unrelated interface, so these three field
  // names are deliberately unchanged.
  const cFull = set === 'all' ? contrasts.youngThin : set === 'majorMinor' ? contrasts.midThin : contrasts.oldThin;
  const c = cFull * armInnerTaper(R, params);
  // params.arms (16 Aug 2026): previously OMITTED here despite being a real
  // field on GalaxyParameters - every caller silently got the module-global
  // ARMS table regardless of what params.arms actually held, the exact
  // "declared but not wired" gap this file's own header names for other
  // fields (juric/erwin/halo). DEFAULT_GALAXY_PARAMETERS.arms === ARMS, so
  // every existing call site (main.ts's test command, goldenMaster, every
  // conformance gate) is bit-for-bit unaffected - this only changes
  // behaviour for a caller that supplies a DIFFERENT arms table
  // (`galaxyCreationModals.ts`'s own seeded-arm construction).
  const raw = armFactor(set, c, R, theta, params.armWidth, params.arms);
  const correction = anchorArmCorrectionFor(params, set);
  return smooth * (raw / correction);
}

const HALO_INDEX = 2.8;        // sourced, Juric 2008
const HALO_FLATTENING = 0.64;  // sourced, Juric 2008 (c/a)
const HALO_TRUNCATION_PC = 20000;   // tunable, Juric's calibration edge (S4.6)

/** Juric's oblate power-law halo, sourced (form). Normalised so it equals
 *  `nLocalHalo` at (R0, 0), and truncated at `HALO_TRUNCATION_PC` (mandatory
 *  for the lenticular's mass-normalised halo, S4.6 - M(<R) ~ R^0.2
 *  diverges otherwise; harmless for the locally-anchored spiral). */
function haloTerm(nLocalHalo: number, R: number, z: number): number {
  const rEff = Math.hypot(R, z / HALO_FLATTENING);
  const rEffRef = Math.hypot(R0_PC, 0);
  if (rEff > HALO_TRUNCATION_PC) return 0;
  const r = Math.max(rEff, CORE_FLOOR_PC);
  return nLocalHalo * Math.pow(rEffRef / r, HALO_INDEX);
}

/**
 * The SAME truncated oblate power-law shape as `haloTerm`, but normalised
 * so `INT rho dV` equals `total` EXACTLY (via `truncatedPowerLawNorm`)
 * rather than anchored to equal a given value at one reference point.
 * Point-anchoring (`haloTerm`) is correct for the spiral, which HAS a
 * genuine local anchor (the Sun's own neighbourhood, R0); the lenticular
 * halo has no such anchor - `massFractionGalaxy` is a total, so its density
 * field must integrate to that total, not merely pass through it at one
 * radius (ported 16 Aug 2026 - previously `createLenticularModel` used
 * `haloTerm`'s own R0-anchor form for this too, a real gap the anchor form
 * cannot close).
 */
function haloTermMassNormalized(total: number, R: number, z: number): number {
  const rEff = Math.hypot(R, z / HALO_FLATTENING);
  if (rEff > HALO_TRUNCATION_PC) return 0;
  const r = Math.max(rEff, CORE_FLOOR_PC);
  const A = truncatedPowerLawNorm(total, HALO_INDEX, HALO_FLATTENING, CORE_FLOOR_PC, HALO_TRUNCATION_PC);
  return A * Math.pow(r, -HALO_INDEX);
}

function hernquistMassDensity(rPc: number, totalMassSol: number, aPc: number): number {
  if (rPc <= 0) return Number.POSITIVE_INFINITY;
  return (totalMassSol * aPc) / (2 * Math.PI * rPc * Math.pow(rPc + aPc, 3));
}

/**
 * Closed-form normalisation of a truncated oblate power law (16 Aug 2026,
 * ported from a sibling build) so it holds exactly `total` - including the
 * core-floor clamp, which is not a rounding detail here. For
 * rho(m) = A * m^-index with m = hypot(R, z/flattening), held CONSTANT
 * inside `floorPc` (which is what this project's own `haloTerm`/
 * `haloTermMassNormalized` actually evaluate), the volume integral gives
 *
 *   total = 4*pi*flattening*A * [ floorPc^(3-index)/3
 *           + (truncationPc^(3-index) - floorPc^(3-index)) / (3-index) ]
 *
 * so A is solved directly. THE FLOOR ENTERS THE NORMALISATION AND MUST NOT
 * BE MOVED CASUALLY: a cusp of index 2.8 (Juric's own halo index) assigns
 * the untruncated integral about 22% of its mass inside 10 pc; clamping
 * cuts that to about 1.8%, and the difference is absorbed here rather than
 * left as a silent ~20% normalisation error - the r^-2.8 cusp is
 * unphysical at small radius and Juric's own fit was never calibrated
 * there, recorded rather than hidden.
 */
function truncatedPowerLawNorm(total: number, index: number, flattening: number, floorPc: number, truncationPc: number): number {
  const p = 3 - index;
  const shape = Math.pow(floorPc, p) / 3 + (Math.pow(truncationPc, p) - Math.pow(floorPc, p)) / p;
  return total / (4 * Math.PI * flattening * shape);
}

/* -------------------------- boxy/peanut bulge geometry ------------------------- */

// smootherstep moved to mathStats.ts (16 Aug 2026) - imported above.

// Wegg & Gerhard 2013 / Wegg, Gerhard & Portail 2015 bulge geometry -
// sourced. NOT DECLARED HERE - `galaxyParameters.DEFAULT_BULGE` is the
// single source (Law 1); `boxyPeanutBulgeMassDensity` below takes
// `BulgeParams` as an explicit argument instead of closing over a
// module-level const, so `createSpiralModel`'s injected `params.bulge` is
// what actually reaches it.

/**
 * C(n) = INT_{R^3} exp(-||u||_n) du dv dw, the volume integral of a unit
 * Lp-norm exponential decay in 3D - closed form via the substitution to
 * "radial shell" coordinates (the Lp-ball's volume is homogeneous of degree
 * 3 in its own radius, same argument as a plain sphere's 4/3*pi*r^3):
 * C(n) = 3*V_unit(n) * Gamma(3) where V_unit(n) = (2*Gamma(1+1/n))^3 /
 * Gamma(1+3/n) is the unit Lp-ball's own volume - collecting terms gives the
 * form below. `derived` (a standard superellipsoid/Lp-ball volume identity,
 * not a citation of its own). Verified numerically (disposable diagnostic
 * script, this session): C(2) matches the known ellipsoid case 8*pi to 14
 * significant digits exactly; C(4) and the full mass-recovery integral
 * (`boxyPeanutBulgeMassDensity` below) both match a brute-force 3D
 * quadrature within that quadrature's own ~0.2-0.6% grid error.
 */
function superellipsoidExpNormConstant(n: number): number {
  return 48 * Math.exp(3 * lnGamma(1 + 1 / n) - lnGamma(1 + 3 / n));
}

/**
 * The boxy/peanut bulge (Amendment A4, morphology patch v3.0, 17 Aug 2026) -
 * an ADDITIVE, mass-normalised population term. Replaces `barFactor`'s old
 * role as a MULTIPLIER on the disc, which was modelling a bulge as if it
 * were the bar's enhancement of disc density - a scope error, not a
 * transcription error (see `BulgeParams`'s own header in `galaxyParameters.ts`).
 *
 * `barEnabled` selects the bulge's own SHAPE, not whether it exists at all -
 * a spiral ALWAYS has a bulge now. `true` gives the real Wegg & Gerhard
 * triaxial anisotropy (x/y scaled independently by `scalePc.x`/`scalePc.y`,
 * boxiness exponent `bulge.boxiness`); `false` axisymmetrises it - x/y both
 * scaled by their geometric mean (`sqrt(scalePc.x * scalePc.y)`, the same
 * cross-sectional AREA as the triaxial ellipse, `calibrated`) AND the
 * exponent forced to n=2 (a plain ellipsoid, NOT `bulge.boxiness` at a=b -
 * a superellipsoid with a=b but n>2 is still a "squircle" cross-section, not
 * a circle, since `|cos(theta)|^n + |sin(theta)|^n` is not constant in
 * theta for n!=2; boxiness IS the bar-aligned anisotropy, so an axisymmetric
 * bulge genuinely has none of it, not merely a rounder version of it) - so
 * an unbarred spiral shows a truly round bulge rather than smuggling in bar
 * structure through the back door under a different exponent. Either way
 * the TOTAL MASS is identical - `massSol` normalises via `a*b*c*C(n)` with
 * whichever `(a,b,c,n)` the branch above selected, so toggling `barEnabled`
 * changes shape, never total light (S4.4's "one implementation, one flag"
 * restated for the new bulge form - gate G4).
 *
 * No core-floor clamp needed (unlike `haloTerm`'s r^-2.8 cusp): `exp(-s)` is
 * bounded by 1 at s=0, never diverges.
 */
function boxyPeanutBulgeMassDensity(
  barEnabled: boolean, bulge: BulgeParams, massSol: number, R: number, theta: number, z: number,
): number {
  const { x: aTri, y: bTri, z: c } = bulge.scalePc;
  if (!barEnabled) {
    // Axisymmetrised: n FORCED to 2 (a plain ellipsoid), not `bulge.boxiness`
    // at a=b - a superellipsoid with a=b but n>2 is still a "squircle"
    // cross-section, not a circle (|cos(theta)|^n + |sin(theta)|^n is not
    // constant in theta for n!=2); boxiness IS the bar-aligned anisotropy,
    // so an axisymmetric bulge genuinely has none of it, not a rounder
    // version of it. `theta` is DELIBERATELY never read in this branch
    // (mirroring `haloTerm`'s own `Math.hypot(R, z/flattening)` pattern) -
    // going through `R*cos(dth)`/`R*sin(dth)` and relying on the
    // cos^2+sin^2=1 identity to cancel theta out would only be
    // mathematically exact, not BIT-identical (floating-point round-off in
    // `Math.cos`/`Math.sin` does not generally satisfy the identity to the
    // last ULP), which would silently break the exact axisymmetry gate G4a.
    const abEff = Math.sqrt(aTri * bTri);
    const s = Math.hypot(R / abEff, z / c);
    const peakDensity = massSol / (abEff * abEff * c * superellipsoidExpNormConstant(2));
    return peakDensity * Math.exp(-s);
  }
  const n = bulge.boxiness;
  const dth = theta - bulge.phaseRad;
  const x = R * Math.cos(dth), y = R * Math.sin(dth);
  const s = Math.pow(Math.pow(Math.abs(x) / aTri, n) + Math.pow(Math.abs(y) / bTri, n) + Math.pow(Math.abs(z) / c, n), 1 / n);
  const peakDensity = massSol / (aTri * bTri * c * superellipsoidExpNormConstant(n));
  return peakDensity * Math.exp(-s);
}

/* ------------------------------- model factories ------------------------------- */

/**
 * ONE implementation, one flag (S4.4). `barEnabled` no longer touches the
 * disc at all (that was `barFactor`'s old, wrong role - see
 * `boxyPeanutBulgeMassDensity`'s own header) - every disc/halo population's
 * density is now IDENTICAL between `spiral` and `barredSpiral` at every
 * radius, not merely outside a taper window (gate: "every non-bulge
 * population is bit-identical between barred and unbarred"). `barEnabled`
 * now selects only the bulge's shape (triaxial vs axisymmetrised).
 *
 * `params` (patch v2.3, 15 Aug 2026) is OPTIONAL, defaulting to
 * `DEFAULT_GALAXY_PARAMETERS` - a caller that omits it gets the identical
 * `R0Pc`/`bulge` values this function always had, so every prior call site
 * (a single positional `barEnabled` argument) keeps compiling and keeps its
 * existing behaviour for the five original populations. The arm/complex
 * modulation, however, is NOT optional once `params` IS supplied - it is
 * what `params` is actually for.
 *
 * `upsilonFor` (17 Aug 2026, additive) is OPTIONAL, defaulting to a flat
 * `calibrated` fallback (`DEFAULT_BULGE_UPSILON`) - only the new bulge
 * population consumes it (the five disc/halo populations are
 * `nLocal`-anchored and need no mass-to-count conversion at all). A caller
 * with access to `galacticDensity.upsilonFor` should inject the real,
 * population-accurate function - `galaxyCreationModals.ts`'s own
 * `modelFromDraft` does exactly this, the same way it already does for
 * `createEllipticalModel`/`createLenticularModel`.
 */
export function createSpiralModel(
  barEnabled: boolean,
  params: GalaxyParameters = DEFAULT_GALAXY_PARAMETERS,
  upsilonFor: (pop: Population) => number = () => DEFAULT_BULGE_UPSILON,
): GalaxyModel {
  const populations = SPIRAL_POPULATIONS;
  return {
    morphology: barEnabled ? 'barredSpiral' : 'spiral',
    populations,
    densityAt(R, theta, z) {
      return Object.values(this.densityByPopulation(R, theta, z) as Record<string, number>)
        .reduce((a, b) => a + b, 0);
    },
    densityByPopulation(R, theta, z): DensityByPopulation {
      const out: Partial<Record<PopulationKey, number>> = {};
      for (const pop of populations) {
        if (pop.key === 'spiralHalo') {
          out[pop.key] = haloTerm(pop.nLocal, R, z);    // AXISYMMETRIC - never barred, never arm-modulated
          continue;
        }
        if (pop.key === 'spiralBoxyPeanutBulge') {
          const massSol = params.bulge.totalStellarMassSol * pop.massFractionGalaxy * params.bulge.strength;
          out[pop.key] = boxyPeanutBulgeMassDensity(barEnabled, params.bulge, massSol, R, theta, z) * upsilonFor(pop);
          continue;
        }
        // spiralYoungThin's complex-tier boost is NOT applied here (removed 16 Aug
        // 2026, ported architecture from a sibling build) - it is a
        // DISCRETE PLACEMENT-time mechanism now (`starFormingComplexes.
        // placeYoungClustered`, called from `sectorFootprint.assembleSector`),
        // not a continuous multiplier on this smooth field. The two were
        // never meant to compose: this field IS the count a placed sector
        // should sum to, and the placement layer partitions that count
        // between smooth and complex-clustered systems (w scales BOTH,
        // per `complexParticipation` - see that module's header) rather
        // than the complex layer adding on top of an already-full field,
        // which is what this multiplier used to do.
        out[pop.key] = discTerm(pop, R, theta, z, params);
      }
      return out;
    },
  };
}

/**
 * Wires up `GalaxyParameters.scale` (16 Aug 2026, a bug this session's own
 * investigation of the sol-neighbourhood marker found: the field existed,
 * was always set to `1.0`, and was never read anywhere - "Galaxy size" had
 * NO EFFECT on a spiral/barredSpiral/Milky-Way-Analogue galaxy at all,
 * confirmed by a full-codebase search for `.scale` before writing this).
 *
 * WHY A COORDINATE WRAPPER, not touching `galaxyParameters.ts`'s stored
 * constants or `discTerm`/`haloTerm`/`boxyPeanutBulgeMassDensity`'s own
 * internals: every length-typed quantity those three functions read
 * (`params.R0Pc` and the disc scale-length/height in `discTerm`; the halo's
 * own R0-anchor, flattening-weighted radius and truncation in `haloTerm`;
 * the bulge's own `scalePc` in `boxyPeanutBulgeMassDensity`; `armInnerTaper`'s
 * start radii; the arm log-spiral geometry itself) is used ONLY as a ratio
 * against the query `R`/`z` - never mixed with an independently-scaled
 * quantity. That makes the WHOLE model homogeneous of degree -1 under a
 * uniform length rescale: building a second model with every one of those
 * constants multiplied by `scale` and querying it at the real
 * `(R, theta, z)` gives EXACTLY the same answer as querying THIS (unscaled)
 * model at `(R/scale, theta, z/scale)` - verified by hand for the disc
 * exponential (`exp(-(R-R0)/L)` is invariant under `R->R/s, R0->R0*s,
 * L->L*s`, and dividing every one of R0/L/R by `s` uniformly reduces to
 * exactly this), the halo's oblate power law INCLUDING its truncation and
 * core-floor clamp (the truncation/floor thresholds become effectively `s`
 * times larger in the query's own frame, which is the correct "the whole
 * galaxy got bigger" behaviour), the bulge's `exp(-s)` (`s` is built purely
 * from `|x|/a, |y|/b, |z|/c` ratios, same argument exactly - re-verified
 * 17 Aug 2026 after the bulge became mass-normalised, see next paragraph),
 * and the arm log-spiral (log-spirals are scale-invariant under a uniform
 * radius rescale BY CONSTRUCTION - `spiralArms.ts` needs no changes at all).
 *
 * `scale === 1` is an EXACT fast path returning the identical model
 * reference - every existing default-scale caller (every conformance gate,
 * the golden master, `main.ts`'s own test command) is completely untouched.
 *
 * THE BULGE IS MASS-NORMALISED AND THIS WRAPPER STILL WORKS ON IT, unlike
 * elliptical/lenticular below - the distinction is WHAT the fixed mass
 * means, not whether one exists. `createEllipticalModel`/
 * `createLenticularModel`'s `galaxyMassSol` is an EXTERNALLY SUPPLIED total
 * (the "Galaxy size" GUI value, driving the ENTIRE model's mass budget) that
 * a coordinate rescale alone would silently understate by `scale^3` if
 * nothing corrected for it - which is why this wrapper is documented as
 * invalid for them. The bulge's `BulgeParams.totalStellarMassSol`/
 * `massFractionGalaxy` are instead FIXED, SOURCED constants (Licquia &
 * Newman 2015) that the "Galaxy size" slider never touches directly at all -
 * so letting the wrapper's coordinate remap change its EFFECTIVE integrated
 * mass by `scale^3` is not an error to guard against, it is the SAME "a
 * bigger galaxy has proportionally more stars" behaviour every disc
 * population already exhibits under this wrapper (their `nLocal` anchors
 * are equally fixed constants the slider never touches directly either),
 * arrived at through mass-normalisation's own mechanism instead of a local
 * anchor's. Verified numerically (disposable diagnostic script, this
 * session): the population-level self-similarity identity holds EXACTLY
 * (`===`) for the bulge at several `k`, and a scale=2 galaxy's numerically
 * -integrated bulge mass lands at exactly 8x (2^3) a scale=1 galaxy's.
 *
 * VALID ONLY FOR LOCALLY-ANCHORED OR INTERNALLY-SOURCED-MASS MODELS
 * (spiral/barredSpiral, including its bulge) - NOT for the elliptical/
 * lenticular factories below, whose EVERY population's mass is externally
 * supplied via `galaxyMassSol`. A model built that way rescaled through this
 * wrapper would need an extra `1/scale^3` volume correction to keep the
 * CALLER's chosen total mass fixed, which this wrapper does not supply -
 * calling it on anything but a spiral/barredSpiral model would silently
 * misstate that model's own total mass. Elliptical/lenticular already have
 * working size scaling via `galaxyMassSol` (`createEllipticalModel`/
 * `createLenticularModel`'s own first parameter) and are untouched by this
 * function's existence.
 *
 * `starFormingComplexes.ts`'s own absolute-pc constants (a star-forming
 * complex is genuinely ~600 pc, Efremov 1978, regardless of how big the
 * HOST galaxy is) are deliberately NOT reachable through this wrapper -
 * only the density field complexes sample FROM goes through it, at
 * whatever real sector position the caller already works in.
 */
export function scaleSpiralModel(model: GalaxyModel, scale: number): GalaxyModel {
  if (scale === 1) return model;
  return {
    morphology: model.morphology,
    populations: model.populations,
    densityAt: (R, theta, z) => model.densityAt(R / scale, theta, z / scale),
    densityByPopulation: (R, theta, z) => model.densityByPopulation(R / scale, theta, z / scale),
  };
}

/**
 * S4.5. `upsilonFor` is INJECTED (Kroupa + msLifetimeGyr + meanStarsPerSystem
 * composed elsewhere, owned by `galacticDensity` - S4.3's own ruling) so this
 * module never depends on `galacticDensity`, keeping the import direction
 * one-way (types.ts -> galaxyModel; galacticDensity -> galaxyModel).
 */
/**
 * `params` (16 Aug 2026, ported - closing a Tier G gap an audit named)
 * defaults to `DEFAULT_GALAXY_PARAMETERS`, whose `elliptical` block matches
 * `ELLIPTICAL_POPULATIONS`'s own hardcoded scale radii exactly - an omitted
 * `params` therefore reproduces the prior behaviour bit-for-bit. Supplying
 * a different `params.elliptical` genuinely changes the generated
 * galaxy's shape now, which is the entire point of a Tier G field.
 */
export function createEllipticalModel(
  galaxyMassSol: number, upsilonFor: (pop: Population) => number,
  params: GalaxyParameters = DEFAULT_GALAXY_PARAMETERS,
): GalaxyModel {
  const { aInSituPc, accretedScaleMultiplier } = params.elliptical;
  const populations: Population[] = ELLIPTICAL_POPULATIONS.map((p) =>
    p.key === 'ellipticalInSitu' ? { ...p, scaleRadiusPc: aInSituPc, fehGradientRefPc: aInSituPc }
      : p.key === 'ellipticalAccreted' ? { ...p, scaleRadiusPc: aInSituPc * accretedScaleMultiplier, fehGradientRefPc: aInSituPc }
        : p);
  return {
    morphology: 'elliptical',
    populations,
    densityAt(R, _theta, z) {
      return Object.values(this.densityByPopulation(R, _theta, z) as Record<string, number>)
        .reduce((a, b) => a + b, 0);
    },
    densityByPopulation(R, _theta, z): DensityByPopulation {
      const r = Math.max(Math.hypot(R, z), CORE_FLOOR_PC);
      const out: Partial<Record<PopulationKey, number>> = {};
      for (const pop of populations) {
        const massSol = galaxyMassSol * pop.massFractionGalaxy;
        out[pop.key] = hernquistMassDensity(r, massSol, pop.scaleRadiusPc!) * upsilonFor(pop);
      }
      return out;
    },
  };
}

/** S4.6. `bulgeType` selects `'composite'` (both pseudo- and classical
 *  bulge populations contribute) or `'classical'` (single spheroidal bulge
 *  only, at the Gao et al. 2018 B/T) - the classical config's B/T constant
 *  lives here rather than as a second population set, per S4.6's own
 *  "reuse the elliptical's function, not its population set" framing. */
/**
 * `params` (16 Aug 2026, ported - closing a Tier G gap an audit named)
 * defaults to `DEFAULT_GALAXY_PARAMETERS`, whose `lenticular` block matches
 * every value this function used to hardcode exactly - an omitted `params`
 * reproduces prior behaviour bit-for-bit, in EITHER `bulgeType`.
 */
export function createLenticularModel(
  galaxyMassSol: number, upsilonFor: (pop: Population) => number,
  bulgeType: 'composite' | 'classical' = 'composite',
  params: GalaxyParameters = DEFAULT_GALAXY_PARAMETERS,
): GalaxyModel {
  const { classicalBT, erwinClassicalRePc, erwinClassicalN, gaoClassicalRePcRatio, gaoClassicalN } = params.lenticular;
  // Gao's own classical-bulge Re/n differ from Erwin's composite-config
  // values - Re = gaoClassicalRePcRatio * thinScaleLengthPc (520 pc at
  // defaults), n = gaoClassicalN (2.62, Gao's steeper index vs Erwin's
  // 1.52). Both `calibrated` scaling relations, not independently
  // re-derived here.
  const gaoClassicalRePc = gaoClassicalRePcRatio * JURIC.lThin;
  const populations = bulgeType === 'composite'
    ? LENTICULAR_POPULATIONS.map((p) =>
      p.key === 'lenticularClassicalBulge' ? { ...p, scaleRadiusPc: erwinClassicalRePc, sersicN: erwinClassicalN } : p)
    : LENTICULAR_POPULATIONS.filter((p) => p.key !== 'lenticularPseudoBulge').map((p) =>
      p.key === 'lenticularClassicalBulge'
        ? { ...p, massFractionGalaxy: classicalBT * (1 - F_HALO), scaleRadiusPc: gaoClassicalRePc, sersicN: gaoClassicalN }
        : p.key === 'lenticularThinDisc' || p.key === 'lenticularThickDisc'
          ? { ...p, massFractionGalaxy: p.massFractionGalaxy * (1 - classicalBT) / ERWIN.disc }
          : p);

  return {
    morphology: 'lenticular',
    populations,
    densityAt(R, theta, z) {
      return Object.values(this.densityByPopulation(R, theta, z) as Record<string, number>)
        .reduce((a, b) => a + b, 0);
    },
    densityByPopulation(R, _theta, z): DensityByPopulation {
      const r = Math.max(Math.hypot(R, z), CORE_FLOOR_PC);
      const out: Partial<Record<PopulationKey, number>> = {};
      for (const pop of populations) {
        const massSol = galaxyMassSol * pop.massFractionGalaxy;
        if (pop.key === 'lenticularHalo') {
          // Closed-form mass normalisation (16 Aug 2026), replacing an
          // R0-point-anchor that never actually guaranteed INT rho dV
          // equalled this population's own total - see
          // `haloTermMassNormalized`'s own doc comment.
          out[pop.key] = haloTermMassNormalized(massSol * upsilonFor(pop), R, z);
        } else if (pop.scaleRadiusPc !== undefined && pop.sersicN !== undefined) {
          // Prugniel-Simien (16 Aug 2026) - the classical bulge, replacing
          // a Hernquist reuse the profile's own literature (Terzic &
          // Graham 2005) says is a poor fit at this Sersic index. `r` here
          // is spherical (matches this function's own floor-clamped `r`,
          // computed once above); prugnielSimienMassDensity floors it again
          // internally (CORE_FLOOR_PC is the same 10 pc value in both
          // modules), so the two guards agree rather than compound.
          out[pop.key] = prugnielSimienMassDensity(r, massSol, pop.scaleRadiusPc, pop.sersicN) * upsilonFor(pop);
        } else if (pop.scaleRadiusPc !== undefined) {
          out[pop.key] = hernquistMassDensity(r, massSol, pop.scaleRadiusPc) * upsilonFor(pop);
        } else {
          // Mass-normalised exponential disc, CENTRED AT R=0 (never R0 - the
          // lenticular has no solar-neighbourhood anchor, S4.6's own point
          // about the pseudo-bulge applies to every disc-shaped population
          // here). Closed form: M = n_centre * 4*pi*L^2*H for
          // n(R,z) = n_centre * exp(-R/L) * exp(-|z|/H), so n_centre is
          // solved directly from mass rather than anchored at any reference
          // radius. `lenticularThinDisc`/`lenticularThickDisc` use Juric's
          // geometry; `lenticularPseudoBulge` (which `discGeometryFor` does
          // NOT recognise - it is not one of the spiral-shared disc keys)
          // falls back to its OWN sourced geometry, Erwin et al. 2015's
          // 440 pc mean scale length, flattening `calibrated` similar to the
          // main disc per S4.6's own text.
          const geom = discGeometryFor(pop.key) ?? { scaleLengthPc: 440, scaleHeightPc: JURIC.hThin };
          const nCentre = (massSol * upsilonFor(pop)) / (4 * Math.PI * geom.scaleLengthPc ** 2 * geom.scaleHeightPc);
          out[pop.key] = nCentre * Math.exp(-R / geom.scaleLengthPc) * Math.exp(-Math.abs(z) / geom.scaleHeightPc);
        }
      }
      return out;
    },
  };
}

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Juric thin/thick disc parameters', status: 'sourced',
    short: 'The scale height and scale length of the Milky Way\'s two stellar discs, and the fraction of stars in each.',
    long: 'Juric et al. 2008\'s SDSS-derived structural fit for the Galactic disc(s), used as the spiral model\'s disc geometry.',
    source: 'Juric et al. 2008, ApJ 673, 864',
  },
  {
    term: 'Hernquist profile', status: 'sourced',
    short: 'A smooth density profile commonly used for galactic bulges and dark-matter haloes.',
    long: 'rho(r) = M/(2*pi) * a / (r * (r+a)^3), used here for both the spiral\'s halo and the elliptical/lenticular models\' bulges; hernquistK derived to normalise total enclosed mass.',
    source: 'Hernquist 1990, ApJ 356, 359',
  },
  {
    term: 'Bar factor', status: 'tunable',
    short: 'An optional density boost/reshaping near the galactic centre representing a stellar bar.',
    long: 'A smootherstep-modulated multiplier, toggled by `barEnabled`; no specific bar-strength literature value is targeted, only a qualitatively plausible central concentration.',
  },
];
