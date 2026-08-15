/**
 * StarForge - canonical shared contracts.
 *
 * THIS FILE SUPERSEDES every `types.ts` fragment in every prior document.
 * Where an earlier spec disagrees with this file, this file wins. The first
 * finding of the archive audit was that conflicting contracts are what stopped
 * the last hand-off; this is the resolution of that finding.
 *
 * -- RULINGS APPLIED --------------------------------------------------------
 *  1. Per-planet results are INDEX-ALIGNED ARRAYS on SystemCore (bundle 14-15),
 *     not decorations on Planet (terraforming handover). The handover's
 *     `Planet.atmosphere` shape is dead. `render` re-nests for display.
 *  2. `humanHabitability` is the SINGLE source of truth for human-habitable.
 *     `habitability.isHumanHabitable` is deleted. `habitability` stays geometric.
 *  3. `terraformed` is procedurally placed, gated on feasibility. `agentRef` is
 *     the field name (not `agent`), and is unset on procedural placements.
 *  4. Detail sheets are generated lazily; the atlas is built eagerly in memory.
 *  5. The atlas marks from `humanHabitability` alone. No Kopparapu flag on the row.
 *  6. Closed taxonomies are named unions, DECLARED IN THE OWNING MODULE and
 *     re-exported here. Only `Confidence` and `LedgerStatus` are declared here,
 *     because they describe the pipeline's epistemics, not the universe.
 *  7. Per-planet PRNG channels key on `formationIndex`, NEVER on array position.
 *  8. `null` means "computed, does not apply". `?` means "genuinely may be absent".
 *  9. (R14) `Population` and `PopulationKey` are DECLARED IN `galaxyModel.ts` and
 *     re-exported here. The population *concept* belongs to the model layer;
 *     each morphology supplies its own *instances*.
 * 10. (R15) `SectorRecipe` hash membership is decided by ONE test: does changing
 *     the field move or remove existing systems? If yes it feeds
 *     `galaxyConfigHash`; if it only changes which systems are ADMITTED, it does
 *     not. See the field comments below.
 *
 * -- CANONICAL UNITS (Law 3) -------------------------------------------------
 *  pc, K, Lsun, Rsun, Msun, AU, Rearth, Mearth, Gyr, dex, Rp (moon orbits), km
 *  Conversion happens ONLY in `units`, ONLY at display. No other module holds
 *  a conversion factor. Field names carry their unit; keep it that way.
 */

// ---------------------------------------------------------------------------
// 1. META-TAXONOMIES - declared here by exception (Amendment A3, type level)
//    No value below asserts anything about the universe.
// ---------------------------------------------------------------------------

/** Confidence in a module's output for the given inputs. */
export type Confidence = 'sourced' | 'extrapolated' | 'out-of-range';

/** Provenance grade of a constant, for the soft-numbers ledger and glossary. */
export type LedgerStatus = 'sourced' | 'calibrated' | 'tunable' | 'derived';

export interface GlossaryEntry {
  term: string;
  short: string;                 // one line, for a reader with no astronomy
  long: string;
  status: LedgerStatus;
  source?: string;               // omitted only when status is 'derived'
  seeAlso?: string[];
}

// ---------------------------------------------------------------------------
// 2. TAXONOMY RE-EXPORTS
//    Each is DECLARED in its owning module. Listed here so consumers have one
//    import path. Revising a taxonomy = editing one module, per the procedure.
// ---------------------------------------------------------------------------

export type { StellarClass, StarKind } from './stellarProperties';
export type { RotationClass, ActivityClass } from './stellarHistory';
export type { BinaryRegime } from './multiplicity';
export type { PlanetClass, PlanetSubclass, EnvelopeState, OrbitType, PlanetZone }
  from './planets';
export type { BeltComposition, BeltKind } from './belts';
export type { MoonComposition, MoonSense, MoonOrigin } from './moons';
export type { AtmosphereKind, CloudClass, PressureClass } from './atmosphere';
export type { BiosphereLevel, SignatureVerdict, SignatureOrigin } from './biosphere';
export type { TerraformType, Completeness } from './terraforming';
export type { HabTier, SupportLevel } from './humanHabitability';
export type { GalaxyModelName, Population, PopulationKey } from './galaxyModel';
export type { SectorCentreCriteria } from './galacticDensity';

// Local aliases so the interfaces below read cleanly.
import type { StarKind } from './stellarProperties';
import type { RotationClass, ActivityClass } from './stellarHistory';
import type { BinaryRegime } from './multiplicity';
import type { PlanetClass, PlanetSubclass, EnvelopeState, OrbitType, PlanetZone }
  from './planets';
