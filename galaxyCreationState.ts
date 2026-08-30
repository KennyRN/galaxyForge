/**
 * galaxyCreationState - the pure, testable state and reactive logic behind
 * the three-screen galaxy-creation GUI (design conversation, 15 Aug 2026).
 * Amendment A3-exempt (no ledger) in the sense `render`/`vault`/`main` are -
 * this is presentation-adjacent state management, not science - but unlike
 * those three, it IS conformance-gated, because it is pure and therefore
 * cheap to gate: no Obsidian dependency lives here at all. The actual
 * screens (`galaxyCreationModals.ts`) are thin - they read/write this
 * state and call `sectorSearch`/`sectorFootprint`/`systemConductor`; the
 * REACTIVE ARITHMETIC (which is where a bug would actually hide) lives
 * here, where it can be tested the same way everything else in this
 * project is.
 *
 * -- SCREEN 1: MORPHOLOGY, SIZE, SEED --------------------------------------------
 * Five buttons (Lenticular, Elliptical, Barred, Spiral, Milky Way
 * Analogue) - `MorphologyChoice`. "Milky Way Analogue" is NOT a fifth
 * `GalaxyModelName` (the type system only has four) - it is spiral + bar
 * enabled + `armSource: 'observed-mw'` + a narrow scale band, exactly as
 * specified in this session's design conversation.
 *
 * SIZE. "Use whatever function is needed to dictate size, even if it's
 * mass... discrete sizes... left is smaller, right is larger" - a single
 * `sizeStepIndex` (0-4) drives a per-morphology-choice discrete ladder
 * (`SIZE_STEPS`), the underlying value being a `scale` multiplier for the
 * three spiral-family choices, `galaxyMassSol` for elliptical/lenticular.
 * Milky Way Analogue's own ladder is a NARROW +/-20% scale band (this
 * session's own recommendation, accepted) - the point of the preset is
 * that it still reads as recognisably the Milky Way.
 *
 * genVersion: this module does not participate - it is a UI staging area,
 * never itself a source of generated data. `SectorRecipe`'s own fields,
 * once a user commits, are what actually get hashed/stored.
 */

import type { GalaxyModelName, GalaxyModel } from './galaxyModel';
import type { FootprintShape } from './sectorFootprint';
import { isWithinFootprint } from './sectorFootprint';
import type { SearchCriteria, SysTypeCriterion } from './sectorSearch';
import type { MultiplicityPreference } from './galacticDensity';
import type { HabTier } from './humanHabitability';
import { fieldFromModel, projectSlab, type SlabRegionPc } from './densityMap';

/* --------------------------------- screen 1 ------------------------------------ */

export type MorphologyChoice = 'lenticular' | 'elliptical' | 'barredSpiral' | 'spiral' | 'milkyWayAnalogue';

/** What `MorphologyChoice` actually resolves to for `createSpiralModel`/
 *  `createEllipticalModel`/`createLenticularModel` - `milkyWayAnalogue` is
 *  spiral with the bar on, never its own `GalaxyModelName`. */
export function resolveModelName(choice: MorphologyChoice): GalaxyModelName {
  if (choice === 'milkyWayAnalogue') return 'barredSpiral';
  return choice;
}
export function resolveBarEnabled(choice: MorphologyChoice): boolean {
  return choice === 'barredSpiral' || choice === 'milkyWayAnalogue';
}

interface SizeStep { readonly label: string; readonly value: number; }

/** `calibrated` - a round, human-legible ladder, not fitted to anything.
 *  Spiral-family: `scale` multiplier (dimensionless, patch v2.3's own
 *  field). Spheroids: `galaxyMassSol`, log-spaced across a plausible
 *  range of real galaxy masses. */
const SIZE_STEPS: Readonly<Record<MorphologyChoice, readonly SizeStep[]>> = {
  spiral: [
    { label: 'Small', value: 0.5 }, { label: 'Modest', value: 0.75 }, { label: 'Standard', value: 1.0 },
    { label: 'Large', value: 1.5 }, { label: 'Grand', value: 2.0 },
  ],
  barredSpiral: [
    { label: 'Small', value: 0.5 }, { label: 'Modest', value: 0.75 }, { label: 'Standard', value: 1.0 },
    { label: 'Large', value: 1.5 }, { label: 'Grand', value: 2.0 },
  ],
  elliptical: [
    { label: 'Dwarf', value: 1e10 }, { label: 'Small', value: 3e10 }, { label: 'Standard', value: 1e11 },
    { label: 'Giant', value: 3e11 }, { label: 'Supergiant', value: 1e12 },
  ],
  lenticular: [
    { label: 'Dwarf', value: 1e10 }, { label: 'Small', value: 3e10 }, { label: 'Standard', value: 1e11 },
    { label: 'Giant', value: 3e11 }, { label: 'Supergiant', value: 1e12 },
  ],
  // +/- 20% about the real Milky Way's own anchor (scale = 1) - narrow
  // enough to stay recognisable, wide enough to give real seed-to-seed
  // variation (this session's own recommendation, accepted over the
  // initial +/-10% suggestion).
  milkyWayAnalogue: [
    { label: 'Smaller', value: 0.8 }, { label: 'Slightly smaller', value: 0.9 }, { label: 'Standard', value: 1.0 },
    { label: 'Slightly larger', value: 1.1 }, { label: 'Larger', value: 1.2 },
  ],
};

