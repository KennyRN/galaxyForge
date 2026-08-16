/**
 * remnants - white dwarfs, neutron stars, black holes as a separate layer.
 * Channels `remnantPlacement` (cell-scoped, WHERE) and `remnantStar`
 * (system-scoped, WHAT) - isolated from `placement`'s own streams so
 * remnant science can never perturb stellar positions (Law 4).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * ANCHOR. Holberg, Oswalt, Sion & McCook 2016, MNRAS 462, 2295: local WD
 * space density 4.8e-3 pc^-3, single fraction 0.74 - `sourced`, both
 * confirmed in the brief's own S5.2 register. Working single-WD density
 * 3.6e-3 pc^-3 (`derived`, the product of the two).
 *
 * SHAPE. `rhoRemFor(pop)` composes the SAME Upsilon machinery
 * (`galacticDensity.upsilonFor`) `planets`/`atmosphere` already reuse -
 * specifically its complement: the fraction of a population's IMF that has
 * ALREADY DIED (mass above the turnoff), converted to a remnant-systems
 * -per-living-system rate via the same living-star-mass/meanStarsPerSystem
 * composition. `SPIRAL_CALIBRATION` then scales the whole shape so the
 * spiral's local total at (R0, 0) reproduces the Holberg anchor - one
 * calibration constant, sourced anchor, derived shape, per S5.2's own
 * framing.
 *
 * NS/BH RATES. McKee, Parravano & Hollenbach 2015, ApJ 814, 13: Sigma_NS =
 * (0.3 +/- 0.1) * N0, N0 ~ 0.25 (`sourced (model)`) - both figures used
 * directly to set a NS:WD number-density RATIO at the reference point (the
 * brief's own text gives no absolute NS spatial density, only this
 * mass-surface-density relation, so a ratio at the anchor is the honest
 * reading rather than inventing a second absolute normalisation). BH rate:
 * `sourced (model)`, McKee's own admission of no direct observational
 * estimate - set here as a small `tunable` fraction of the NS rate,
 * consistent with "expect a handful of neutron stars and at most one black
 * hole in a ten-thousand-system sector" (S5.2's own stated expectation).
 *
 * NS SPATIAL DISTRIBUTION - A NAMED GAP, attributed correctly. Every remnant
 * kind drawn here, NS included, is placed using its SOURCE POPULATION's own
 * density shape (`rhoRemFor` scales `popDensity`) - i.e. a neutron star gets
 * its birth population's thin-disc scale height, with no kick-broadening.
 * That is a known simplification: real NS receive large natal kicks and
 * their true scale height is well above their birth population's. The
 * correct citation for that broadening is McKee, Parravano & Hollenbach
 * 2015 S4.3, NOT Sartore et al. 2010 directly (checked against the actual
 * text this session, not carried over from the brief unverified): McKee
 * themselves do not adopt one scale-height figure - they report a Sigma_NS
 * surface density within 1.1 kpc of the plane by combining several of
 * Sartore's velocity-distribution models, explicitly excluding Sartore's
 * own "case 1E" (33 pc) as an outlier, rather than settling on a single
 * number. Inventing a scale height here would mean either quoting Sartore
 * directly (the brief's own S5.2 explicitly rules this out - "attribute the
 * scale height to McKee S4.3... do not quote Sartore directly") or guessing
 * which of McKee's several combined cases to adopt. Recorded as a named
 * upgrade path rather than either: give NS (and, more weakly, BH) their own
 * broadened scale height once a specific McKee-endorsed figure can be
 * pinned down, the same "flag, don't fake" pattern this file already
 * applies to its placeholder white-dwarf chain.
 *
 * WHITE-DWARF CHAIN, UPGRADED 16 AUG 2026 (ported from a sibling build,
 * `galaxyforge`, that has already adopted this). Progenitor mass now drawn
 * log-uniformly between a REAL turnoff mass (`turnoffMassSol(age, feh)`,
 * `stellarProperties.ts`) and the IFMR's own validity ceiling - previously a
 * flat 1.5-8 Msun range untethered to any age. Final mass now the Cummings
 * et al. 2018 three-piece linear IFMR (`sourced`, adopted verbatim, replacing
 * the two-segment PLACEHOLDER this module used to share with
 * `multiplicity.ts`'s promotion chain - that module still uses ITS OWN
 * placeholder for now, a separate, smaller gap). Cooling age is now a REAL
 * consequence of a REAL rolled system age (`rollAge`/`rollMetallicity`, the
 * SAME mechanism and the SAME `age`/`metallicity`/`formationRank` channels
 * the stellar layer uses, keyed by this remnant's own sysid - not a second
 * copy of the concern, Law 1) minus the progenitor's own main-sequence
 * lifetime - previously a uniform 0-10 Gyr draw uncoupled from any system.
 * Mestel-form cooling and the degenerate mass-radius relation are unchanged.
 *
 * SURVIVING WHITE-DWARF PLANETS, ADDED 16 AUG 2026. Vanderburg et al. 2020,
 * Nature 585, 363: WD 1856+534 b, a transiting giant-planet candidate,
 * proves planets SURVIVE around white dwarfs - existence only, `sourced`.
 * There is no white-dwarf planet census, so the 1% occurrence rate this
 * module draws on is `calibrated`, not sourced - deliberately the module's
 * only dial. Placed log-uniformly at 1-5 AU (`calibrated`: the AGB envelope
 * clears anything closer, so a surviving planet was always wide or was
 * scattered outward), a fixed Earth-mass rocky body (there is no
 * white-dwarf-planet mass distribution to draw from), carrying no
 * atmosphere/surface/biosphere layer - this layer owns the planet's
 * existence, nothing about its air. NS/BH carry no planets: pulsar planets
 * exist (PSR B1257+12) but form via a different, post-supernova-disc
 * mechanism this layer has no model for, so the honest count is zero.
 *
 * NO CLUSTERING - S5.2's own explicit scoping (dynamically mixed old
 * population).
 *
 * genVersion: any constant here changing is genVersion-bumping.
 */

