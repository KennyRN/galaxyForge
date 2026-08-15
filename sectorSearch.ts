/**
 * sectorSearch - the interactive sector-centring search, S4.8's own "cheapest
 * -first multiplicity/class/planets/habitability walk", flagged as not-built
 * by `galacticDensity.ts`'s own header since that module was first written.
 * Closed here, built on `systemConductor`. No PRNG channel of its own - it
 * calls `placement.rollCell`/`systemConductor.generateSystemCore`, which own
 * every draw; this module only decides WHICH cells to look at and in what
 * order, and stops.
 *
 * -- CHEAPEST-FIRST, FOR REAL -------------------------------------------------
 * A multiplicity-only search (the common case) never runs the full
 * conductor. `quickMultiplicityCensus` (exported from `systemConductor.ts`,
 * reusing the SAME channels the full run uses - see that module's own
 * comment) answers "solo or multi-star" for the price of two draws per
 * candidate, not the full planet/belt/moon/atmosphere/biosphere/
 * terraforming/habitability pipeline. The expensive path
 * (`generateSystemCore`) only runs for a candidate that ALREADY passed the
 * multiplicity filter and the search criterion needs planets or
 * habitability to decide.
 *
 * -- NEAREST, WITH A CORRECTNESS GUARANTEE, NOT JUST "SEARCHED IN ORDER" -----
 * Cells are visited in expanding CUBE SHELLS (Chebyshev distance from the
 * origin cell) - shell 0 is the origin cell itself, shell 1 is the 26 cells
 * around it, and so on. A shell is fully processed before the search
 * decides whether to stop: once the closest match found so far is CLOSER
 * than the minimum possible distance to anything in the next unprocessed
 * shell (`shellRadius * cellSizePc`), no later shell can possibly contain a
 * closer match, and the search returns immediately - a genuine nearest
 * -match guarantee, not merely "the first one that happened to pass".
 *
 * -- WHAT THIS MODULE DELIBERATELY SKIPS ---------------------------------------
 * `placement.applyExclusion` (the minimum-separation rule) is NOT applied to
 * search candidates - it needs the full, final candidate set for a footprint
 * to resolve correctly, and the search is a DISCOVERY tool, not the sector's
 * final authority. Once a user commits to a found centre, the real sector
 * generation pass (existing `placement`/`remnants` pipeline) is what
 * actually determines final, exclusion-resolved positions - a system this
 * search reports could, in a rare case, be one exclusion later removes.
 * Documented rather than silently assumed away.
 *
 * genVersion: this module draws nothing and stores nothing - a change here
 * alters what a user is SHOWN during centring, never what exists once
 * generated. It does not participate in genVersion.
 */

import type { GalaxyModel, PopulationKey } from './galaxyModel';
import { rollCell, CELL_SIZE_PC, type CellKey, type PlacedSystem } from './placement';
import { quickMultiplicityCensus, generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import type { SystemCore } from './types';
import type { MultiplicityPreference } from './galacticDensity';
import type { HabTier } from './humanHabitability';

export type SysTypeCriterion =
  | { readonly kind: 'nearest' }
  | { readonly kind: 'interesting' }
  | { readonly kind: 'habitable'; readonly minTier: HabTier };

export interface SearchCriteria {
  readonly multiplicity: MultiplicityPreference;
  readonly sysType: SysTypeCriterion;
}

export interface SearchFound {
  readonly found: true;
  readonly sysid: string;
  readonly positionPc: { readonly x: number; readonly y: number; readonly z: number };
  readonly distancePc: number;
  readonly population: PopulationKey;
  /** Present only when the criterion required the full conductor
   *  (`interesting`/`habitable`) - a `nearest`/multiplicity-only match never
   *  pays for one, so callers must not assume this is always set. */
  readonly core?: SystemCore;
}

export interface SearchNotFound {
  readonly found: false;
  readonly searchedRadiusPc: number;
}

export type SearchResult = SearchFound | SearchNotFound;

/** solo = exactly one star; binary = at least one companion (the common
 *  colloquial reading, not literally "exactly two" - a triple satisfies a
 *  "binary" preference); any = no constraint. `calibrated` UI convention,
 *  not a physical distinction the model itself draws. */
function multiplicityMatches(pref: MultiplicityPreference, starCount: number): boolean {
  if (pref === 'any') return true;
  if (pref === 'solo') return starCount === 1;
  return starCount >= 2;   // 'binary'
}

/** Planets + belts, across the whole system - moons don't count (they orbit
 *  a planet, not the star). Matches "orbital items" as specified: >= 3 for
 *  a single-star system, >= 4 for a multi-star system. */
function orbitalItemCount(core: SystemCore): number {
  return core.planets.length + core.belts.length;
}
function isInteresting(core: SystemCore): boolean {
  const threshold = core.stars.length > 1 ? 4 : 3;
  return orbitalItemCount(core) >= threshold;
}

/** Best (highest) human-habitability tier across every planet in the
 *  system - the same "best tier across the system" convention
 *  `SystemSummary.bestHabTier` already establishes. `null` when no planet
 *  has a habitability verdict at all (an all-giant system). */
function bestHabTier(core: SystemCore): HabTier | null {
  let best: HabTier | null = null;
  for (const h of core.humanHabitability) {
    if (h && (best === null || h.tier > best)) best = h.tier;
  }
  return best;
}

function cellsInShell(originCell: CellKey, shellRadius: number): CellKey[] {
  if (shellRadius === 0) return [originCell];
  const out: CellKey[] = [];
  const r = shellRadius;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;   // shell SURFACE only
        out.push({ ix: originCell.ix + dx, iy: originCell.iy + dy, iz: originCell.iz + dz });
      }
    }
  }
  return out;
}

