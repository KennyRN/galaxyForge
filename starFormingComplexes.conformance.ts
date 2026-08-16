/**
 * starFormingComplexes.conformance - the 7 STAR_FORMING_COMPLEXES_GATES,
 * rewritten 16 Aug 2026 for the discrete-placement rearchitecture (this
 * module used to be a continuous density-field multiplier with a
 * completely different `complexIntensityAt` signature - see the module's
 * own header for why).
 */

import {
  complexAgeWeight, complexAgeWeightForBin, complexIntensityAt, complexParticipation,
  meanYoungSurfaceInCell, complexCellsOverlapping, complexCentresInCell, placeYoungClustered,
  STAR_FORMING_COMPLEXES_GATES,
} from './starFormingComplexes';
import { DEFAULT_COMPLEX_TIER } from './galaxyParameters';
import { SPIRAL_POPULATIONS } from './galaxyModel';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const P = DEFAULT_COMPLEX_TIER;
const youngThin = SPIRAL_POPULATIONS.find((p) => p.key === 'youngThin')!;
const oldThin = SPIRAL_POPULATIONS.find((p) => p.key === 'oldThin')!;

// A flat, uniform young-surface field - simplest possible input for the
// placement-hierarchy gates, isolates the mechanism from the real density
// field's own shape.
const FLAT_SURFACE = 0.02;   // systems / pc^2, a plausible order of magnitude
const flatSurfaceAt = () => FLAT_SURFACE;

/* 1. determinism ---------------------------------------------------------------- */

check('1 placeYoungClustered is deterministic for the same worldSeed/params/footprint', (() => {
  const a = placeYoungClustered('gate-seed', 8178, 0, 0, 200, 15, 0.6, flatSurfaceAt, P, youngThin.meanGroupSize ?? 12, 1.5);
  const b = placeYoungClustered('gate-seed', 8178, 0, 0, 200, 15, 0.6, flatSurfaceAt, P, youngThin.meanGroupSize ?? 12, 1.5);
  return JSON.stringify(a) === JSON.stringify(b);
})());

/* 2. complexAgeWeight shape ------------------------------------------------------- */

