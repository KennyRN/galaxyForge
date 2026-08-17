/**
 * galaxyParameters - the Tier G parameter block, patch v2.3.
 *
 * -- WHAT "TIER G" MEANS, AND WHY THIS FILE EXISTS ----------------------------
 * `patches/galaxyForge-SPIRAL-PATCH-v2.3-parameter-schema.md` rules that
 * every module-level constant which can MOVE OR REMOVE an existing system
 * (disc/bar/arm/halo/co-natal-placement geometry) must live in ONE
 * serialisable per-galaxy object, not scattered `const`s - so that a galaxy
 * generated under `fieldShapeVersion: 1` is provably protected from a
 * future default change (patch S2: "the moment the first galaxy is written
 * ... it is pinned to whatever the block contains"). Tier S (stellar -
 * `stellarProperties`, `multiplicity`, `planets`, `habitability`, `belts`,
 * `moons`, and modules 12-15) is explicitly OUT of scope - pinned by sheet
 * content on disk instead (patch S2). Tier D (display) is never pinned.
 *
 * -- SCOPE OF THIS PASS, STATED HONESTLY --------------------------------------
 * Every field the patch's S4 schema names explicitly (arms, armWidth,
 * armResponse, armContrast, armStart*Pc, reference point, nLocalPerPc3,
 * anchorArmCorrection, complexTier) is here, real, and LIVE - actually
 * consumed by `createSpiralModel`/`starFormingComplexes`, not merely
 * declared. `createSpiralModel(barEnabled, params?)` reads `params.R0Pc`,
 * `params.bar` and the arm/complex fields directly; omitting `params`
 * reproduces the prior hardcoded behaviour exactly (verified - see the
 * golden master re-cut, CHANGELOG.md 15 Aug 2026). `params.bar` was renamed
 * `params.bulge` 17 Aug 2026 (Amendment A4, morphology patch v3.0) - see
 * `BulgeParams`'s own header for why.
 *
 * The patch's S5 ALSO names disc structure, Juric geometry, Erwin fractions
 * and halo shape for `elliptical`/`lenticular`, and cell/jitter/exclusion
 * geometry for `placement`/`remnants`, as required Tier G fields - its own
 * words: "I have not seen the disc, bar or co-natal modules... I cannot
 * hand you their key names". Those fields ARE declared below (`juric`,
 * `erwin`, `haloIndexPower`, `haloFlattening`, `haloTruncationPc`,
 * `coreFloorPc`, `placement`) with defaults exactly matching their current
 * hardcoded values, but remain **NOT YET WIRED** into `createSpiralModel`'s
 * OWN disc/halo terms, `placement.ts` or `remnants.ts` - those three still
 * read their own module-level `const`s unchanged, a separately-scoped
 * remaining gap, not attempted here.
 *
 * `elliptical`/`lenticular` (new fields, 16 Aug 2026) ARE fully wired -
 * `createEllipticalModel`/`createLenticularModel` now take this block and
 * build their populations from `params.elliptical`/`params.lenticular`
 * directly, closing the gap this file's own header used to name for those
 * two morphologies specifically (an audit finding, 16 Aug 2026). Recorded
 * here as a real, named partial completion rather than a silent one either
 * way: per the patch's OWN S2 warning, "a block that is 90% complete is
 * worse than one that is 50% complete and known to be". The schema is
 * complete; the wiring now covers the spiral's arm geometry AND both
 * spheroid morphologies' own shape, not yet the spiral's disc/halo terms
 * or `placement`/`remnants`.
 *
 * genVersion: this file's DEFAULT values changing is genVersion-bumping,
 * exactly like a module-level const changing used to be - it is the same
 * commitment, moved to one place.
 */

import type { GalaxyModelName } from './galaxyModel';
import { ARMS, DEFAULT_ARM_WIDTH, deriveArmContrasts, anchorArmCorrection as computeAnchorArmCorrection, type ArmDefinition, type ArmWidthParams, type ArmResponseSet, type ArmContrastSet } from './spiralArms';

/* --------------------------------- arm block ---------------------------------- */

export interface ArmResponseByPopulation {
  readonly spiralYoungThin: ArmResponseSet;
  readonly spiralMidThin: ArmResponseSet;
  readonly spiralOldThin: ArmResponseSet;
  readonly spiralThick: ArmResponseSet;
  readonly spiralHalo: ArmResponseSet;
}