import { channelRng, type Rng } from './rng';
import { poissonInvCdf, LAMBDA_MAX } from './mathStats';
import { densityByPopulationAtCartesian, upsilonFor, deadStarFraction } from './galacticDensity';
import type { GalaxyModel, Population, PopulationKey } from './galaxyModel';
import type { CellKey } from './placement';
import { CELL_SIZE_PC } from './placement';
import { RSUN_KM } from './units';
import { rollAge } from './age';
import { rollMetallicity } from './metallicity';
import { msLifetimeGyr, turnoffMassSol } from './stellarProperties';
import { zoneOf, snowLineAu, subclassOf, kindOfClass } from './planets';
import type { Planet } from './types';

export type RemnantKind = 'white-dwarf' | 'neutron-star' | 'black-hole';

export interface RemnantSystem {
  readonly cellKey: CellKey;
  readonly ordinal: number;
  readonly sysid: string;
  readonly positionPc: { readonly x: number; readonly y: number; readonly z: number };
  readonly sourcePopulation: PopulationKey;
  readonly kind: RemnantKind;
  readonly massSol: number;
  readonly radiusSol: number;
  readonly tempK: number;
  readonly luminositySol: number;
  /** The real rolled age/metallicity behind this remnant's cooling chain -
   *  carried on the object so a caller composing a full SectorGeneration
   *  result never needs to re-derive them (Law 1). Present for every kind,
   *  not only white dwarfs - a neutron star or black hole still has a real
   *  birth population age even though nothing here uses it for cooling. */
  readonly ageGyr: number;
  readonly feh: number;
  /** At most one surviving planet - white dwarfs only (see header). */
  readonly planet: Planet | null;
}

/* --------------------------------- shape and rate ------------------------------ */

const NS_TO_WD_RATIO_AT_REF = 0.0025;   // sourced (model)-derived ratio, McKee S4.3, at the reference point
const BH_TO_NS_RATIO = 0.15;            // tunable, per S5.2's own "a handful of NS, at most one BH" expectation

/** rho_rem(pop): remnant systems per unit volume implied by this
 *  population's OWN density and its dead-star fraction. `derived`. */
export function rhoRemFor(pop: Population, popDensity: number): number {
  const deadFraction = deadStarFraction(pop);
  return popDensity * deadFraction / Math.max(1 - deadFraction, 1e-6) / upsilonFor(pop);
}

/** Calibrated once, against the spiral's oldThin population density at
 *  (R0, 0), so the total single-WD density there reproduces Holberg's
 *  working anchor (3.6e-3 pc^-3). Computed lazily so `spiralModelForCalibration`
 *  is only constructed if a caller actually needs the calibrated total. */
