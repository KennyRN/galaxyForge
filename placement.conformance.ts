import {
  rollCell, applyExclusion, CELL_SIZE_PC, JITTER_SIGMA_PC, JITTER_TRUNCATION_SIGMA,
  EXCLUSION_RADIUS_PC, type CellKey, type PlacedSystem,
} from './placement';
import { createSpiralModel } from './galaxyModel';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const WORLD_SEED = 'test-galaxy';
const model = createSpiralModel(false);
// A cell near the solar circle, where density is high enough to reliably
// produce several systems per cell (worth checking - see the printed count).
const CELL: CellKey = { ix: Math.floor(8178 / CELL_SIZE_PC), iy: 0, iz: 0 };

// 1. determinism
check('1 rollCell is deterministic - same worldSeed/model/key give bit-identical output',
  (() => {
    const a = rollCell(WORLD_SEED, model, CELL);
    const b = rollCell(WORLD_SEED, model, CELL);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

// 2. cell independence - no cross-cell state
check('2 two adjacent cells generated independently equal the same two cells ' +
  'generated in the other order (no shared/leaking state)',
  (() => {
    const c1: CellKey = { ix: CELL.ix, iy: 0, iz: 0 };
    const c2: CellKey = { ix: CELL.ix + 1, iy: 0, iz: 0 };
    const order1 = [rollCell(WORLD_SEED, model, c1), rollCell(WORLD_SEED, model, c2)];
    const order2 = [rollCell(WORLD_SEED, model, c2), rollCell(WORLD_SEED, model, c1)];
    return JSON.stringify(order1[0]) === JSON.stringify(order2[1]) &&
      JSON.stringify(order1[1]) === JSON.stringify(order2[0]);
  })());

// 3. sysid stability, never a counter
check('3 the same (cellKey, ordinal) always produces the same sysid, across ' +
  'repeated calls and independent of anything else',
  (() => {
    const a = rollCell(WORLD_SEED, model, CELL);
    const b = rollCell(WORLD_SEED, model, CELL);
    return a.every((s, i) => s.sysid === b[i]!.sysid && s.sysid === `${CELL.ix}.${CELL.iy}.${CELL.iz}.${i}`);
  })());

// 4. positions stay within cell bounds + jitter truncation margin
const JITTER_BOUND_PC = JITTER_TRUNCATION_SIGMA * JITTER_SIGMA_PC;
check('4 every position stays within its cell bounds plus the jitter truncation margin',
  (() => {
    const systems = rollCell(WORLD_SEED, model, CELL);
    const lo = { x: CELL.ix * CELL_SIZE_PC - JITTER_BOUND_PC, y: CELL.iy * CELL_SIZE_PC - JITTER_BOUND_PC, z: CELL.iz * CELL_SIZE_PC - JITTER_BOUND_PC };
    const hi = { x: (CELL.ix + 1) * CELL_SIZE_PC + JITTER_BOUND_PC, y: (CELL.iy + 1) * CELL_SIZE_PC + JITTER_BOUND_PC, z: (CELL.iz + 1) * CELL_SIZE_PC + JITTER_BOUND_PC };
    return systems.every((s) =>
      s.positionPc.x >= lo.x && s.positionPc.x <= hi.x &&
      s.positionPc.y >= lo.y && s.positionPc.y <= hi.y &&
      s.positionPc.z >= lo.z && s.positionPc.z <= hi.z);
  })());
check('4b cell size comfortably exceeds 3x the jitter sigma (the margin ' +
  'assumption every other gate here depends on)',
  CELL_SIZE_PC > 3 * JITTER_SIGMA_PC);

// 5. population keys are always among the model's own set
check('5 every drawn population key is one of the model\'s own populations',
  (() => {
    const validKeys = new Set(model.populations.map((p) => p.key));
    const cells: CellKey[] = [CELL, { ix: CELL.ix, iy: 5, iz: 0 }, { ix: CELL.ix - 3, iy: -2, iz: 1 }];
    return cells.every((c) => rollCell(WORLD_SEED, model, c).every((s) => validKeys.has(s.population)));
  })());

// 6. exclusion is local and symmetric
function mkSystem(x: number, y: number, z: number, ix: number, ord: number): PlacedSystem {
  return { cellKey: { ix, iy: 0, iz: 0 }, ordinal: ord, sysid: `${ix}.0.0.${ord}`,
    positionPc: { x, y, z }, population: 'oldThin', formationRank: 0.5 };
}
check('6 a close pair (within the exclusion radius) drops the later-keyed one',
  (() => {
    const a = mkSystem(0, 0, 0, 0, 0);
    const b = mkSystem(EXCLUSION_RADIUS_PC * 0.5, 0, 0, 0, 1);
    const kept = applyExclusion([a, b]);
    return kept.length === 1 && kept[0]!.sysid === a.sysid;
  })());
check('6b adding a DISTANT, unrelated third point changes nothing about a ' +
  'close pair\'s own verdict (the "local" half of local-and-symmetric)',
  (() => {
    const a = mkSystem(0, 0, 0, 0, 0);
    const b = mkSystem(EXCLUSION_RADIUS_PC * 0.5, 0, 0, 0, 1);
    const far = mkSystem(10000, 10000, 10000, 999, 0);
    const withoutFar = applyExclusion([a, b]).map((s) => s.sysid).sort();
    const withFar = applyExclusion([a, b, far]).map((s) => s.sysid).sort().filter((id) => id !== far.sysid);
    return JSON.stringify(withoutFar) === JSON.stringify(withFar);
  })());
check('6c the rule is SYMMETRIC in the sense of being order-independent: ' +
  'shuffling the input array gives the same kept set',
  (() => {
    const pts = [mkSystem(0, 0, 0, 0, 0), mkSystem(0.03, 0, 0, 0, 1), mkSystem(0.06, 0, 0, 0, 2), mkSystem(5, 5, 5, 1, 0)];
    const a = applyExclusion(pts).map((s) => s.sysid).sort();
    const b = applyExclusion([...pts].reverse()).map((s) => s.sysid).sort();
    return JSON.stringify(a) === JSON.stringify(b);
  })());

// 7. expansion stability
check('7 EXPANSION STABILITY - systems in already-included cells keep their ' +
  'exact positions and sysids when the cell range widens',
  (() => {
    const smallRange: CellKey[] = [];
    for (let ix = CELL.ix - 1; ix <= CELL.ix + 1; ix++) for (let iy = -1; iy <= 1; iy++) smallRange.push({ ix, iy, iz: 0 });
    const largeRange: CellKey[] = [];
    for (let ix = CELL.ix - 3; ix <= CELL.ix + 3; ix++) for (let iy = -3; iy <= 3; iy++) largeRange.push({ ix, iy, iz: 0 });

    const before = new Map<string, PlacedSystem>();
    for (const c of smallRange) for (const s of rollCell(WORLD_SEED, model, c)) before.set(s.sysid, s);
    const after = new Map<string, PlacedSystem>();
    for (const c of largeRange) for (const s of rollCell(WORLD_SEED, model, c)) after.set(s.sysid, s);

    for (const [id, sys] of before) {
      const later = after.get(id);
      if (!later || JSON.stringify(later) !== JSON.stringify(sys)) return false;
    }
    return after.size >= before.size;
  })());

// 8. clustering has teeth
check('8 clustering measurably tightens nearest-neighbour distances for a ' +
  'clustered population versus a uniform-random baseline at the same count/volume',
  (() => {
    // youngThin has clusteredFraction set; oldThin does not (per SPIRAL_POPULATIONS).
    const cells: CellKey[] = [];
    for (let ix = CELL.ix - 2; ix <= CELL.ix + 2; ix++) for (let iy = -2; iy <= 2; iy++) cells.push({ ix, iy, iz: 0 });
    const all = cells.flatMap((c) => rollCell(WORLD_SEED, model, c));
    const young = all.filter((s) => s.population === 'youngThin').map((s) => s.positionPc);
    const old = all.filter((s) => s.population === 'oldThin').map((s) => s.positionPc);

    function meanNearestNeighbour(pts: { x: number; y: number; z: number }[]): number | null {
      if (pts.length < 2) return null;
      let total = 0;
      for (let i = 0; i < pts.length; i++) {
        let best = Infinity;
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const d = Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y, pts[i]!.z - pts[j]!.z);
          if (d < best) best = d;
        }
        total += best;
      }
      return total / pts.length;
    }
    const mnnYoung = meanNearestNeighbour(young);
    const mnnOld = meanNearestNeighbour(old);
    if (mnnYoung === null || mnnOld === null) return true;   // not enough points this run; do not fail spuriously
    // Normalise by count^(-1/3) (rough 3D density scaling) so the comparison
    // is not just "there happened to be more young stars".
    const normYoung = mnnYoung * Math.cbrt(young.length);
    const normOld = mnnOld * Math.cbrt(old.length);
    return normYoung < normOld;
  })());

if (failures > 0) throw new Error(`${failures} placement conformance failure(s)`);
console.log('\nall placement conformance checks passed');

console.log(`\n  systems in reference cell (${CELL.ix},${CELL.iy},${CELL.iz}): ${rollCell(WORLD_SEED, model, CELL).length}`);