/** By-law S3 (patch v2.3) - calibrated, see `spiralArms.ts`'s own header.
 *  Field names renamed 17 Aug 2026 (Amendment A9) to match `PopulationKey`'s
 *  own spiral keys - this interface is one entry per spiral population, so
 *  it follows that rename rather than being an independent naming choice. */
export const DEFAULT_ARM_RESPONSE: ArmResponseByPopulation = {
  spiralYoungThin: 'all', spiralMidThin: 'majorMinor', spiralOldThin: 'major', spiralThick: 'none', spiralHalo: 'none',
};

export interface ComplexTierParams {
  /** pc. Efremov 1978: star-forming complexes ~600 pc across, so sigma =
   *  600/4 (+/-2 sigma spans the full extent) - `sourced`. */
  readonly sigmaComplexPc: number;
  /** How many co-natal groups (see `conatal.ts`) one complex spawns -
   *  `calibrated`. */
  readonly meanGroupsPerComplex: number;
  /** What fraction of spiralYoungThin's mass is complex-organised -
   *  `calibrated`, DELIBERATELY the same number as `SPIRAL_POPULATIONS
   *  .spiralYoungThin.clusteredFraction` (0.6) per the patch's own Law-1
   *  instruction ("do
   *  not redeclare it... reference it"). Not re-declared as a literal here -
   *  see `starFormingComplexes.ts`'s own read of the population table. */
  readonly complexFraction: number;
  readonly ageDecayStartGyr: number;   // calibrated, NOT sourced (patch's own ledger)
  readonly ageDecayEndGyr: number;     // calibrated, NOT sourced
  /** pc. Parent-point grid cell for the complex-scale Poisson process - MUST
   *  be >= 8 * sigmaComplexPc (gate 27's own load-time assertion; at the
   *  default values this sits AT the floor with zero margin). */
  readonly cellSizePc: number;
  readonly guardBandSigma: number;     // tunable
  readonly cellMeanSubGridN: number;   // tunable, sub-grid quadrature resolution
}

export const DEFAULT_COMPLEX_TIER: ComplexTierParams = {
  sigmaComplexPc: 150,
  meanGroupsPerComplex: 6,
  complexFraction: 0.6,
  ageDecayStartGyr: 0.1,
  ageDecayEndGyr: 0.5,
  cellSizePc: 1200,
  guardBandSigma: 4,
  cellMeanSubGridN: 32,
};

/* ------------------------------- disc/bar/halo block --------------------------- */

export interface JuricParams {
  readonly f: number; readonly lThin: number; readonly hThin: number;
  readonly lThick: number; readonly hThick: number;
}
export const DEFAULT_JURIC: JuricParams = { f: 0.12, lThin: 2600, hThin: 300, lThick: 3600, hThick: 900 };

export interface ErwinParams { readonly disc: number; readonly pseudo: number; readonly classical: number; }
export const DEFAULT_ERWIN: ErwinParams = { disc: 0.61, pseudo: 0.33, classical: 0.06 };

/**
 * The spiral/barredSpiral boxy/peanut bulge (Amendment A4, morphology patch
 * v3.0, 17 Aug 2026) - RENAMED from `BarParams`/`DEFAULT_BAR`, not merely
 * relabelled. The old name was the bug: `halfLengthPc`/`taperInnerPc`/
 * `taperOuterPc` (a LONG BAR's own taper window, a different structure
 * outside the bulge entirely) were bolted onto Wegg & Gerhard 2013's bulge
 * geometry, and `barFactor` (retired, see `galaxyModel.ts`) applied the
 * whole thing as a MULTIPLIER on the disc - both wrong for what these
 * numbers actually describe. `scalePc`/`phaseRad` were always right (Wegg &
 * Gerhard 2013's own triaxial exponential scale lengths/bar angle); this
 * interface now carries ONLY what an additive, mass-normalised bulge
 * population needs, and nothing a long bar (not modelled - would be a
 * SEPARATE term with its own citation, per the patch's own instruction) or
 * `barFactor`'s old multiplicative role required.
 */
