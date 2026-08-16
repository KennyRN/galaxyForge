import { terraformabilityOf, evaluateTerraforming, requiredScoreThreshold } from './terraforming';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const EARTH_LIKE = terraformabilityOf(288, 1.0, true);
const HARSH = terraformabilityOf(600, 4.0, false);   // deliberately infeasible - hot, heavy, airless

const DIALS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
const FEASIBILITY_THRESHOLD = 0.3;
const CAP = 0.95;

// 1. terraformabilityOf purely deterministic
check('1 terraformabilityOf takes no Rng - same inputs always give the same score',
  terraformabilityOf(288, 1.0, true).score === terraformabilityOf(288, 1.0, true).score);

// 2. evaluateTerraforming purely deterministic
check('2 evaluateTerraforming is deterministic - same inputs, same output, always, across every dial combination',
  DIALS.every((c) => DIALS.every((i) => {
    const a = evaluateTerraforming(EARTH_LIKE, c, i);
    const b = evaluateTerraforming(EARTH_LIKE, c, i);
    return JSON.stringify(a) === JSON.stringify(b);
  })));

// 3. requiredScoreThreshold always lands in [FEASIBILITY_THRESHOLD, CAP]
check('3 requiredScoreThreshold lands in [FEASIBILITY_THRESHOLD, CAP] for every (coverage, intensity) pair in 0-6',
  DIALS.every((c) => DIALS.every((i) => {
    const t = requiredScoreThreshold(c, i);
    return t >= FEASIBILITY_THRESHOLD - 1e-12 && t <= CAP + 1e-12;
  })));

// 4. monotonic non-increasing in coverage, at fixed intensity
check('4 requiredScoreThreshold is monotonically non-increasing in coverage, at every fixed intensity',
  DIALS.every((i) => {
    const seq = DIALS.map((c) => requiredScoreThreshold(c, i));
    return seq.every((v, k) => k === 0 || v <= seq[k - 1]! + 1e-12);
  }));

// 5. monotonic non-increasing in intensity, at fixed coverage
check('5 requiredScoreThreshold is monotonically non-increasing in intensity, at every fixed coverage',
  DIALS.every((c) => {
    const seq = DIALS.map((i) => requiredScoreThreshold(c, i));
    return seq.every((v, k) => k === 0 || v <= seq[k - 1]! + 1e-12);
  }));

// 6. coverage=6, intensity=6 -> exactly FEASIBILITY_THRESHOLD
check('6 coverage=6, intensity=6 gives requiredScoreThreshold === FEASIBILITY_THRESHOLD exactly - ' +
  'the "every physically feasible world" boundary',
  Math.abs(requiredScoreThreshold(6, 6) - FEASIBILITY_THRESHOLD) < 1e-12);

// 7. coverage=0 -> exactly CAP, regardless of intensity
check('7 coverage=0 gives requiredScoreThreshold === CAP exactly, at every intensity - ' +
  '"only the very best, no matter the reach"',
  DIALS.every((i) => Math.abs(requiredScoreThreshold(0, i) - CAP) < 1e-12));

// 8. an infeasible world is NEVER terraformed, at any dial combination
check('8 a world with feasible === false is never terraformed, at any (coverage, intensity) combination - ' +
  'the physical floor always wins over both authoring dials',
  !HARSH.feasible && DIALS.every((c) => DIALS.every((i) => evaluateTerraforming(HARSH, c, i).terraformed === null)));

// 8b. the converse - a genuinely ideal world IS terraformed at full reach/coverage
check('8b a near-ideal, feasible world (score above CAP would be needed to fail even coverage=0) ' +
  'IS terraformed at coverage=6, intensity=6 (the widest setting)',
  EARTH_LIKE.feasible && evaluateTerraforming(EARTH_LIKE, 6, 6).terraformed !== null);

// 9. agentRef always unset
check('9 agentRef is undefined on every procedurally-placed record, across every dial combination',
  DIALS.every((c) => DIALS.every((i) => {
    const d = evaluateTerraforming(EARTH_LIKE, c, i);
    return !d.terraformed || d.terraformed.agentRef === undefined;
  })));

// 10. every terraformed world gets the identical, full types set
check('10 every terraformed world gets the identical, full 5-type set',
  (() => {
    const full = ['atmospheric', 'thermal', 'hydrological', 'biological', 'ecological'];
    const d = evaluateTerraforming(EARTH_LIKE, 6, 6);
    return d.terraformed !== null && JSON.stringify(d.terraformed.types) === JSON.stringify(full);
  })());

// + realised fields are null exactly when unterraformed, non-null exactly when terraformed
check('+ realisedComposition/realisedPressureClass/realisedMeanTempK are null iff not terraformed',
  DIALS.every((c) => DIALS.every((i) => {
    const d = evaluateTerraforming(EARTH_LIKE, c, i);
    const terraformed = d.terraformed !== null;
    return terraformed
      ? d.realisedComposition !== null && d.realisedPressureClass !== null && d.realisedMeanTempK !== null
      : d.realisedComposition === null && d.realisedPressureClass === null && d.realisedMeanTempK === null;
  })));

if (failures > 0) throw new Error(`${failures} terraforming conformance failure(s)`);
console.log('\nall terraforming conformance checks passed');