let cachedCalibration: number | null = null;
export function spiralCalibrationConstant(model: GalaxyModel): number {
  if (cachedCalibration !== null) return cachedCalibration;
  const HOLBERG_WORKING_DENSITY = 4.8e-3 * 0.74;   // sourced, Holberg et al. 2016
  const densities = model.densityByPopulation(8178, 0, 0);
  let rawTotal = 0;
  for (const pop of model.populations) rawTotal += rhoRemFor(pop, densities[pop.key] ?? 0);
  cachedCalibration = rawTotal > 0 ? HOLBERG_WORKING_DENSITY / rawTotal : 1;
  return cachedCalibration;
}

/* --------------------------------- placement ------------------------------------ */

function cellCentrePc(k: CellKey): { x: number; y: number; z: number } {
  return { x: (k.ix + 0.5) * CELL_SIZE_PC, y: (k.iy + 0.5) * CELL_SIZE_PC, z: (k.iz + 0.5) * CELL_SIZE_PC };
}

/**
 * Draws every remnant in one cell - no clustering. Placement rides its own
 * cell-scoped channel as before; age/[Fe/H] now ride the SAME channels and
 * mechanism the stellar layer uses (`rollAge`/`rollMetallicity`), keyed by
 * each remnant's own sysid, so a remnant's cooling age is a real consequence
 * of its population's age (16 Aug 2026) rather than a decoration. Draw
 * budget per remnant is no longer fixed at exactly three - a real
 * `rollAge`/`rollMetallicity` call costs what those functions cost, same as
 * any stellar system - but it IS still fully deterministic and independent
 * of every other remnant's outcome, which is what actually matters here.
 */
export function rollRemnantCell(worldSeed: string, model: GalaxyModel, k: CellKey): RemnantSystem[] {
  const centre = cellCentrePc(k);
  const cellVolumePc3 = CELL_SIZE_PC ** 3;
  const densities = densityByPopulationAtCartesian(model, centre.x, centre.y, centre.z);
  const calibration = spiralCalibrationConstant(model);

  let totalRhoRem = 0;
  const rhoByPop = new Map<PopulationKey, number>();
  for (const pop of model.populations) {
    const rho = rhoRemFor(pop, densities[pop.key] ?? 0) * calibration;
    rhoByPop.set(pop.key, rho);
    totalRhoRem += rho;
  }

  const placementRng = channelRng(worldSeed, 'remnantPlacement', k.ix, k.iy, k.iz);
  const starRng = channelRng(worldSeed, 'remnantStar', k.ix, k.iy, k.iz);

  const lambda = Math.min(totalRhoRem * cellVolumePc3, LAMBDA_MAX - 1e-6);
  const count = poissonInvCdf(lambda, placementRng());

  const popKeys = [...rhoByPop.keys()];
  const weights = popKeys.map((pk) => rhoByPop.get(pk)!);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const out: RemnantSystem[] = [];
  for (let ordinal = 0; ordinal < count; ordinal++) {
    const sourcePopulation = drawWeighted(placementRng, popKeys, weights, weightSum);
    const ux = placementRng(), uy = placementRng(), uz = placementRng();
    const positionPc = {
      x: k.ix * CELL_SIZE_PC + ux * CELL_SIZE_PC,
      y: k.iy * CELL_SIZE_PC + uy * CELL_SIZE_PC,
      z: k.iz * CELL_SIZE_PC + uz * CELL_SIZE_PC,
    };
    const sysid = `remnant.${k.ix}.${k.iy}.${k.iz}.${ordinal}`;

    const popMeta = model.populations.find((p) => p.key === sourcePopulation)!;
    const galactocentricRadiusPc = Math.hypot(positionPc.x, positionPc.y, positionPc.z);
    const formationRankValue = channelRng(worldSeed, 'formationRank', sysid)();
    const ageGyr = rollAge(channelRng(worldSeed, 'age', sysid), popMeta, formationRankValue);
    const feh = rollMetallicity(channelRng(worldSeed, 'metallicity', sysid), popMeta, galactocentricRadiusPc, formationRankValue);

    const uKind = starRng();
    const wdShare = 1 / (1 + NS_TO_WD_RATIO_AT_REF * (1 + BH_TO_NS_RATIO));
    let kind: RemnantKind;
    if (uKind < wdShare) kind = 'white-dwarf';
    else if (uKind < wdShare + (1 - wdShare) / (1 + BH_TO_NS_RATIO)) kind = 'neutron-star';
    else kind = 'black-hole';

    out.push(buildRemnantStar(starRng, k, ordinal, sysid, sourcePopulation, kind, positionPc, ageGyr, feh));
  }
  return out;
}