import type { BeltComposition, BeltKind } from './belts';
import type { MoonComposition, MoonSense, MoonOrigin } from './moons';
import type { AtmosphereKind, CloudClass, PressureClass } from './atmosphere';
import type { BiosphereLevel, SignatureVerdict, SignatureOrigin } from './biosphere';
import type { TerraformType, Completeness } from './terraforming';
import type { HabTier, SupportLevel } from './humanHabitability';
import type { GalaxyModelName, PopulationKey } from './galaxyModel';
import type { SectorCentreCriteria } from './galacticDensity';

// ---------------------------------------------------------------------------
// 3. STARS AND SYSTEM GEOMETRY
// ---------------------------------------------------------------------------

export interface Star {
  class: StarKind;               // MS class, or a remnant kind: 'white-dwarf' for
                                 //   a promoted companion OR a placed single
                                 //   (Build 1, Part R); 'neutron-star' /
                                 //   'black-hole' arrive with the StarKind
                                 //   widening at stage 1
  tempK: number;                 // K
  colourBV: number;              // mag - REQUIRED: stellarHistory's gyrochronology
                                 //   is keyed on B-V, and the Mamajek sequence has it
  luminositySol: number;         // Lsun - 0 for a remnant
  massSol: number;               // Msun
  radiusSol: number;             // Rsun
}

/**
 * Orbital elements of one companion. Index-aligned to `stars.slice(1)`.
 * Deliberately carries NO mass, class or luminosity - those live on the Star.
 * Duplicating them here would put one quantity in two places (Law 2).
 */
export interface StellarOrbit {
  separationAu: number;          // AU, semi-major axis of the stellar orbit
  eccentricity: number;
}

export interface SystemGeometry {
  regime: BinaryRegime;
  orbits: StellarOrbit[];                // index-aligned to stars.slice(1)
  aStypeMaxAu: number | null;            // Holman & Wiegert; null when single
  aPtypeMinAu: number | null;            // Holman & Wiegert; null when single
  combinedLuminositySol: number;         // Lsun, all stars summed
  hostsCircumbinary: boolean;
  stabilityConfidence: Confidence;       // 'out-of-range' when mass ratio < 0.1
}

// ---------------------------------------------------------------------------
// 4. PLANETS
// ---------------------------------------------------------------------------

export interface Planet {
  /**
   * STABLE IDENTITY. Pre-merge, pre-sort, pre-migration position.
   * Every per-planet PRNG channel keys on this: `atmosphere:${formationIndex}`.
   * Array position is NOT stable across genVersion changes; this is.
   */
  formationIndex: number;

  kind: 'rocky' | 'giant';       // atlas reducer only; derived from `class`
  class: PlanetClass;            // sourced breakpoints, Muller 2024
  subclass: PlanetSubclass;      // naming layer, calibrated
  zone: PlanetZone;              // 'A' surveyed | 'B' temperate | 'C' cold

  au: number;                    // AU, current
  formationAu: number;           // AU at formation - a migrated giant keeps icy moons
  eccentricity: number;

  radiusEarth: number;           // Rearth
  massEarth: number;             // Mearth
  coreMassEarth: number;         // Mearth, excluding any envelope
  envelopeFraction: number;      // envelope mass / core mass; 0 when stripped
  envelope: EnvelopeState;

  /**
   * Effective host luminosity, in Lsun. Primary alone for S-type, combined for
   * P-type. Stamped upstream so NO module below `planets` needs to know that
   * binaries exist. Read this, never `stars[0].luminositySol`.
   */
  hostLuminositySol: number;
  orbitType: OrbitType;

  channel: 'core-accretion' | 'disk-instability';
  migrated: boolean;
}

// ---------------------------------------------------------------------------
// 5. BELTS AND MOONS
// ---------------------------------------------------------------------------

export interface Belt {
  kind: BeltKind;
  composition: BeltComposition;  // MUST be derived by testing mid-radius against
                                 //   snowLineAu - not hardcoded per belt kind
  innerAu: number;
  outerAu: number;
  /** Broken SFD, Bottke 2005. The elbow is a fossil of accretion and does NOT
   *  scale with belt mass; the normalisation does. */
  countAbove1km: number;
  largestDiameterKm: number;
  lateHeavyBombardment: boolean; // lives here, never in `planets`
  depletionFactor: number;
}