export interface BulgeParams {
  readonly phaseRad: number;   // sourced, Wegg & Gerhard 2013 (27 deg +/- 2)
  readonly scalePc: { readonly x: number; readonly y: number; readonly z: number };   // sourced, Wegg & Gerhard 2013 (0.70:0.44:0.18 kpc)
  /** Superellipsoid exponent for the isodensity surface:
   *  s = ((|x|/a)^n + (|y|/b)^n + (|z|/c)^n)^(1/n), n=2 is a plain ellipsoid,
   *  n>2 is boxy. `calibrated` - Wegg & Gerhard's map is non-parametric (axis
   *  ratios and scale lengths only, no closed-form boxiness given); n=4
   *  follows a published precedent for exactly this generalisation in the
   *  boxy-bulge literature, not W&G13 itself. */
  readonly boxiness: number;
  /** Msol, `sourced` - Licquia & Newman 2015 (ApJ 806, 96) total MW stellar
   *  mass, the denominator `SPIRAL_POPULATIONS.spiralBoxyPeanutBulge
   *  .massFractionGalaxy` (0.91e10/6.08e10) is relative to. */
  readonly totalStellarMassSol: number;
  /** `tunable` - multiplies the sourced mass; 1.0 (default) reproduces the
   *  Licquia & Newman figure exactly. A dial for bulge prominence on a
   *  non-Milky-Way-analogue spiral, not itself sourced to anything. */
  readonly strength: number;
}
export const DEFAULT_BULGE: BulgeParams = {
  phaseRad: (27 * Math.PI) / 180,
  scalePc: { x: 700, y: 440, z: 180 },
  boxiness: 4,
  totalStellarMassSol: 6.08e10,
  strength: 1.0,
};

export interface PlacementParams {
  readonly cellSizePc: number;
  readonly jitterSigmaPc: number;
  readonly jitterTruncationSigma: number;
  readonly exclusionRadiusPc: number;
}
export const DEFAULT_PLACEMENT_PARAMS: PlacementParams = {
  cellSizePc: 10, jitterSigmaPc: 1.5, jitterTruncationSigma: 3, exclusionRadiusPc: 0.1,
};

/* ------------------------- elliptical/lenticular block (16 Aug 2026) ----------- */
//
// Ported from a sibling build's own EllipticalParameters/LenticularParameters
// shapes, closing a gap this file's own header named honestly: these two
// morphologies' geometry constants existed only as module-level `const`s in
// `galaxyModel.ts`, outside Tier G pinning entirely - `createEllipticalModel`/
// `createLenticularModel` took a raw `galaxyMassSol` number, no parameter
// block. Wired below AND into `createEllipticalModel`/`createLenticularModel`
// (galaxyModel.ts), unlike the still-honestly-unwired juric/erwin/halo fields
// above, which remain the named remaining gap for the SPIRAL/`placement`/
// `remnants` (a separately-scoped piece of work, not attempted here).

export interface EllipticalParams {
  /** pc. Hernquist scale radius of the in-situ population - `derived`, Shen
   *  size-mass (S4.5). */
  readonly aInSituPc: number;
  /** How much more extended the accreted (ex-situ) population's scale
   *  radius is than the in-situ one - `calibrated`. A single shared scale
   *  radius would give a radially CONSTANT ex-situ mass fraction, so this
   *  multiplier is what makes the ex-situ fraction rise with radius at all
   *  (2.3a's own requirement). */
  readonly accretedScaleMultiplier: number;
}
export const DEFAULT_ELLIPTICAL_PARAMS: EllipticalParams = {
  aInSituPc: 2400, accretedScaleMultiplier: 8,
};

export interface LenticularParams {
  /** Classical-configuration bulge-to-total ratio - `calibrated`, Gao, Ho,
   *  Barth & Li 2018 (unbarred). */
  readonly classicalBT: number;
  /** pc, Sersic effective radius for the COMPOSITE configuration's
   *  classical bulge component - `sourced`, Erwin et al. 2015. */
  readonly erwinClassicalRePc: number;
  /** Sersic index for the COMPOSITE configuration's classical bulge -
   *  `sourced`, Erwin et al. 2015. */
  readonly erwinClassicalN: number;
  /** Re / (thin-disc scale length) for the CLASSICAL configuration's single
   *  spheroidal bulge - `calibrated`, Gao, Ho, Barth & Li 2018's own
   *  scaling relation. */
  readonly gaoClassicalRePcRatio: number;
  /** Sersic index for the CLASSICAL configuration's bulge - `sourced`, Gao
   *  et al. 2018. */
  readonly gaoClassicalN: number;
}
export const DEFAULT_LENTICULAR_PARAMS: LenticularParams = {
  classicalBT: 0.38, erwinClassicalRePc: 143, erwinClassicalN: 1.52,
  gaoClassicalRePcRatio: 0.20, gaoClassicalN: 2.62,
};

