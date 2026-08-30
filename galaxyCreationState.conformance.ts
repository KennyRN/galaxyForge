/**
 * galaxyCreationState.conformance - the pure GUI state/reactive-arithmetic
 * layer. No Obsidian dependency here, so this is fully gatable like every
 * other module in the project, unlike the actual screens.
 */

import {
  resolveModelName, resolveBarEnabled, sizeStepsFor, sizeValueFor, sizeIsMass,
  thicknessPcFor, sysTypeToSearchCriterion, centrePcFromPolar, reconcileSizeFields,
  sizeInPcForTargetCount, targetCountForSizeInPc, defaultScreen2Draft, assembleSearchCriteria,
  defaultScreen1Draft, solNeighbourhoodBand, rollSolNeighbourhoodCentre,
  type MorphologyChoice, type Screen2Draft,
} from './galaxyCreationState';
import { createSpiralModel } from './galaxyModel';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

/* -- screen 1: default draft, with settings-persistence overrides (16 Aug 2026) -- */

check('defaultScreen1Draft() with no overrides matches the original hardcoded defaults',
  (() => {
    const d = defaultScreen1Draft();
    return d.morphology === 'spiral' && d.sizeStepIndex === 2 && d.worldSeed === '' &&
      d.terraformScale === 3 && d.terraformIntensity === 3 && d.lenticularBulgeType === 'composite';
  })());
check('defaultScreen1Draft(overrides) applies ONLY the given overrides, leaving ' +
  'every other field at its normal default - main.ts\'s own persisted-settings ' +
  'seed can supply worldSeed alone without having to know every other field',
  (() => {
    const d = defaultScreen1Draft({ worldSeed: 'persisted-seed-123' });
    return d.worldSeed === 'persisted-seed-123' && d.morphology === 'spiral' && d.terraformScale === 3 && d.terraformIntensity === 3;
  })());

/* -- screen 2: default draft, with settings-persistence overrides (16 Aug 2026) -- */

check('defaultScreen2Draft() with no overrides matches the original hardcoded defaults',
  (() => {
    const d = defaultScreen2Draft();
    return d.sysDensity === 'standard' && d.footprintShape === 'circle' && d.angleRad === 0 &&
      d.distanceFromCentrePc === 8178 && d.distanceFromPlanePc === 0 && d.sizeEditMode === 'sizeInPc' && d.sizeInPc === 25;
  })());
check('defaultScreen2Draft(overrides) applies ONLY the given overrides, leaving every ' +
  'other field at its normal default - a direct user report ("everything is reset" ' +
  'on leaving and returning to Screen 2) that this parameter (previously absent) fixes',
  (() => {
    const d = defaultScreen2Draft({ angleRad: 1.2, distanceFromCentrePc: 5000 });
    return d.angleRad === 1.2 && d.distanceFromCentrePc === 5000 && d.sysDensity === 'standard' && d.footprintShape === 'circle';
  })());

/* -- sol-like neighbourhood band + roll (30 Aug 2026) -------------------------- */

check('solNeighbourhoodBand: R centred on R0, +/-10% half-width, z half-height = hThin, all scaled by previewScale',
  (() => {
    const b = solNeighbourhoodBand(8178, 300, 2);
    return b.rCentrePc === 8178 * 2 && Math.abs(b.rHalfWidthPc - 817.8 * 2) < 1e-9 && b.zHalfWidthPc === 300 * 2;
  })());

check('rollSolNeighbourhoodCentre: every roll lands inside the band (R within +/-half-width, z within +/-half-height), for rng extremes and midpoint',
  (() => {
    const b = solNeighbourhoodBand(8178, 300, 1);
    return [0, 0.5, 1, 0.123, 0.987].every((v) => {
      const c = rollSolNeighbourhoodCentre(b, () => v);
      return c.distanceFromCentrePc >= b.rCentrePc - b.rHalfWidthPc - 1e-9
        && c.distanceFromCentrePc <= b.rCentrePc + b.rHalfWidthPc + 1e-9
        && Math.abs(c.distanceFromPlanePc) <= b.zHalfWidthPc + 1e-9
        && c.angleRad >= 0 && c.angleRad <= 2 * Math.PI + 1e-9;
    });
  })());

