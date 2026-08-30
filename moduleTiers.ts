/**
 * moduleTiers - the single owner of Tier G/S/D module classification.
 * Ported 16 Aug 2026 from a sibling build (`galaxyforge`), whose own
 * "Amendment R" already formalises the distinction this project's
 * `galaxyParameters.ts` header only ever discussed in prose - "Tier G
 * (galaxy-shape-affecting) vs Tier S (stellar/sheet-pinned) vs Tier D
 * (display-only)" - never as a structural registry a gate could check.
 *
 * A module's tier determines what a shape break in it would cost the user
 * under a future refresh/bake/fork mechanism (this project's own
 * groundwork for that - `types.ts`'s `AuthoredOverlay.pinned`/
 * `pinnedAtGenVersion`, `render.ts`'s fence - exists; the mechanism itself
 * does not yet, matching the sibling build's own state per the 16 Aug
 * audit). Getting the CLASSIFICATION wrong now is a durability bug later,
 * so it is pinned here as a real registry, not left as prose scattered
 * across module headers where it can silently drift.
 *
 *   G - geometry & placement: which systems exist, and where. Would be
 *       PINNED under a future refresh mechanism - a shape break here means
 *       existing systems move or disappear.
 *   S - system composition: the contents of one system. Would be
 *       REFRESHABLE - regenerating one system's own sheet never moves
 *       another system or changes who exists.
 *   D - display: a view over already-decided state. Nothing moves;
 *       always current, never stale.
 *
 * This gate (R7, the sibling build's own name for it, kept for
 * traceability) asserts no module spans tiers, and specifically that the
 * `galacticDensity`/`stellarPopulation` split (this project's own analogue
 * of the sibling's `stellarDensity`/`stellarPopulation` split - same
 * concern, same boundary) keeps `densityByPopulationAtCartesian`/
 * `upsilonFor` on the G side and `pickClass` on the S side, never crossed.
 */

export type ModuleTier = 'G' | 'S' | 'D';

/**
 * Every real generator/view module this project ships. Widening this
 * union is additive; assigning a tier is mandatory - a module missing
 * from `MODULE_TIER` is invisible to any future refresh/bake/fork
 * mechanism, which is a seam in the wrong place, not a detail to fill in
 * later (this file's own gate R7 fails rather than inventing a default).
 *
 * DELIBERATELY EXCLUDED: `types`, `rng`, `mathStats`, `genVersion`,
 * `glossary` - classical/shared infrastructure with no generation role of
 * its own to tier (the same exclusion the sibling build applies to ITS
 * own `prng`/`canonicalJson`/`goldenFixture`). `render`/`vault`/`main` ARE
 * included, as Tier D - Amendment A3 exempts them from provenance
 * headers, not from tiering; they are real, gated-elsewhere view/adapter
 * modules the sibling build's own `creatorPreview`/`sheetTemplate`/
 * `atlasFormat` are the direct analogue of.
 */
export type ModuleName =
  // Tier G - geometry & placement
  | 'galaxyModel'
  | 'galaxyParameters'
  | 'spiralArms'
  | 'prugnielSimien'
  | 'galacticDensity'
  | 'placement'
  | 'starFormingComplexes'
  | 'nebulaMorphology'
  | 'conatal'
  | 'remnants'
  | 'sectorFootprint'
  // Tier S - system composition
  | 'systemConductor'
  | 'stellarPopulation'
  | 'stellarProperties'
  | 'stellarHistory'
  | 'multiplicity'
  | 'metallicity'
  | 'planets'
  | 'habitability'
  | 'belts'
  | 'moons'
  | 'atmosphere'
  | 'surfaceTemperature'
  | 'biosphere'
  | 'terraforming'
  | 'humanHabitability'
  // Tier D - display
  | 'units'
  | 'densityMap'
  | 'sectorSearch'
  | 'sky'
  | 'render'
  | 'vault'
  | 'main';

/**
 * Which tier each module sits in. This is the single owner of the
 * tiering - a module not listed here is a gate R7 failure, not a silent
 * "assume Tier D" default.
 */
export const MODULE_TIER: Readonly<Record<ModuleName, ModuleTier>> = {
  galaxyModel: 'G',
  galaxyParameters: 'G',
  spiralArms: 'G',
  prugnielSimien: 'G',
  galacticDensity: 'G',
  placement: 'G',
  starFormingComplexes: 'G',
  nebulaMorphology: 'G',   // P17 - sculpts complex-organised young star positions
  conatal: 'G',
  remnants: 'G',
  sectorFootprint: 'G',

  systemConductor: 'S',
  stellarPopulation: 'S',
  stellarProperties: 'S',
  stellarHistory: 'S',
  multiplicity: 'S',
  metallicity: 'S',
  planets: 'S',
  habitability: 'S',
  belts: 'S',
  moons: 'S',
  atmosphere: 'S',
  surfaceTemperature: 'S',
  biosphere: 'S',
  terraforming: 'S',
  humanHabitability: 'S',

  units: 'D',
  densityMap: 'D',
  sectorSearch: 'D',
  sky: 'D',
  render: 'D',
  vault: 'D',
  main: 'D',
};

export function tierOf(module: ModuleName): ModuleTier {
  return MODULE_TIER[module];
}
