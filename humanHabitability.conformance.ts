import { assessHumanHabitability, isHumanHabitable, HAB_TIER_LABELS } from './humanHabitability';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// 1. monotonicity toward Earth-like
check('1 tier is monotonically non-decreasing as temperature moves toward ' +
  'Earth-like, at fixed favourable gravity/atmosphere',
  (() => {
    const temps = [500, 400, 320, 288, 288];   // converging on 288 K
    const tiers = temps.map((t) => assessHumanHabitability(t, 'moderate', true, 1.0).tier);
    return tiers.every((t, i) => i === 0 || t >= tiers[i - 1]!);
  })());
check('1b tier is monotonically non-decreasing as gravity moves toward 1g, ' +
  'at fixed favourable temperature/atmosphere',
  (() => {
    const gravities = [3.0, 2.0, 1.5, 1.0];
    const tiers = gravities.map((g) => assessHumanHabitability(288, 'moderate', true, g).tier);
    return tiers.every((t, i) => i === 0 || t >= tiers[i - 1]!);
  })());

// 2. tier 0 / tier 4 boundary conditions
check('2 tier 0 always has liveable=false and support=none',
  (() => {
    const d = assessHumanHabitability(900, 'vacuum', false, 5.0);
    return d.tier === 0 && !d.liveable && d.support === 'none';
  })());
check('2b tier 4 (Earth-like, favourable everything) has liveable=true and support=unassisted',
  (() => {
    const d = assessHumanHabitability(288, 'moderate', true, 1.0);
    return d.tier === 4 && d.liveable && d.support === 'unassisted';
  })());

// 3. HAB_TIER_LABELS has exactly one entry per tier value
check('3 HAB_TIER_LABELS has exactly one entry for each of 0,1,2,3,4',
  Object.keys(HAB_TIER_LABELS).sort().join(',') === '0,1,2,3,4');

// 4. STRUCTURAL: isHumanHabitable exists exactly once, here
const HERE = __dirname;
function readSource(name: string): string {
  return fs.readFileSync(path.join(HERE, '..', name), 'utf8');
}
function allTsFiles(): string[] {
  return fs.readdirSync(path.join(HERE, '..')).filter((f) => f.endsWith('.ts') && !f.endsWith('.conformance.ts'));
}
const IS_HUMAN_HABITABLE_DEF = /(?:export\s+)?function\s+isHumanHabitable\s*\(/g;
check('4 THE STAGE-9 GATE - exactly ONE definition of isHumanHabitable exists ' +
  'across every source file, and it is in humanHabitability.ts',
  (() => {
    const defs = allTsFiles().flatMap((f) => {
      const matches = readSource(f).match(IS_HUMAN_HABITABLE_DEF) ?? [];
      return matches.map(() => f);
    });
    return defs.length === 1 && defs[0] === 'humanHabitability.ts';
  })());
// Matches actual CODE usage (a call or declaration), not prose -
// habitability.ts's own header explains the absence using the literal name.
check('4b habitability.ts (the geometric module) never defines or calls ' +
  'isHumanHabitable as code',
  !/\bisHumanHabitable\s*\(/.test(readSource('habitability.ts')));

// 5. no Rng anywhere in this module's public surface
check('5 humanHabitability.ts imports nothing from rng.ts',
  !readSource('humanHabitability.ts').includes("from './rng'"));
check('5b isHumanHabitable and assessHumanHabitability are deterministic ' +
  '(same inputs, same outputs, always)',
  isHumanHabitable(2) === isHumanHabitable(2) &&
  JSON.stringify(assessHumanHabitability(288, 'moderate', true, 1.0)) ===
  JSON.stringify(assessHumanHabitability(288, 'moderate', true, 1.0)));

if (failures > 0) throw new Error(`${failures} humanHabitability conformance failure(s)`);
console.log('\nall humanHabitability conformance checks passed');
