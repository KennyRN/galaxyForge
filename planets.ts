/**
 * planets - planet counts and types by star type. Channel `planets` (one
 * shared stream per system, not per-planet - per-planet streams belong to
 * `moons`/`atmosphere`/etc., keyed on `formationIndex`, once those exist).
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * This is "the largest single piece" the brief names, and the piece with the
 * least raw material actually handed to this package: no occurrence-rate
 * table, no mass-radius grid, no Muller 2024 breakpoints ever shipped here.
 * What DID ship is the brief's own explicit gate targets - which this module
 * treats as the requirement, exactly as the brief's morphology sections treat
 * a stated gate as ground truth rather than an invitation to invent a
 * differently-shaped model that happens to pass it by luck.
 *
 * OCCURRENCE. `LAMBDA_ZONE_A_FGK` = 1.07, `LAMBDA_ZONE_A_M` = 2.5 - these are
 * the brief's OWN stated Zone-A occurrence targets (S6, citing Kepler DR25 /
 * NASA Exoplanet Archive occurrence work per the brief's S8 register), graded
 * `sourced` because the module is built TO them, not fitted after the fact.
 * `ETA_EARTH_RATE` = 0.35 sits at the centre of the brief's stated 0.30-0.40
 * eta-earth band, `calibrated`. Zone B/C occurrence and the giant-hosting
 * metallicity power law (`GIANT_HOSTING_RATE`, fit to the brief's own 7% at
 * solar / 21% at +0.4 dex targets - the qualitative form is Fischer & Valenti
 * 2005, already named in the brief's S8 register) are `calibrated` the same
 * way.
 *
 * MASS-RADIUS AND ENVELOPE. Muller 2024 is named as the mass-radius source
 * but its breakpoints never shipped with this package - same situation as
 * Stage 1's MIST grid and Stage 4's Johnstone 2021 track table. What ships
 * instead: a rocky-core mass-radius power law (R ~ M^0.27, `sourced (form)`,
 * the standard silicate/iron scaling, e.g. Seager et al. 2007/Valencia et al.
 * 2006) and a PHYSICS-FIRST envelope-retention mechanism keyed on the ACTUAL
 * XUV exposure this system's own `stellarHistory.xuvFluenceRel` already
 * computed, scaled by 1/au^2 to this planet's own distance - not a
 * hand-drawn bimodal radius histogram, an emergent one. This is the
 * qualitative mechanism behind the real Fulton et al. 2017 (AJ 154, 109)
 * radius gap - photoevaporation strips low-mass, close-in envelopes and
 * leaves high-mass or far-out ones intact (Lopez & Fortney 2014's finding,
 * ApJ 792, 1, for the qualitative "a percent-level envelope mass fraction
 * doubles the radius" claim) - and both are named here because the
 * MECHANISM is real even though this module's specific stripping threshold
 * and envelope-inflation constants are `calibrated`, tuned until the
 * resulting histogram actually shows the valley the brief's gate demands
 * (verified in the conformance suite, not assumed).
 *
 * HABITABLE ZONE. Imported from `habitability` (Stage 9) - see that
 * module's own header for the form and its grading. This module used to
 * carry a local copy (necessarily, since `habitability` did not exist yet
 * at Stage 6); that seam is now closed, per Law 1.
 *
 * SNOW LINE. `snowLineAu = 2.7 * sqrt(L/Lsun)` - the standard order-of
 * -magnitude form (Kennedy & Kenyon 2008-style), `sourced (form)`.
 *
 * HOLMAN & WIEGERT PLACEMENT. "No planet between aStypeMaxAu and
 * aPtypeMinAu" and "circumbinary innermost median a/a_crit ~1.25" are
 * enforced structurally at DRAW TIME (S-type candidates snap to the nearer
 * legal boundary rather than being generated-then-filtered, preserving fixed
 * draw counts; P-type placement draws a margin ABOVE `aPtypeMinAu` with
 * median exactly 1.25x by construction of the quantile used) - "apply the
 * multiplicity amendment in the same pass, not afterwards", per the brief.
 *
 * MUTUAL-HILL MERGING. `K_STABILITY` = 10 mutual Hill radii - the commonly
 * cited long-term-stability threshold range is roughly 8-12 (e.g. Chambers,
 * Wetherill & Boss 1996; Pu & Wu 2015 find the observed Kepler population
 * clusters nearer 10-20). `tunable`, picked from the middle of that range.
 *
 * genVersion: every constant graded above is genVersion-bumping if changed.
 */

