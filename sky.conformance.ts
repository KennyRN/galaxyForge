import { skyFrom, type SkySystemInput } from './sky';
import { absMagV, luminositySol } from './stellarProperties';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const ORIGIN = { x: 0, y: 0, z: 0 };

function oneStarSystem(sysid: string, cls: 'G2V' | 'A2V', x: number): SkySystemInput {
  return {
    sysid, positionPc: { x, y: 0, z: 0 },
    stars: [{ class: cls, luminositySol: luminositySol(cls), colourBV: 0 }],
  };
}

// 1. THE STAGE-5.1 GATES
const sunAt10pc = skyFrom(ORIGIN, [oneStarSystem('sun', 'G2V', 10)], 99)[0]!;
check(`1 the Sun (G2V) at 10 pc returns apparentMagV EXACTLY absMagV('G2V') ` +
  `(distance modulus is a no-op at d=10pc, by definition of absolute magnitude) - got ${sunAt10pc.apparentMagV}`,
  sunAt10pc.apparentMagV === absMagV('G2V'));

const AU_IN_PC = 4.84814e-6;
const sunAt1Au = skyFrom(ORIGIN, [oneStarSystem('sun', 'G2V', AU_IN_PC)], 99)[0]!;
check(`1b the Sun at 1 AU lands near -26.7 (got ${sunAt1Au.apparentMagV.toFixed(2)})`,
  Math.abs(sunAt1Au.apparentMagV - (-26.7)) < 0.3);

const siriusStandIn = skyFrom(ORIGIN, [oneStarSystem('sirius', 'A2V', 2.64)], 99)[0]!;
check(`1c a Sirius stand-in (A2V) at 2.64 pc lands near -1.5, the brief's own ` +
  `stated ballpark for the real star (got ${siriusStandIn.apparentMagV.toFixed(2)})`,
  siriusStandIn.apparentMagV < -1 && siriusStandIn.apparentMagV > -2);

// 2. remnant contributes zero flux, no -Infinity
check('2 an all-remnant system contributes no light and produces no -Infinity',
  (() => {
    const sys: SkySystemInput = {
      sysid: 'wd-only', positionPc: { x: 5, y: 0, z: 0 },
      stars: [{ class: 'white-dwarf', luminositySol: 0, colourBV: 0 }],
    };
    const result = skyFrom(ORIGIN, [sys], 99);
    return result.length === 0;   // filtered out - zero flux, never appears with -Infinity
  })());
check('2b a mixed system (one remnant + one real star) counts ONLY the real ' +
  'star\'s flux, no NaN or -Infinity contamination',
  (() => {
    const sys: SkySystemInput = {
      sysid: 'mixed', positionPc: { x: 10, y: 0, z: 0 },
      stars: [
        { class: 'white-dwarf', luminositySol: 0, colourBV: 0 },
        { class: 'G2V', luminositySol: luminositySol('G2V'), colourBV: 0.65 },
      ],
    };
    const result = skyFrom(ORIGIN, [sys], 99)[0]!;
    return Number.isFinite(result.apparentMagV) && result.apparentMagV === absMagV('G2V');
  })());

// 3. deterministic order under permutation
check('3 output order is deterministic under input permutation (brightness, then sysid)',
  (() => {
    const systems = [
      oneStarSystem('c', 'G2V', 20), oneStarSystem('a', 'G2V', 5), oneStarSystem('b', 'A2V', 10),
    ];
    const forward = skyFrom(ORIGIN, systems, 99).map((s) => s.sysid);
    const reversed = skyFrom(ORIGIN, [...systems].reverse(), 99).map((s) => s.sysid);
    return JSON.stringify(forward) === JSON.stringify(reversed);
  })());

// 4. STRUCTURAL - no Rng anywhere in this module
const HERE = __dirname;
const source = fs.readFileSync(path.join(HERE, '..', 'sky.ts'), 'utf8');
check('4 sky.ts imports nothing from rng.ts and defines no Rng parameter',
  !source.includes("from './rng'") && !/:\s*Rng\b/.test(source));

// 5. d === 0 excluded
check('5 the viewpoint\'s own system (d=0) never appears in the output',
  (() => {
    const own: SkySystemInput = oneStarSystem('home', 'G2V', 0);
    return skyFrom(ORIGIN, [own], 99).length === 0;
  })());

if (failures > 0) throw new Error(`${failures} sky conformance failure(s)`);
console.log('\nall sky conformance checks passed');
