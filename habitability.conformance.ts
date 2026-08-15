import { habitableZoneAu, galacticHabitabilityScore } from './habitability';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// 1. HZ monotonicity
check('1 HZ inner and outer both increase with luminosity',
  (() => {
    const Ls = [0.1, 0.5, 1.0, 2.0, 5.0];
    const hz = Ls.map((l) => habitableZoneAu(l));
    return hz.every((h, i) => i === 0 || (h.inner > hz[i - 1]!.inner && h.outer > hz[i - 1]!.outer));
  })());
check('1b inner is always less than outer', [0.01, 0.5, 1, 10].every((l) => habitableZoneAu(l).inner < habitableZoneAu(l).outer));

// 2. GHZ shape
check('2 galacticHabitabilityScore peaks at the reference radius and midplane',
  (() => {
    const peak = galacticHabitabilityScore(8000, 0);
    return peak > galacticHabitabilityScore(4000, 0) && peak > galacticHabitabilityScore(15000, 0) &&
      peak > galacticHabitabilityScore(8000, 2000);
  })());
check('2b GHZ score is monotonically decreasing in |r - peak|',
  (() => {
    const rs = [8000, 9000, 11000, 15000, 20000];
    const scores = rs.map((r) => galacticHabitabilityScore(r, 0));
    return scores.every((s, i) => i === 0 || s < scores[i - 1]!);
  })());
check('2c GHZ score is monotonically decreasing in |z|',
  (() => {
    const zs = [0, 200, 500, 1000, 3000];
    const scores = zs.map((z) => galacticHabitabilityScore(8000, z));
    return scores.every((s, i) => i === 0 || s < scores[i - 1]!);
  })());
check('2d GHZ score always stays in [0, 1]',
  (() => {
    for (let r = 0; r <= 30000; r += 1000) {
      for (let z = -3000; z <= 3000; z += 500) {
        const s = galacticHabitabilityScore(r, z);
        if (!(s >= 0 && s <= 1)) return false;
      }
    }
    return true;
  })());

// 3. STRUCTURAL: isHumanHabitable does not appear in THIS module
const HERE = __dirname;   // .gate-tmp/build - the .ts sources are copied one level up
function readSource(name: string): string {
  return fs.readFileSync(path.join(HERE, '..', name), 'utf8');
}
// Matches actual CODE usage (a call or declaration, identifier followed by
// "("), not prose - this module's own header explains the absence using the
// literal name, which a bare substring check would wrongly flag.
check('3 isHumanHabitable does not appear as CODE (a call or declaration) ' +
  'anywhere in habitability.ts',
  !/\bisHumanHabitable\s*\(/.test(readSource('habitability.ts')));

// 4. purely deterministic - no Rng import
check('4 habitability.ts imports nothing from rng.ts (purely deterministic module)',
  !readSource('habitability.ts').includes("from './rng'"));

if (failures > 0) throw new Error(`${failures} habitability conformance failure(s)`);
console.log('\nall habitability conformance checks passed');