function drawWeighted(rng: Rng, keys: readonly PopulationKey[], weights: readonly number[], sum: number): PopulationKey {
  if (sum <= 0) return keys[0]!;
  const u = rng() * sum;
  let cum = 0;
  for (let i = 0; i < keys.length; i++) { cum += weights[i]!; if (u <= cum) return keys[i]!; }
  return keys[keys.length - 1]!;
}

/* ----------------------------- the white-dwarf chain ----------------------------- */

/**
 * Cummings 2018 MIST IFMR domain (M-sun). Below the floor the star has not
 * left the main sequence within a Hubble time; above the ceiling the
 * relation stops and core-collapse territory begins, which this module
 * models as NS/BH instead. `sourced`.
 */
export const IFMR_MI_MIN = 0.83;
export const IFMR_MI_MAX = 7.20;
/** The two knot masses of the piecewise relation (M-sun). */
export const IFMR_KNOTS = [2.85, 3.60] as const;

/**
 * Initial-to-final mass relation - Cummings et al. 2018, ApJ 866, 21, the
 * MIST-based three-piece linear fit, adopted VERBATIM (16 Aug 2026, ported
 * from a sibling build that already adopted it - previously a two-segment
 * placeholder here, `calibrated` not `sourced`):
 *
 *   0.83 <= Mi < 2.85   Mf = 0.080*Mi + 0.489
 *   2.85 <= Mi < 3.60   Mf = 0.187*Mi + 0.184
 *   3.60 <= Mi <= 7.20  Mf = 0.107*Mi + 0.471
 *
 * The published intercepts are kept EXACTLY - they are not forced to close
 * at the knots (the segments disagree by ~5e-5 Msun at 2.85 and ~1e-3 Msun
 * at 3.60, both far inside the paper's own 1-sigma), because closing the
 * gap by hand would trade a sourced number for a tidier calibrated one.
 * `mInit` is clamped to the fitted domain - an extrapolated IFMR is a
 * different claim from a fitted one, and this function never makes it.
 */
export function wdMassFromProgenitor(mInit: number): number {
  const mi = Math.min(Math.max(mInit, IFMR_MI_MIN), IFMR_MI_MAX);
  if (mi < IFMR_KNOTS[0]) return 0.080 * mi + 0.489;
  if (mi < IFMR_KNOTS[1]) return 0.187 * mi + 0.184;
  return 0.107 * mi + 0.471;
}

/** WD radius from degenerate M^(-1/3) scaling - 0.0126 Rsun at 0.6 Msun,
 *  S5.2's own figure. Unchanged by the 16 Aug 2026 upgrade. */
function wdRadiusSol(massSol: number): number {
  return 0.0126 * Math.pow(massSol / 0.6, -1 / 3);
}

/** Mestel cooling L/Lsun ~ t_cool^(-7/5); constant calibrated to the
 *  Holberg T_eff band. Unchanged by the 16 Aug 2026 upgrade - only its
 *  INPUT (a real cooling age, not a uniform 0-10 Gyr draw) changed. */
function wdLuminositySol(coolingAgeGyr: number): number {
  return 0.02 * Math.pow(Math.max(coolingAgeGyr, 0.01), -7 / 5);
}
function wdTempK(luminositySolValue: number, radiusSolValue: number): number {
  return 5772 * Math.pow(luminositySolValue / (radiusSolValue * radiusSolValue), 0.25);
}

/* ------------------------------ surviving planets --------------------------------- */

/** At most one surviving planet is placed on a white dwarf. */
export const WD_MAX_PLANET_COUNT = 1;

/**
 * Probability a placed white dwarf keeps one surviving planet. `calibrated`,
 * and the module's only dial - see header. Added 16 Aug 2026.
 */
export const WD_PLANET_OCCURRENCE = 0.01;

