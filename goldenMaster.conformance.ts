/**
 * goldenMaster - the Stage 10 fixture (S6.3). Self-bootstrapping: run once
 * with no `verification/golden/gen{N}.json` present and it CUTS the
 * fixture (writes it, passes); run again against an existing fixture and
 * it VERIFIES byte-identical regeneration plus expansion stability,
 * failing loudly on any drift.
 *
 * -- SCOPE, WIDENED 16 Aug 2026 (an audit finding: this suite covered only
 * ONE morphology and two stages, despite `systemConductor.ts` existing
 * since the previous day) --------------------------------------------------
 * Now covers all FOUR morphologies (spiral, barredSpiral, elliptical,
 * lenticular) and THREE stages per morphology: `placement` (positions,
 * sysid, population, formationRank), `remnants` (the additive remnant
 * layer), and a FULL `SystemCore` hash - `systemConductor.generateSystemCore`
 * run on a capped sample of the reference range's placed systems (stars,
 * planets, atmospheres, biospheres, habitability - everything). Per-stage
 * hashing throughout (S6.3: "when a future change breaks the master, a
 * per-stage set tells you WHICH concern moved").
 *
 * CANONICAL NUMBER FORMATTING (16 Aug 2026, an audit finding): `JSON.
 * stringify` on a `number` can differ in REPRESENTATION for
 * bit-identical values across platforms/engine versions (e.g. `1e-7` vs
 * `0.0000001`), which would make this fixture drift for a reason that has
 * nothing to do with the generator changing. `canonicalStringify` now
 * fixes every number to 12 significant figures before hashing - enough
 * precision that no REAL regression is masked (every gate elsewhere in
 * this project that cares about tighter precision, e.g. spiralArms'
 * mean-preservation check, asserts that directly against the live
 * function, not through this fixture), while removing representation
 * noise as a false-positive source.
 */

import { rollCell, type CellKey, type PlacedSystem } from './placement';
import { rollRemnantCell } from './remnants';
import { createSpiralModel, createEllipticalModel, createLenticularModel, type GalaxyModel, type Population, type PopulationKey } from './galaxyModel';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { xmur3 } from './rng';
import { CURRENT_GEN_VERSION } from './genVersion';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

/**
 * Canonical JSON: recursively sorted object keys (content, not
 * construction/insertion order, S6.3's own requirement) AND every number
 * fixed to 12 significant figures (16 Aug 2026 - see this file's own
 * header on why).
 */
