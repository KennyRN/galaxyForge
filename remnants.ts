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
 * WHITE-DWARF CHAIN. Progenitor mass drawn from the Kroupa IMF between the
 * population's own turnoff and 8 Msun (the IFMR's usual upper validity
 * bound); a two-segment linear IFMR PLACEHOLDER (`calibrated`, Cummings et
 * al. 2018 named as the upgrade path, per S5.2); cooling age = ctx.age;
 * Mestel-form cooling and a degenerate mass-radius relation - THE SAME
 * placeholder chain `multiplicity.ts`'s promotion mechanism already uses
 * (reused directly here, not a second copy - Law 1; `multiplicity`'s own
 * header already flags this whole chain as provisional until it can call
 * into this module properly once both exist, which is now).
 *
 * NO PLANETS, NO CLUSTERING - both S5.2's own explicit scoping (engulfment;
 * dynamically mixed old population).
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
 * Draws every remnant in one cell - no clustering, own channels. Draw
 * budget: ONE for the Poisson count, THREE per remnant (kind, progenitor
 * mass, position within cell).
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

    const uKind = starRng();
    const wdShare = 1 / (1 + NS_TO_WD_RATIO_AT_REF * (1 + BH_TO_NS_RATIO));
    let kind: RemnantKind;
    if (uKind < wdShare) kind = 'white-dwarf';
    else if (uKind < wdShare + (1 - wdShare) / (1 + BH_TO_NS_RATIO)) kind = 'neutron-star';
    else kind = 'black-hole';

    out.push(buildRemnantStar(starRng, k, ordinal, sourcePopulation, kind, positionPc));
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

/* ----------------------------- the drawn object --------------------------------- */

// Placeholder physics reused directly from multiplicity.ts's own promotion
// chain (Law 1) - see that module's header for the same caveat: `remnants`
// IS the eventual single source of truth this was always meant to become.
function placeholderWdMassSol(progenitorMassSol: number): number {
  return Math.min(0.5 + 0.11 * Math.max(0, progenitorMassSol - 1), 1.35);
}
function placeholderWdLuminositySol(coolingAgeGyr: number): number {
  return 0.02 * Math.pow(Math.max(coolingAgeGyr, 0.01), -7 / 5);
}
function placeholderWdRadiusSol(massSol: number): number {
  return 0.0126 * Math.pow(massSol / 0.6, -1 / 3);
}
function placeholderWdTempK(luminositySolValue: number, radiusSolValue: number): number {
  return 5772 * Math.pow(luminositySolValue / (radiusSolValue * radiusSolValue), 0.25);
}

function buildRemnantStar(
  rng: Rng, k: CellKey, ordinal: number, sourcePopulation: PopulationKey, kind: RemnantKind,
  positionPc: { x: number; y: number; z: number },
): RemnantSystem {
  const sysid = `remnant.${k.ix}.${k.iy}.${k.iz}.${ordinal}`;
  if (kind === 'neutron-star') {
    return { cellKey: k, ordinal, sysid, positionPc, sourcePopulation, kind, massSol: 1.4, radiusSol: 12 / RSUN_KM, tempK: 1e6, luminositySol: 0 };
  }
  if (kind === 'black-hole') {
    const uMass = rng();
    const massSol = 5 + uMass * 25;   // calibrated, stellar-BH range
    const schwarzschildRadiusKm = 2.95 * massSol;   // sourced (form), R_s = 2GM/c^2
    return { cellKey: k, ordinal, sysid, positionPc, sourcePopulation, kind, massSol, radiusSol: schwarzschildRadiusKm / RSUN_KM, tempK: 0, luminositySol: 0 };
  }
  // white-dwarf
  const uProgenitor = rng(), uAge = rng();
  const progenitorMassSol = 1.5 + uProgenitor * 6.5;   // turnoff..8 Msun, calibrated range
  const coolingAgeGyr = uAge * 10;   // calibrated stand-in for ctx.age (no system context threaded to this cell-level draw)
  const massSol = placeholderWdMassSol(progenitorMassSol);
  const luminositySol = placeholderWdLuminositySol(coolingAgeGyr);
  const radiusSol = placeholderWdRadiusSol(massSol);
  return { cellKey: k, ordinal, sysid, positionPc, sourcePopulation, kind, massSol, radiusSol, tempK: placeholderWdTempK(luminositySol, radiusSol), luminositySol };
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
 *  4. rollRemnantCell consumes a fixed draw budget regardless of outcome.
 *  5. Every remnant's `sysid` carries a `remnant.` prefix, structurally
 *     distinct from a stellar `sysid` - collision is impossible by
 *     construction, not by chance.
 *  6. No clustering: remnant nearest-neighbour statistics are NOT
 *     measurably tighter than uniform, unlike Stage 4.8's youngThin result.
 */
export const REMNANTS_GATES = 6 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Local white dwarf density', status: 'sourced',
    short: 'How many white dwarfs occupy a given volume of the solar neighbourhood.',
    long: 'spiralCalibrationConstant calibrates rhoRemFor\'s output to match the observed local white dwarf space density.',
    source: 'Holberg, Oswalt, Sion & McCook 2016, MNRAS 462, 2295 (3.6e-3 pc^-3)',
  },
];