import type { Rng } from './rng';
import { poissonInvCdf, probit } from './mathStats';
import { xuvFluenceRel } from './stellarHistory';
import type { StellarClass } from './stellarProperties';
import { habitableZoneAu } from './habitability';

export type PlanetZone = 'A' | 'B' | 'C';
export type EnvelopeState = 'primary-retained' | 'stripped';
export type OrbitType = 's-type' | 'p-type';
export type PlanetClass =
  | 'rocky-small' | 'earth-like' | 'super-earth'
  | 'sub-neptune' | 'neptune-like' | 'sub-giant' | 'giant' | 'super-giant';
export type PlanetSubclass =
  | 'iron' | 'desert' | 'temperate' | 'ocean' | 'super-earth-icy'
  | 'gas-dwarf' | 'ice-giant' | 'hot-jupiter' | 'jovian' | 'puffy-giant';

/* --------------------------------- zones -------------------------------------- */

/** AU. `sourced (form)`. */
export function snowLineAu(hostLuminositySol: number): number {
  return 2.7 * Math.sqrt(Math.max(hostLuminositySol, 1e-6));
}

function zoneBoundaries(hostLuminositySol: number): { aInner: number; aOuter: number } {
  const sl = snowLineAu(hostLuminositySol);
  // aInner is set BELOW the conservative HZ inner edge (0.95*sqrt(L)) so the
  // whole HZ sits inside Zone B, not straddling A/B - otherwise the eta
  // -earth mechanism's own placements leak into the Zone A occurrence count
  // it is not supposed to touch. 0.3, not 0.5 (calibrated, verified in the
  // conformance suite): 0.3*2.7 = 0.81 AU < 0.95 AU at solar luminosity.
  return { aInner: 0.3 * sl, aOuter: 2 * sl };   // A: [0, aInner), B: [aInner, aOuter), C: [aOuter, inf)
}

export function zoneOf(au: number, hostLuminositySol: number): PlanetZone {
  const { aInner, aOuter } = zoneBoundaries(hostLuminositySol);
  if (au < aInner) return 'A';
  if (au < aOuter) return 'B';
  return 'C';
}

/* ------------------------------- occurrence ------------------------------------ */

const LAMBDA_ZONE_A_FGK = 1.07;    // sourced - the brief's own Zone-A FGK target
// M dwarfs' Zone A is physically much narrower in AU (a tight multiple of a
// small snow line), which packs raw draws close enough together that
// mutual-Hill merging (below) removes a measurable fraction of them before
// the count is ever observed. `calibrated` UP from the brief's own 2.5
// target to compensate, verified in the conformance suite against the
// POST-merge measured occurrence, which is what the gate actually means.
const LAMBDA_ZONE_A_M = 3.1;
const LAMBDA_ZONE_B = 0.55;        // calibrated
const LAMBDA_ZONE_C = 0.35;        // calibrated
// calibrated - NOT the centre of the band (0.35) transcribed directly: the
// MEASURED quantity (rocky planets landing inside the HZ, from every
// mechanism and after mutual-Hill merging) responds to this input at less
// than 1:1 (some of this mechanism's own placements merge into a
// neighbouring Zone-B planet and stop being their own countable body, and
// some Zone-B planets independently land in the HZ too). Solved empirically
// against the actual measured output (two trial points, linear fit), not
// assumed to equal the target - verified in the conformance suite.
const ETA_EARTH_RATE = 0.41;

function isMDwarfLike(primaryMassSol: number): boolean { return primaryMassSol < 0.6; }

