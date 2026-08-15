/**
 * systemConductor - generates one complete `SystemCore` end to end. THE
 * missing composition every module up to Stage 9 has been flagged as
 * waiting for - `galacticDensity.ts`'s own header, `goldenMaster
 * .conformance.ts`'s own scope note, and `multiplicity.ts`'s own WD-chain
 * caveat all name this exact gap. Closed here, 15 Aug 2026.
 *
 * -- WHAT THIS MODULE IS, AND ISN'T ------------------------------------------
 * A CONDUCTOR (the brief's own word, S4.4's member-count note): it asks
 * each already-built module a question and stitches the answers into a
 * `SystemCore`, in the fixed order `types.ts`'s own field layout implies.
 * It introduces NO new science - every constant, formula and draw budget
 * belongs to the module that already owns it. What it DOES introduce is a
 * small number of ORDERING/CHANNEL/PLACEMENT decisions no other module
 * claims, listed here rather than buried in comments beside each line:
 *
 *  1. CHANNEL ASSIGNMENT. Every `CHANNELS` entry this module reads was
 *     already reserved (Stage 0's own registry) but never consumed until
 *     now. Non-indexed channels (`stars`, `companions`, `age`,
 *     `metallicity`, `planets`, `belts`) are keyed on `sysid` alone;
 *     indexed channels (`rotation`, `moons`, `atmosphere`,
 *     `surfaceTemperature`, `biosphere`, `terraforming`) are keyed on
 *     `sysid` PLUS the index the channel name already encodes - `sysid`
 *     alone would let planet #0 of two DIFFERENT systems draw from the
 *     same stream, which is exactly the collision channel isolation exists
 *     to prevent. `pickClass` and `rollStarCount` share ONE `stars` stream,
 *     called in that fixed order - both are "how many/what stars" facts,
 *     and Law 2 asks for isolation BETWEEN concerns, not one stream per
 *     function call.
 *
 *  2. `formationRank` AND `population` ARE INPUTS, NEVER RE-ROLLED.
 *     `placement.rollCell` already draws both, on its own channels, when a
 *     system is first individuated - re-rolling here would silently
 *     duplicate a draw and desynchronise this module's output from
 *     `placement`'s own golden-master-verified positions. `galactocentricRadiusPc`
 *     is the SPHERICAL radius (`Math.hypot(x,y,z)`), per `SystemContext`'s
 *     own doc comment - never the cylindrical R `galacticDensity` uses for
 *     the density FIELD.
 *
 *  3. WHITE-DWARF COMPANIONS GET NO ROTATION HISTORY. `rollStellarHistory`'s
 *     own "remnant" short-circuit triggers on `luminositySol <= 0` -
 *     `multiplicity`'s placeholder WD chain gives a promoted companion a
 *     small but POSITIVE luminosity (Mestel cooling never hits exactly
 *     zero), so calling `rollStellarHistory` with a WD's `classGuess` would
 *     NOT take that branch, and would instead apply main-sequence
 *     gyrochronology to a degenerate star - wrong physics, not a missing
 *     guard. This module bypasses `rollStellarHistory` entirely for any
 *     `kind === 'white-dwarf'` companion and synthesises the SAME
 *     `'quiet'`/`out-of-range` result the module's own remnant branch
 *     produces, consuming a matched one draw on that star's `rotation(i)`
 *     channel so the draw budget is unaffected by which kind of star sits
 *     at that index (Law 2's own "fixed draw budget regardless of outcome"
 *     pattern, applied at the conductor level since no single module owns
 *     this seam).
 *
 *  4. GRAVITY. Neither `terraforming` nor `humanHabitability` computes
 *     `gravityG` - both take it as a caller-supplied value. `units
 *     .surfaceGravityG` (added alongside this module) is the one place
 *     that formula now lives.
 *
 *  5. MOON COUNT. No module rolls how many moons a planet HAS - `rollMoons`
 *     takes `count` as a given. `moonCountFor` below is a `calibrated`,
 *     openly-invented heuristic (giants host more moons than rocky planets
 *     on average, loosely anchored to the Solar System's own giant/rocky
 *     split) via one Poisson draw on that planet's own `moons(i)` channel,
 *     BEFORE `rollMoons`'s own four-draws-per-moon budget.
 *
 *  6. BELT PLACEMENT. No module decides WHERE a belt goes - `rollBelt`
 *     takes `innerAu`/`outerAu` as given. Two candidate belts per system,
 *     `calibrated`: an inner (rocky) belt spanning Zone B (`[aInner,
 *     aOuter)`, the same boundaries `planets.ts` already computes from the
 *     snow line) and an outer (icy) belt spanning `[aOuter, 4*aOuter)` - a
 *     Kuiper-analog width, not a sourced figure. Both are offered to
 *     `rollBelt`, which returns `null` (a swept belt) on its own terms.
 *
 *  7. ATMOSPHERE COMPOSITION. `rollAtmosphere` returns everything
 *     `Atmosphere` needs except `composition: SpeciesFraction[]` - no
 *     module computes a species breakdown for an ABIOTIC atmosphere
 *     (`biosphere`'s own `realisedComposition` only exists once life has
 *     taken hold). A minimal two/three-species placeholder keyed on `kind`
 *     is synthesised here, `calibrated`, clearly not a real chemistry
 *     model - the same honesty posture `biosphere.ts`'s own placeholder
 *     composition already uses.
 *
 *  8. SYSTEM-LEVEL HABITABLE ZONE. `habitableZoneAu`/planets' own
 *     `hostLuminositySol` already encode "primary alone for S-type,
 *     combined for P-type" per planet - `SystemCore.habitableZoneAu` is one
 *     value, so this module applies the SAME rule at system level:
 *     `combinedLuminositySol` when `geometry.hostsCircumbinary`, else the
 *     primary's own.
 *
 *  9. GIANTS GET NO SURFACE/BIOSPHERE/TERRAFORMING/HUMAN-HABITABILITY
 *     VERDICT. A gas/ice giant has no solid surface - `null` on those four
 *     arrays is correct per `SystemCore`'s own "does not apply" convention,
 *     not a missing case. Moons and atmosphere still apply (Jupiter has
 *     both). Skipping `biosphere(i)`/`terraforming(i)` entirely for such a
 *     planet is safe: every indexed channel is independently seeded, so
 *     never opening one stream cannot perturb any other planet's own.
 *
 * genVersion: any change to the ordering, channel assignment, or any of the
 * eight invented policies above is genVersion-bumping - it changes what a
 * generated system core actually contains, even though no science module
 * itself changed.
 */

