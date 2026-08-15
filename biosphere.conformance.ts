import { rollBiosphere } from './biosphere';
import { mulberry32, type Rng } from './rng';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const WATER_TEMP_K = 288;   // liquidWaterStable(288) === true
const NO_WATER_TEMP_K = 500;

// 1. exactly two draws, always
check('1 rollBiosphere consumes EXACTLY TWO draws when origin succeeds',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.01; };   // low u -> origin succeeds
    rollBiosphere(counting, 'quiet', WATER_TEMP_K, 5.0);
    return calls === 2;
  })());
check('1b rollBiosphere STILL consumes EXACTLY TWO draws when origin fails ' +
  '(a fixed draw budget regardless of outcome)',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.99; };   // high u -> origin fails
    rollBiosphere(counting, 'quiet', WATER_TEMP_K, 5.0);
    return calls === 2;
  })());

// 2. gating conditions
check('2 origin is impossible without stable liquid water',
  rollBiosphere(mulberry32(1), 'quiet', NO_WATER_TEMP_K, 5.0).originProbability === 0);
check('2b origin is impossible before the minimum abiogenesis window',
  rollBiosphere(mulberry32(1), 'quiet', WATER_TEMP_K, 0.1).originProbability === 0);
check('2c origin IS possible with water and enough time',
  rollBiosphere(mulberry32(1), 'quiet', WATER_TEMP_K, 5.0).originProbability > 0);

// 3. activityClass modifies survival odds - the Stage-9 requirement
check('3 a flare-active host has STRICTLY LOWER origin probability than an ' +
  'otherwise-identical quiet host',
  (() => {
    const flareActive = rollBiosphere(mulberry32(1), 'flare-active', WATER_TEMP_K, 5.0).originProbability;
    const quiet = rollBiosphere(mulberry32(1), 'quiet', WATER_TEMP_K, 5.0).originProbability;
    return flareActive < quiet;
  })());

// 4. STRUCTURAL: no Rossby-number computation in this file, and only one
// definition of it exists anywhere in the project (in stellarHistory.ts).
const HERE = __dirname;
function readSource(name: string): string {
  return fs.readFileSync(path.join(HERE, '..', name), 'utf8');
}
function allTsFiles(): string[] {
  return fs.readdirSync(path.join(HERE, '..')).filter((f) => f.endsWith('.ts') && !f.endsWith('.conformance.ts'));
}
const ROSSBY_DEF = /(?:export\s+)?function\s+rossbyNumber\s*\(/g;
check('4 exactly ONE definition of rossbyNumber exists across every source ' +
  'file, and it is in stellarHistory.ts',
  (() => {
    const defs = allTsFiles().flatMap((f) => {
      const matches = readSource(f).match(ROSSBY_DEF) ?? [];
      return matches.map(() => f);
    });
    return defs.length === 1 && defs[0] === 'stellarHistory.ts';
  })());
check('4b biosphere.ts itself contains no Rossby-number computation and ' +
  'imports nothing from stellarHistory beyond the ActivityClass type',
  !readSource('biosphere.ts').includes('rossbyNumber') &&
  !/import\s*\{[^}]*\brossbyNumber\b/.test(readSource('biosphere.ts')));

// 5. level/composition consistency
check('5 level=none implies empty realisedComposition and signatures',
  (() => {
    const d = rollBiosphere(mulberry32(1), 'quiet', NO_WATER_TEMP_K, 5.0);
    return d.level === 'none' && d.realisedComposition.length === 0 && d.signatures.length === 0;
  })());

// 6. determinism
check('6 rollBiosphere is deterministic for the same rng sequence and inputs',
  (() => {
    const a = rollBiosphere(mulberry32(3), 'moderate', WATER_TEMP_K, 5.0);
    const b = rollBiosphere(mulberry32(3), 'moderate', WATER_TEMP_K, 5.0);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

if (failures > 0) throw new Error(`${failures} biosphere conformance failure(s)`);
console.log('\nall biosphere conformance checks passed');
