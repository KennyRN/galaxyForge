/**
 * starFormingComplexes.conformance - the 5 STAR_FORMING_COMPLEXES_GATES,
 * plus a direct demonstration that this module's own honesty claim (its own
 * header: "not a byte-identical reconstruction, a real interpretive
 * mechanism") does not mean untested.
 */

import { complexIntensityAt, STAR_FORMING_COMPLEXES_GATES } from './starFormingComplexes';
import { makeDefaultGalaxyParameters, type GalaxyParameters } from './galaxyParameters';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const params = makeDefaultGalaxyParameters('gate-seed');
const CF = 0.6;   // stand-in complexFraction - the real value is injected by galaxyModel.ts from youngThin.clusteredFraction

/* 1. determinism -------------------------------------------------------------- */

check('complexIntensityAt is deterministic for the same inputs', (() => {
  const a = complexIntensityAt('gate-seed', params, CF, 8200, 137, 4);
  const b = complexIntensityAt('gate-seed', params, CF, 8200, 137, 4);
  return a === b;
})());

check('a different worldSeed changes the result (channel isolation) - checked across many points, since any ONE point may legitimately see zero complexes under both seeds', (() => {
  for (let i = 0; i < 50; i++) {
    const x = (i * 977) % 20000, y = (i * 613) % 20000, z = 0;
    const a = complexIntensityAt('gate-seed-A', params, CF, x, y, z);
    const b = complexIntensityAt('gate-seed-B', params, CF, x, y, z);
    if (a !== b) return true;
  }
  return false;
})());

/* 2. far-field limit ------------------------------------------------------------ */

check('complexIntensityAt === 1 exactly, far from every complex (empty region, tiny guard band)', (() => {
  const tinyGuard: GalaxyParameters = { ...params, complexTier: { ...params.complexTier, guardBandSigma: 0 } };
  return complexIntensityAt('gate-seed', tinyGuard, CF, 8200, 137, 4) === 1;
})());

/* 3. never below 1 -------------------------------------------------------------- */

check('complexIntensityAt never drops below 1, sampled across many points', (() => {
  for (let i = 0; i < 300; i++) {
    const x = (i * 977) % 20000, y = (i * 613) % 20000, z = ((i * 331) % 2000) - 1000;
    if (complexIntensityAt('gate-seed', params, CF, x, y, z) < 1) return false;
  }
  return true;
})());

/* 4. age decay -------------------------------------------------------------------- */

{
  // Exercise ageFactor's shape indirectly: force a single complex at age 0
  // (via a params override that hands ageDecayEndGyr as if the draw always
  // lands young) is not directly reachable without exposing the internal
  // `ageFactor` - so this gate checks the DOCUMENTED invariant on the
  // exported surface instead: shrinking ageDecayEndGyr toward
  // ageDecayStartGyr (spending complexes faster) never INCREASES the
  // average boost across many sample points, for a fixed seed.
  function meanBoost(p: GalaxyParameters): number {
    let sum = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      const x = (i * 733) % 20000, y = (i * 419) % 20000, z = 0;
      sum += complexIntensityAt('gate-seed', p, CF, x, y, z); n++;
    }
    return sum / n;
  }
  const longLived: GalaxyParameters = { ...params, complexTier: { ...params.complexTier, ageDecayStartGyr: 0.4, ageDecayEndGyr: 2.0 } };
  const shortLived: GalaxyParameters = { ...params, complexTier: { ...params.complexTier, ageDecayStartGyr: 0.001, ageDecayEndGyr: 0.002 } };
  check('shortening the age-decay window never increases the mean boost across many points', meanBoost(shortLived) <= meanBoost(longLived) + 1e-9);
}

/* 5. guard-band consistency - a wider guard band only ADDS non-negative
 *    contributions relative to a narrower one at the same point, never
 *    removes or double-counts what the narrower band already found ------- */

check('a wider guard band never produces a SMALLER boost than a narrower one, at the same point', (() => {
  const narrow: GalaxyParameters = { ...params, complexTier: { ...params.complexTier, guardBandSigma: 1 } };
  const wide: GalaxyParameters = { ...params, complexTier: { ...params.complexTier, guardBandSigma: 6 } };
  let ok = true;
  for (let i = 0; i < 100; i++) {
    const x = (i * 857) % 20000, y = (i * 271) % 20000, z = 0;
    if (complexIntensityAt('gate-seed', wide, CF, x, y, z) < complexIntensityAt('gate-seed', narrow, CF, x, y, z) - 1e-12) { ok = false; break; }
  }
  return ok;
})());

check('gate count matches STAR_FORMING_COMPLEXES_GATES', STAR_FORMING_COMPLEXES_GATES === 5);

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nstarFormingComplexes.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nstarFormingComplexes.conformance: all checks passed.');
}
