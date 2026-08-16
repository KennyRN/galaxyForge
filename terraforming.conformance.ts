import { terraformabilityOf, rollTerraforming } from './terraforming';
import { mulberry32, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const EARTH_LIKE = terraformabilityOf(288, 1.0, true);
const BASE_COMPOSITION = [{ species: 'CO2', fraction: 0.95 }, { species: 'N2', fraction: 0.03 }, { species: 'other', fraction: 0.02 }];

// 1. purely deterministic
check('1 terraformabilityOf takes no Rng - same inputs always give the same score',
  terraformabilityOf(288, 1.0, true).score === terraformabilityOf(288, 1.0, true).score);

// 2. agentRef always unset on procedural placement
check('2 agentRef is undefined on every procedurally-placed record, across many draws',
  (() => {
    for (let seed = 0; seed < 500; seed++) {
      const d = rollTerraforming(mulberry32(seed), EARTH_LIKE, 6, 3, BASE_COMPOSITION, 200);
      if (d.terraformed && d.terraformed.agentRef !== undefined) return false;
    }
    return true;
  })());

// 3. terraformScale=0 never places
check('3 terraformScale = 0 never places terraforming, regardless of feasibility',
  (() => {
    for (let seed = 0; seed < 300; seed++) {
      const d = rollTerraforming(mulberry32(seed), EARTH_LIKE, 0, 3, BASE_COMPOSITION, 200);
      if (d.terraformed !== null) return false;
    }
    return true;
  })());

// 4. higher terraformScale never decreases placement rate
function placementRate(scale: number, n: number): number {
  let placed = 0;
  for (let seed = 0; seed < n; seed++) {
    if (rollTerraforming(mulberry32(seed + 10000), EARTH_LIKE, scale, 3, BASE_COMPOSITION, 200).terraformed) placed++;
  }
  return placed / n;
}
check('4 higher terraformScale never decreases the placement rate (measured)',
  (() => {
    const scales = [0, 1, 2, 3, 4, 5, 6];
    const rates = scales.map((s) => placementRate(s, 3000));
    return rates.every((r, i) => i === 0 || r >= rates[i - 1]! - 1e-9);
  })());

// 5. draw counts
check('5 rollTerraforming consumes exactly ONE draw when unplaced (scale=0)',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.5; };
    rollTerraforming(counting, EARTH_LIKE, 0, 3, BASE_COMPOSITION, 200);
    return calls === 1;
  })());
check('5b rollTerraforming consumes exactly TWO draws when placed',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.001; };   // guaranteed placement at scale=6
    rollTerraforming(counting, EARTH_LIKE, 6, 3, BASE_COMPOSITION, 200);
    return calls === 2;
  })());
check('5c draw count is UNCHANGED by terraformIntensity, at every intensity level - ' +
  'the two-axis design reshapes the second draw, it never adds a third',
  (() => {
    for (let intensity = 0; intensity <= 6; intensity++) {
      let calls = 0;
      const counting: Rng = () => { calls++; return 0.001; };
      rollTerraforming(counting, EARTH_LIKE, 6, intensity, BASE_COMPOSITION, 200);
      if (calls !== 2) return false;
    }
    return true;
  })());

// 6. completeness/types monotonicity
check('6 higher completeness never has fewer terraform types than a lower one, ' +
  'over many placed draws',
  (() => {
    const order = ['planned', 'partial', 'substantial', 'complete'];
    for (let seed = 0; seed < 2000; seed++) {
      const d = rollTerraforming(mulberry32(seed), EARTH_LIKE, 6, 3, BASE_COMPOSITION, 200);
      if (!d.terraformed) continue;
      const rank = order.indexOf(d.terraformed.completeness);
      const minTypesForRank = [2, 2, 3, 5];   // planned/partial: 2 types; substantial: 3; complete: 5
      if (d.terraformed.types.length < minTypesForRank[rank]!) return false;
    }
    return true;
  })());

// 7. determinism
check('7 rollTerraforming is deterministic for the same rng sequence and inputs',
  (() => {
    const a = rollTerraforming(mulberry32(42), EARTH_LIKE, 6, 3, BASE_COMPOSITION, 200);
    const b = rollTerraforming(mulberry32(42), EARTH_LIKE, 6, 3, BASE_COMPOSITION, 200);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

// 8. terraformIntensity moves the DEGREE distribution, coverage untouched
// (16 Aug 2026, the two-axis fix itself).
function meanCompletenessRank(intensity: number, n: number): number {
  const order = ['planned', 'partial', 'substantial', 'complete'];
  let sum = 0, placed = 0;
  for (let seed = 0; seed < n; seed++) {
    // scale fixed at 6 (always placed when feasible) so every draw below
    // reaches the completeness roll - isolating intensity's own effect.
    const d = rollTerraforming(mulberry32(seed + 20000), EARTH_LIKE, 6, intensity, BASE_COMPOSITION, 200);
    if (!d.terraformed) continue;
    sum += order.indexOf(d.terraformed.completeness);
    placed++;
  }
  return placed > 0 ? sum / placed : -1;
}
check('8a higher terraformIntensity never decreases mean completeness rank, at fixed scale/feasibility',
  (() => {
    const levels = [0, 1, 2, 3, 4, 5, 6];
    const means = levels.map((i) => meanCompletenessRank(i, 4000));
    return means.every((m, i) => i === 0 || m >= means[i - 1]! - 1e-9);
  })());
check('8b terraformIntensity = 0 and terraformIntensity = 6 are genuinely DIFFERENT ' +
  'distributions from the midpoint (3) - not a dial that silently does nothing',
  (() => {
    const lo = meanCompletenessRank(0, 4000), mid = meanCompletenessRank(3, 4000), hi = meanCompletenessRank(6, 4000);
    return lo < mid - 0.15 && hi > mid + 0.15;
  })());
check('8c terraformIntensity = 3 (the midpoint) reproduces the ORIGINAL uniform ' +
  'completeness draw exactly, for continuity with every prior single-axis draw',
  (() => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = mulberry32(seed);
      const uPlace = rng();
      const placementProbability = Math.min(1, (6 / 6) * EARTH_LIKE.score);
      if (uPlace >= placementProbability) continue;
      const uCompletenessDirect = rng();
      const expectedIdx = Math.min(3, Math.floor(uCompletenessDirect * 4));
      const d = rollTerraforming(mulberry32(seed), EARTH_LIKE, 6, 3, BASE_COMPOSITION, 200);
      const order = ['planned', 'partial', 'substantial', 'complete'];
      if (!d.terraformed || order.indexOf(d.terraformed.completeness) !== expectedIdx) return false;
    }
    return true;
  })());

if (failures > 0) throw new Error(`${failures} terraforming conformance failure(s)`);
console.log('\nall terraforming conformance checks passed');