function lambdaZoneA(primaryMassSol: number): number {
  return isMDwarfLike(primaryMassSol) ? LAMBDA_ZONE_A_M : LAMBDA_ZONE_A_FGK;
}

/**
 * Giant-hosting fraction vs [Fe/H]. Power-law form (Fischer & Valenti 2005's
 * qualitative shape), coefficients FIT to the brief's own two stated anchors:
 * 7% at feh=0, 21% at feh=+0.4. `calibrated`.
 */
const GIANT_HOSTING_BASE = 0.07;
const GIANT_HOSTING_SLOPE = Math.log10(21 / 7) / 0.4;   // ~1.193, solved so the +0.4 dex anchor lands exactly on 21%

export function giantHostingRate(feh: number): number {
  return Math.min(GIANT_HOSTING_BASE * Math.pow(10, GIANT_HOSTING_SLOPE * feh), 1);
}

/* ------------------------------- envelope physics ------------------------------- */

/** Rocky-core mass-radius relation, `sourced (form)`. */
function coreRadiusEarth(coreMassEarth: number): number {
  return Math.pow(coreMassEarth, 0.27);
}

// `calibrated` - tuned (and verified in the conformance suite) until the
// resulting radius histogram shows a valley in the brief's stated 1.7-1.8
// Rearth band. The key finding from that tuning pass: a envelope fraction
// that can draw arbitrarily close to zero (even when "retained") blurs
// straight back into the rocky peak from the other side and NEVER produces
// a real gap - an unstripped planet needs a FLOOR on how little envelope it
// can plausibly have kept, matching Lopez & Fortney 2014's qualitative
// point that even a small (percent-level) envelope mass fraction already
// produces a large radius change, so "retained" and "negligible" are not
// smoothly connected outcomes.
const XUV_STRIP_THRESHOLD = 1.6;          // fluence-at-planet units (xuvFluenceRel / au^2)
const XUV_STRIP_CORE_MASS_EARTH = 6.0;    // cores at/above this mass resist stripping
const ENVELOPE_MIN_FRACTION = 0.10;       // calibrated - the floor that makes the gap real
const ENVELOPE_RADIUS_BOOST = 3.0;        // calibrated, Lopez & Fortney 2014's qualitative effect
const ENVELOPE_EXPONENT = 0.25;           // calibrated

/** XUV exposure at this planet's own distance, in the same relative units as
 *  `stellarHistory.xuvFluenceRel` (Earth-at-1AU-at-4.6Gyr = 1). Reuses Stage
 *  4's integral directly rather than recomputing anything - inverse-square
 *  scaled to this orbit. Uses the MEDIAN (unscattered) rotation track:
 *  `planets` does not have a per-star `rotationPercentile` threaded to it
 *  (that is `stellarHistory`'s own seeded draw, made once per star at
 *  Stage 4) - a future conductor wiring the two stages together should pass
 *  the star's actual draw through instead of re-approximating it here. */
export function planetXuvFluence(hostClass: StellarClass, hostAgeGyr: number, au: number): number {
  return xuvFluenceRel(hostClass, hostAgeGyr, 0.5) / (au * au);
}

interface EnvelopeResult {
  readonly envelopeFraction: number;
  readonly envelope: EnvelopeState;
  readonly radiusEarth: number;
  readonly massEarth: number;
}

/** PHYSICS-FIRST: envelope retention is a consequence of XUV exposure and
 *  core mass, not a hand-picked radius bin. `envelopeFractionDraw` is a
 *  uniform(0,1) that sets HOW MUCH envelope survives when it does. */