export function sizeStepsFor(choice: MorphologyChoice): readonly SizeStep[] { return SIZE_STEPS[choice]; }
export function sizeValueFor(choice: MorphologyChoice, stepIndex: number): number {
  const steps = SIZE_STEPS[choice];
  const clamped = Math.max(0, Math.min(steps.length - 1, Math.round(stepIndex)));
  return steps[clamped]!.value;
}

/** True for the two morphology choices whose size is a MASS, not a scale
 *  multiplier - callers use this to route the resolved size value to the
 *  right model-factory parameter. */
export function sizeIsMass(choice: MorphologyChoice): boolean {
  return choice === 'elliptical' || choice === 'lenticular';
}

export type LenticularBulgeType = 'composite' | 'classical';

export interface Screen1Draft {
  readonly morphology: MorphologyChoice;
  readonly sizeStepIndex: number;   // 0-4, into SIZE_STEPS[morphology]
  readonly worldSeed: string;
  readonly terraformScale: number;   // 0-6, "other options" section - COVERAGE
  /** 0-6, "other options" section - DEGREE (16 Aug 2026, paired with
   *  `terraformScale`; see `terraforming.ts`'s own header for why one dial
   *  could not carry both questions). */
  readonly terraformIntensity: number;
  /** Only meaningful when `morphology === 'lenticular'` - "other options"
   *  section, per this session's own instruction. */
  readonly lenticularBulgeType: LenticularBulgeType;
}

/** `overrides` (16 Aug 2026) lets a caller seed the draft from persisted
 *  settings (`main.ts`'s own `StarForgeSettings`) without this module
 *  knowing anything about settings/plugin persistence exists - the
 *  dependency runs one way, caller reads this module's own shape and
 *  supplies a partial override, never the reverse. */
export function defaultScreen1Draft(overrides: Partial<Screen1Draft> = {}): Screen1Draft {
  return { morphology: 'spiral', sizeStepIndex: 2, worldSeed: '', terraformScale: 3, terraformIntensity: 3, lenticularBulgeType: 'composite', ...overrides };
}

/* --------------------------------- screen 2 ------------------------------------ */

export type SysDensityChoice = 'thin' | 'standard' | 'thick';

/** "sys density" is the slab-thickness control, made legible - this
 *  session's own explicit instruction, restated here so a future reader
 *  does not go looking for a genuinely separate density concept. Maps
 *  directly onto the three ruled `thicknessPc` values (S4.1's own union). */
const SYS_DENSITY_THICKNESS_PC: Readonly<Record<SysDensityChoice, number>> = { thin: 5, standard: 10, thick: 15 };
export function thicknessPcFor(choice: SysDensityChoice): number { return SYS_DENSITY_THICKNESS_PC[choice]; }

export type SysTypeChoice = 'nearest' | 'interesting' | 'marginal' | 'tolerable' | 'earthLike';

export function sysTypeToSearchCriterion(choice: SysTypeChoice): SysTypeCriterion {
  switch (choice) {
    case 'nearest': return { kind: 'nearest' };
    case 'interesting': return { kind: 'interesting' };
    case 'marginal': return { kind: 'habitable', minTier: 2 as HabTier };
    case 'tolerable': return { kind: 'habitable', minTier: 3 as HabTier };
    case 'earthLike': return { kind: 'habitable', minTier: 4 as HabTier };
  }
}

/** Which of the reactive pair (total systems / size in pc) the user last
 *  touched - THAT one stays fixed; the other recomputes. Neither is
 *  "the" derived field permanently (this session's own instruction). */
export type SizeEditMode = 'totalSystems' | 'sizeInPc';

