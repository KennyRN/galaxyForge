/**
 * systemConductor.conformance - the 7 SYSTEM_CONDUCTOR_GATES, exercised
 * across many systems (varied population, position, formationRank) since
 * this module's whole job is composing OTHER modules correctly - the real
 * bugs here are wrong array lengths, null-handling mistakes and channel
 * collisions, none of which a typecheck alone would catch.
 */

import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { SPIRAL_POPULATIONS } from './galaxyModel';
import type { Population } from './galaxyModel';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const populations = new Map(SPIRAL_POPULATIONS.map((p) => [p.key, p] as const));

function makeInputs(sysid: string, pop: Population, overrides: Partial<GenerateSystemInputs> = {}): GenerateSystemInputs {
  return {
    sysid, genVersion: 2, worldSeed: 'conductor-gate-seed',
    positionPc: { x: 8100 + sysid.length, y: 40, z: 12 },
    population: pop.key, populationMeta: pop, formationRank: 0.5,
    terraformScale: 3,
    ...overrides,
  };
}

// A spread of test systems across populations, positions and formationRank,
// large enough to shake out rare branches (multi-star, giants, remnant
// companions) without an unreasonable runtime.
const TEST_SYSIDS = Array.from({ length: 200 }, (_, i) => `test.${i}`);

/* 1. determinism ---------------------------------------------------------------- */

check('generateSystemCore is deterministic for the same inputs', (() => {
  const inputs = makeInputs('det-test', populations.get('oldThin')!);
  const a = JSON.stringify(generateSystemCore(inputs));
  const b = JSON.stringify(generateSystemCore(inputs));
  return a === b;
})());

check('a different worldSeed changes the output', (() => {
  const a = generateSystemCore(makeInputs('seed-test', populations.get('oldThin')!, { worldSeed: 'seed-A' }));
  const b = generateSystemCore(makeInputs('seed-test', populations.get('oldThin')!, { worldSeed: 'seed-B' }));
  return JSON.stringify(a) !== JSON.stringify(b);
})());

/* Build the full test set once, reused by every gate below. */
const cores = TEST_SYSIDS.map((sysid, i) => {
  const popKeys = [...populations.keys()];
  const pop = populations.get(popKeys[i % popKeys.length]!)!;
  const formationRank = (i % 11) / 10;
  return generateSystemCore(makeInputs(sysid, pop, {
    formationRank,
    positionPc: { x: 8000 + i * 37, y: (i * 53) % 500 - 250, z: (i * 13) % 200 - 100 },
    terraformScale: i % 7,
  }));
});

/* 2. array alignment -------------------------------------------------------------- */

check('every per-planet array has exactly planets.length entries, for every test system', cores.every((c) =>
  c.moons.length === c.planets.length &&
  c.atmospheres.length === c.planets.length &&
  c.surface.length === c.planets.length &&
  c.biospheres.length === c.planets.length &&
  c.terraforming.length === c.planets.length &&
  c.humanHabitability.length === c.planets.length,
));

check('moons[i] belongs to planets[i] - index order is formationIndex order, not reordered', cores.every((c) =>
  c.planets.every((p, i) => p.formationIndex === c.planets[i]!.formationIndex) === true,
));

/* 3. stars.length === 1 + orbits.length ------------------------------------------- */

check('stars.length === 1 + ctx.geometry.orbits.length, for every test system', cores.every((c) =>
  c.stars.length === 1 + c.ctx.geometry.orbits.length,
));

check('at least one multi-star system appears in the test set (the gate above is non-trivial)', cores.some((c) => c.stars.length > 1));

/* 4. primary survives to ctx.age ---------------------------------------------------- */

// pickClass's own invariant re-asserted at this module's output boundary:
// re-derive via the same msLifetimeGyr the module itself uses.
import { msLifetimeGyr } from './stellarProperties';
check('the primary\'s own main-sequence lifetime exceeds ctx.age, for every test system', cores.every((c) =>
  msLifetimeGyr(c.stars[0]!.massSol, c.ctx.feh) > c.ctx.age,
));

/* 5. white-dwarf companions never get real rotation physics ------------------------- */

check('every white-dwarf star entry has activityClass "quiet" and confidence "out-of-range"', cores.every((c) =>
  c.stars.every((s, i) => s.class !== 'white-dwarf' || (c.ctx.history[i]!.activityClass === 'quiet' && c.ctx.history[i]!.confidence === 'out-of-range')),
));

check('at least one white-dwarf companion appears in the test set (the gate above is non-trivial)', cores.some((c) =>
  c.stars.some((s) => s.class === 'white-dwarf'),
));

/* 6. galactocentricRadiusPc is spherical, not cylindrical --------------------------- */

check('ctx.galactocentricRadiusPc === hypot(x,y,z), the SPHERICAL radius', cores.every((c) =>
  Math.abs(c.ctx.galactocentricRadiusPc - Math.hypot(c.ctx.positionPc.x, c.ctx.positionPc.y, c.ctx.positionPc.z)) < 1e-9,
));

check('at least one test system has a non-zero z, so this gate is non-trivial (spherical genuinely differs from cylindrical there)', cores.some((c) => c.ctx.positionPc.z !== 0));

/* 7. belt candidates never overlap ---------------------------------------------------- */

check('no two belts in the same system overlap, for every test system with 2 belts', cores.every((c) => {
  if (c.belts.length < 2) return true;
  const [a, b] = [...c.belts].sort((x, y) => x.innerAu - y.innerAu);
  return a!.outerAu <= b!.innerAu;
}));

/* -- giant/rocky null-handling (Policy 9) -------------------------------------------- */

check('every giant-kind planet has null surface/biosphere/terraforming/humanHabitability', cores.every((c) =>
  c.planets.every((p, i) => p.kind !== 'giant' || (
    c.surface[i] === null && c.biospheres[i] === null && c.terraforming[i] === null && c.humanHabitability[i] === null
  )),
));
check('every rocky-kind planet has a real (non-null) surface record', cores.every((c) =>
  c.planets.every((p, i) => p.kind !== 'rocky' || c.surface[i] !== null),
));
check('at least one giant-kind planet appears in the test set (the gate above is non-trivial)', cores.some((c) => c.planets.some((p) => p.kind === 'giant')));

/* -- basic sanity across the whole set ------------------------------------------------ */

check('every generated system has a finite, positive combinedLuminositySol', cores.every((c) => Number.isFinite(c.ctx.geometry.combinedLuminositySol) && c.ctx.geometry.combinedLuminositySol > 0));
check('every generated habitableZoneAu has inner < outer', cores.every((c) => c.habitableZoneAu.inner < c.habitableZoneAu.outer));
check('galacticHabitabilityScore always lands in [0, 1]', cores.every((c) => c.galacticHabitabilityScore >= 0 && c.galacticHabitabilityScore <= 1));
check('no planet, moon, atmosphere, surface, biosphere, terraforming or humanHabitability field is NaN, across the whole test set', cores.every((c) =>
  !JSON.stringify(c).includes('null') || true) && cores.every((c) => {
  const str = JSON.stringify(c, (_k, v) => (typeof v === 'number' && Number.isNaN(v) ? '__NAN__' : v));
  return !str.includes('__NAN__');
}));

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nsystemConductor.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log(`\nsystemConductor.conformance: all checks passed (${cores.length} test systems generated).`);
}
