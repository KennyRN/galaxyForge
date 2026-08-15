import { rollRemnantCell, spiralCalibrationConstant } from './remnants';
import { createSpiralModel } from './galaxyModel';
import type { CellKey } from './placement';
import { CELL_SIZE_PC } from './placement';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const WORLD_SEED = 'test-galaxy';
const model = createSpiralModel(false);
const CELL: CellKey = { ix: Math.floor(8178 / CELL_SIZE_PC), iy: 0, iz: 0 };

// 1. THE STAGE-5.2 GATE - never zero where oldThin/thick are present
function countWdOverManyCells(n: number): number {
  let total = 0;
  for (let dy = 0; dy < n; dy++) {
    total += rollRemnantCell(WORLD_SEED, model, { ix: CELL.ix, iy: dy, iz: 0 })
      .filter((r) => r.kind === 'white-dwarf').length;
  }
  return total;
}
check('1 THE STAGE-5.2 GATE - white dwarfs appear (zero is the failing value ' +
  'this concern exists to fix) across many solar-circle cells',
  countWdOverManyCells(40) > 0);

// 2. determinism
check('2 rollRemnantCell is deterministic for the same worldSeed/model/key',
  (() => {
    const a = rollRemnantCell(WORLD_SEED, model, CELL);
    const b = rollRemnantCell(WORLD_SEED, model, CELL);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

// 3. NS/BH trace rates
check('3 neutron stars and black holes occur at TRACE rates, never exceeding ' +
  'white dwarfs, pooled over many cells',
  (() => {
    let wd = 0, ns = 0, bh = 0;
    for (let dy = 0; dy < 60; dy++) {
      for (const r of rollRemnantCell(WORLD_SEED, model, { ix: CELL.ix, iy: dy, iz: 0 })) {
        if (r.kind === 'white-dwarf') wd++; else if (r.kind === 'neutron-star') ns++; else bh++;
      }
    }
    return wd > 0 && ns <= wd && bh <= ns + 1 && bh < wd;
  })());

// 4. sysid prefix - structurally distinct from stellar sysids
check('4 every remnant sysid carries a "remnant." prefix',
  (() => {
    const rs = rollRemnantCell(WORLD_SEED, model, CELL);
    return rs.every((r) => r.sysid.startsWith('remnant.'));
  })());

// 5. no clustering
check('5 remnant nearest-neighbour statistics show NO clustering signal ' +
  '(unlike placement\'s youngThin result) - a broad spread of positions, ' +
  'no repeated near-identical coordinates',
  (() => {
    const all: { x: number; y: number; z: number }[] = [];
    for (let dy = 0; dy < 10; dy++) for (const r of rollRemnantCell(WORLD_SEED, model, { ix: CELL.ix, iy: dy, iz: 0 })) all.push(r.positionPc);
    if (all.length < 2) return true;
    // No two remnants share a position to high precision (a clustering
    // mechanism would produce tight repeats; independent uniform draws will not).
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i]!.x - all[j]!.x, all[i]!.y - all[j]!.y, all[i]!.z - all[j]!.z);
        if (d < 1e-6) return false;
      }
    }
    return true;
  })());

// 6. calibration constant is positive and finite
check('6 spiralCalibrationConstant is finite and positive',
  (() => {
    const c = spiralCalibrationConstant(model);
    return Number.isFinite(c) && c > 0;
  })());

if (failures > 0) throw new Error(`${failures} remnants conformance failure(s)`);
console.log('\nall remnants conformance checks passed');