export interface Screen2Draft {
  readonly sysDensity: SysDensityChoice;
  readonly footprintShape: FootprintShape;
  readonly angleRad: number;               // theta, sector centre polar angle
  readonly distanceFromCentrePc: number;   // R, galactocentric radius
  readonly distanceFromPlanePc: number;    // z
  readonly sizeEditMode: SizeEditMode;
  readonly totalSystems: number;
  readonly sizeInPc: number;
  readonly systemAtCentre: boolean;
  readonly multiplicity: MultiplicityPreference;
  readonly sysType: SysTypeChoice;
}

/** `overrides` (16 Aug 2026, mirroring `defaultScreen1Draft`'s own pattern
 *  exactly) lets a caller seed the draft from a persisted settings value
 *  (`main.ts`'s own `StarForgeSettings.lastScreen2Draft`) without this
 *  module knowing anything about settings/plugin persistence exists - the
 *  dependency runs one way, caller reads this module's own shape and
 *  supplies a partial override, never the reverse. Closes a direct user
 *  report: "when leave and come back to the 2nd page... everything is
 *  reset" - previously this function took no parameter at all. */
export function defaultScreen2Draft(overrides: Partial<Screen2Draft> = {}): Screen2Draft {
  return {
    sysDensity: 'standard', footprintShape: 'circle',
    angleRad: 0, distanceFromCentrePc: 8178, distanceFromPlanePc: 0,
    sizeEditMode: 'sizeInPc', totalSystems: 0, sizeInPc: 25,
    systemAtCentre: false, multiplicity: 'any', sysType: 'nearest',
    ...overrides,
  };
}

export function centrePcFromPolar(d: Screen2Draft): { x: number; y: number; z: number } {
  return { x: d.distanceFromCentrePc * Math.cos(d.angleRad), y: d.distanceFromCentrePc * Math.sin(d.angleRad), z: d.distanceFromPlanePc };
}

/* ----------------------- sol-like neighbourhood band -------------------------- */

/**
 * The slice of a disc galaxy that still "feels" roughly sol-like (16 Aug
 * 2026, a direct user question originally answered inline in Screen 2's own
 * constructor; lifted here 30 Aug 2026 so the new sol-neighbourhood sector
 * flow rolls a centre from the SAME band Screen 2 draws as a reference
 * mark, never a second definition that could silently disagree - Law 1):
 *
 *  - R within +/-10% of the model's own solar anchor radius R0 (a plain,
 *    symmetric "still close to R0" reading).
 *  - z within one full thin-disc scale height (`juric.hThin`, Juric et al.
 *    2008) either side of the plane.
 *  - theta unconstrained - the band is a full annulus.
 *
 * `previewScale` scales every distance the same way `scaleSpiralModel`
 * scales the rest of the model, so the band stays correct at every galaxy
 * size. Meaningful only for the disc morphologies (spiral/barredSpiral) -
 * a pressure-supported spheroid has no plane, so no caller should ask.
 */
export interface SolNeighbourhoodBand {
  readonly rCentrePc: number;
  readonly rHalfWidthPc: number;
  readonly zHalfWidthPc: number;
}

export function solNeighbourhoodBand(r0Pc: number, hThinPc: number, previewScale: number): SolNeighbourhoodBand {
  return { rCentrePc: r0Pc * previewScale, rHalfWidthPc: r0Pc * 0.1 * previewScale, zHalfWidthPc: hThinPc * previewScale };
}

/** One uniform random sector centre inside `band` - R uniform across the
 *  full +/-10% width, z uniform across the full +/-hThin height (so it can
 *  land above OR below the plane), theta uniform on the circle. `rng` is
 *  injected (`Math.random` in the GUI) purely so this is a pure function a
 *  gate can pin - a rolled centre must always land inside the band. */
export function rollSolNeighbourhoodCentre(
  band: SolNeighbourhoodBand, rng: () => number,
): { angleRad: number; distanceFromCentrePc: number; distanceFromPlanePc: number } {
  return {
    angleRad: rng() * 2 * Math.PI,
    distanceFromCentrePc: band.rCentrePc + (rng() * 2 - 1) * band.rHalfWidthPc,
    distanceFromPlanePc: (rng() * 2 - 1) * band.zHalfWidthPc,
  };
}

/**
 * One remembered sol-neighbourhood roll (30 Aug 2026) - persisted in
 * `StarForgeSettings.solNeighbourhoodHistory` so the sector flow's own
 * "view new sector" history survives a restart. Carries `worldSeed`
 * alongside the coordinates: re-selecting an entry must reproduce the SAME
 * sector, which means the same galaxy, not just the same point in a fresh
 * one.
 */
export interface SolNeighbourhoodSector {
  readonly worldSeed: string;
  readonly angleRad: number;
  readonly distanceFromCentrePc: number;
  readonly distanceFromPlanePc: number;
  readonly rolledIso: string;
}