check('rollSolNeighbourhoodCentre: a sector can land below the plane (rng 0) AND above it (rng 1) - not pinned to z=0',
  (() => {
    const b = solNeighbourhoodBand(8178, 300, 1);
    return rollSolNeighbourhoodCentre(b, () => 0).distanceFromPlanePc < 0
      && rollSolNeighbourhoodCentre(b, () => 1).distanceFromPlanePc > 0;
  })());

/* -- screen 1: morphology resolution -------------------------------------------- */

check('milkyWayAnalogue resolves to barredSpiral, never a fifth GalaxyModelName', resolveModelName('milkyWayAnalogue') === 'barredSpiral');
check('milkyWayAnalogue resolves bar ENABLED', resolveBarEnabled('milkyWayAnalogue') === true);
check('spiral resolves bar DISABLED', resolveBarEnabled('spiral') === false);
check('barredSpiral resolves to itself with bar enabled', resolveModelName('barredSpiral') === 'barredSpiral' && resolveBarEnabled('barredSpiral') === true);
check('lenticular/elliptical resolve to themselves, bar always disabled', (['lenticular', 'elliptical'] as MorphologyChoice[]).every((m) => resolveModelName(m) === m && resolveBarEnabled(m) === false));

/* -- screen 1: size ladders ------------------------------------------------------- */

check('every morphology choice has exactly 5 size steps', (['lenticular', 'elliptical', 'barredSpiral', 'spiral', 'milkyWayAnalogue'] as MorphologyChoice[]).every((m) => sizeStepsFor(m).length === 5));
check('size value strictly increases left to right, for every morphology choice', (['lenticular', 'elliptical', 'barredSpiral', 'spiral', 'milkyWayAnalogue'] as MorphologyChoice[]).every((m) => {
  const steps = sizeStepsFor(m);
  for (let i = 1; i < steps.length; i++) if (!(steps[i]!.value > steps[i - 1]!.value)) return false;
  return true;
}));
check('sizeValueFor clamps out-of-range indices rather than throwing', sizeValueFor('spiral', -5) === sizeStepsFor('spiral')[0]!.value && sizeValueFor('spiral', 99) === sizeStepsFor('spiral')[4]!.value);
check('sizeIsMass is true for elliptical/lenticular, false for the three spiral-family choices', sizeIsMass('elliptical') && sizeIsMass('lenticular') && !sizeIsMass('spiral') && !sizeIsMass('barredSpiral') && !sizeIsMass('milkyWayAnalogue'));
check('milkyWayAnalogue\'s size ladder stays within +/-20% of 1.0 (the accepted variance)', sizeStepsFor('milkyWayAnalogue').every((s) => s.value >= 0.8 && s.value <= 1.2));
check('the generic spiral ladder spans a much wider range than milkyWayAnalogue\'s (0.5-2.0 vs 0.8-1.2)', (() => {
  const spiral = sizeStepsFor('spiral');
  return spiral[0]!.value < 0.8 && spiral[4]!.value > 1.2;
})());

/* -- screen 2: sys density === slab thickness ------------------------------------- */

check('thicknessPcFor maps thin/standard/thick to the ruled 5/10/15 pc union exactly', thicknessPcFor('thin') === 5 && thicknessPcFor('standard') === 10 && thicknessPcFor('thick') === 15);

/* -- screen 2: sys type -> search criterion --------------------------------------- */

check('nearest/interesting map to their own criterion kind with no tier', sysTypeToSearchCriterion('nearest').kind === 'nearest' && sysTypeToSearchCriterion('interesting').kind === 'interesting');
check('marginal/tolerable/earthLike map to habitable with tiers 2/3/4 respectively', (() => {
  const m = sysTypeToSearchCriterion('marginal'), t = sysTypeToSearchCriterion('tolerable'), e = sysTypeToSearchCriterion('earthLike');
  return m.kind === 'habitable' && m.minTier === 2 && t.kind === 'habitable' && t.minTier === 3 && e.kind === 'habitable' && e.minTier === 4;
})());

/* -- screen 2: polar -> Cartesian -------------------------------------------------- */

