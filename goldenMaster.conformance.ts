/**
 * goldenMaster - the Stage 10 fixture (S6.3). Self-bootstrapping: run once
 * with no `verification/golden/gen{N}.json` present and it CUTS the fixture
 * (writes it, passes); run again against an existing fixture and it
 * VERIFIES byte-identical regeneration plus expansion stability, failing
 * loudly on any drift.
 *
 * -- SCOPE, stated honestly -----------------------------------------------------
 * This covers what actually composes into a deterministic, wired-together
 * pipeline today: `placement` (positions, sysid, population, formationRank)
 * and `remnants` (the additive remnant layer), for a fixed
 * `(worldSeed, galaxyConfig, cell range)`. It does NOT cover a full
 * `SystemCore` (stars, planets, atmospheres, biospheres) - that needs a
 * single conductor function threading `ctx.age`/`ctx.feh` from `placement`
 * through `stellarPopulation.pickClass`, `multiplicity.rollStarCount`,
 * `planets.rollPlanets`, `atmosphere.rollAtmosphere` and
 * `biosphere.rollBiosphere` per system - which does not exist yet (the same
 * gap `galacticDensity.ts`'s own header already flags for the interactive
 * sector-centring search). Recorded here rather than faked with a partial
 * fixture that silently covers less than it claims to.
 *
 * Per-stage hashing (S6.3: "when a future change breaks the master, a
 * per-stage set tells you WHICH concern moved") - `placement` and
 * `remnants` are hashed SEPARATELY, not pooled into one hash.
 */

import { rollCell, type CellKey } from './placement';
import { rollRemnantCell } from './remnants';
import { createSpiralModel } from './galaxyModel';
import { xmur3 } from './rng';
import { CURRENT_GEN_VERSION } from './genVersion';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

/** Canonical JSON: recursively sorted object keys, so the hash tracks
 *  content, not construction/insertion order (S6.3's own requirement). */
function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashOf(value: unknown): string {
  return xmur3(canonicalStringify(value))().toString(16);
}

const WORLD_SEED = 'golden-master-reference-seed-v1';
const model = createSpiralModel(false);

// A small, fixed cell range - enough to exercise clustering and a handful
// of systems per cell without making the fixture unwieldy.
const REFERENCE_CELLS: CellKey[] = [];
for (let ix = 816; ix <= 819; ix++) for (let iy = -1; iy <= 1; iy++) REFERENCE_CELLS.push({ ix, iy, iz: 0 });

// An EXPANDED range, strictly containing the reference range, for the
// expansion-stability check (S6.3: "a sector regenerated after footprint
// expansion keeps every previously generated system unchanged").
const EXPANDED_CELLS: CellKey[] = [];
for (let ix = 814; ix <= 821; ix++) for (let iy = -3; iy <= 3; iy++) EXPANDED_CELLS.push({ ix, iy, iz: 0 });

function generatePlacement(cells: CellKey[]) { return cells.map((c) => rollCell(WORLD_SEED, model, c)); }
function generateRemnants(cells: CellKey[]) { return cells.map((c) => rollRemnantCell(WORLD_SEED, model, c)); }

const placementData = generatePlacement(REFERENCE_CELLS);
const remnantData = generateRemnants(REFERENCE_CELLS);

const hashes = {
  genVersion: CURRENT_GEN_VERSION,
  placement: hashOf(placementData),
  remnants: hashOf(remnantData),
};

// Reach OUT of the ephemeral .gate-tmp/build staging area (wiped every run)
// into the real project's verification/golden/ - the fixture must persist
// across runs to mean anything.
const GOLDEN_DIR = path.join(__dirname, '..', '..', 'verification', 'golden');
const GOLDEN_PATH = path.join(GOLDEN_DIR, `gen${CURRENT_GEN_VERSION}.json`);

if (!fs.existsSync(GOLDEN_PATH)) {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  fs.writeFileSync(GOLDEN_PATH, JSON.stringify({ hashes, placementData, remnantData }, null, 2));
  console.log(`CUT golden master: ${GOLDEN_PATH}`);
  console.log(`  hashes: ${JSON.stringify(hashes)}`);
  console.log('  (this run PASSES by cutting the fixture; the NEXT run verifies against it)');
} else {
  const stored = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));

  check('1 stored fixture genVersion matches CURRENT_GEN_VERSION (a version ' +
    'bump with no re-cut fixture is caught here, not silently)',
    stored.hashes.genVersion === CURRENT_GEN_VERSION);
  check('2 placement hash matches the stored golden master EXACTLY',
    hashes.placement === stored.hashes.placement);
  check('3 remnants hash matches the stored golden master EXACTLY',
    hashes.remnants === stored.hashes.remnants);
  check('4 the full placement data is byte-identical to the stored fixture ' +
    '(not just the hash - a hash collision would slip past checks 2/3 alone)',
    canonicalStringify(placementData) === canonicalStringify(stored.placementData));
  check('4b the full remnants data is byte-identical to the stored fixture',
    canonicalStringify(remnantData) === canonicalStringify(stored.remnantData));

  // 5. EXPANSION STABILITY - regenerate over the EXPANDED range and confirm
  // every system that was in the reference range keeps its exact
  // sysid/position/population/formationRank.
  const expandedPlacement = generatePlacement(EXPANDED_CELLS).flat();
  const expandedBySysid = new Map(expandedPlacement.map((s) => [s.sysid, s]));
  const referenceFlat = placementData.flat();
  check('5 EXPANSION STABILITY - every system in the reference cell range ' +
    'keeps its exact position, population and formationRank when the cell ' +
    'range widens around it',
    referenceFlat.every((s) => {
      const found = expandedBySysid.get(s.sysid);
      return found !== undefined && canonicalStringify(found) === canonicalStringify(s);
    }));
}

if (failures > 0) throw new Error(`${failures} goldenMaster conformance failure(s)`);
console.log('\nall goldenMaster conformance checks passed');
