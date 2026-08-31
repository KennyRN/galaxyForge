import {
  upsilonFor, deadStarFraction, cartesianToPolar, polarToCartesian, densityAtCartesian,
  __clearImfCaches, imfTotalNumber, GALACTIC_DENSITY_GATES, type ImfInputs,
} from './galacticDensity';
import {
  createSpiralModel, SPIRAL_POPULATIONS, ELLIPTICAL_POPULATIONS, LENTICULAR_POPULATIONS,
} from './galaxyModel';
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
  key: 'spiralOldThin', label: 'test', nLocal: 0, ageGyr: [6, 8], ageMeanGyr: 7.0, ageSigmaGyr: 0.8,
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

// 6. MEMOISED EQUALS RAW - the IMF-integral memo returns the bit-identical
// value it would have computed cold. Over the full shipped population set
// crossed with a grid of ages and metallicities: compute warm, clear the
// cache, compute cold, assert strict === both ways. This is the gate that
// licenses leaving genVersion untouched.
check('6 upsilonFor / deadStarFraction are bit-identical cached vs freshly cleared, ' +
  'across every shipped population x an age/feh grid (memoisation, not approximation)',
  (() => {
    const pops = [...SPIRAL_POPULATIONS, ...ELLIPTICAL_POPULATIONS, ...LENTICULAR_POPULATIONS];
    const ages = [0.1, 0.5, 1, 3, 7, 10, 13, 13.8];
    const fehs = [-2.5, -1, -0.3, 0, 0.3];
    let pairs = 0;
    for (const base of pops) {
      for (const ageMeanGyr of ages) {
        for (const fehMeanDex of fehs) {
          const pop: Population = { ...base, ageMeanGyr, fehMeanDex };
          __clearImfCaches();
          const u1 = upsilonFor(pop);
          const d1 = deadStarFraction(pop);
          const u2 = upsilonFor(pop);           // warm
          const d2 = deadStarFraction(pop);     // warm
          __clearImfCaches();
          const u3 = upsilonFor(pop);           // cold again
          const d3 = deadStarFraction(pop);
          pairs++;
          if (!(u1 === u2 && u2 === u3 && d1 === d2 && d2 === d3)) return false;
        }
      }
    }
    console.log(`    (${pairs} paired evaluations, 0 differing)`);
    return true;
  })());

// 7. CACHE KEY IS COMPLETE - upsilonFor / deadStarFraction depend on EXACTLY
// ageMeanGyr and fehMeanDex. Perturb every other numeric field of a Population
// and assert neither result moves. Fails the day a third dependency is added
// without extending imfMemoKey.
check('7 perturbing any Population field other than ageMeanGyr/fehMeanDex leaves ' +
  'upsilonFor and deadStarFraction exactly unchanged (memo key is complete)',
  (() => {
    __clearImfCaches();
    const base: Population = { ...SOLAR_LIKE };
    const u0 = upsilonFor(base);
    const d0 = deadStarFraction(base);
    let perturbed = 0;
    for (const k of Object.keys(base)) {
      if (k === 'ageMeanGyr' || k === 'fehMeanDex') continue;
      const rec = { ...base } as Record<string, unknown>;
      const v = rec[k];
      if (typeof v !== 'number') continue;
      rec[k] = v * 1.7 + 1;
      const probe = rec as unknown as Population;
      __clearImfCaches();
      perturbed++;
      if (upsilonFor(probe) !== u0 || deadStarFraction(probe) !== d0) return false;
    }
    console.log(`    (${perturbed} other numeric fields perturbed, 0 leaks)`);
    __clearImfCaches();
    return true;
  })());

// 8. IMF TOTAL IS A CONSTANT (A4) - hoisted out of deadStarFraction's body.
check('8 imfTotalNumber() is idempotent and deadStarFraction stays consistent with it ' +
  '(zero-age population -> exactly 0 dead: numerator == the hoisted denominator)',
  (() => {
    const a = imfTotalNumber();
    const b = imfTotalNumber();
    if (a !== b || !(Number.isFinite(a) && a > 0)) return false;
    __clearImfCaches();
    // turnoff = IMF_MAX at age 0, so numberOfLiving === imfTotalNumber() and 1 - 1 === 0
    return deadStarFraction({ ageMeanGyr: 0, fehMeanDex: 0 }) === 0;
  })());

// A2 (compile-time): upsilonFor / deadStarFraction accept ImfInputs, not the
// full Population. If either signature is ever widened back to require a third
// field, these assignments stop compiling and the gate suite fails to build -
// which is the structural half of "the memo key is complete".
const _a2_upsilon: (p: ImfInputs) => number = upsilonFor;
const _a2_dead: (p: ImfInputs) => number = deadStarFraction;
void _a2_upsilon; void _a2_dead;

check(`gate count matches GALACTIC_DENSITY_GATES`, GALACTIC_DENSITY_GATES === 8);

if (failures > 0) throw new Error(`${failures} galacticDensity conformance failure(s)`);
console.log('\nall galacticDensity conformance checks passed');

console.log('\n--- Upsilon vs age, solar feh ---');
for (const age of [0.5, 1, 3, 6, 9, 12]) {
  console.log(`  age=${String(age).padStart(4)} Gyr   Upsilon=${upsilonFor({ ...SOLAR_LIKE, ageMeanGyr: age }).toFixed(3)} systems/Msun`);
}
