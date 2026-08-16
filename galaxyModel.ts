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

import type { GalaxyParameters, BarParams } from './galaxyParameters';
import { DEFAULT_GALAXY_PARAMETERS, anchorArmCorrectionFor } from './galaxyParameters';
import { armFactor, type ArmResponseSet } from './spiralArms';
import { smootherstep } from './mathStats';

export type GalaxyModelName = 'spiral' | 'barredSpiral' | 'elliptical' | 'lenticular';

/**
 * Every key any SHIPPED morphology uses. Widening it for a new morphology is
 * additive and sanctioned (0.5). Downstream code NEVER special-cases a key.
 *
 * -- NAMING CONVENTION, and it is binding -----------------------------------
 * New keys are MORPHOLOGY-PREFIXED camelCase. The five unprefixed keys predate
 * the convention and are frozen; they are not evidence against it. This is the
 * `nLocal` precedent applied deliberately - a documented historical exception
 * beats either a corrupting rename or a convention nobody wrote down (0.2).
 *
 * WHY FROZEN, and it is stronger than Law 5: the five are STAMPED INTO
 * GENERATED NOTES via `SystemContext.population`. A rename is silent corruption
 * of stored user data, which is the one thing the project promises never to do.
 *
 * WHY PREFIXED: a key identifies a population *instance definition*, not a
 * physical category. Two morphologies' classical bulges share a word and share
 * nothing else - different scale radius, mass fraction, age and metallicity -
 * so a shared key makes every glossary entry and every stamp wrong for one of
 * them. This is not hypothetical for `classicalBulge`: 0.9 instructs "apply
 * the bar to disc and bulge terms only", and Part 9 already carries Licquia &
 * Newman's Milky Way bulge mass, so the unprefixed name is a slot the spiral
 * will claim. AUDIT CORRECTION (1 Aug): an earlier draft of this comment
 * asserted the spiral's density field "has a bulge term TODAY". That could not
 * be verified from this package - the only spiral reference implementation in
 * it (1.3) is haloTerm + discs, with no bulge term - and the shipped plugin
 * code is not in the archive to arbitrate. Do not go hunting for a term 1.3
 * does not show. The reservation of the unprefixed key does not depend on
 * whether the term exists yet; 0.9's instruction binds whichever terms do.
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
  // EXISTING AND FROZEN. Unprefixed by history, not by design.
  | 'youngThin'
  | 'midThin'
  | 'oldThin'
  | 'thick'
  | 'halo'
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
  // midThin/oldThin boundary is an AGE-COHORT subdivision (Xiang & Rix), not a
  // structural one - Juric assigns both the same scale height and length. A
  // quenched galaxy has no ongoing formation laying down an age sequence, so
  // the thin disc is one old population. That is what "drop the young cohort"
  // means. Collapsing to a single disc would instead discard the thick disc's
  // distinct chemistry, which is the thing the AMR coupling needs.
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
  { key: 'youngThin', label: 'Young thin disc', nLocal: 0.018, ageGyr: [0, 3],
    ageMeanGyr: 1.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.10,
    fehMeanDex: 0.0, fehSigmaDex: 0.15,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    clusteredFraction: 0.6, meanGroupSize: 12, armAmplitude: 0.35 },
  { key: 'midThin', label: 'Mid thin disc', nLocal: 0.030, ageGyr: [3, 6],
    ageMeanGyr: 4.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.30,
    fehMeanDex: -0.05, fehSigmaDex: 0.18,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    armAmplitude: 0.25 },
  { key: 'oldThin', label: 'Old thin disc', nLocal: 0.024, ageGyr: [6, 8],
    ageMeanGyr: 7.0, ageSigmaGyr: 0.8, massFractionGalaxy: 0.30,
    fehMeanDex: -0.15, fehSigmaDex: 0.20,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    armAmplitude: 0.15 },
  { key: 'thick', label: 'Thick disc', nLocal: 0.006, ageGyr: [8, 12],
    ageMeanGyr: 10.0, ageSigmaGyr: 1.2, massFractionGalaxy: 0.25,
    fehMeanDex: -0.55, fehSigmaDex: 0.25,
    fehGradientForm: 'linear', fehGradient: -0.000015, fehGradientRefPc: R0_PC,
    armAmplitude: 0.0 },
  { key: 'halo', label: 'Stellar halo', nLocal: 0.0002, ageGyr: [11, 13.5],
    ageMeanGyr: 12.0, ageSigmaGyr: 0.9, massFractionGalaxy: 0.05,
    fehMeanDex: -1.6, fehSigmaDex: 0.4, armAmplitude: 0.0 },
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
    scaleRadiusPc: 143 / hernquistK(), armAmplitude: 0 },
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
    case 'youngThin': case 'midThin': case 'oldThin':
    case 'lenticularThinDisc':
      return { scaleLengthPc: JURIC.lThin, scaleHeightPc: JURIC.hThin };
    case 'thick': case 'lenticularThickDisc':
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
    case 'youngThin': return params.armResponse.youngThin;
    case 'midThin': return params.armResponse.midThin;
    case 'oldThin': return params.armResponse.oldThin;
    case 'thick': return params.armResponse.thick;
    case 'halo': return params.armResponse.halo;
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
  const cFull = set === 'all' ? contrasts.youngThin : set === 'majorMinor' ? contrasts.midThin : contrasts.oldThin;
  const c = cFull * armInnerTaper(R, params);
  const raw = armFactor(set, c, R, theta, params.armWidth);
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

function hernquistMassDensity(rPc: number, totalMassSol: number, aPc: number): number {
  if (rPc <= 0) return Number.POSITIVE_INFINITY;
  return (totalMassSol * aPc) / (2 * Math.PI * rPc * Math.pow(rPc + aPc, 3));
}

/* ------------------------------- bar geometry --------------------------------- */