export interface Moon {
  radiusKm: number;              // km - canonical for small bodies
  orbitRp: number;               // planetary radii (Amendment A1), NOT AU
  composition: MoonComposition;  // from formationAu, not au
  sense: MoonSense;
  origin: MoonOrigin;
  tidallyLocked: boolean;
}

// ---------------------------------------------------------------------------
// 6. STELLAR ACTIVITY HISTORY
// ---------------------------------------------------------------------------

export interface StellarHistory {
  rotationPercentile: number;    // 0-1; the ONLY seeded quantity in the module
  rotationClass: RotationClass;
  /** BUILD 3 (P6). Present-day magnetic activity, DERIVED from the Rossby
   *  number this module already computes: 'flare-active' in the saturated
   *  regime (Ro < 0.13, Wright et al. 2011, ApJ 743, 48), then 'moderate' /
   *  'quiet' by tunable Ro boundaries. STAMPED HERE, upstream - `biosphere`,
   *  `atmosphere` and `render` read this field and NEVER recompute Rossby
   *  numbers (Law 2; a grep gate enforces it at stage 9). */
  activityClass: ActivityClass;
  initialPeriodDays: number;
  presentPeriodDays: number;
  xuvPresentRel: number;         // solar today = 1. Carries a known ~6x offset
                                 //   from the Sanz-Forcada EUV bridge; see ledger
  xuvFluenceRel: number;         // CUMULATIVE XUV at 1 AU, Earth-at-4.6-Gyr = 1.
                                 //   Zahnle & Catling units - the shoreline reads this
  saturatedUntilGyr: number;
  preMainSequenceFactor: number;
  confidence: Confidence;        // 'out-of-range' outside 0.1-1.2 Msun
}

// ---------------------------------------------------------------------------
// 7. ATMOSPHERE AND SURFACE
// ---------------------------------------------------------------------------

export interface SpeciesFraction {
  species: string;               // free text BY DESIGN - chemistry is open-ended
  fraction: number;              // normalised to 1
}

export interface Atmosphere {
  kind: AtmosphereKind;
  dominant: string | null;       // null when kind is 'none'
  composition: SpeciesFraction[];
  pressureClass: PressureClass;
  cloudClass: CloudClass | null;  // null = evaluated, does not apply.
                                  //   Sudarsky classifies primary envelopes only
  equilibriumTempK: number;       // imported from surfaceTemperature, never local
  /** EECS atmosphere-retention margin, in dex. Positive retains.
   *  Meni-Gallardo & Palle 2026, MNRAS 550, 1, stag1163 (eq. 3), NOT the
   *  arXiv:2508.12865v1 preprint - cite the published version.
   *  v_esc in km/s and xuvFluenceRel in ZC units - no free constant remains.
   *  The km/s convention is load-bearing: the dimensionless form shifts every
   *  verdict by 5.77 * log10(11.186) = 6.05 dex. */
  retentionMarginDex: number;
}

export interface Surface {
  meanTempK: number;
  dayNightDeltaK: number | null;  // null when not tidally locked
  liquidWaterStable: boolean;
  gravityG: number;
}

// ---------------------------------------------------------------------------
// 8. BIOSPHERE, TERRAFORMING, HABITABILITY
// ---------------------------------------------------------------------------

export interface Biosignature {
  species: string;
  verdict: SignatureVerdict;
  origin: SignatureOrigin;        // biotic | abiotic | engineered
}

export interface Biosphere {
  level: BiosphereLevel;
  originProbability: number;
  originEpochGyr: number | null;  // null when level is 'none'
  oxygenated: boolean;
  /** NOT FINAL. `terraforming` reads this and applies a further delta.
   *  Three-layer peelback: abiotic -> biotic -> anthropic, nothing discarded. */
  realisedComposition: SpeciesFraction[];
  signatures: Biosignature[];
}

export interface Terraformability {
  feasible: boolean;
  score: number;                  // 0-1, deterministic from physical state
  blockers: string[];
}

export interface Terraforming {
  terraformability: Terraformability;
  /** null = not terraformed. Procedurally placed, gated on feasibility.
   *  Authored placements in frontmatter override and are never regenerated. */
  terraformed: {
    types: TerraformType[];
    completeness: Completeness;
    /** Soft link to the placing civilisation. UNSET on procedural placements -
     *  render as "agency unattributed", never as a blank field.
     *  `?` not `| null`: a dangling reference may genuinely be absent. */
    agentRef?: string;
  } | null;
  realisedComposition: SpeciesFraction[] | null;  // null = read biosphere unchanged
  realisedPressureClass: PressureClass | null;
  realisedMeanTempK: number | null;
}