function canonicalNumber(n: number): string {
  if (!Number.isFinite(n)) return JSON.stringify(n);   // NaN/Infinity: JSON.stringify's own behaviour is fine, they are not the drift risk
  if (n === 0) return '0';
  return n.toPrecision(12);
}
function canonicalStringify(value: unknown): string {
  if (typeof value === 'number') return canonicalNumber(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    // Keys with an `undefined` value are DROPPED, matching JSON.stringify's
    // own behaviour (16 Aug 2026 fix) - a freshly-generated object that
    // explicitly sets an optional field to `undefined` (e.g.
    // `SystemContext.conatalGroupId` for a field system) would otherwise
    // canonicalise DIFFERENTLY from that same object after a round trip
    // through the stored JSON fixture (which never had the key at all,
    // since JSON drops undefined-valued properties on write) - a spurious
    // mismatch with nothing wrong, not a real regression.
    const keys = Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashOf(value: unknown): string {
  return xmur3(canonicalStringify(value))().toString(16);
}

const WORLD_SEED = 'golden-master-reference-seed-v1';
const CONST_UPSILON = 0.7;   // a fixed, plausible stand-in - this fixture does not test upsilonFor's own value
const upsilonFor = (_p: Population) => CONST_UPSILON;
const TERRAFORM_SCALE = 3;
const TERRAFORM_INTENSITY = 3;   // paired with TERRAFORM_SCALE, 16 Aug 2026

interface MorphologyFixture {
  readonly name: string;
  readonly model: GalaxyModel;
  readonly referenceCells: CellKey[];
  readonly expandedCells: CellKey[];
}

// Spiral/barredSpiral are anchored near the solar circle (R0=8178 pc,
// ix~816-819 at CELL_SIZE_PC=10). Elliptical/lenticular are centrally
// CUSPED (Hernquist/Prugniel-Simien profiles diverge toward the origin,
// only floored at CORE_FLOOR_PC=10 pc) - a reference range actually AT the
// origin was tried and measured to produce a multi-megabyte fixture
// (LAMBDA_MAX-saturated cells, thousands of systems in a 12-cell block),
// which is both impractical to commit and not what this gate is for. Their
// own reference range instead sits at a moderate radius (~500-530 pc,
// ix=50-53) - comfortably past the extreme cusp, same order of magnitude
// density as the spiral's own reference block, and the same radius
// `galaxyModel.conformance.ts`'s own PROBES array already exercises for
// these two morphologies.
// Cell blocks kept DELIBERATELY small (16 Aug 2026) - the genuine two-level
// Thomas process (placement.ts, this same version bump) means a clustered
// population's offspring are ADDITIONAL to its parent count, not a
// redistribution of a fixed total, so cell system counts are legitimately
// much higher than the pre-bump fixture's own reference blocks assumed. A
// 4x3-cell block at these densities was measured to produce tens of
// thousands of systems and a >15 MB fixture - correct output, wrong
// instrument: this gate is a regression tripwire, not a scale test
// (systemConductor.conformance.ts's own 200-system sweep and
// sectorFootprint.conformance.ts's own dedicated gates already cover
// correctness at realistic scale).
const MORPHOLOGIES: MorphologyFixture[] = [
  {
    name: 'spiral', model: createSpiralModel(false),
    referenceCells: cellRange(817, 817, 0, 0), expandedCells: cellRange(815, 820, -2, 2),
  },
  {
    name: 'barredSpiral', model: createSpiralModel(true),
    // Inside taperOuterPc=5800 pc (ix=417 -> R~4170 pc) so the bar's own
    // factor is genuinely != 1 here - the same reference cell as spiral
    // would sit outside the bar entirely (barFactor=1, densityByPopulation
    // bit-identical to unbarred, so the fixture would silently test
    // nothing bar-specific).
    referenceCells: cellRange(417, 417, 0, 0), expandedCells: cellRange(415, 420, -2, 2),
  },
  {
    // A much smaller test mass than a realistic elliptical (5e11 Msun) -
    // this fixture is a regression tripwire on the WIRING, not a scale
    // test, and a smaller mass keeps the reference cell's system count
    // small without changing which code paths run.
    name: 'elliptical', model: createEllipticalModel(2e9, upsilonFor),
    referenceCells: cellRange(50, 50, 0, 0), expandedCells: cellRange(48, 53, -2, 2),
  },
  {
    name: 'lenticular', model: createLenticularModel(2e8, upsilonFor),
    referenceCells: cellRange(50, 50, 0, 0), expandedCells: cellRange(48, 53, -2, 2),
  },
];

function cellRange(ixLo: number, ixHi: number, iyLo: number, iyHi: number): CellKey[] {
  const out: CellKey[] = [];
  for (let ix = ixLo; ix <= ixHi; ix++) for (let iy = iyLo; iy <= iyHi; iy++) out.push({ ix, iy, iz: 0 });
  return out;
}

function generatePlacement(model: GalaxyModel, cells: CellKey[]) { return cells.map((c) => rollCell(WORLD_SEED, model, c)); }
function generateRemnants(model: GalaxyModel, cells: CellKey[]) { return cells.map((c) => rollRemnantCell(WORLD_SEED, model, c)); }

/** Full SystemCore for a CAPPED sample of placed systems - unbounded would
 *  make this fixture's own runtime scale with cell density, which is not
 *  what this gate is for (systemConductor.conformance.ts already exercises
 *  200 varied systems for correctness; this fixture is a REGRESSION
 *  tripwire on the composed pipeline, not a second correctness suite). */
const SYSTEM_CORE_SAMPLE_CAP = 12;

function findPop(model: GalaxyModel, key: PopulationKey): Population {
  const p = model.populations.find((pp) => pp.key === key);
  if (!p) throw new Error(`goldenMaster: population "${key}" not found on this model`);
  return p;
}

function generateSystemCoreSample(model: GalaxyModel, placed: readonly PlacedSystem[][]) {
  const flat = placed.flat().slice(0, SYSTEM_CORE_SAMPLE_CAP);
  return flat.map((s) => {
    const inputs: GenerateSystemInputs = {
      sysid: s.sysid, genVersion: CURRENT_GEN_VERSION, worldSeed: WORLD_SEED,
      positionPc: s.positionPc, population: s.population, populationMeta: findPop(model, s.population),
      formationRank: s.formationRank, terraformScale: TERRAFORM_SCALE, terraformIntensity: TERRAFORM_INTENSITY,
    };
    return generateSystemCore(inputs);
  });
}

interface StageHashes {
  readonly placement: string;
  readonly remnants: string;
  readonly systemCore: string;
}

const fixtureData: Record<string, {
  placementData: PlacedSystem[][];
  remnantData: ReturnType<typeof generateRemnants>;
  systemCoreData: ReturnType<typeof generateSystemCoreSample>;
}> = {};
const hashes: { genVersion: number; byMorphology: Record<string, StageHashes> } = {
  genVersion: CURRENT_GEN_VERSION, byMorphology: {},
};

for (const m of MORPHOLOGIES) {
  const placementData = generatePlacement(m.model, m.referenceCells);
  const remnantData = generateRemnants(m.model, m.referenceCells);
  const systemCoreData = generateSystemCoreSample(m.model, placementData);
  fixtureData[m.name] = { placementData, remnantData, systemCoreData };
  hashes.byMorphology[m.name] = {
    placement: hashOf(placementData),
    remnants: hashOf(remnantData),
    systemCore: hashOf(systemCoreData),
  };
}

// Reach OUT of the ephemeral .gate-tmp/build staging area (wiped every run)
// into the real project's verification/golden/ - the fixture must persist
// across runs to mean anything.
const GOLDEN_DIR = path.join(__dirname, '..', '..', 'verification', 'golden');
const GOLDEN_PATH = path.join(GOLDEN_DIR, `gen${CURRENT_GEN_VERSION}.json`);

if (!fs.existsSync(GOLDEN_PATH)) {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  fs.writeFileSync(GOLDEN_PATH, JSON.stringify({ hashes, fixtureData }, null, 2));
  console.log(`CUT golden master: ${GOLDEN_PATH}`);
  console.log(`  hashes: ${JSON.stringify(hashes)}`);
  console.log('  (this run PASSES by cutting the fixture; the NEXT run verifies against it)');
} else {
  const stored = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));

  check('1 stored fixture genVersion matches CURRENT_GEN_VERSION (a version ' +
    'bump with no re-cut fixture is caught here, not silently)',
    stored.hashes.genVersion === CURRENT_GEN_VERSION);

  for (const m of MORPHOLOGIES) {
    const storedHashes = stored.hashes.byMorphology[m.name];
    const storedData = stored.fixtureData[m.name];
    const liveHashes = hashes.byMorphology[m.name]!;
    const liveData = fixtureData[m.name]!;

    check(`2 [${m.name}] placement hash matches the stored golden master EXACTLY`,
      liveHashes.placement === storedHashes?.placement);
    check(`3 [${m.name}] remnants hash matches the stored golden master EXACTLY`,
      liveHashes.remnants === storedHashes?.remnants);
    check(`3c [${m.name}] full SystemCore hash matches the stored golden master EXACTLY ` +
      '(stars, planets, atmospheres, biospheres, habitability - the composed pipeline, not just placement)',
      liveHashes.systemCore === storedHashes?.systemCore);
    check(`4 [${m.name}] the full placement data is byte-identical to the stored fixture ` +
      '(not just the hash - a hash collision would slip past checks 2/3 alone)',
      canonicalStringify(liveData.placementData) === canonicalStringify(storedData?.placementData));
    check(`4b [${m.name}] the full remnants data is byte-identical to the stored fixture`,
      canonicalStringify(liveData.remnantData) === canonicalStringify(storedData?.remnantData));
    check(`4c [${m.name}] the full SystemCore sample is byte-identical to the stored fixture`,
      canonicalStringify(liveData.systemCoreData) === canonicalStringify(storedData?.systemCoreData));

    // 5. EXPANSION STABILITY - regenerate over the EXPANDED range and
    // confirm every system that was in the reference range keeps its
    // exact sysid/position/population/formationRank.
    const expandedPlacement = generatePlacement(m.model, m.expandedCells).flat();
    const expandedBySysid = new Map(expandedPlacement.map((s) => [s.sysid, s]));
    const referenceFlat = liveData.placementData.flat();
    check(`5 [${m.name}] EXPANSION STABILITY - every system in the reference cell ` +
      'range keeps its exact position, population and formationRank when the cell range widens around it',
      referenceFlat.every((s) => {
        const found = expandedBySysid.get(s.sysid);
        return found !== undefined && canonicalStringify(found) === canonicalStringify(s);
      }));
  }
}

if (failures > 0) throw new Error(`${failures} goldenMaster conformance failure(s)`);
console.log('\nall goldenMaster conformance checks passed');