// smootherstep moved to mathStats.ts (16 Aug 2026) - imported above.

// Wegg & Gerhard 2013 / Wegg, Gerhard & Portail 2015 bar geometry - sourced
// except the taper window and strength (tunable, S4.4's own ledger). NO
// LONGER DECLARED HERE (15 Aug 2026, patch v2.3) - `galaxyParameters
// .DEFAULT_BAR` is the single source now (Law 1); `barFactor` below takes
// `BarParams` as an explicit argument instead of closing over a module
// -level const, so `createSpiralModel`'s injected `params.bar` is what
// actually reaches it.

/** Returns EXACTLY 1 when `enabled` is false - the short-circuit that
 *  guarantees `barredSpiral` with the bar off reproduces `spiral`
 *  bit-identically (S4.4's own gate). */
function barFactor(enabled: boolean, bar: BarParams, R: number, theta: number, z: number): number {
  if (!enabled || bar.strength === 0) return 1;
  const dth = theta - bar.phaseRad;
  const x = R * Math.cos(dth), y = R * Math.sin(dth);
  const s = Math.abs(x) / bar.scalePc.x + Math.abs(y) / bar.scalePc.y + Math.abs(z) / bar.scalePc.z;
  const window = 1 - smootherstep(bar.taperInnerPc, bar.taperOuterPc, R);
  return 1 + bar.strength * Math.exp(-s) * window;
}

/* ------------------------------- model factories ------------------------------- */

/**
 * ONE implementation, one flag (S4.4). `barEnabled = false` reproduces the
 * pure spiral bit-identically, because `barFactor` returns exactly 1 and the
 * halo is NEVER multiplied by it (S4.2's halo/bar bug fix - a bar is a disc
 * instability, not a halo feature).
 *
 * `params` (patch v2.3, 15 Aug 2026) is OPTIONAL, defaulting to
 * `DEFAULT_GALAXY_PARAMETERS` - a caller that omits it gets the identical
 * `R0Pc`/`bar` values this function always had, so every prior call site
 * (a single positional `barEnabled` argument) keeps compiling and keeps its
 * existing behaviour. The arm/complex modulation, however, is NOT optional
 * once `params` IS supplied - it is what `params` is actually for.
 */
export function createSpiralModel(barEnabled: boolean, params: GalaxyParameters = DEFAULT_GALAXY_PARAMETERS): GalaxyModel {
  const populations = SPIRAL_POPULATIONS;
  return {
    morphology: barEnabled ? 'barredSpiral' : 'spiral',
    populations,
    densityAt(R, theta, z) {
      return Object.values(this.densityByPopulation(R, theta, z) as Record<string, number>)
        .reduce((a, b) => a + b, 0);
    },
    densityByPopulation(R, theta, z): DensityByPopulation {
      const bar = barFactor(barEnabled, params.bar, R, theta, z);
      const out: Partial<Record<PopulationKey, number>> = {};
      for (const pop of populations) {
        if (pop.key === 'halo') {
          out[pop.key] = haloTerm(pop.nLocal, R, z);    // AXISYMMETRIC - never barred, never arm-modulated
          continue;
        }
        // youngThin's complex-tier boost is NOT applied here (removed 16 Aug
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
        out[pop.key] = discTerm(pop, R, theta, z, params) * bar;
      }
      return out;
    },
  };
}

/**
 * S4.5. `upsilonFor` is INJECTED (Kroupa + msLifetimeGyr + meanStarsPerSystem
 * composed elsewhere, owned by `galacticDensity` - S4.3's own ruling) so this
 * module never depends on `galacticDensity`, keeping the import direction
 * one-way (types.ts -> galaxyModel; galacticDensity -> galaxyModel).
 */
export function createEllipticalModel(
  galaxyMassSol: number, upsilonFor: (pop: Population) => number,
): GalaxyModel {
  const populations = ELLIPTICAL_POPULATIONS;
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
export function createLenticularModel(
  galaxyMassSol: number, upsilonFor: (pop: Population) => number,
  bulgeType: 'composite' | 'classical' = 'composite',
): GalaxyModel {
  const CLASSICAL_BT = 0.38;   // calibrated, Gao, Ho, Barth & Li 2018 (unbarred)
  const populations = bulgeType === 'composite'
    ? LENTICULAR_POPULATIONS
    : LENTICULAR_POPULATIONS.filter((p) => p.key !== 'lenticularPseudoBulge').map((p) =>
      p.key === 'lenticularClassicalBulge' ? { ...p, massFractionGalaxy: CLASSICAL_BT * (1 - F_HALO) }
        : p.key === 'lenticularThinDisc' || p.key === 'lenticularThickDisc'
          ? { ...p, massFractionGalaxy: p.massFractionGalaxy * (1 - CLASSICAL_BT) / ERWIN.disc }
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
          out[pop.key] = haloTerm(1, R, z) * (massSol * upsilonFor(pop)) / haloTerm(1, R0_PC, 0);
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