import { channelRng, type Rng } from './rng';
import { poissonInvCdf } from './mathStats';
import type { Population, PopulationKey } from './galaxyModel';
import type {
  SystemContext, SystemCore, Star, StellarOrbit, SpeciesFraction,
} from './types';
import { CHANNELS } from './types';

import { pickClass, type StellarPopulationCtx } from './stellarPopulation';
import { rollAge } from './age';
import { rollMetallicity } from './metallicity';
import {
  representativeMass, teffK, colourBV, radiusSol as msRadiusSol, luminositySol as msLuminositySol,
  type StellarClass,
} from './stellarProperties';
import { rollStarCount, rollCompanions, buildSystemGeometry, type CompanionStar } from './multiplicity';
import { rollStellarHistory } from './stellarHistory';
import { rollPlanets, mutualHillMerge, snowLineAu, zoneOf, type PlanetSystemInputs, type PlanetDraw } from './planets';
import { rollBelt } from './belts';
import { rollMoons, type MoonHostInputs } from './moons';
import { rollSurfaceTemperature } from './surfaceTemperature';
import { rollAtmosphere, type AtmosphereDraw } from './atmosphere';
import { rollBiosphere } from './biosphere';
import { terraformabilityOf, rollTerraforming } from './terraforming';
import { assessHumanHabitability } from './humanHabitability';
import { habitableZoneAu, galacticHabitabilityScore } from './habitability';
import { surfaceGravityG } from './units';