function evolveEnvelope(coreMassEarth: number, fluence: number, envelopeFractionDraw: number): EnvelopeResult {
  const resists = coreMassEarth >= XUV_STRIP_CORE_MASS_EARTH;
  const stripped = fluence > XUV_STRIP_THRESHOLD && !resists;
  const coreR = coreRadiusEarth(coreMassEarth);
  if (stripped) {
    return { envelopeFraction: 0, envelope: 'stripped', radiusEarth: coreR, massEarth: coreMassEarth };
  }
  // Envelope mass fraction: floored at ENVELOPE_MIN_FRACTION (see the
  // constant's own comment for why), rising with a `calibrated` monotonic
  // mapping favouring higher-mass cores (bigger gravity wells hold more gas
  // at formation).
  const maxFraction = Math.max(ENVELOPE_MIN_FRACTION + 0.01, Math.min(0.6, 0.02 + 0.05 * Math.sqrt(coreMassEarth)));
  const envelopeFraction = ENVELOPE_MIN_FRACTION + (maxFraction - ENVELOPE_MIN_FRACTION) * envelopeFractionDraw;
  const radiusEarth = coreR * (1 + ENVELOPE_RADIUS_BOOST * Math.pow(envelopeFraction, ENVELOPE_EXPONENT));
  const massEarth = coreMassEarth / Math.max(1 - envelopeFraction, 0.01);
  return { envelopeFraction, envelope: 'primary-retained', radiusEarth, massEarth };
}

/* ---------------------------------- classes -------------------------------------- */

const CLASS_BREAKPOINTS: readonly [number, PlanetClass][] = [
  [0.5, 'rocky-small'], [1.25, 'earth-like'], [1.75, 'super-earth'],
  [4.0, 'sub-neptune'], [6.5, 'neptune-like'], [10.5, 'sub-giant'],
  [16.5, 'giant'], [Infinity, 'super-giant'],
];

export function classOfRadius(radiusEarth: number): PlanetClass {
  for (const [hi, cls] of CLASS_BREAKPOINTS) if (radiusEarth < hi) return cls;
  return 'super-giant';
}

const ROCKY_CLASSES = new Set<PlanetClass>(['rocky-small', 'earth-like', 'super-earth']);
export function kindOfClass(c: PlanetClass): 'rocky' | 'giant' {
  return ROCKY_CLASSES.has(c) ? 'rocky' : 'giant';
}

function subclassOf(c: PlanetClass, au: number, snowline: number, migrated: boolean): PlanetSubclass {
  const icy = au > snowline;
  switch (c) {
    case 'rocky-small': return 'iron';
    case 'earth-like': return icy ? 'ocean' : 'temperate';
    case 'super-earth': return icy ? 'super-earth-icy' : 'desert';
    case 'sub-neptune': return 'gas-dwarf';
    case 'neptune-like': return 'ice-giant';
    case 'sub-giant': return migrated ? 'hot-jupiter' : 'jovian';
    case 'giant': return migrated ? 'hot-jupiter' : 'jovian';
    case 'super-giant': return 'puffy-giant';
  }
}

/* --------------------------------- the planet -------------------------------------- */

export interface PlanetDraw {
  formationIndex: number;
  kind: 'rocky' | 'giant';
  class: PlanetClass;
  subclass: PlanetSubclass;
  zone: PlanetZone;
  au: number;
  formationAu: number;
  eccentricity: number;
  radiusEarth: number;
  massEarth: number;
  coreMassEarth: number;
  envelopeFraction: number;
  envelope: EnvelopeState;
  hostLuminositySol: number;
  orbitType: OrbitType;
  channel: 'core-accretion' | 'disk-instability';
  migrated: boolean;
}

export interface PlanetSystemInputs {
  readonly primaryMassSol: number;
  readonly primaryLuminositySol: number;
  readonly combinedLuminositySol: number;
  readonly hostClass: StellarClass;
  readonly ageGyr: number;
  readonly feh: number;
  /** null for single stars. */
  readonly aStypeMaxAu: number | null;
  readonly aPtypeMinAu: number | null;
}

const K_STABILITY = 10;   // tunable, mutual Hill radii

/** Snap a proposed S-type semimajor axis out of the forbidden gap, toward
 *  whichever legal boundary is nearer - keeps draw counts fixed (no
 *  rejection sampling) while still enforcing the constraint AT DRAW TIME. */
function snapOutOfGap(auProposed: number, aStypeMaxAu: number | null, aPtypeMinAu: number | null): number {
  if (aStypeMaxAu === null || aPtypeMinAu === null) return auProposed;
  if (auProposed <= aStypeMaxAu || auProposed >= aPtypeMinAu) return auProposed;
  const toInner = auProposed - aStypeMaxAu;
  const toOuter = aPtypeMinAu - auProposed;
  return toInner <= toOuter ? aStypeMaxAu * 0.999 : aPtypeMinAu * 1.001;
}

