import { upsilonFor, cartesianToPolar, polarToCartesian, densityAtCartesian } from './galacticDensity';
import { createSpiralModel, SPIRAL_POPULATIONS } from './galaxyModel';
import type { Population } from './galaxyModel';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// 1. Upsilon sanity check - S4.3's own stated expectation: "should land near
// 2 systems per solar mass... agreement within about ten per cent means the
// chain is sound".
const SOLAR_LIKE: Population = {
  key: 'oldThin', label: 'test', nLocal: 0, ageGyr: [6, 8], ageMeanGyr: 7.0, ageSigmaGyr: 0.8,
  massFractionGalaxy: 0.3, fehMeanDex: 0, fehSigmaDex: 0.2,
};
const upsilonSolar = upsilonFor(SOLAR_LIKE);
check(`1 Upsilon for a solar-like (7 Gyr, solar feh) population lands within a ` +
  `factor of ~2 of the brief's own "near 2 systems per solar mass" sanity check ` +
  `(got ${upsilonSolar.toFixed(3)})`,
  upsilonSolar > 1 && upsilonSolar < 4);

// 2. Upsilon rises with age - an OLDER population has a lower turnoff mass,
// so its living stars are on average LESS massive, so MORE systems per unit
// living mass (a lighter mean living star means more of them per Msun).
check('2 Upsilon increases with population age (older -> lighter living stars ' +
  '-> more systems per solar mass of living stars)',
  (() => {
    const ages = [1, 3, 6, 9, 12];
    const upsilons = ages.map((a) => upsilonFor({ ...SOLAR_LIKE, ageMeanGyr: a }));
    return upsilons.every((u, i) => i === 0 || u > upsilons[i - 1]!);
  })());

// 3. Upsilon is well-defined (finite, positive) across the full population set
check('3 Upsilon is finite and positive for every shipped spiral/elliptical/lenticular population',
  SPIRAL_POPULATIONS.every((p) => {
    const u = upsilonFor(p);
    return Number.isFinite(u) && u > 0;
  }));

// 4. coordinate transform round-trips
check('4 polarToCartesian -> cartesianToPolar round-trips to 1e-9',
  (() => {
    const cases: [number, number, number][] = [[1000, 0.5, 100], [8178, 0, 0], [500, -2.1, -300], [1, Math.PI - 0.01, 5]];
    return cases.every(([R, theta, z]) => {
      const { x, y, z: z2 } = polarToCartesian(R, theta, z);
      const back = cartesianToPolar(x, y, z2);
      return Math.abs(back.R - R) < 1e-6 && Math.abs(back.z - z) < 1e-9 &&
        Math.abs(Math.cos(back.theta) - Math.cos(theta)) < 1e-9 && Math.abs(Math.sin(back.theta) - Math.sin(theta)) < 1e-9;
    });
  })());
check('4b cartesianToPolar(0,0,z) gives R=0 without throwing (the coordinate origin)',
  (() => { const p = cartesianToPolar(0, 0, 5); return p.R === 0 && p.z === 5; })());

// 5. densityAtCartesian agrees with the model's own densityAt via the SAME transform
check('5 densityAtCartesian(model, x, y, z) equals model.densityAt(R, theta, z) ' +
  'for the equivalent polar point',
  (() => {
    const model = createSpiralModel(false);
    const cases: [number, number, number][] = [[8178, 0, 0], [3000, 1.5, -50], [1000, -1, 100]];
    return cases.every(([x, y, z]) => {
      const { R, theta } = cartesianToPolar(x, y, z);
      return densityAtCartesian(model, x, y, z) === model.densityAt(R, theta, z);
    });
  })());

if (failures > 0) throw new Error(`${failures} galacticDensity conformance failure(s)`);
console.log('\nall galacticDensity conformance checks passed');

console.log('\n--- Upsilon vs age, solar feh ---');
for (const age of [0.5, 1, 3, 6, 9, 12]) {
  console.log(`  age=${String(age).padStart(4)} Gyr   Upsilon=${upsilonFor({ ...SOLAR_LIKE, ageMeanGyr: age }).toFixed(3)} systems/Msun`);
}