export interface GenerateSystemInputs {
  readonly sysid: string;
  readonly genVersion: number;
  readonly worldSeed: string;
  readonly positionPc: { readonly x: number; readonly y: number; readonly z: number };
  readonly population: PopulationKey;
  readonly populationMeta: Population;
  readonly formationRank: number;
  readonly terraformScale: number;   // 0-6, authoring input
}

/* --------------------------------- channels ------------------------------------ */

function ch(worldSeed: string, channel: string, sysid: string): Rng {
  return channelRng(worldSeed, channel, sysid);
}

/* --------------------------------- policy 5: moon count ------------------------- */

const MOON_COUNT_MEAN_GIANT = 3.0;   // calibrated - loosely anchored to the Solar System's giants
const MOON_COUNT_MEAN_ROCKY = 0.3;   // calibrated - most rocky planets have zero-to-few

function moonCountFor(rng: Rng, planetKind: 'rocky' | 'giant'): number {
  const lambda = planetKind === 'giant' ? MOON_COUNT_MEAN_GIANT : MOON_COUNT_MEAN_ROCKY;
  return poissonInvCdf(lambda, rng());
}

/* --------------------------------- policy 6: belt placement --------------------- */

function beltCandidates(hostLuminositySol: number): { innerAu: number; outerAu: number }[] {
  const sl = snowLineAu(hostLuminositySol);
  // Mirrors planets.ts's own (private) zoneBoundaries exactly - aInner =
  // 0.3*sl, aOuter = 2*sl - duplicated as two numbers rather than imported,
  // since that function is not exported (Law 1 would prefer a shared
  // export; recorded as a small future tidy-up, not a science
  // disagreement - the two values MUST stay in sync with planets.ts's own
  // zoneOf boundaries or a belt could be placed inside a zone it does not
  // belong to).
  const aInner = 0.3 * sl, aOuter = 2 * sl;
  return [
    { innerAu: aInner, outerAu: aOuter },       // inner (rocky) belt candidate
    { innerAu: aOuter, outerAu: aOuter * 4 },   // outer (icy) belt candidate
  ];
}

/* --------------------------------- policy 7: atmosphere composition ------------- */

function atmosphereComposition(draw: AtmosphereDraw): SpeciesFraction[] {
  switch (draw.kind) {
    case 'none': return [];
    case 'gas-envelope': return [{ species: 'H2', fraction: 0.75 }, { species: 'He', fraction: 0.24 }, { species: 'other', fraction: 0.01 }];
    case 'thin': return [{ species: 'CO2', fraction: 0.6 }, { species: 'N2', fraction: 0.35 }, { species: 'other', fraction: 0.05 }];
    case 'thick': return [{ species: 'N2', fraction: 0.7 }, { species: 'CO2', fraction: 0.25 }, { species: 'other', fraction: 0.05 }];
  }
}

/* --------------------------------- the conductor -------------------------------- */