/** Orbit range for a survivor (AU), log-uniform. `calibrated` - see header. */
export const WD_PLANET_AU_MIN = 1.0;
export const WD_PLANET_AU_MAX = 5.0;

/**
 * The rare surviving white-dwarf planet. FIXED DRAW COUNT: exactly two
 * uniforms, called for EVERY remnant regardless of kind, so the planet
 * question can never shift the draw stream of a neutron star or black hole
 * depending on whether this function was even invoked for them - it always
 * is, and returns null immediately for anything but a white dwarf.
 */
function rollRemnantPlanet(rng: Rng, kind: RemnantKind, hostLuminositySol: number): Planet | null {
  const uOccurrence = rng();
  const uOrbit = rng();
  if (kind !== 'white-dwarf') return null;
  if (uOccurrence >= WD_PLANET_OCCURRENCE) return null;

  const logLo = Math.log10(WD_PLANET_AU_MIN);
  const logHi = Math.log10(WD_PLANET_AU_MAX);
  const au = 10 ** (logLo + uOrbit * (logHi - logLo));
  const snowline = snowLineAu(hostLuminositySol);
  const cls = 'earth-like' as const;

  return {
    formationIndex: 0,
    kind: kindOfClass(cls),
    class: cls,
    subclass: subclassOf(cls, au, snowline, false),
    zone: zoneOf(au, hostLuminositySol),
    au, formationAu: au, eccentricity: 0,
    radiusEarth: 1, massEarth: 1, coreMassEarth: 1, envelopeFraction: 0, envelope: 'stripped',
    hostLuminositySol, orbitType: 's-type',
    channel: 'core-accretion', migrated: false,
  };
}

/* ----------------------------- the drawn object --------------------------------- */

