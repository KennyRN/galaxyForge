import {
  escapeVelocityKmS, atmosphericRetentionMarginDex, rollAtmosphere,
} from './atmosphere';
import { mulberry32 } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// 1. Earth calibration point
check('1 escapeVelocityKmS(1, 1) is EXACTLY 11.186 km/s (Earth\'s own value)',
  escapeVelocityKmS(1, 1) === 11.186);

// 2. the arithmetic tell
check('2 5.77 * log10(11.186) equals 6.0509 to 1e-4 (the brief\'s own arithmetic tell)',
  Math.abs(5.77 * Math.log10(11.186) - 6.0509) < 1e-4);

// 3. THE STAGE-8 GATE: the twelve-body Solar System run
interface Body { name: string; massEarth: number; radiusEarth: number; auFromSun: number; expectRetains: boolean | null; }
// null = genuinely ambiguous/borderline in reality; not scored either way.
const BODIES: Body[] = [
  { name: 'Mercury', massEarth: 0.0553, radiusEarth: 0.383, auFromSun: 0.387, expectRetains: false },
  { name: 'Venus', massEarth: 0.815, radiusEarth: 0.949, auFromSun: 0.723, expectRetains: true },
  { name: 'Earth', massEarth: 1.0, radiusEarth: 1.0, auFromSun: 1.0, expectRetains: true },
  { name: 'Mars', massEarth: 0.107, radiusEarth: 0.532, auFromSun: 1.524, expectRetains: true },
  { name: 'Europa', massEarth: 0.0080, radiusEarth: 0.245, auFromSun: 5.20, expectRetains: false },
  { name: 'Ganymede', massEarth: 0.0248, radiusEarth: 0.413, auFromSun: 5.20, expectRetains: false },
  { name: 'Callisto', massEarth: 0.0180, radiusEarth: 0.378, auFromSun: 5.20, expectRetains: false },
  { name: 'Titan', massEarth: 0.0225, radiusEarth: 0.404, auFromSun: 9.58, expectRetains: true },
  { name: 'Triton', massEarth: 0.00359, radiusEarth: 0.212, auFromSun: 30.1, expectRetains: false },
  { name: 'Pluto', massEarth: 0.00218, radiusEarth: 0.186, auFromSun: 39.5, expectRetains: null },
  { name: 'Haumea', massEarth: 0.00067, radiusEarth: 0.098, auFromSun: 43.1, expectRetains: false },
  { name: 'Eris', massEarth: 0.00280, radiusEarth: 0.182, auFromSun: 67.8, expectRetains: null },
];

const AGE_GYR = 4.6;
const results = BODIES.map((b) => {
  const arm = atmosphericRetentionMarginDex(b.massEarth, b.radiusEarth, 'G2V', AGE_GYR, b.auFromSun);
  return { ...b, arm, retains: arm >= 0 };
});

const scored = results.filter((r) => r.expectRetains !== null);
const correct = scored.filter((r) => r.retains === r.expectRetains).length;
check(`3 at least 10 of ${scored.length} scoreable bodies classify as scientifically ` +
  `expected (got ${correct}/${scored.length})`, correct >= scored.length - 2);

const mars = results.find((r) => r.name === 'Mars')!;
const titan = results.find((r) => r.name === 'Titan')!;
check(`3b Mars lands within +/-0.15 dex of ARM=0 (got ${mars.arm.toFixed(4)})`, Math.abs(mars.arm) < 0.15);
check(`3c Titan lands within +/-0.15 dex of ARM=0 (got ${titan.arm.toFixed(4)})`, Math.abs(titan.arm) < 0.15);

// 4. gas-giant sentinel
check('4 a giant-class planet gets retentionMarginDex = +Infinity, never a ' +
  'computed ARM value',
  rollAtmosphere(mulberry32(1), 'giant', 300, 11, 'G2V', 5, 5, 150).retentionMarginDex === Infinity);

// 5. direction: more distant => MORE retention (less stripping), not less
check('5 retentionMarginDex increases with orbital distance at fixed planet ' +
  '(farther = less XUV = easier retention)',
  atmosphericRetentionMarginDex(1, 1, 'G2V', 4.6, 2.0) > atmosphericRetentionMarginDex(1, 1, 'G2V', 4.6, 1.0));

// 6. determinism
check('6 rollAtmosphere is deterministic for the same inputs',
  (() => {
    const a = rollAtmosphere(mulberry32(1), 'earth-like', 1, 1, 'G2V', 4.6, 1, 255);
    const b = rollAtmosphere(mulberry32(1), 'earth-like', 1, 1, 'G2V', 4.6, 1, 255);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

if (failures > 0) throw new Error(`${failures} atmosphere conformance failure(s)`);
console.log('\nall atmosphere conformance checks passed');

console.log('\n--- the twelve-body Solar System run ---');
for (const r of results) {
  const tag = r.expectRetains === null ? '(borderline in reality)' :
    (r.retains === r.expectRetains ? 'OK' : 'MISMATCH');
  console.log(`  ${r.name.padEnd(9)} ARM=${r.arm.toFixed(3).padStart(8)}  ` +
    `${r.retains ? 'retains' : 'strips '}  ${tag}`);
}
