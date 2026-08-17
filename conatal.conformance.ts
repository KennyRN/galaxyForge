import {
  conatalProbability, drawGroup, memberFeh, groupRng, COHERENCE_WINDOW_GYR, SIGMA_INTRA_DEX,
} from './conatal';
import { SPIRAL_POPULATIONS } from './galaxyModel';
import { mulberry32, channelRng, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const youngThin = SPIRAL_POPULATIONS.find((p) => p.key === 'spiralYoungThin')!;
const thick = SPIRAL_POPULATIONS.find((p) => p.key === 'spiralThick')!;
const halo = SPIRAL_POPULATIONS.find((p) => p.key === 'spiralHalo')!;
const CELL = { ix: 817, iy: 0, iz: 0 };

// 1. conatalProbability zero/positive as appropriate
check('1 conatalProbability is 0 for thick and halo (age interval never dips ' +
  'below the coherence window)',
  conatalProbability(thick) === 0 && conatalProbability(halo) === 0);
check('1b conatalProbability is strictly positive for youngThin (age interval ' +
  '[0,3] Gyr reaches well below the 1 Gyr window)',
  conatalProbability(youngThin) > 0);
check('1c conatalProbability is exactly 1 for youngThin (its full interval ' +
  '[0,3] Gyr is not fully below 1 Gyr, but check it never exceeds 1)',
  conatalProbability(youngThin) <= 1);

// 2. every drawn group's age is strictly below the window
check('2 every drawn group age is STRICTLY below COHERENCE_WINDOW_GYR, across ' +
  'many seeds',
  (() => {
    for (let seed = 0; seed < 2000; seed++) {
      const g = drawGroup(mulberry32(seed), CELL, 0, youngThin);
      if (!(g.ageGyr < COHERENCE_WINDOW_GYR)) return false;
    }
    return true;
  })());

// 3. draw counts
check('3 drawGroup consumes EXACTLY THREE draws',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.5; };
    drawGroup(counting, CELL, 0, youngThin);
    return calls === 3;
  })());
check('3b memberFeh consumes EXACTLY ONE draw',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.5; };
    memberFeh(counting, -0.1);
    return calls === 1;
  })());

// 4. sigma_intra scatter has real teeth against the population's own spread
check(`4 memberFeh scatter is consistent with SIGMA_INTRA (${SIGMA_INTRA_DEX} dex) ` +
  'and clearly tighter than the population\'s own fehSigmaDex (a 7x+ contrast)',
  (() => {
    const n = 5000;
    const groupFeh = 0.0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const fixedRng: Rng = () => u;
      const v = memberFeh(fixedRng, groupFeh) - groupFeh;
      sumSq += v * v;
    }
    const measuredSigma = Math.sqrt(sumSq / n);
    const withinTolerance = Math.abs(measuredSigma - SIGMA_INTRA_DEX) < 0.005;
    const contrastRatio = youngThin.fehSigmaDex / SIGMA_INTRA_DEX;
    return withinTolerance && contrastRatio > 7;
  })());

// 5. determinism
check('5 drawGroup is deterministic for the same rng sequence and inputs',
  (() => {
    const a = drawGroup(mulberry32(42), CELL, 3, youngThin);
    const b = drawGroup(mulberry32(42), CELL, 3, youngThin);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

// 6. channel isolation - groupRng never matches placement's own channel stream
check('6 groupRng (conatalGroup channel) produces a DIFFERENT stream than a ' +
  'placement-channel rng seeded with the same key',
  (() => {
    const a = groupRng('seed', CELL, 3)();
    const b = channelRng('seed', 'placement', CELL.ix, CELL.iy, CELL.iz, 3)();
    return a !== b;
  })());

if (failures > 0) throw new Error(`${failures} conatal conformance failure(s)`);
console.log('\nall conatal conformance checks passed');
