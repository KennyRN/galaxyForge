import { rollBelt, isSwept, beltComposition, referenceCountAbove, REFERENCE_MASS_KG } from './belts';
import type { PlanetDraw } from './planets';
import { mulberry32, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

function mkPlanet(formationAu: number, kind: 'rocky' | 'giant' = 'rocky', migrated = false): PlanetDraw {
  return {
    formationIndex: 0, kind, class: 'earth-like', subclass: 'temperate', zone: 'C',
    au: formationAu, formationAu, eccentricity: 0, radiusEarth: 1, massEarth: 1, coreMassEarth: 1,
    envelopeFraction: 0, envelope: 'stripped', hostLuminositySol: 1, orbitType: 's-type',
    channel: 'core-accretion', migrated,
  };
}

// 1. THE STAGE-7 GATE
check(`1 N(>100km) is within a few percent of 220 for the reference SFD (got ${referenceCountAbove(100).toFixed(1)})`,
  Math.abs(referenceCountAbove(100) - 220) < 5);
check(`1b N(>200km) is within a few percent of 26 for the reference SFD (got ${referenceCountAbove(200).toFixed(2)})`,
  Math.abs(referenceCountAbove(200) - 26) < 2);
check('1c the SFD is monotonically decreasing in diameter',
  [1, 10, 50, 100, 150, 200, 500].every((d, i, arr) => i === 0 || referenceCountAbove(d) < referenceCountAbove(arr[i - 1]!)));

// 2. mass gate
check(`2 integrated reference belt mass is within a factor of two of 2.4e21 kg ` +
  `(got ${REFERENCE_MASS_KG.toExponential(3)} kg)`,
  REFERENCE_MASS_KG > 2.4e21 / 2 && REFERENCE_MASS_KG < 2.4e21 * 2);

// 3. isSwept tests formationAu, not au
check('3 isSwept fires when a planet\'s formationAu falls inside the annulus',
  isSwept(3, 5, [mkPlanet(4)]));
check('3b isSwept does NOT fire when formationAu is outside the annulus, even ' +
  'if the planet MIGRATED to sit inside it (au != formationAu)',
  (() => {
    const migratedIn: PlanetDraw = { ...mkPlanet(10), au: 4 };   // formed at 10 AU, migrated to 4 AU
    return !isSwept(3, 5, [migratedIn]);
  })());

// 4. composition
check('4 composition is rocky well inside the snow line, icy well beyond it, ' +
  'mixed at the boundary',
  beltComposition(0.5, 1.0, 1.0) === 'rocky' &&
  beltComposition(20, 30, 1.0) === 'icy' &&
  beltComposition(2.5, 3.0, 1.0) === 'mixed');   // snowLineAu(1.0) = 2.7

// 5. draw counts
check('5 rollBelt consumes ZERO draws when swept',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.5; };
    const belt = rollBelt(counting, 3, 5, 1.0, [mkPlanet(4)]);
    return belt === null && calls === 0;
  })());
check('5b rollBelt consumes EXACTLY THREE draws when a belt is placed',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.5; };
    rollBelt(counting, 3, 5, 1.0, []);
    return calls === 3;
  })());

// 6. depletionFactor consistency
check('6 depletionFactor is exactly 1.0 whenever lateHeavyBombardment is false, ' +
  'and always < 1 when true, across many draws',
  (() => {
    for (let seed = 0; seed < 500; seed++) {
      const hasGiant = seed % 2 === 0;
      const planets = hasGiant ? [mkPlanet(4, 'giant', true)] : [];
      const belt = rollBelt(mulberry32(seed), 8, 12, 1.0, planets);
      if (!belt) continue;
      if (belt.lateHeavyBombardment && !(belt.depletionFactor < 1)) return false;
      if (!belt.lateHeavyBombardment && belt.depletionFactor !== 1.0) return false;
    }
    return true;
  })());

// 7. largestDiameterKm self-consistency
check('7 largestDiameterKm is self-consistent with the SFD: the cumulative ' +
  'count there is within tolerance of 1',
  (() => {
    const belt = rollBelt(mulberry32(3), 3, 5, 1.0, [])!;
    const scale = belt.countAbove1km / referenceCountAbove(1);
    return Math.abs(referenceCountAbove(belt.largestDiameterKm) * scale - 1) < 0.05;
  })());

// 8. determinism
check('8 rollBelt is deterministic for the same rng sequence and inputs',
  (() => {
    const a = rollBelt(mulberry32(42), 3, 5, 1.0, []);
    const b = rollBelt(mulberry32(42), 3, 5, 1.0, []);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

if (failures > 0) throw new Error(`${failures} belts conformance failure(s)`);
console.log('\nall belts conformance checks passed');
console.log(`\n  N(>100km)=${referenceCountAbove(100).toFixed(1)}  N(>200km)=${referenceCountAbove(200).toFixed(2)}  ` +
  `mass=${REFERENCE_MASS_KG.toExponential(3)} kg`);
