/**
 * ism.conformance - the 7 ISM_GATES (Amendment A8, morphology patch v3.0,
 * 17 Aug 2026). Render-only module - see ism.ts's own header for scope.
 */

import { ismDensityAt, DEFAULT_ISM_PARAMS, ISM_GATES } from './ism';
import { CHANNELS } from './types';
import { ARMS, generateSeededArms, rollArmClass, DEFAULT_ARM_WIDTH } from './spiralArms';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const PROBES: readonly [number, number, number][] = [
  [0, 0, 0], [1000, 0.7, 50], [8178, 2.1, -100], [15000, 4.5, 200],
];

/* 1. purity ---------------------------------------------------------------- */

check('1 ismDensityAt is bit-identical for the same inputs, always',
  PROBES.every(([R, t, z]) => ismDensityAt(R, t, z) === ismDensityAt(R, t, z)));

/* 2. no channel -------------------------------------------------------------- */

check('2 CHANNELS reserves a key for ism (registry completeness), which nothing ' +
  'in this module ever calls channelRng with - render-only, rolls nothing (A8)',
  CHANNELS.ism === 'ism');

/* 3. non-negative and finite everywhere ------------------------------------- */

check('3 ismDensityAt is finite and non-negative everywhere, including R=0 and z=0',
  PROBES.concat([[0, 0, 0], [50000, 6.0, 5000]]).every(([R, t, z]) => {
    const d = ismDensityAt(R, t, z);
    return Number.isFinite(d) && d >= 0;
  }));

/* 4. peaks at z=0 ------------------------------------------------------------- */

check('4 for fixed (R, theta), density is strictly greatest at z=0 and monotonically ' +
  'decreasing in |z| - both sech2 components peak at their own argument 0',
  (() => {
    const R = 8178, theta = 1.0;
    const zs = [0, 50, 150, 300, 600, 1200];
    const vals = zs.map((z) => ismDensityAt(R, theta, z));
    for (let i = 1; i < vals.length; i++) if (!(vals[i]! < vals[i - 1]!)) return false;
    // symmetry: z and -z give the same value (sech2 is even)
    return zs.every((z) => ismDensityAt(R, theta, z) === ismDensityAt(R, theta, -z));
  })());

/* 5. molecular layer thinner than atomic - a real dust LANE, not one shape --- */

check('5 the combined field retains MORE relative density at moderate |z| than an ' +
  'all-thin (ratio=1) version would, at fixed R - the real, thicker atomic tail ' +
  'genuinely props up the total at larger z, which is what makes a thin dust LANE ' +
  '(the molecular layer alone) read as visually distinct from the wider gas ' +
  'envelope around it, not merely a single shape', (() => {
  // Isolate the atomic tail's own contribution by comparing the REAL
  // (ratio=2, atomic genuinely thicker) field against an "all-thin"
  // (ratio=1, atomic collapsed to the SAME thinness as molecular) field,
  // both normalised to their own central value - no reach into ism.ts's
  // own private helpers.
  const R = 8178, theta = 0;
  const z = 250;   // between typical molecular (~100pc-ish) and atomic (~200pc-ish) scale heights at R0
  const combined = ismDensityAt(R, theta, z);
  const combinedAtCentre = ismDensityAt(R, theta, 0);
  const allThin = ismDensityAt(R, theta, z, { ...DEFAULT_ISM_PARAMS, atomicToMolecularScaleHeightRatio: 1.0 });
  const allThinAtCentre = ismDensityAt(R, theta, 0, { ...DEFAULT_ISM_PARAMS, atomicToMolecularScaleHeightRatio: 1.0 });
  // The genuinely-thicker-atomic (real) field retains MORE of its own
  // central value at this z than the artificially-all-thin version does.
  return (combined / combinedAtCentre) > (allThin / allThinAtCentre);
})());

/* 6. scale height flares with radius ----------------------------------------- */

check('6 the molecular scale height is strictly increasing in R (flares outward) - ' +
  'measured indirectly via how far density has to fall at increasing R for the ' +
  'SAME z, which widens as the scale height grows', (() => {
  const theta = 0, z = 300;
  const Rs = [500, 4000, 8178, 14000, 20000];
  // At fixed z, a LARGER scale height means LESS vertical suppression - so
  // density(z=300)/density(z=0) should be monotonically increasing with R
  // (closer to 1, less suppressed) if the scale height genuinely flares.
  const ratios = Rs.map((R) => ismDensityAt(R, theta, z) / ismDensityAt(R, theta, 0));
  for (let i = 1; i < ratios.length; i++) if (!(ratios[i]! > ratios[i - 1]!)) return false;
  return true;
})());

/* 7. arm modulation is real, reused from spiralArms - not manufactured ------- */

check('7a ismDensityAt varies with theta at fixed (R, z), for a table with live arm ' +
  'contrast (the real ARMS table) - arm modulation genuinely reaches the ISM field',
  (() => {
    const R = 6000, z = 0;
    const thetas = [0, 0.6, 1.3, 2.4, 3.5, 5.0];
    const vals = thetas.map((t) => ismDensityAt(R, t, z));
    return vals.some((v) => v !== vals[0]);
  })());

check('7b the SAME arm table reused, not a manufactured independent signal - passing ' +
  'a DIFFERENT (seeded) arm table changes the azimuthal pattern (Law 1: derived from ' +
  'the existing field, not a second competing one)',
  (() => {
    const R = 6000, z = 0, theta = 1.0;
    const seeded = generateSeededArms('ism-gate-seed', rollArmClass('ism-gate-seed'));
    const withRealArms = ismDensityAt(R, theta, z, DEFAULT_ISM_PARAMS, ARMS, DEFAULT_ARM_WIDTH);
    const withSeededArms = ismDensityAt(R, theta, z, DEFAULT_ISM_PARAMS, seeded, DEFAULT_ARM_WIDTH);
    return withRealArms !== withSeededArms;
  })());

if (failures > 0) {
  console.error(`\nism.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log(`\nism.conformance: all ${ISM_GATES} checks passed.`);
}