export function generateSystemCore(inputs: GenerateSystemInputs): SystemCore {
  const { sysid, genVersion, worldSeed, positionPc, population, populationMeta, formationRank, terraformScale } = inputs;
  const galactocentricRadiusPc = Math.hypot(positionPc.x, positionPc.y, positionPc.z);

  // -- age, metallicity (policy 2: formationRank/population are INPUTS) ---------
  const age = rollAge(ch(worldSeed, CHANNELS.age, sysid), populationMeta, formationRank);
  const feh = rollMetallicity(ch(worldSeed, CHANNELS.metallicity, sysid), populationMeta, galactocentricRadiusPc, formationRank);

  // -- stars (policy 1: pickClass + rollStarCount share one 'stars' stream) -----
  const starsRng = ch(worldSeed, CHANNELS.stars, sysid);
  const primaryClass: StellarClass = pickClass(starsRng, { age, feh } satisfies StellarPopulationCtx);
  const primaryMassSol = representativeMass(primaryClass);
  const primaryLuminositySol = msLuminositySol(primaryClass);
  const starCount = rollStarCount(starsRng, primaryMassSol);

  const companions: CompanionStar[] = starCount > 1
    ? rollCompanions(ch(worldSeed, CHANNELS.companions, sysid), primaryMassSol, starCount, age, feh)
    : [];
  const geometry = buildSystemGeometry(primaryMassSol, primaryLuminositySol, companions);

  const stars: Star[] = [
    { class: primaryClass, tempK: teffK(primaryClass), colourBV: colourBV(primaryClass), luminositySol: primaryLuminositySol, massSol: primaryMassSol, radiusSol: msRadiusSol(primaryClass) },
    ...companions.map((c): Star => ({ class: c.kind === 'white-dwarf' ? 'white-dwarf' : c.classGuess, tempK: c.tempK, colourBV: c.colourBV, luminositySol: c.luminositySol, massSol: c.massSol, radiusSol: c.radiusSol })),
  ];

  // -- per-star history (policy 3: WD companions bypass rollStellarHistory) -----
  const history = stars.map((s, i) => {
    const rng = ch(worldSeed, CHANNELS.rotation(i), sysid);
    if (s.class === 'white-dwarf' || s.luminositySol <= 0) {
      rng();   // matched draw - keeps the budget fixed regardless of which kind sits at this index
      return {
        rotationPercentile: 0.5, rotationClass: 'slow' as const, activityClass: 'quiet' as const,
        initialPeriodDays: 0, presentPeriodDays: 0, xuvPresentRel: 0, xuvFluenceRel: 0,
        saturatedUntilGyr: 0, preMainSequenceFactor: 1, confidence: 'out-of-range' as const,
      };
    }
    return rollStellarHistory(rng, s.class as StellarClass, age, s.luminositySol);
  });

  const ctx: SystemContext = {
    sysid, genVersion, positionPc, galactocentricRadiusPc, population, formationRank,
    age, feh, geometry, history, terraformScale,
  };

  // -- planets --------------------------------------------------------------------
  const planetInputs: PlanetSystemInputs = {
    primaryMassSol, primaryLuminositySol, combinedLuminositySol: geometry.combinedLuminositySol,
    hostClass: primaryClass, ageGyr: age, feh,
    aStypeMaxAu: geometry.aStypeMaxAu, aPtypeMinAu: geometry.aPtypeMinAu,
  };
  const rawPlanets = rollPlanets(ch(worldSeed, CHANNELS.planets, sysid), planetInputs);
  const planetDraws: PlanetDraw[] = mutualHillMerge(rawPlanets, primaryMassSol);
  const planets = planetDraws;   // PlanetDraw is field-identical to types.ts's Planet

  // -- belts (policy 6) -------------------------------------------------------------
  const beltsRng = ch(worldSeed, CHANNELS.belts, sysid);
  const belts = beltCandidates(primaryLuminositySol)
    .map((cand) => rollBelt(beltsRng, cand.innerAu, cand.outerAu, primaryLuminositySol, planetDraws))
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .map(({ totalMassKg: _totalMassKg, ...b }) => b);   // totalMassKg is belts.ts's own extra field, not in types.ts's Belt

  // -- per-planet layers ------------------------------------------------------------
  const moons: SystemCore['moons'] = [];
  const atmospheres: SystemCore['atmospheres'] = [];
  const surface: SystemCore['surface'] = [];
  const biospheres: SystemCore['biospheres'] = [];
  const terraforming: SystemCore['terraforming'] = [];
  const humanHabitability: SystemCore['humanHabitability'] = [];

  for (const p of planetDraws) {
    const i = p.formationIndex;

    // -- surface temperature (policy: icy tested against formationAu, not
    //    au - the same "composition follows formation position" convention
    //    moons.ts's own header already states). --
    const icy = p.formationAu >= snowLineAu(p.hostLuminositySol);
    const stRng = ch(worldSeed, CHANNELS.surfaceTemperature(i), sysid);
    const hostTempK = p.orbitType === 'p-type' ? weightedCombinedTempK(stars) : stars[0]!.tempK;
    const hostRadiusSol = p.orbitType === 'p-type' ? stars[0]!.radiusSol : stars[0]!.radiusSol;
    const stDraw = rollSurfaceTemperature(stRng, p.class, icy, hostTempK, hostRadiusSol, p.au);

    // -- atmosphere (policy 4, 7) --
    const atmRng = ch(worldSeed, CHANNELS.atmosphere(i), sysid);
    const atmDraw = rollAtmosphere(atmRng, p.class, p.massEarth, p.radiusEarth, primaryClass, age, p.au, stDraw.equilibriumTempK);
    atmospheres.push({
      kind: atmDraw.kind, dominant: atmDraw.dominant, composition: atmosphereComposition(atmDraw),
      pressureClass: atmDraw.pressureClass, cloudClass: atmDraw.cloudClass,
      equilibriumTempK: atmDraw.equilibriumTempK, retentionMarginDex: atmDraw.retentionMarginDex,
    });

    const gravityG = surfaceGravityG(p.massEarth, p.radiusEarth);

    // -- moons (policy 5) - applies to every planet kind, giants included --
    const moonsRng = ch(worldSeed, CHANNELS.moons(i), sysid);
    const count = moonCountFor(moonsRng, p.kind);
    const moonInputs: MoonHostInputs = {
      planetAu: p.au, planetFormationAu: p.formationAu, planetMassEarth: p.massEarth,
      planetRadiusEarth: p.radiusEarth, planetEccentricity: p.eccentricity, planetKind: p.kind,
      starMassSol: primaryMassSol, hostLuminositySol: p.hostLuminositySol,
    };
    moons.push(rollMoons(moonsRng, moonInputs, count));

    // -- POLICY 9 (new): surface/biosphere/terraforming/humanHabitability
    //    apply to ROCKY planets only - a giant has no solid surface, so
    //    `null` ("evaluated for planets[i], does not apply", per
    //    SystemCore's own invariant) is correct, not a missing case. The
    //    channels (surfaceTemperature(i) already ran above for atmosphere's
    //    own cloud-deck classification; biosphere(i)/terraforming(i) are
    //    simply never opened for a giant - safe, since every channel is
    //    independently seeded per index and skipping one never perturbs
    //    another planet's own stream. --
    if (p.kind !== 'rocky') {
      surface.push(null); biospheres.push(null); terraforming.push(null); humanHabitability.push(null);
      continue;
    }

    const liquidWaterStable = stDraw.equilibriumTempK >= 273 && stDraw.equilibriumTempK <= 373;
    surface.push({ meanTempK: stDraw.equilibriumTempK, dayNightDeltaK: null, liquidWaterStable, gravityG });

    // -- biosphere --
    const bioRng = ch(worldSeed, CHANNELS.biosphere(i), sysid);
    const starHistoryForPlanet = history[0]!;   // planets orbit the ensemble; activity read from the primary
    const bioDraw = rollBiosphere(bioRng, starHistoryForPlanet.activityClass, stDraw.equilibriumTempK, age);
    biospheres.push(bioDraw);

    // -- terraforming --
    const terraRng = ch(worldSeed, CHANNELS.terraforming(i), sysid);
    const hasAtmosphere = atmDraw.kind !== 'none';
    const terraformability = terraformabilityOf(stDraw.equilibriumTempK, gravityG, hasAtmosphere);
    const terraDraw = rollTerraforming(terraRng, terraformability, terraformScale, atmosphereComposition(atmDraw), stDraw.equilibriumTempK);
    terraforming.push(terraDraw);

    // -- human habitability (deterministic, no channel) --
    const finalTempK = terraDraw.realisedMeanTempK ?? stDraw.equilibriumTempK;
    const finalPressureClass = terraDraw.realisedPressureClass ?? atmDraw.pressureClass;
    const finalOxygenated = terraDraw.realisedComposition
      ? terraDraw.realisedComposition.some((s) => s.species === 'O2' && s.fraction > 0.1)
      : bioDraw.oxygenated;
    humanHabitability.push(assessHumanHabitability(finalTempK, finalPressureClass, finalOxygenated, gravityG));
  }

  const hzLuminositySol = geometry.hostsCircumbinary ? geometry.combinedLuminositySol : primaryLuminositySol;

  return {
    sysid, genVersion, ctx,
    stars, planets, belts, moons, atmospheres, surface, biospheres, terraforming, humanHabitability,
    habitableZoneAu: habitableZoneAu(hzLuminositySol),
    galacticHabitabilityScore: galacticHabitabilityScore(galactocentricRadiusPc, positionPc.z),
  };
}

