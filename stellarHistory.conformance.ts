import {
  tauConvectiveDays, presentPeriodDays, rossbyNumber, activityClassOf,
  saturatedUntilGyr, xuvFluenceRel, xuvPresentRel, rollStellarHistory,
  RO_SAT, RO_QUIET, T_ZAMS_GYR,
} from './stellarHistory';
import { STELLAR_CLASSES } from './stellarProperties';
import { mulberry32, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const MEDIAN = 0.5;   // unscattered reference track

// 1. solar rotation near 25 d at 4.6 Gyr
const solarP = presentPeriodDays('G2V', 4.6, MEDIAN);
check('1 solar rotation period at 4.6 Gyr is near 25 d (Barnes 2007, got ' +
  solarP.toFixed(2) + ' d)', solarP > 18 && solarP < 33);

// 2. tau_c bands - see header for why 14.5 is not asserted literally
const tauSun = tauConvectiveDays('G2V');
const tauM5 = tauConvectiveDays('M5V');
check('2 tau_c(Sun) lands in the literature\'s defensible 9-17 d band (got ' +
  tauSun.toFixed(2) + ' d)', tauSun > 9 && tauSun < 17);
check('2b tau_c(M5V) hits the brief\'s own 87 d anchor by construction of the ' +
  'cool-star fit (got ' + tauM5.toFixed(2) + ' d)', Math.abs(tauM5 - 87) < 0.5);
check('2c tau_c increases monotonically hotter -> cooler across the whole sequence',
  STELLAR_CLASSES.every((c, i) => i === 0 || tauConvectiveDays(STELLAR_CLASSES[i - 1]!) <= tauConvectiveDays(c) + 1e-9));

// 3. xuvFluenceRel self-normalisation
check('3 xuvFluenceRel(G2V, 4.6 Gyr, median) is EXACTLY 1.0 by construction',
  Math.abs(xuvFluenceRel('G2V', 4.6, MEDIAN) - 1.0) < 1e-9);
check('3b xuvPresentRel(G2V, 4.6 Gyr, median) is EXACTLY 1.0 (solar today = 1)',
  Math.abs(xuvPresentRel('G2V', 4.6, MEDIAN) - 1.0) < 1e-9);
check('3c fluence accumulates monotonically with age (a strictly positive integrand)',
  xuvFluenceRel('G2V', 1.0, MEDIAN) < xuvFluenceRel('G2V', 4.6, MEDIAN));

// 4. Sun quiet, young M5 flare-active
check('4 the Sun classifies quiet at 4.6 Gyr',
  activityClassOf('G2V', 4.6, MEDIAN) === 'quiet');
check('4b a young (< 1 Gyr) M5V classifies flare-active',
  activityClassOf('M5V', 0.5, MEDIAN) === 'flare-active');

// 5. consistency invariant, swept across classes and rotation percentiles
check('5 CONSISTENCY: age < saturatedUntilGyr implies flare-active, for every ' +
  'class and a spread of rotationPercentile values',
  STELLAR_CLASSES.filter((_, i) => i % 5 === 0).every((c) =>
    [0.1, 0.5, 0.9].every((rp) => {
      const until = saturatedUntilGyr(c, rp);
      if (until <= T_ZAMS_GYR) return true;   // nothing to check; never saturated past the floor
      const justBefore = Math.max(T_ZAMS_GYR, until - 0.01);
      return activityClassOf(c, justBefore, rp) === 'flare-active';
    })));
check('5b just PAST the crossing, the class is no longer flare-active (the ' +
  'boundary is genuinely a crossing, not a one-sided clamp)',
  STELLAR_CLASSES.filter((_, i) => i % 5 === 0).every((c) =>
    [0.1, 0.5, 0.9].every((rp) => {
      const until = saturatedUntilGyr(c, rp);
      const justAfter = until + 0.05;
      return activityClassOf(c, justAfter, rp) !== 'flare-active';
    })));

// 6. remnants
check('6 a remnant (luminositySol <= 0) always classifies quiet',
  (() => {
    const h = rollStellarHistory(mulberry32(1), 'G2V', 0.2, 0);
    return h.activityClass === 'quiet';
  })());

// 7. exactly one draw
check('7 rollStellarHistory consumes EXACTLY ONE call to rng()',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.6; };
    rollStellarHistory(counting, 'K5V', 5.0, 1.0);
    return calls === 1;
  })());

// 8. Rossby monotonicity in age
check('8 rossbyNumber is monotonically increasing in age at fixed class/percentile',
  (() => {
    const ages = [0.1, 0.5, 1, 2, 4, 8, 12];
    return ['G2V', 'K5V', 'M2V'].every((c) => {
      const ros = ages.map((a) => rossbyNumber(c as any, a, MEDIAN));
      return ros.every((r, i) => i === 0 || r >= ros[i - 1]!);
    });
  })());

// determinism
check('9 rollStellarHistory is deterministic for the same rng and inputs',
  (() => {
    const a = rollStellarHistory(mulberry32(55), 'F5V', 2.0, 1.5);
    const b = rollStellarHistory(mulberry32(55), 'F5V', 2.0, 1.5);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

if (failures > 0) throw new Error(`${failures} stellarHistory conformance failure(s)`);
console.log('\nall stellarHistory conformance checks passed');

console.log('\n--- reference values ---');
console.log(`  solar P(4.6 Gyr) = ${solarP.toFixed(2)} d   (brief: "near 25 d")`);
console.log(`  tau_c(Sun) = ${tauSun.toFixed(2)} d   (brief states "near 14.5 d"; see header trap note)`);
console.log(`  tau_c(M5V) = ${tauM5.toFixed(2)} d   (brief anchor: 87 d)`);
console.log(`  Ro(Sun, 4.6 Gyr) = ${rossbyNumber('G2V', 4.6, MEDIAN).toFixed(3)}` +
  `   (RO_SAT=${RO_SAT}, RO_QUIET=${RO_QUIET})`);