check('centrePcFromPolar at angle=0 puts the centre directly on the +x axis at the given R, z', (() => {
  const d = { ...defaultScreen2Draft(), distanceFromCentrePc: 5000, angleRad: 0, distanceFromPlanePc: 42 };
  const c = centrePcFromPolar(d);
  return Math.abs(c.x - 5000) < 1e-9 && Math.abs(c.y) < 1e-9 && c.z === 42;
})());
check('centrePcFromPolar at angle=pi/2 puts the centre on the +y axis', (() => {
  const d = { ...defaultScreen2Draft(), distanceFromCentrePc: 1000, angleRad: Math.PI / 2, distanceFromPlanePc: 0 };
  const c = centrePcFromPolar(d);
  return Math.abs(c.x) < 1e-6 && Math.abs(c.y - 1000) < 1e-6;
})());

/* -- screen 2: reactive total-systems <-> size-in-pc ------------------------------- */

const model = createSpiralModel(false);

check('sizeInPcForTargetCount is monotonically increasing in target count', (() => {
  const centre = { x: 8178, y: 0, z: 0 };
  const r1 = sizeInPcForTargetCount(model, centre, 50, 10, 'circle');
  const r2 = sizeInPcForTargetCount(model, centre, 200, 10, 'circle');
  const r3 = sizeInPcForTargetCount(model, centre, 800, 10, 'circle');
  return r1 < r2 && r2 < r3;
})());

check('sizeInPcForTargetCount and targetCountForSizeInPc round-trip within 20% (bisection against a numerical integral, not exact by construction)', (() => {
  const centre = { x: 8178, y: 0, z: 0 };
  const targetCount = 300;
  const radius = sizeInPcForTargetCount(model, centre, targetCount, 10, 'circle');
  const recoveredCount = targetCountForSizeInPc(model, centre, radius, 10, 'circle');
  return Math.abs(recoveredCount - targetCount) / targetCount < 0.2;
})());

check('at fixed target count, a THICKER slab needs a SMALLER radius (more volume per unit area)', (() => {
  const centre = { x: 8178, y: 0, z: 0 };
  const rThin = sizeInPcForTargetCount(model, centre, 300, 5, 'circle');
  const rThick = sizeInPcForTargetCount(model, centre, 300, 15, 'circle');
  return rThick < rThin;
})());

check('at fixed radius, a SQUARE contains fewer expected systems than a CIRCLE (smaller area at the same circumradius)', (() => {
  const centre = { x: 8178, y: 0, z: 0 };
  const circleCount = targetCountForSizeInPc(model, centre, 100, 10, 'circle');
  const squareCount = targetCountForSizeInPc(model, centre, 100, 10, 'square');
  return squareCount < circleCount;
})());

check('reconcileSizeFields in "sizeInPc" mode recomputes totalSystems, leaving sizeInPc untouched', (() => {
  const d: Screen2Draft = { ...defaultScreen2Draft(), sizeEditMode: 'sizeInPc', sizeInPc: 40, totalSystems: 0 };
  const out = reconcileSizeFields(model, d);
  return out.sizeInPc === 40 && out.totalSystems > 0;
})());
check('reconcileSizeFields in "totalSystems" mode recomputes sizeInPc, leaving totalSystems untouched', (() => {
  const d: Screen2Draft = { ...defaultScreen2Draft(), sizeEditMode: 'totalSystems', totalSystems: 250, sizeInPc: 0 };
  const out = reconcileSizeFields(model, d);
  return out.totalSystems === 250 && out.sizeInPc > 0;
})());
check('reconcileSizeFields never mutates its input draft', (() => {
  const d: Screen2Draft = { ...defaultScreen2Draft(), sizeEditMode: 'sizeInPc', sizeInPc: 40 };
  const frozen = JSON.stringify(d);
  reconcileSizeFields(model, d);
  return JSON.stringify(d) === frozen;
})());

/* -- assembly ----------------------------------------------------------------------- */

check('assembleSearchCriteria carries the draft\'s own multiplicity and sysType through unchanged', (() => {
  const d: Screen2Draft = { ...defaultScreen2Draft(), multiplicity: 'binary', sysType: 'tolerable' };
  const c = assembleSearchCriteria(d);
  return c.multiplicity === 'binary' && c.sysType.kind === 'habitable' && (c.sysType as { minTier: number }).minTier === 3;
})());

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\ngalaxyCreationState.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\ngalaxyCreationState.conformance: all checks passed.');
}