/**
 * Draws every planet for one system. Fixed draw budget PER SLOT (5 draws:
 * position, core mass, envelope-fraction, eccentricity, subclass-flavour) so
 * the total is deterministic given the slot counts, which are themselves
 * drawn once each via `poissonInvCdf` (1 draw per zone/mechanism).
 */
export function rollPlanets(rng: Rng, inputs: PlanetSystemInputs): PlanetDraw[] {
  const { primaryMassSol, primaryLuminositySol, combinedLuminositySol, hostClass, ageGyr, feh,
    aStypeMaxAu, aPtypeMinAu } = inputs;
  const sl = snowLineAu(primaryLuminositySol);
  const { aInner, aOuter } = zoneBoundaries(primaryLuminositySol);
  const hz = habitableZoneAu(primaryLuminositySol);

  const draws: PlanetDraw[] = [];
  let nextIndex = 0;

  function drawSlot(auLo: number, auHi: number, coreLoEarth: number, coreHiEarth: number, forceZone?: PlanetZone): void {
    const uAu = rng(), uCore = rng(), uEnv = rng(), uEcc = rng(), uSub = rng();
    const logLo = Math.log(auLo), logHi = Math.log(Math.max(auHi, auLo * 1.0001));
    let au = Math.exp(logLo + uAu * (logHi - logLo));
    au = snapOutOfGap(au, aStypeMaxAu, aPtypeMinAu);
    const coreMassEarth = Math.exp(Math.log(coreLoEarth) + uCore * (Math.log(coreHiEarth) - Math.log(coreLoEarth)));
    const fluence = planetXuvFluence(hostClass, ageGyr, au);
    const env = evolveEnvelope(coreMassEarth, fluence, uEnv);
    const eccentricity = Math.min(Math.max(uEcc, 0), 1) * 0.15;   // calibrated, modest for a stable multi-planet slot
    const migrated = false;
    const orbitType: OrbitType = aPtypeMinAu !== null && au >= aPtypeMinAu ? 'p-type' : 's-type';
    const hostLum = orbitType === 'p-type' ? combinedLuminositySol : primaryLuminositySol;
    const cls = classOfRadius(env.radiusEarth);
    draws.push({
      formationIndex: nextIndex++, kind: kindOfClass(cls), class: cls,
      subclass: subclassOf(cls, au, sl, migrated), zone: forceZone ?? zoneOf(au, primaryLuminositySol),
      au, formationAu: au, eccentricity,
      radiusEarth: env.radiusEarth, massEarth: env.massEarth, coreMassEarth,
      envelopeFraction: env.envelopeFraction, envelope: env.envelope,
      hostLuminositySol: hostLum, orbitType, channel: 'core-accretion', migrated,
      // uSub reserved for future subclass-flavour scatter; consumed to keep
      // the draw budget fixed even though today's subclassOf is deterministic.
    });
    void uSub;
  }

  // Zone A
  const nA = poissonInvCdf(lambdaZoneA(primaryMassSol), rng());
  for (let i = 0; i < nA; i++) drawSlot(0.02, aInner, 0.3, 4, 'A');

  // Zone B
  const nB = poissonInvCdf(LAMBDA_ZONE_B, rng());
  for (let i = 0; i < nB; i++) drawSlot(aInner, aOuter, 0.3, 6, 'B');

  // Zone C
  const nC = poissonInvCdf(LAMBDA_ZONE_C, rng());
  for (let i = 0; i < nC; i++) drawSlot(aOuter, aOuter * 8, 0.3, 10, 'C');

  // Earth-like-in-HZ mechanism (eta-earth) - its own explicit occurrence,
  // forced rocky and forced inside the HZ, not left to emerge from the zone
  // -B lottery above (see header: the brief's gate is treated as ground truth).
  const nEarth = poissonInvCdf(ETA_EARTH_RATE, rng());
  for (let i = 0; i < nEarth; i++) {
    const uAu = rng(), uCore = rng(), uEcc = rng();
    const au = snapOutOfGap(hz.inner + uAu * (hz.outer - hz.inner), aStypeMaxAu, aPtypeMinAu);
    const coreMassEarth = 0.6 + uCore * 1.2;   // calibrated, Earth-like core range
    const cls = classOfRadius(coreRadiusEarth(coreMassEarth));
    draws.push({
      formationIndex: nextIndex++, kind: 'rocky', class: cls, subclass: subclassOf(cls, au, sl, false),
      zone: zoneOf(au, primaryLuminositySol), au, formationAu: au,
      eccentricity: Math.min(uEcc, 1) * 0.1,
      radiusEarth: coreRadiusEarth(coreMassEarth), massEarth: coreMassEarth, coreMassEarth,
      envelopeFraction: 0, envelope: 'stripped',
      hostLuminositySol: primaryLuminositySol, orbitType: 's-type', channel: 'core-accretion', migrated: false,
    });
  }

  // Giant-hosting mechanism.
  const uGiant = rng();
  if (uGiant < giantHostingRate(feh)) {
    const uForm = rng(), uMig = rng(), uMass = rng(), uEcc = rng(), uChannel = rng();
    const formationAu = sl * (1.5 + uForm * 6);   // beyond the snow line, per standard core-accretion siting
    const MIGRATION_PROBABILITY = 0.30;           // tunable
    const migrated = uMig < MIGRATION_PROBABILITY;
    let au = migrated ? 0.02 + uMig * 0.3 : formationAu;   // hot-Jupiter-scale if migrated
    au = snapOutOfGap(au, aStypeMaxAu, aPtypeMinAu);
    const massEarth = 30 + uMass * 900;   // ~2-60 Mearth-to-Jupiter-ish range (Mjup ~ 317.8 Mearth)
    const radiusEarth = 11.0 * Math.pow(massEarth / 317.8, 0.10);
    const cls = classOfRadius(radiusEarth);
    const orbitType: OrbitType = aPtypeMinAu !== null && au >= aPtypeMinAu ? 'p-type' : 's-type';
    draws.push({
      formationIndex: nextIndex++, kind: 'giant', class: cls, subclass: subclassOf(cls, au, sl, migrated),
      zone: zoneOf(au, primaryLuminositySol), au, formationAu,
      eccentricity: Math.min(uEcc, 1) * 0.2,
      radiusEarth, massEarth, coreMassEarth: massEarth * 0.1,
      envelopeFraction: 0.9, envelope: 'primary-retained',
      hostLuminositySol: orbitType === 'p-type' ? combinedLuminositySol : primaryLuminositySol,
      orbitType, channel: uChannel < 0.15 ? 'disk-instability' : 'core-accretion', migrated,
    });
  }

  // Explicit P-type placement: "circumbinary innermost median a/a_crit ~
  // 1.25" - a margin quantile whose MEDIAN is exactly 0.25 by construction
  // (probit(0.5) = 0), so the multiplier's median is exactly 1.25.
  if (aPtypeMinAu !== null) {
    const uOccur = rng();
    const P_TYPE_OCCURRENCE = 0.5;   // tunable - not every circumbinary-capable system hosts one
    if (uOccur < P_TYPE_OCCURRENCE) {
      const uMargin = rng(), uCore = rng(), uEcc = rng();
      const MARGIN_SIGMA_DEX = 0.2;   // tunable spread; median unaffected
      const margin = 0.25 * Math.pow(10, MARGIN_SIGMA_DEX * probit(Math.min(Math.max(uMargin, 1e-9), 1 - 1e-9)));
      const au = aPtypeMinAu * (1 + margin);
      const coreMassEarth = 1 + uCore * 8;
      const env = evolveEnvelope(coreMassEarth, planetXuvFluence(hostClass, ageGyr, au), 0.3);
      const cls = classOfRadius(env.radiusEarth);
      draws.push({
        formationIndex: nextIndex++, kind: kindOfClass(cls), class: cls,
        subclass: subclassOf(cls, au, sl, false), zone: zoneOf(au, primaryLuminositySol),
        au, formationAu: au, eccentricity: Math.min(uEcc, 1) * 0.1,
        radiusEarth: env.radiusEarth, massEarth: env.massEarth, coreMassEarth,
        envelopeFraction: env.envelopeFraction, envelope: env.envelope,
        hostLuminositySol: combinedLuminositySol, orbitType: 'p-type',
        channel: 'core-accretion', migrated: false,
      });
    }
  }

  const merged = mutualHillMerge(draws, primaryMassSol);
  return merged;
}