/* ---------------------------------- the block ---------------------------------- */

export interface GalaxyParameters {
  // -- stamps --
  readonly fieldShapeVersion: number;
  readonly placementShapeVersion: number;
  /** Purely informational (patch S4) - no generator, loader or migration
   *  may read this to change behaviour. */
  readonly parameterSetVersion: string;

  // -- identity --
  readonly worldSeed: string;
  readonly morphology: GalaxyModelName;
  readonly scale: number;
  readonly armSource: 'observed-mw' | 'seeded';

  // -- arm geometry --
  readonly arms: readonly ArmDefinition[];
  readonly armWidth: ArmWidthParams;
  readonly armResponse: ArmResponseByPopulation;
  /** Reproduced HONESTLY, not byte-identically - see `spiralArms.ts`'s own
   *  header. `deriveArmContrasts` is called once, lazily, at first read. */
  readonly armContrast: () => ArmContrastSet;
  readonly armStartInnerPc: number;   // calibrated, Wegg 2015 bar half-length
  readonly armStartOuterPc: number;   // calibrated

  // -- density anchor --
  readonly referenceRPc: number;
  readonly referenceThetaDeg: number;
  /** systems/pc^3, `sourced`. NEVER a silent default - see
   *  `assertGalaxyParameters` (gate 27). Wired from the Reyle anchor query
   *  (`verification/reyle_anchor_result.json`, 15 Aug 2026), NOT yet applied
   *  to the disc populations' own `nLocal` figures (see
   *  `galacticDensity.ts`'s own header note on this same gap). */
  readonly nLocalPerPc3: number;

  // -- star-forming complexes --
  readonly complexTier: ComplexTierParams;

  // -- disc/bar/halo (patch S5, migrated from prior module-level consts) --
  readonly R0Pc: number;              // sourced, GRAVITY Collaboration 2019
  readonly juric: JuricParams;        // sourced, Juric et al. 2008
  readonly fHalo: number;             // tunable, S4.6 - MW is a low outlier
  readonly erwin: ErwinParams;        // sourced, Erwin et al. 2015
  readonly haloIndexPower: number;    // sourced, Juric 2008
  readonly haloFlattening: number;    // sourced, Juric 2008 (c/a)
  readonly haloTruncationPc: number;  // tunable, Juric's calibration edge
  readonly coreFloorPc: number;       // tunable, numerical guard
  readonly bulge: BulgeParams;
  readonly placement: PlacementParams;

  // -- elliptical/lenticular (16 Aug 2026 - WIRED, not merely declared) --
  readonly elliptical: EllipticalParams;
  readonly lenticular: LenticularParams;
}

/**
 * The default parameter set - every value here is IDENTICAL to what was
 * previously a module-level `const` in `galaxyModel.ts`/`placement.ts`
 * (confirmed by diff before this migration; see CHANGELOG.md, 15 Aug 2026).
 * `deriveArmContrasts`/`anchorArmCorrection` are wrapped in closures rather
 * than eagerly evaluated so a parameter set can be constructed cheaply and
 * only pays the arm-contrast root-find cost if a caller actually reads it.
 *
 * `arms`/`armSource` (16 Aug 2026, additive - see `spiralArms
 * .generateSeededArms`'s own header) let a caller supply a DIFFERENT arm
 * table (a per-worldSeed procedural one) instead of the real Milky Way's.
 * Omitting either reproduces every prior call site's behaviour exactly -
 * `arms` defaults to `ARMS`, `armSource` to `'observed-mw'`, so
 * `createSpiralModel`'s own default path (no `params` argument at all) and
 * every existing conformance/golden-master call are untouched bit-for-bit.
 * `armContrast`'s own closure captures `arms` too - the memoisation this
 * function's own comment already documents is now correct per-table (see
 * `deriveArmContrasts`'s own header) rather than merely per-process.
 */
