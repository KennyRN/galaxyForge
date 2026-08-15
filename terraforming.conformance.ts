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
      const d = rollTerraforming(mulberry32(seed), EARTH_LIKE, 6, BASE_COMPOSITION, 200);
      if (d.terraformed && d.terraformed.agentRef !== undefined) return false;
    }
    return true;
  })());

// 3. terraformScale=0 never places
check('3 terraformScale = 0 never places terraforming, regardless of feasibility',
  (() => {
    for (let seed = 0; seed < 300; seed++) {
      const d = rollTerraforming(mulberry32(seed), EARTH_LIKE, 0, BASE_COMPOSITION, 200);
      if (d.terraformed !== null) return false;
    }
    return true;
  })());

// 4. higher terraformScale never decreases placement rate
function placementRate(scale: number, n: number): number {
  let placed = 0;
  for (let seed = 0; seed < n; seed++) {
    if (rollTerraforming(mulberry32(seed + 10000), EARTH_LIKE, scale, BASE_COMPOSITION, 200).terraformed) placed++;
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
    rollTerraforming(counting, EARTH_LIKE, 0, BASE_COMPOSITION, 200);
    return calls === 1;
  })());
check('5b rollTerraforming consumes exactly TWO draws when placed',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.001; };   // guaranteed placement at scale=6
    rollTerraforming(counting, EARTH_LIKE, 6, BASE_COMPOSITION, 200);
    return calls === 2;
  })());

// 6. completeness/types monotonicity
check('6 higher completeness never has fewer terraform types than a lower one, ' +
  'over many placed draws',
  (() => {
    const order = ['planned', 'partial', 'substantial', 'complete'];
    for (let seed = 0; seed < 2000; seed++) {
      const d = rollTerraforming(mulberry32(seed), EARTH_LIKE, 6, BASE_COMPOSITION, 200);
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
    const a = rollTerraforming(mulberry32(42), EARTH_LIKE, 6, BASE_COMPOSITION, 200);
    const b = rollTerraforming(mulberry32(42), EARTH_LIKE, 6, BASE_COMPOSITION, 200);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

if (failures > 0) throw new Error(`${failures} terraforming conformance failure(s)`);
console.log('\nall terraforming conformance checks passed');