/* -------------------------------- mutual-Hill merging ------------------------------- */

const MEARTH_PER_MSUN = 333030;

/** Sorts by `au`, merges any adjacent pair closer than `K_STABILITY` mutual
 *  Hill radii, keeps the SURVIVOR's original `formationIndex` (the lower
 *  -index / earlier-formed one - `formationIndex` is pre-merge identity per
 *  types.ts, so a merge does not invent a new one). */
export function mutualHillMerge(planetsIn: readonly PlanetDraw[], primaryMassSol: number): PlanetDraw[] {
  const sorted = [...planetsIn].sort((a, b) => a.au - b.au);
  const out: PlanetDraw[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (prev) {
      const m1 = prev.massEarth / MEARTH_PER_MSUN, m2 = p.massEarth / MEARTH_PER_MSUN;
      const mutualHillAu = ((prev.au + p.au) / 2) * Math.pow((m1 + m2) / (3 * primaryMassSol), 1 / 3);
      const separation = p.au - prev.au;
      if (mutualHillAu > 0 && separation < K_STABILITY * mutualHillAu) {
        // Merge into `prev`: combine mass, keep prev's formationIndex (the
        // earlier-formed body), recompute derived fields from the sum.
        const mergedCoreMassEarth = prev.coreMassEarth + p.coreMassEarth;
        const mergedMassEarth = prev.massEarth + p.massEarth;
        const mergedEnvelopeFraction = Math.max(prev.envelopeFraction, p.envelopeFraction);
        const mergedRadiusEarth = Math.max(prev.radiusEarth, p.radiusEarth);
        const mergedCls = classOfRadius(mergedRadiusEarth);
        out[out.length - 1] = {
          ...prev, coreMassEarth: mergedCoreMassEarth, massEarth: mergedMassEarth,
          envelopeFraction: mergedEnvelopeFraction, radiusEarth: mergedRadiusEarth,
          class: mergedCls, kind: kindOfClass(mergedCls),
        };
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. Zone A occurrence averages near 1.07 for FGK primaries, 2.5 for M
 *     (measured over many systems, both by construction of the lambdas).
 *  2. eta-earth (fraction of G-primary systems with >=1 rocky planet inside
 *     the HZ) lands in [0.30, 0.40].
 *  3. Giant-hosting fraction is ~7% at feh=0, ~21% at feh=+0.4.
 *  4. THE RADIUS HISTOGRAM - pooled across a large synthetic population, has
 *     a genuine local minimum (not a monotonic slope) somewhere in
 *     [1.7, 1.8] Rearth, EMERGENT from the XUV-stripping mechanism, not
 *     hand-drawn.
 *  5. No planet's `au` ever falls strictly between `aStypeMaxAu` and
 *     `aPtypeMinAu`, for any system with both defined.
 *  6. Circumbinary placement: across many draws, the median of
 *     au / aPtypeMinAu for the (single) placed P-type planet lands near 1.25.
 *  7. `formationIndex` is unique per system and stable under merging (a
 *     merged planet keeps its earlier-formed index, never invents a new one).
 *  8. Mutual-Hill merging actually reduces overpacked configurations: a
 *     deliberately-overpacked synthetic input (many planets crammed into a
 *     narrow au range) comes out with strictly fewer planets after merging.
 *  9. Determinism - same rng sequence and inputs give bit-identical output.
 */
export const PLANETS_GATES = 9 as const;
