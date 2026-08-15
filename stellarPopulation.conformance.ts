import {
  BIRTH_FRACTION, T_DISC_GYR, pickClass, classProbabilityGivenAgeFeh,
} from './stellarPopulation';
import { STELLAR_CLASSES, msLifetimeGyr, representativeMass } from './stellarProperties';
import { mulberry32, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const sumOf = (m: ReadonlyMap<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

// 1. sums to 1
check('1 BIRTH_FRACTION sums to 1 across all 65 classes',
  Math.abs(sumOf(BIRTH_FRACTION) - 1) < 1e-9);
check('1b every class has a positive birth fraction (Kroupa weighting never zeroes one out)',
  STELLAR_CLASSES.every((c) => BIRTH_FRACTION.get(c)! > 0));

// 2. survival constraint
check('2 pickClass never returns a class whose lifetime is shorter than ctx.age',
  (() => {
    const rng = mulberry32(7);
    for (let i = 0; i < 3000; i++) {
      const age = (i % 130) / 10;         // 0 .. 12.9 Gyr
      const feh = -0.5 + (i % 21) / 20;    // -0.5 .. +0.5
      const c = pickClass(rng, { age, feh });
      if (!(msLifetimeGyr(representativeMass(c), feh) > age)) return false;
    }
    return true;
  })());

// 3. exactly one draw
check('3 pickClass consumes EXACTLY ONE call to rng()',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.4321; };
    pickClass(counting, { age: 1, feh: 0 });
    return calls === 1;
  })());

// 4. determinism
check('4 same rng draw and ctx give the same class, always',
  (() => {
    const a = pickClass(mulberry32(99), { age: 4.5, feh: -0.1 });
    const b = pickClass(mulberry32(99), { age: 4.5, feh: -0.1 });
    return a === b;
  })());

// 5. Stage-3 gate: integrating P(class|age) over a uniform age distribution
//    on [0, T_DISC_GYR] at feh=0 recovers OBSERVED_FRACTION-shaped totals -
//    reconstructed here directly (not imported) so the check is independent
//    of the module's own internal OBSERVED_FRACTION table.
function letterOf(c: string): string { return c[0]!; }
function integratedLetterFraction(letter: string, nSteps = 4000): number {
  let acc = 0;
  for (let i = 0; i < nSteps; i++) {
    const age = ((i + 0.5) / nSteps) * T_DISC_GYR;
    for (const c of STELLAR_CLASSES) {
      if (letterOf(c) === letter) acc += classProbabilityGivenAgeFeh(c, age, 0);
    }
  }
  return acc / nSteps;
}
// Reconstruct the CNS5-anchored letter fractions the same way the module
// does (from the header-documented raw weights, normalised), so this is a
// genuine round-trip check on the ALGEBRA, not a re-assertion of the module's
// own internal table.
const EXPECTED_LETTER: Record<string, number> = {};
const RAW: Record<string, number> = { M: 72.0, K: 14.4, G: 9.1, F: 3.6, A: 0.72, B: 0.16, O: 0.00004 };
const RAW_SUM = Object.values(RAW).reduce((a, b) => a + b, 0);
for (const k of Object.keys(RAW)) EXPECTED_LETTER[k] = RAW[k]! / RAW_SUM;

check('5 M, K, G recover their observed letter fraction to within 3% relative, ' +
  'integrating P(class|age) over a uniform age distribution',
  (['M', 'K', 'G'] as const).every((letter) => {
    const got = integratedLetterFraction(letter);
    const expected = EXPECTED_LETTER[letter]!;
    return Math.abs(got - expected) / expected < 0.03;
  }));

check('5b O, B, A are allowed to differ more (short-lived, rare classes) but stay ' +
  'within a documented 30% ceiling - not unboundedly wrong',
  (['O', 'B', 'A'] as const).every((letter) => {
    const got = integratedLetterFraction(letter);
    const expected = EXPECTED_LETTER[letter]!;
    return Math.abs(got - expected) / expected < 0.30;
  }));

// 6. the halo gate
check('6 at a halo-like age (~12 Gyr) and the halo\'s own feh (-1.6), only K and M ' +
  'classes survive',
  (() => {
    const survivingLetters = new Set(
      STELLAR_CLASSES.filter((c) => msLifetimeGyr(representativeMass(c), -1.6) > 12.0)
        .map((c) => c[0]),
    );
    return survivingLetters.size > 0 &&
      [...survivingLetters].every((l) => l === 'K' || l === 'M');
  })());

check('6b the same test at SOLAR feh would NOT be K/M-only at 12 Gyr - proving the ' +
  'gate is genuinely testing the metallicity term, not a coincidence',
  (() => {
    const survivingLettersSolar = new Set(
      STELLAR_CLASSES.filter((c) => msLifetimeGyr(representativeMass(c), 0) > 12.0)
        .map((c) => c[0]),
    );
    return [...survivingLettersSolar].some((l) => l !== 'K' && l !== 'M');
  })());

if (failures > 0) throw new Error(`${failures} stellarPopulation conformance failure(s)`);
console.log('\nall stellarPopulation conformance checks passed');

console.log('\n--- observed-letter-fraction round trip (integrated vs expected) ---');
for (const letter of ['O', 'B', 'A', 'F', 'G', 'K', 'M']) {
  const got = integratedLetterFraction(letter);
  const expected = EXPECTED_LETTER[letter]!;
  console.log(`  ${letter}: integrated ${(got * 100).toFixed(4)}%  expected ${(expected * 100).toFixed(4)}%  ` +
    `rel.err ${(Math.abs(got - expected) / expected * 100).toFixed(1)}%`);
}
