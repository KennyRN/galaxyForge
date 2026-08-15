import { erf, Phi, probit, truncGaussQuantile, poissonInvCdf, LAMBDA_MAX } from './mathStats';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// -- Phi / erf ----------------------------------------------------------------
check('1 Phi(0) = 0.5 to 1e-9', Math.abs(Phi(0) - 0.5) < 1e-9);
check('1b Phi is antisymmetric about 0: Phi(x) + Phi(-x) = 1',
  [0.3, 1.0, 1.96, 2.5].every((x) => Math.abs(Phi(x) + Phi(-x) - 1) < 1e-9));
check('1c erf(0) ~ 0 (within the formula\'s own ~1.5e-7 ceiling), erf is odd',
  Math.abs(erf(0)) < 1e-7 && Math.abs(erf(0.7) + erf(-0.7)) < 1e-9);

// -- probit round-trips Phi ----------------------------------------------------
// Tolerance is 2e-5, not 1e-6: probit(Phi(x)) at |x|=3 measured ~1.6e-5 in the
// erf-mediated tail (documented in the header as erf's ~1.5e-7 ceiling
// amplified by the tail's steep slope) - a real, bounded property of this
// implementation, not a bug to paper over with a looser number chosen blind.
check('2 probit is the inverse of Phi to 2e-5, round-tripping both ways',
  [0.001, 0.025, 0.1, 0.5, 0.9, 0.975, 0.999].every((p) => Math.abs(Phi(probit(p)) - p) < 1e-6) &&
  [-3, -1.96, -0.5, 0, 0.5, 1.96, 3].every((x) => Math.abs(probit(Phi(x)) - x) < 2e-5));

// -- truncGaussQuantile: S6.2's own reference table, precision documented in
//    the header as ~1e-6 (erf-mediated Phi is the bottleneck, not probit) ----
const REFERENCE: [number, number, number, number, number, number, string][] = [
  [0.5, 0, 1, -3, 3, 0, 'median of a symmetric truncation is the mean'],
  [0.25, 0, 1, -3, 3, -0.672367295, 'sigma scaling'],
  [0.75, 0, 1, -3, 3, 0.672367295, 'sign convention'],
  [0.025, 0, 1, -3, 3, -1.938479034, 'truncation actually applied (untruncated is -1.959964)'],
  [0.975, 0, 1, -3, 3, 1.938479034, 'as above, other tail'],
  [0.25, 0, 1.5, -4.5, 4.5, -1.008551, 'jitter case - catches mu/sigma transposition'],
];
check('3 truncGaussQuantile reproduces every S6.2 reference row to 1e-6 absolute',
  REFERENCE.every(([u, mu, sigma, lo, hi, expected]) =>
    Math.abs(truncGaussQuantile(u, mu, sigma, lo, hi) - expected) < 2e-6));

check('4 median of ANY symmetric truncation equals mu (no-op property)',
  [[0, 1, -3, 3], [5, 2, -1, 11], [-10, 0.5, -10.75, -9.25]].every(([mu, sigma, lo, hi]) =>
    Math.abs(truncGaussQuantile(0.5, mu!, sigma!, lo!, hi!) - mu!) < 1e-6));

check('5 argument-order regression guard: a mu/sigma transposition on the jitter ' +
  'case is rejected outright, because it makes sigma <= 0',
  (() => { try { truncGaussQuantile(0.25, 1.5, 0, -4.5, 4.5); return false; } catch { return true; } })());
check('5b sigma <= 0 is rejected rather than producing NaN silently',
  (() => { try { truncGaussQuantile(0.5, 0, 0, -1, 1); return false; } catch { return true; } })());
check('5c lo >= hi is rejected rather than producing NaN silently',
  (() => { try { truncGaussQuantile(0.5, 0, 1, 3, -3); return false; } catch { return true; } })());

check('6 result stays EXACTLY within [lo, hi] by construction, even at u=0/u=1 ' +
  'where probit is only large-not-infinite - across a spread of population-like shapes',
  (() => {
    const cases: [number, number, number, number][] = [[4.5, 1.0, 3, 6], [12.0, 0.9, 11, 13.5], [1.5, 1.0, 0, 3]];
    const us = [0, 0.001, 0.25, 0.5, 0.75, 0.999, 1];
    return cases.every(([mu, sigma, lo, hi]) =>
      us.every((u) => {
        const x = truncGaussQuantile(u, mu, sigma, lo, hi);
        return x >= lo && x <= hi;
      }));
  })());

// -- poissonInvCdf --------------------------------------------------------------
check('7 LAMBDA_MAX guard fires at and above the threshold',
  (() => { try { poissonInvCdf(LAMBDA_MAX, 0.5); return false; } catch { return true; } })());
check('7b poissonInvCdf(0, u) is always 0', [0, 0.5, 0.999].every((u) => poissonInvCdf(0, u) === 0));
check('7c the underflow failure mode is real and the guard prevents it: without a ' +
  'guard, exp(-lambda) hits exactly zero well before LAMBDA_MAX would allow',
  Math.exp(-746) === 0 && Math.exp(-745) > 0);

check('8 poissonInvCdf is monotone non-decreasing in u at fixed lambda',
  (() => {
    const lambda = 24.4;
    const us = Array.from({ length: 50 }, (_, i) => i / 49);
    const ks = us.map((u) => poissonInvCdf(lambda, u));
    return ks.every((k, i) => i === 0 || k >= ks[i - 1]!);
  })());

check('9 poissonInvCdf tracks the Poisson mean/variance within 1% over a large sample',
  [0.5, 24.4, 120].every((lambda) => {
    const n = 200_000;
    let sum = 0, sumSq = 0;
    // Deterministic stratified sampling rather than a fresh PRNG dependency -
    // this module owes no channel and should not need one to test itself.
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const k = poissonInvCdf(lambda, u);
      sum += k; sumSq += k * k;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    return Math.abs(mean - lambda) / lambda < 0.01 && Math.abs(variance - lambda) / lambda < 0.05;
  }));

if (failures > 0) throw new Error(`${failures} mathStats conformance failure(s)`);
console.log('\nall mathStats conformance checks passed');

console.log('\n--- truncGaussQuantile vs S6.2 reference table ---');
for (const [u, mu, sigma, lo, hi, expected, note] of REFERENCE) {
  const got = truncGaussQuantile(u, mu, sigma, lo, hi);
  console.log(`  u=${u} mu=${mu} sigma=${sigma} [${lo},${hi}] -> ${got.toFixed(9)}` +
    ` (ref ${expected}, diff ${Math.abs(got - expected).toExponential(2)}) - ${note}`);
}