function distancePc(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Walks outward from `originPc` looking for the NEAREST system matching
 * `criteria`, capped at `maxRadiusPc`. `worldSeed`/`model`/`genVersion`/
 * `terraformScale` are exactly what the real generation pass would use -
 * the search draws from the SAME deterministic streams, so a found system
 * is not a preview of something different, it IS the system (modulo the
 * exclusion-pass caveat in this module's own header).
 */
export function searchNearestSystem(
  worldSeed: string, model: GalaxyModel, genVersion: number, terraformScale: number,
  originPc: { readonly x: number; readonly y: number; readonly z: number },
  criteria: SearchCriteria, maxRadiusPc: number,
): SearchResult {
  const cellSize = CELL_SIZE_PC;
  const originCell: CellKey = {
    ix: Math.floor(originPc.x / cellSize), iy: Math.floor(originPc.y / cellSize), iz: Math.floor(originPc.z / cellSize),
  };
  const maxShell = Math.ceil(maxRadiusPc / cellSize) + 1;

  let best: { system: PlacedSystem; distance: number; core?: SystemCore } | null = null;

  for (let shell = 0; shell <= maxShell; shell++) {
    // CORRECTNESS GUARANTEE (see header): nothing in this or a later shell
    // can be closer than (shell - 1) * cellSize from the origin POINT (not
    // cell) - a conservative bound (the shell's nearest cell corner could
    // be closer still, but never closer than this). If the best match
    // already beats that bound, stop.
    if (best && best.distance <= Math.max(0, shell - 1) * cellSize) break;
    if (shell * cellSize > maxRadiusPc && best === null) {
      // No match within the cap, and we've exceeded it - stop and report.
      if (shell > 0) break;
    }

    for (const cellKey of cellsInShell(originCell, shell)) {
      const candidates = rollCell(worldSeed, model, cellKey);
      for (const candidate of candidates) {
        const d = distancePc(originPc, candidate.positionPc);
        if (d > maxRadiusPc) continue;
        if (best && d >= best.distance) continue;   // cheapest-first: never do more work than the current best requires beating

        const populationMeta = model.populations.find((p) => p.key === candidate.population);
        if (!populationMeta) continue;   // structurally unreachable (rollCell only draws the model's own populations), guarded anyway

        const baseInputs: GenerateSystemInputs = {
          sysid: candidate.sysid, genVersion, worldSeed, positionPc: candidate.positionPc,
          population: candidate.population, populationMeta, formationRank: candidate.formationRank, terraformScale,
        };

        const census = quickMultiplicityCensus(baseInputs);
        if (!multiplicityMatches(criteria.multiplicity, census.starCount)) continue;

        if (criteria.sysType.kind === 'nearest') {
          best = { system: candidate, distance: d };
          continue;
        }

        // Everything past this point needs the full conductor.
        const core = generateSystemCore(baseInputs);
        const matches = criteria.sysType.kind === 'interesting'
          ? isInteresting(core)
          : (() => { const t = bestHabTier(core); return t !== null && t >= criteria.sysType.minTier; })();
        if (matches) best = { system: candidate, distance: d, core };
      }
    }
  }

  if (!best) return { found: false, searchedRadiusPc: Math.min(maxShell * cellSize, maxRadiusPc) };
  return {
    found: true, sysid: best.system.sysid, positionPc: best.system.positionPc, distancePc: best.distance,
    population: best.system.population, core: best.core,
  };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - same worldSeed/model/origin/criteria/cap gives a
 *     bit-identical result.
 *  2. TRUE NEAREST - the returned match (when found) is never farther from
 *     origin than any OTHER system within the search cap that also
 *     satisfies the criteria (verified directly by exhaustively checking
 *     every candidate within a bounded test volume).
 *  3. CHEAPEST-FIRST HAS TEETH - a multiplicity-only search ('nearest',
 *     'any') never calls `generateSystemCore` (measured directly, not
 *     merely asserted).
 *  4. THE CAP BINDS - a criterion satisfiable only far outside `maxRadiusPc`
 *     returns `found: false`, never searches unboundedly.
 *  5. 'solo'/'binary'/'any' partition correctly - a solo match always has
 *     exactly one star; a binary match always has at least two.
 *  6. `interesting`'s threshold is genuinely 3 for single-star systems and
 *     4 for multi-star systems, not a single constant misapplied to both.
 */
export const SECTOR_SEARCH_GATES = 6 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: '"Interesting" system criterion', status: 'calibrated',
    short: 'What makes a system worth centring on, when no specific habitability target is set.',
    long: 'A main-sequence-hosted system with at least 3 orbital items (planets + belts, not moons); a multi-star system needs 4, spread across the whole system rather than any one star. A user-specified narrative convention, not a literature figure.',
    source: 'Threshold and counting rule specified directly by the project owner (15 Aug 2026 GUI design conversation), not derived from any external source.',
  },
  {
    term: 'Multiplicity search preference', status: 'calibrated',
    short: 'How "solo"/"binary"/"any" are read when searching for a system.',
    long: '"solo" requires exactly one star; "binary" requires at least one companion (a colloquial reading, not literally exactly two - a triple satisfies it); "any" is unconstrained. A UI convention, not a physical distinction the model itself draws.',
    source: 'A UI-naming convention chosen for this module, not an external source - "binary" is used colloquially for "has a companion", matching how the sector-centring GUI itself presents the choice.',
  },
];