/** Luminosity-weighted mean temperature across every star, for a P-type
 *  (circumbinary) planet's surface-temperature host input - `calibrated`,
 *  no module owns a "combined effective temperature" concept, and this is
 *  the natural analogue of `combinedLuminositySol`'s own weighting. */
function weightedCombinedTempK(stars: readonly Star[]): number {
  const totalL = stars.reduce((a, s) => a + s.luminositySol, 0);
  if (totalL <= 0) return stars[0]!.tempK;
  return stars.reduce((a, s) => a + s.tempK * s.luminositySol, 0) / totalL;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - same worldSeed/inputs give a bit-identical SystemCore.
 *  2. ARRAY ALIGNMENT - moons/atmospheres/surface/biospheres/terraforming/
 *     humanHabitability all have exactly planets.length entries, in
 *     formationIndex order.
 *  3. stars.length === 1 + ctx.geometry.orbits.length, always.
 *  4. The primary's own main-sequence lifetime exceeds ctx.age (pickClass's
 *     own invariant, re-asserted at the conductor's own output boundary).
 *  5. A white-dwarf companion never produces a non-'quiet'/non-'out-of-range'
 *     StellarHistory entry (policy 3 has real teeth).
 *  6. galactocentricRadiusPc on SystemContext is the SPHERICAL radius,
 *     not equal to cylindrical R except on the midplane (z=0).
 *  7. No belt's innerAu/outerAu extends past the OTHER belt's own bounds
 *     (the two candidates never overlap, by construction of policy 6).
 */
export const SYSTEM_CONDUCTOR_GATES = 7 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Moon count', status: 'calibrated',
    short: 'How many moons a planet gets, before rollMoons decides where each one sits.',
    long: 'No module rolls a moon COUNT - rollMoons takes it as a given. A Poisson draw with a giant-vs-rocky mean, loosely anchored to the Solar System\'s own giant/rocky moon-count split, invented here since nothing in the shipped package specifies it.',
    source: 'Loosely anchored to the Solar System\'s own observed giant/rocky moon-count disparity (Jupiter/Saturn/Uranus/Neptune each carry many more moons than Earth/Mars) - not a fitted or literature figure.',
  },
  {
    term: 'Belt placement', status: 'calibrated',
    short: 'Where a system\'s asteroid- and Kuiper-belt analogues sit, before rollBelt decides whether each survives being swept.',
    long: 'Two candidates per system: an inner (rocky) belt spanning planets.ts\'s own Zone B boundaries, and an outer (icy) belt spanning Zone C out to four times its inner edge - a Kuiper-analogue width, not a sourced figure.',
    source: 'Reuses planets.ts\'s own Zone A/B/C boundaries (already sourced-form, snow-line-anchored) for the inner belt; the outer belt\'s 4x span is an unsourced, order-of-magnitude Kuiper-belt-analogue choice.',
  },
  {
    term: 'Abiotic atmosphere composition', status: 'calibrated',
    short: 'A rough species breakdown for a planet\'s atmosphere before any life has touched it.',
    long: 'rollAtmosphere classifies an atmosphere\'s kind and retention but stops short of a chemistry breakdown - a minimal two/three-species placeholder keyed on that classification, the same honesty posture biosphere.ts\'s own placeholder composition already uses.',
    source: 'Loosely anchored to Solar System analogues (N2/CO2-dominated terrestrial atmospheres, H2/He-dominated gas-giant envelopes) - not a fitted or literature figure.',
  },
];