export function makeDefaultGalaxyParameters(
  worldSeed = '', arms: readonly ArmDefinition[] = ARMS, armSource: 'observed-mw' | 'seeded' = 'observed-mw',
): GalaxyParameters {
  const referenceRPc = 8200;
  const referenceThetaDeg = 0;
  return {
    fieldShapeVersion: 1,
    placementShapeVersion: 1,
    parameterSetVersion: '2026.08.15',
    worldSeed,
    morphology: 'spiral',
    scale: 1.0,
    armSource,
    arms,
    armWidth: DEFAULT_ARM_WIDTH,
    armResponse: DEFAULT_ARM_RESPONSE,
    armContrast: () => deriveArmContrasts(referenceRPc, DEFAULT_ARM_WIDTH, arms),
    armStartInnerPc: 3500,
    armStartOuterPc: 5500,
    referenceRPc,
    referenceThetaDeg,
    nLocalPerPc3: 0.0606380,   // verification/reyle_anchor_result.json, 15 Aug 2026 (stars_only, adopted)
    complexTier: DEFAULT_COMPLEX_TIER,
    R0Pc: 8178,
    juric: DEFAULT_JURIC,
    fHalo: 0.01,
    erwin: DEFAULT_ERWIN,
    haloIndexPower: 2.8,
    haloFlattening: 0.64,
    haloTruncationPc: 20000,
    coreFloorPc: 10,
    bulge: DEFAULT_BULGE,
    placement: DEFAULT_PLACEMENT_PARAMS,
    elliptical: DEFAULT_ELLIPTICAL_PARAMS,
    lenticular: DEFAULT_LENTICULAR_PARAMS,
  };
}

/** A ready-made default, `worldSeed: ''` - callers that need a real seed
 *  build their own via `makeDefaultGalaxyParameters(seed)`; this export
 *  exists for call sites that only need the constants, not identity. */
export const DEFAULT_GALAXY_PARAMETERS: GalaxyParameters = makeDefaultGalaxyParameters();

/**
 * Per-population anchor correction, computed from the block's OWN stored
 * (4-dp) contrasts - patch S7's self-consistency rule. `derived`.
 */
export function anchorArmCorrectionFor(params: GalaxyParameters, set: ArmResponseSet): number {
  return computeAnchorArmCorrection(
    set, params.armContrast(), params.referenceRPc, (params.referenceThetaDeg * Math.PI) / 180, params.armWidth, params.arms,
  );
}

/**
 * GATE 27 - load-time assertions (patch S10). Throws loudly rather than
 * defaulting or silently clamping - a mis-pinned galaxy parameter file is
 * exactly the failure this exists to prevent from running quietly wrong.
 */
export function assertGalaxyParameters(params: GalaxyParameters): void {
  if (params.armWidth.broadening > 1.02) {
    throw new Error(
      `galaxyParameters: armWidth.broadening (${params.armWidth.broadening}) exceeds the hard ceiling 1.02 - ` +
      `above it Perseus merges with Norma-Outer at the inner disc edge (patch v2.3 S4).`,
    );
  }
  if (params.complexTier.cellSizePc < 8 * params.complexTier.sigmaComplexPc) {
    throw new Error(
      `galaxyParameters: complexTier.cellSizePc (${params.complexTier.cellSizePc}) is below the floor ` +
      `8 * sigmaComplexPc (${8 * params.complexTier.sigmaComplexPc}) - guard band would clip a live complex (patch v2.3 S4).`,
    );
  }
  if (params.nLocalPerPc3 === undefined || params.nLocalPerPc3 === null || !(params.nLocalPerPc3 > 0)) {
    throw new Error(
      `galaxyParameters: nLocalPerPc3 must be a positive, present number - it must never be defaulted or left ` +
      `TBD (patch v2.3 S6/S10 gate 27). Run verification/reyle_anchor.py and set it explicitly.`,
    );
  }
}

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Tier G parameter block', status: 'derived',
    short: 'The single file that would let a generated galaxy be provably protected from a future update changing its shape.',
    long: 'Every constant that can move or remove an existing system (disc, bar, arm, halo, star-forming-complex geometry) collected into one object rather than scattered module-level constants - every default value unchanged from its prior hardcoded constant, migrated mechanically rather than re-derived.',
    source: 'patch v2.3 (galaxyForge-SPIRAL-PATCH-v2.3-parameter-schema.md)',
  },
  {
    term: 'Local density anchor (nLocalPerPc3)', status: 'sourced',
    short: 'How many star systems occupy each cubic parsec near the Sun - the number the whole arm-modulated density field is pinned to.',
    long: 'From the restricted (hydrogen-burning-only) Reyle 10 pc anchor query, run 15 August 2026 against the live GAVO TAP service.',
    source: 'Reyle et al. 2021/2022 (10 pc catalogue), via verification/reyle_anchor.py',
  },
  // 'Star-forming complex' term lives in starFormingComplexes.ts (16 Aug
  // 2026 - moved there rather than duplicated, since that module is now
  // the actual mechanism's owner, not just a parameter block reader).
];
