/**
 * metallicity.conformance - the 5 METALLICITY_GATES.
 */

import { rollMetallicity, METALLICITY_GATES } from './metallicity';
import { mulberry32, xmur3 } from './rng';
import { SPIRAL_POPULATIONS, R0_PC } from './galaxyModel';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const oldThin = SPIRAL_POPULATIONS.find((p) => p.key === 'spiralOldThin')!;
const halo = SPIRAL_POPULATIONS.find((p) => p.key === 'spiralHalo')!;
const seed = (s: string) => mulberry32(xmur3(s)());

/* 1. determinism -------------------------------------------------------------- */

check('rollMetallicity is deterministic for the same rng sequence and inputs', (() => {
  const a = rollMetallicity(seed('m1'), oldThin, R0_PC, 0.5);
  const b = rollMetallicity(seed('m1'), oldThin, R0_PC, 0.5);
  return a === b;
})());

/* 2. one draw ------------------------------------------------------------------ */

check('rollMetallicity consumes exactly one call to rng()', (() => {
  let calls = 0;
  const counting = () => { calls++; return 0.5; };
  rollMetallicity(counting, oldThin, R0_PC, 0.5);
  return calls === 1;
})());

/* 3. gradient applies ----------------------------------------------------------- */

check('feh varies with galactocentric radius when the population sets a gradient (oldThin)', (() => {
  const near = rollMetallicity(seed('m3'), oldThin, R0_PC, 0.5);
  const far = rollMetallicity(seed('m3'), oldThin, R0_PC * 3, 0.5);
  return near !== far;
})());

check('feh is CONSTANT in radius when the population sets no gradient (halo)', (() => {
  const near = rollMetallicity(seed('m3b'), halo, 1000, 0.5);
  const far = rollMetallicity(seed('m3b'), halo, 9000, 0.5);
  return near === far;
})());

/* 4. opposite-sign coupling ------------------------------------------------------ */

check('higher formationRank shifts feh LOWER on average, holding population/radius fixed', (() => {
  const N = 400;
  let sumLow = 0, sumHigh = 0;
  for (let i = 0; i < N; i++) {
    sumLow += rollMetallicity(seed(`m4-low-${i}`), oldThin, R0_PC, 0.1);
    sumHigh += rollMetallicity(seed(`m4-high-${i}`), oldThin, R0_PC, 0.9);
  }
  return sumHigh / N < sumLow / N;
})());

/* 5. no spike ------------------------------------------------------------------- */

check('no anomalous spike - many draws span a real spread of values, not one repeated value', (() => {
  const vals = new Set<number>();
  for (let i = 0; i < 200; i++) vals.add(rollMetallicity(seed(`m5-${i}`), oldThin, R0_PC, Math.random()));
  return vals.size > 150;
})());

check('gate count matches METALLICITY_GATES', METALLICITY_GATES === 5);

check('rollMetallicity throws on an out-of-range formationRank', (() => {
  try { rollMetallicity(seed('m7'), oldThin, R0_PC, 1.5); return false; } catch { return true; }
})());

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nmetallicity.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nmetallicity.conformance: all checks passed.');
}