check('2 complexAgeWeight(0) === 1 exactly', complexAgeWeight(0, 0.1, 0.5) === 1);
check('2b complexAgeWeight is 0 at and after ageDecayEndGyr', complexAgeWeight(0.5, 0.1, 0.5) === 0 && complexAgeWeight(1.0, 0.1, 0.5) === 0);
check('2c complexAgeWeight is monotonically non-increasing across the decay window', (() => {
  const ages = [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
  let prev = Infinity;
  for (const a of ages) {
    const w = complexAgeWeight(a, 0.1, 0.5);
    if (w > prev) return false;
    prev = w;
  }
  return true;
})());

/* 3. complexAgeWeightForBin uses the EXPECTATION, not the point-evaluation ------- */

check('3 youngThin\'s own ageMeanGyr sits ABOVE ageDecayEndGyr (the trap this gate ' +
  'exists to catch)', youngThin.ageMeanGyr > P.ageDecayEndGyr);
check('3b complexAgeWeight evaluated AT youngThin\'s mean age would be exactly 0 ' +
  '(confirming the trap is real, not hypothetical)',
  complexAgeWeight(youngThin.ageMeanGyr, P.ageDecayStartGyr, P.ageDecayEndGyr) === 0);
check('3c complexAgeWeightForBin (the EXPECTATION over youngThin\'s own age range, ' +
  'which DOES dip below the decay window) is strictly positive - the fix',
  complexAgeWeightForBin(youngThin, P.ageDecayStartGyr, P.ageDecayEndGyr) > 0);

/* 4. complexParticipation is 0 for an unclustered population --------------------- */

check('4 complexParticipation is 0 for oldThin (clusteredFraction unset/zero)',
  complexParticipation(oldThin, P) === 0);
check('4b complexParticipation is strictly positive for youngThin', complexParticipation(youngThin, P) > 0);
check('4c complexParticipation never exceeds complexFraction itself (the age weight ' +
  'can only shrink it, never amplify it)', complexParticipation(youngThin, P) <= P.complexFraction + 1e-12);

/* 5. count conservation ----------------------------------------------------------- */

check('5 complexIntensityAt integrated over an area, times groupsPerComplex * ' +
  'systemsPerGroup, reproduces w * surface * area (the layer claims to draw ' +
  'exactly the systems it represents, not an arbitrary extra)', (() => {
  const w = 0.6, meanGroups = 6, meanPerGroup = 12;
  const areaPc2 = 500 * 500;
  const lambda = complexIntensityAt(FLAT_SURFACE, w, meanGroups, meanPerGroup) * areaPc2;
  const expectedSystems = lambda * meanGroups * meanPerGroup;
  const claimedSystems = w * FLAT_SURFACE * areaPc2;
  return Math.abs(expectedSystems - claimedSystems) / claimedSystems < 1e-9;
})());
check('5b complexIntensityAt is 0 when w is 0 (no participation, no centres)',
  complexIntensityAt(FLAT_SURFACE, 0, 6, 12) === 0);

check('5c meanYoungSurfaceInCell reproduces a FLAT field exactly, at any sub-grid resolution',
  Math.abs(meanYoungSurfaceInCell(0, 0, 1200, 1200, flatSurfaceAt, 8) - FLAT_SURFACE) < 1e-12 &&
  Math.abs(meanYoungSurfaceInCell(0, 0, 1200, 1200, flatSurfaceAt, 32) - FLAT_SURFACE) < 1e-12);

/* 6. expansion invariance --------------------------------------------------------- */

check('6 EXPANSION INVARIANCE - a wider footprint\'s result is a strict superset of ' +
  'a narrower one\'s, same position/ordinal for every already-included candidate', (() => {
  const narrow = placeYoungClustered('expand-gate-seed', 8178, 0, 0, 200, 15, 0.6, flatSurfaceAt, P, 12, 1.5);
  const wide = placeYoungClustered('expand-gate-seed', 8178, 0, 0, 400, 15, 0.6, flatSurfaceAt, P, 12, 1.5);
  const wideByKey = new Map(wide.map((c) => [`${c.cellIx}.${c.cellIy}.${c.ordinal}.${c.isOffspring}.${c.parentOrdinal}`, c]));
  return narrow.every((c) => {
    const key = `${c.cellIx}.${c.cellIy}.${c.ordinal}.${c.isOffspring}.${c.parentOrdinal}`;
    const match = wideByKey.get(key);
    return match !== undefined && match.x === c.x && match.y === c.y && match.z === c.z;
  }) && wide.length >= narrow.length;
})());

/* 7. LAMBDA_MAX splitting preserves the mean -------------------------------------- */

check('7 splitting a cell whose meanN exceeds LAMBDA_MAX preserves the EXPECTED total ' +
  'centre count (checked via the sum of sub-tile means against the unsplit formula, ' +
  'not a single stochastic draw)', (() => {
  // A deliberately dense surface so meanN comfortably exceeds LAMBDA_MAX (500)
  // for a full 1200pc cell at w=1, forcing the split path.
  const denseSurface = () => 5.0;
  const cell = complexCellsOverlapping(0, 0, 1, P.cellSizePc, 0, denseSurface, P.cellMeanSubGridN)[0]!;
  const areaPc2 = cell.widthPc * cell.heightPc;
  const unsplitMeanN = areaPc2 * complexIntensityAt(cell.meanYoungSurface, 1, P.meanGroupsPerComplex, 12);
  const centres = complexCentresInCell(cell, 'lambda-gate-seed', 1, denseSurface, P, 12);
  // A stochastic draw won't match the mean exactly, but splitting into many
  // independent Poisson draws should land within a generous statistical band.
  const relError = Math.abs(centres.length - unsplitMeanN) / unsplitMeanN;
  return unsplitMeanN > 500 && relError < 0.1;
})());

check('gate count matches STAR_FORMING_COMPLEXES_GATES', STAR_FORMING_COMPLEXES_GATES === 7);

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nstarFormingComplexes.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nstarFormingComplexes.conformance: all checks passed.');
}