function buildRemnantStar(
  rng: Rng, k: CellKey, ordinal: number, sysid: string, sourcePopulation: PopulationKey, kind: RemnantKind,
  positionPc: { x: number; y: number; z: number }, ageGyr: number, feh: number,
): RemnantSystem {
  if (kind === 'neutron-star') {
    const planet = rollRemnantPlanet(rng, kind, 0);
    return { cellKey: k, ordinal, sysid, positionPc, sourcePopulation, kind, massSol: 1.4, radiusSol: 12 / RSUN_KM, tempK: 1e6, luminositySol: 0, ageGyr, feh, planet };
  }
  if (kind === 'black-hole') {
    const uMass = rng();
    const massSol = 5 + uMass * 25;   // calibrated, stellar-BH range
    const schwarzschildRadiusKm = 2.95 * massSol;   // sourced (form), R_s = 2GM/c^2
    const planet = rollRemnantPlanet(rng, kind, 0);
    return { cellKey: k, ordinal, sysid, positionPc, sourcePopulation, kind, massSol, radiusSol: schwarzschildRadiusKm / RSUN_KM, tempK: 0, luminositySol: 0, ageGyr, feh, planet };
  }
  // white-dwarf - progenitor between a REAL turnoff mass and the IFMR
  // ceiling. The ceiling is the relation's, not a round number: drawing to
  // 8 Msun and clamping would pile every 7.2-8 Msun progenitor onto one
  // final mass.
  const mLo = Math.min(Math.max(turnoffMassSol(ageGyr, feh), IFMR_MI_MIN), IFMR_MI_MAX);
  const mHi = IFMR_MI_MAX;
  const uProgenitor = rng();
  const logLo = Math.log10(mLo), logHi = Math.log10(mHi);
  const mInit = 10 ** (logLo + uProgenitor * (logHi - logLo));
  const massSol = wdMassFromProgenitor(mInit);
  const radiusSol = wdRadiusSol(massSol);
  const msAgeGyr = msLifetimeGyr(mInit, feh);
  const coolingAgeGyr = Math.max(ageGyr - msAgeGyr, 0.01);
  const luminositySol = wdLuminositySol(coolingAgeGyr);
  const tempK = wdTempK(luminositySol, radiusSol);
  const planet = rollRemnantPlanet(rng, kind, luminositySol);
  return { cellKey: k, ordinal, sysid, positionPc, sourcePopulation, kind, massSol, radiusSol, tempK, luminositySol, ageGyr, feh, planet };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. THE STAGE-5.2 GATE - a Milky-Way-anchored cell's white-dwarf density
 *     is NEVER ZERO where the spiral's own oldThin/thick populations are
 *     present (the bug this concern exists to fix, stated as a test).
 *  2. Determinism.
 *  3. NS and BH occur at TRACE rates relative to WD, never exceeding them,
 *     across many cells.
 *  4. Every remnant's kind draw and its `rollRemnantPlanet` call consume a
 *     FIXED draw count for that kind (age/[Fe/H] cost what `rollAge`/
 *     `rollMetallicity` cost, same as any stellar system - not literally
 *     uniform across kinds since 16 Aug 2026's real-age threading, but each
 *     kind's own cost is fixed and outcome-independent within itself).
 *  5. Every remnant's `sysid` carries a `remnant.` prefix, structurally
 *     distinct from a stellar `sysid` - collision is impossible by
 *     construction, not by chance.
 *  6. No clustering: remnant nearest-neighbour statistics are NOT
 *     measurably tighter than uniform, unlike Stage 4.8's youngThin result.
 *  7. wdMassFromProgenitor is continuous to within 1e-2 Msun at both IFMR
 *     knots (the published segments do not close exactly - see the IFMR's
 *     own docstring for why that is correct, not a bug).
 *  8. A white dwarf's cooling age is REAL: older-population white dwarfs
 *     are systematically cooler (lower luminosity) than younger ones, at
 *     fixed progenitor mass - the property the 16 Aug 2026 upgrade exists
 *     to deliver.
 *  9. rollRemnantPlanet returns null for every neutron star and black hole,
 *     always - never a planet on a kind this layer has no formation model
 *     for.
 */
export const REMNANTS_GATES = 9 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Local white dwarf density', status: 'sourced',
    short: 'How many white dwarfs occupy a given volume of the solar neighbourhood.',
    long: 'spiralCalibrationConstant calibrates rhoRemFor\'s output to match the observed local white dwarf space density.',
    source: 'Holberg, Oswalt, Sion & McCook 2016, MNRAS 462, 2295 (3.6e-3 pc^-3)',
  },
  {
    term: 'Cummings initial-final mass relation', status: 'sourced',
    short: 'How heavy a white dwarf ends up, given how heavy the star that made it was.',
    long: 'The MIST-based three-piece linear fit adopted verbatim (16 Aug 2026, replacing a two-segment placeholder): 0.080*Mi+0.489, then 0.187*Mi+0.184 above 2.85 Msun, then 0.107*Mi+0.471 above 3.60 Msun. Published intercepts kept exactly - the segments disagree by 5e-5 and 1e-3 Msun at the two knots, inside the paper\'s own 1-sigma, and closing the gap by hand would trade a sourced number for a tidier calibrated one. Progenitors are clamped to the fitted 0.83-7.20 Msun domain.',
    source: 'Cummings, Kalirai, Tremblay, Ramirez-Ruiz & Choi 2018, ApJ 866, 21, doi:10.3847/1538-4357/aadfd6',
  },
  {
    term: 'White dwarf cooling age', status: 'derived',
    short: 'How long a white dwarf has been cooling - now a real consequence of a real system age, not a random guess.',
    long: 'coolingAgeGyr = ageGyr - msLifetimeGyr(progenitorMass, feh), where ageGyr is rolled the same way a stellar system\'s age is (rollAge, on the population\'s own age distribution). Older populations produce systematically cooler, fainter white dwarfs without any morphology-aware special-casing. Replaces a uniform 0-10 Gyr draw uncoupled from any system (16 Aug 2026).',
    source: 'Mestel 1952 (cooling form); this project\'s own age.ts (real age input)',
  },
  {
    term: 'Surviving white-dwarf planets', status: 'calibrated',
    short: 'A rare planet that outlived its star\'s red-giant phase, still orbiting the white dwarf remnant.',
    long: 'Vanderburg et al. 2020 detected WD 1856+534 b transiting a white dwarf, so survival is an observed outcome - sourced. The 1% occurrence rate is NOT: one detection with no published survey completeness is not a rate, so WD_PLANET_OCCURRENCE is this module\'s single dial. Placed log-uniformly at 1-5 AU (the AGB envelope clears anything closer), a fixed Earth-mass rocky body rather than a drawn one, with no atmosphere/surface/biosphere layer. Added 16 Aug 2026.',
    source: 'Vanderburg et al. 2020, Nature 585, 363 (existence only, not the rate)',
  },
];