/* -- reactive total-systems <-> size-in-pc, via densityMap's own machinery -- */

/** Bounding-square area ratio for each footprint shape at a given
 *  circumradius (see `sectorFootprint.ts`'s own header for the shape
 *  conventions) - circle: pi/4 of the 2R square; square (corners on R):
 *  1/2; hexagon (pointy-top, vertex on R): (3*sqrt(3)/2)/4. Used to scale
 *  `expectedSystemCount`'s own bounding-square estimate down to the
 *  actual requested shape, reusing `densityMap`'s already-tested
 *  integration rather than a second one (Law 1). */
const SHAPE_AREA_RATIO: Readonly<Record<FootprintShape, number>> = {
  circle: Math.PI / 4,
  square: 0.5,
  hexagon: (3 * Math.sqrt(3)) / 2 / 4,
};

function estimatedCountAtRadius(model: GalaxyModel, centrePc: { x: number; y: number; z: number }, radiusPc: number, thicknessPc: number, shape: FootprintShape): number {
  const field = fieldFromModel(model);
  const region: SlabRegionPc = { centre: centrePc, halfWidthPc: radiusPc, halfDepthPc: radiusPc, thicknessPc };
  const surface = projectSlab(field, region, { nx: 32, ny: 32 });
  const cellArea = (2 * radiusPc / 32) * (2 * radiusPc / 32);
  let acc = 0;
  for (let i = 0; i < surface.values.length; i++) acc += surface.values[i]!;
  return acc * cellArea * SHAPE_AREA_RATIO[shape];
}

/** Given a target system count, find the circumradius (pc) that would be
 *  expected to contain roughly that many systems, at the given centre/
 *  thickness/shape - bisection over `estimatedCountAtRadius` (monotonic in
 *  radius), not a closed form, since the density field is not uniform. */
export function sizeInPcForTargetCount(model: GalaxyModel, centrePc: { x: number; y: number; z: number }, targetCount: number, thicknessPc: number, shape: FootprintShape): number {
  if (targetCount <= 0) return 1;
  let lo = 0.5, hi = 2000;
  // Grow hi until it brackets the target, guarding a pathologically
  // sparse region (e.g. deep halo) from an unbounded search.
  for (let i = 0; i < 20 && estimatedCountAtRadius(model, centrePc, hi, thicknessPc, shape) < targetCount; i++) hi *= 2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (estimatedCountAtRadius(model, centrePc, mid, thicknessPc, shape) < targetCount) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function targetCountForSizeInPc(model: GalaxyModel, centrePc: { x: number; y: number; z: number }, radiusPc: number, thicknessPc: number, shape: FootprintShape): number {
  return Math.round(estimatedCountAtRadius(model, centrePc, radiusPc, thicknessPc, shape));
}

/**
 * Re-derives the NON-primary field of the reactive pair, given the current
 * `sizeEditMode` - call whenever anything affecting the estimate changes
 * (sys density, shape, R/theta/z, or the primary field itself). Returns a
 * NEW draft; never mutates.
 */
export function reconcileSizeFields(model: GalaxyModel, d: Screen2Draft): Screen2Draft {
  const centre = centrePcFromPolar(d);
  const thickness = thicknessPcFor(d.sysDensity);
  if (d.sizeEditMode === 'totalSystems') {
    const sizeInPc = sizeInPcForTargetCount(model, centre, d.totalSystems, thickness, d.footprintShape);
    return { ...d, sizeInPc };
  }
  const totalSystems = targetCountForSizeInPc(model, centre, d.sizeInPc, thickness, d.footprintShape);
  return { ...d, totalSystems };
}

/* --------------------------------- screen 3 ------------------------------------ */

export interface Screen3Preview {
  readonly positionsPc: readonly { readonly x: number; readonly y: number; readonly z: number }[];
}

/** Screen 3 shows POSITIONS ONLY, no other information - the user's own
 *  spec ("only the location with no other information") - so the preview
 *  never needs the conductor, only `sectorFootprint.generateSector`. */
export function buildScreen3Preview(positions: readonly { readonly x: number; readonly y: number; readonly z: number }[]): Screen3Preview {
  return { positionsPc: positions };
}

/* --------------------------------- assembly ------------------------------------ */

export function assembleSearchCriteria(d: Screen2Draft): SearchCriteria {
  return { multiplicity: d.multiplicity, sysType: sysTypeToSearchCriterion(d.sysType) };
}

/** Re-exported for a canvas renderer's own point-in-shape test, so the
 *  preview draws the SAME boundary `generateSector` actually filters by -
 *  never a second, independently-drawn shape that could silently disagree. */
export { isWithinFootprint };