export interface HumanHabitability {
  tier: HabTier;
  liveable: boolean;
  support: SupportLevel;
  gravityG: number;
  blockers: string[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// 9. CONTEXT AND CORE
// ---------------------------------------------------------------------------

/**
 * System-level state threaded to every module. Carries chemistry, epoch and
 * geometry WITHOUT polluting the stellar interfaces.
 */
export interface SystemContext {
  sysid: string;
  genVersion: number;
  positionPc: { x: number; y: number; z: number };
  /** SPHERICAL r, not cylindrical R (8.8). For a disc near the midplane the
   *  two barely differ; for a spheroid, r is what the metallicity gradient
   *  depends on. Pinned here so no consumer has to guess. */
  galactocentricRadiusPc: number;
  /** Union of every key any shipped morphology uses (0.5, R14). Widening it
   *  for a new morphology is additive and sanctioned. Never special-case a key
   *  downstream. */
  population: PopulationKey;
  formationRank: number;         // 0-1 shared latent; couples age and metallicity
  /** BUILD 2 (Part C), REALISM RULING. Present iff this system belongs to a
   *  CO-NATAL REMNANT - a young (< 1 Gyr), chemically coherent group; members
   *  share stored age EXACTLY and [Fe/H] to SIGMA_INTRA = 0.02 dex.
   *  Unset for field systems. There is no other case: under the realism ruling
   *  placement is gated on coherence, so EVERY placed group is conatal and the
   *  chance-alignment branch of the earlier draft does not exist. Derives from
   *  (cell, parentOrdinal): expansion-stable, but rederived on any genVersion
   *  bump - user names attach via fences, never to this id. */
  conatalGroupId?: string;
  age: number;                   // Gyr - a DATA-FLOW dependency for atmosphere
  feh: number;                   // dex
  geometry: SystemGeometry;
  history: StellarHistory[];     // index-aligned to `stars`; per-star channels
  terraformScale: number;        // 0-6. An AUTHORING parameter shown at galaxy
                                 //   creation; it shapes procedural prevalence
}

/**
 * The complete generated system. Per-planet results are INDEX-ALIGNED to
 * `planets` - position i in every array below refers to planets[i].
 *
 * INVARIANT, and it is load-bearing: every array here has planets.length
 * entries. `null` at position i means "evaluated for planets[i], does not
 * apply". Assert this in tests; index drift is silent corruption.
 *
 * `render` re-nests these for display. It is the only module that does so.
 */
export interface SystemCore {
  sysid: string;
  genVersion: number;
  ctx: SystemContext;

  stars: Star[];                          // stars[0] is the primary
  planets: Planet[];
  belts: Belt[];

  moons: Moon[][];                        // index-aligned; moons[i] belongs to planets[i]
  atmospheres: (Atmosphere | null)[];
  surface: (Surface | null)[];
  biospheres: (Biosphere | null)[];
  terraforming: (Terraforming | null)[];
  humanHabitability: (HumanHabitability | null)[];

  /** Circumstellar HZ, from `habitability`. GEOMETRIC ONLY - it makes no claim
   *  about atmospheres or sterilisation. Detail-sheet content; not on the atlas row. */
  habitableZoneAu: { inner: number; outer: number };
  galacticHabitabilityScore: number;      // deterministic score, NOT an rng gate
}

// ---------------------------------------------------------------------------
// 10. ATLAS ROW - the eager reduction
// ---------------------------------------------------------------------------

/**
 * A pure reduction of SystemCore. The full pipeline runs in memory for every
 * system at atlas-build time; only this survives. Detail notes are written
 * lazily, on click.
 */
export interface SystemSummary {
  sysid: string;
  name: string | null;                    // null until a user names it
  distancePc: number;
  primaryClass: StarKind;
  starCount: number;
  planetCount: number;
  countByClass: Record<PlanetClass, number>;
  /** The atlas marks from THIS and nothing else. Best tier across the system;
   *  null when no planet has a surface to judge. */
  bestHabTier: HabTier | null;
  hasNote: boolean;                       // render as a wikilink only when true,
                                          //   else the graph view fills with stubs
}

// ---------------------------------------------------------------------------
// 11. SECTOR RECIPE - the actual store
// ---------------------------------------------------------------------------

/**
 * Regenerates the entire sector. If everything else burns down, this is enough.
 *
 * HASH MEMBERSHIP TEST (R15, and it is the whole rule): does changing this
 * field MOVE or REMOVE an existing system? If yes, it feeds `galaxyConfigHash`.
 * If it only changes which systems are ADMITTED, it does not - because under
 * the per-cell density ruling (R5) every cell is a pure function of space, so
 * a retained system keeps its exact position and `sysid`.
 */
export interface SectorRecipe {
  worldSeed: string;
  genVersion: number;

  // -- Galaxy configuration - HASHED (0.7) ----------------------------------
  model: GalaxyModelName;
  galaxyMassSol: number;                            // rolled ONCE at creation, then stored (9.1)
  barEnabled: boolean;
  lenticularBulgeType?: 'composite' | 'classical';  // lenticular only (3.3)

  // -- Sector geometry -------------------------------------------------------
  /** Resolved value (8.9a). Sector-local origin; galactic coords stay canonical.
   *  NOT hashed: it selects which cells are admitted and which z-layer the slab
   *  occupies, never what any cell contains. */
  centrePc: { x: number; y: number; z: number };
  /** CIRCUMRADIUS of the footprint, for every shape (8.2). NOT hashed -
   *  widening the footprint only admits more systems. */
  radiusPc: number;
  /** FULL thickness, not half. The name carries the convention (8.2).
   *  HASHED: cells span the full slab, so lambda scales with thickness and
   *  changing it generates a different slice of the galaxy. */
  thicknessPc: number;
  /** NOT hashed. Without this field the footprint filter is not regenerable
   *  at all, which is why it must be stored (R15). */
  footprintShape: 'circle' | 'square' | 'hexagon';

  // -- Provenance, not generation input ---------------------------------------
  /** Why the centre is where it is (8.9a). OUTSIDE the hash, so a user may
   *  revise their search criteria later without invalidating a single note. */
  centreCriteria?: SectorCentreCriteria;
  terraformScale: number;

  galaxyConfigHash: string;
}

// ---------------------------------------------------------------------------
// 12. STORAGE
// ---------------------------------------------------------------------------

export interface AuthoredOverlay {
  sysid: string;
  pinned: boolean;
  pinnedAtGenVersion: number | null;
  terraformed?: {
    formationIndex: number;               // keys on formationIndex, NOT array position
    types: TerraformType[];
    completeness: Completeness;
    agentRef?: string;
  }[];
}

export interface FenceState {
  genVersion: number;
  /** Sits beside genVersion (0.7). A STALENESS STAMP ONLY - it never feeds a
   *  PRNG seed. Modules are pure and do not detect staleness; `vault` does. */
  galaxyConfigHash: string;
  sha: string;                            // hash of the generated block
  edited: boolean;                        // hash mismatch -> NEVER overwrite
}

// ---------------------------------------------------------------------------
// 13. PRNG CHANNELS
//     One place, so a typo is a compile error rather than a silent new stream.
// ---------------------------------------------------------------------------

export const CHANNELS = {
  /** Spatial placement AND population assignment, together, per cell (0.6).
   *  ONE addition, not two. There is no `population` channel anywhere in the
   *  project - R12 swept the three stale references to one. */
  placement: 'placement',
  formationRank: 'formationRank',
  age: 'age',
  metallicity: 'metallicity',
  stars: 'stars',
  companions: 'companions',
  /** BUILD 1 (Part R): the remnant layer's pair, mirroring placement/stars -
   *  one cell-scoped stream for WHERE, one system-scoped stream for WHAT.
   *  Isolated so remnant science can never perturb stellar positions (Law 4). */
  remnantPlacement: 'remnantPlacement',
  remnantStar: 'remnantStar',
  /** BUILD 2 (Part C): the per-group conatality decision and shared birth
   *  chemistry, seeded from (worldSeed, cell, parentOrdinal). Isolated so
   *  conatal science can never perturb positions - placement stays the
   *  sampler's aesthetic concern; this stream decides which groups MEAN
   *  something. Member scatter rides each member's own `metallicity` channel. */
  conatalGroup: 'conatalGroup',
  planets: 'planets',
  belts: 'belts',
  rotation: (starIndex: number) => `rotation:${starIndex}`,
  moons: (formationIndex: number) => `moons:${formationIndex}`,
  atmosphere: (formationIndex: number) => `atmosphere:${formationIndex}`,
  surfaceTemperature: (formationIndex: number) => `surfaceTemperature:${formationIndex}`,
  biosphere: (formationIndex: number) => `biosphere:${formationIndex}`,
  terraforming: (formationIndex: number) => `terraforming:${formationIndex}`,
} as const;

/** Exhaustiveness guard. Every taxonomy switch in `render` ends with this. */
export function assertNever(x: never): never {
  throw new Error(`Unhandled taxonomy value: ${JSON.stringify(x)}`);
}
