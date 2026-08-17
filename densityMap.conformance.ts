import {
  sampleVolume, projectSlab, expectedSystemCount, normaliseForDisplay, modulateArmsForDisplay, edgeOnDisplayField,
  SLAB_THICKNESSES_PC, isSlabThickness, Z_SAMPLES,
  type DensityField, type PointPc, type SlabRegionPc,
} from './densityMap';
import { CHANNELS } from './types';
import type { GalaxyModel } from './galaxyModel';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const N0 = 8.0214e-2;                    // systems pc^-3 at Sol
const H = 300;                           // thin-disc scale height, pc

const uniform: DensityField = { at: () => N0 };
const expo: DensityField = { at: (p) => N0 * Math.exp(-Math.abs(p.z) / H) };
const sech2: DensityField = { at: (p) => N0 / Math.cosh(p.z / (2 * H)) ** 2 };
const smooth: DensityField = {
  at: (p) => N0 * Math.exp(-Math.hypot(p.x, p.y) / 2500) * Math.exp(-Math.abs(p.z) / H),
  byPopulation: (p) => {
    const tot = N0 * Math.exp(-Math.hypot(p.x, p.y) / 2500) * Math.exp(-Math.abs(p.z) / H);
    // Real PopulationKeys, deliberately NOT cast: a cast here would hide a
    // genuine mismatch if a key were ever renamed, which is the whole point of
    // the union existing.
    return { spiralYoungThin: tot * 0.3, spiralMidThin: tot * 0.5, spiralThick: tot * 0.2 };
  },
};

const slab = (t: number): SlabRegionPc =>
  ({ centre: { x: 8178, y: 0, z: 0 }, halfWidthPc: 50, halfDepthPc: 50, thicknessPc: t });

// 1. purity - bit-identical
const a = projectSlab(smooth, slab(10), { nx: 24, ny: 24 });
const b = projectSlab(smooth, slab(10), { nx: 24, ny: 24 });
check('1 purity - bit-identical grid, no tolerance',
  a.values.every((v, i) => v === b.values[i]));

// 2. projection identity - constant field returns density * thickness exactly
check('2 projection identity - uniform field gives density x thickness',
  SLAB_THICKNESSES_PC.every((t) => {
    const s = projectSlab(uniform, slab(t), { nx: 8, ny: 8 });
    return s.values.every((v) => Math.abs(v - N0 * t) <= 1e-12 * N0 * t);
  }));

// 3. quadrature sufficiency - vs a 513-sample reference, both profiles
function reference(field: DensityField, t: number): number {
  const n = 513, h = t / (n - 1);
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const w = k === 0 || k === n - 1 ? 1 : (k % 2 ? 4 : 2);
    acc += w * field.at({ x: 8178, y: 0, z: -t / 2 + h * k } as PointPc);
  }
  return acc * h / 3;
}
check(`3 quadrature - Z_SAMPLES=${Z_SAMPLES} exact vs 513-sample ref, both profiles, all thicknesses`,
  ([expo, sech2] as DensityField[]).every((f) =>
    SLAB_THICKNESSES_PC.every((t) => {
      const got = projectSlab(f, slab(t), { nx: 1, ny: 1 }).values[0]!;
      return Math.abs(got - reference(f, t)) <= 1e-9 * reference(f, t);
    })));

// 3b. the same gate is the enforcement of "keep it a thin slice"
const thickFails = [400, 800, 1600].some((t) => {
  const got = projectSlab(expo, slab(t), { nx: 1, ny: 1 }).values[0]!;
  return Math.abs(got - reference(expo, t)) > 1e-9 * reference(expo, t);
});
check('3b thin-slice enforcement - the gate DOES fail for an over-thick slab', thickFails);

// 4. count consistency vs analytic
const r4 = slab(15);
const analytic = N0 * (2 * r4.halfWidthPc) * (2 * r4.halfDepthPc) * r4.thicknessPc;
check('4 expectedSystemCount on a uniform field equals n x volume',
  Math.abs(expectedSystemCount(uniform, r4) - analytic) <= 1e-12 * analytic);

// 5. population surfaces sum to the total surface
const s5 = projectSlab(smooth, slab(10), { nx: 16, ny: 16 }, { byPopulation: true });
check('5 per-population surfaces sum to the total surface',
  s5.byPopulation !== undefined &&
  s5.values.every((v, i) => {
    const sum = Object.values(s5.byPopulation!).reduce((acc, arr) => acc + (arr as Float64Array)[i]!, 0);
    return Math.abs(v - sum) <= 1e-9 * Math.max(1e-30, v);
  }));

// 6. no PRNG channel for this module
check('6 no PRNG channel - a map reveals, it never rolls',
  !Object.keys(CHANNELS).some((k) => /density.?map|map/i.test(k)));

// 7. resolution independence
const lo = expectedSystemCount(smooth, slab(15), { nx: 16, ny: 16 });
const hi = expectedSystemCount(smooth, slab(15), { nx: 256, ny: 256 });
check('7 expectedSystemCount is resolution-independent to better than 0.5%',
  Math.abs(lo - hi) / hi < 5e-3);

// extras: typing guard and display normalisation stay out of the data path
check('+ slab thickness type guard rejects off-menu values',
  isSlabThickness(5) && isSlabThickness(15) && !isSlabThickness(12));
const raw = projectSlab(smooth, slab(10), { nx: 12, ny: 12 });
const before = Float64Array.from(raw.values);
const norm = normaliseForDisplay(raw.values);
check('+ normaliseForDisplay returns a new array in [0,1] and leaves raw untouched',
  norm !== raw.values && raw.values.every((v, i) => v === before[i]) &&
  norm.every((v) => v >= 0 && v <= 1));

// 3D primitive is real, and the slab is its reduction
const vol = sampleVolume(uniform, { min: { x: 0, y: 0, z: -5 }, max: { x: 10, y: 10, z: 5 } }, { nx: 4, ny: 4, nz: 4 });
check('+ sampleVolume returns a populated 3D grid (the v2 map, exercised today)',
  vol.values.length === 64 && vol.values.every((v) => v === N0));

/* -- modulateArmsForDisplay (rewritten 17 Aug 2026, superseding the retired
 *    emphasiseArmsForDisplay - see densityMap.ts's own header for why) ------------ */

const NX = 64, NY = 64, HALF_PC = 20000, DISC_SCALE_PC = 2600;

function gridOf(f: (x: number, y: number) => number): Float64Array {
  const out = new Float64Array(NX * NY);
  const cellX = (2 * HALF_PC) / NX, cellY = (2 * HALF_PC) / NY;
  for (let iy = 0; iy < NY; iy++) {
    for (let ix = 0; ix < NX; ix++) {
      const x = -HALF_PC + (ix + 0.5) * cellX, y = -HALF_PC + (iy + 0.5) * cellY;
      out[ix + NX * iy] = f(x, y);
    }
  }
  return out;
}

// A pure radial exponential falloff, NO azimuthal structure at all -
// exactly the "arms invisible" failure mode's own input shape (a smooth
// disc with no arm bump).
const radialOnly = gridOf((x, y) => {
  const R = Math.hypot(x, y);
  return Math.exp(-R / DISC_SCALE_PC);
});

// The SAME radial falloff, but with a real +40% azimuthal bump in one
// half-plane (x > 0) - a crude stand-in for "an arm is here".
const radialPlusArm = gridOf((x, y) => {
  const R = Math.hypot(x, y);
  const armBoost = x > 0 ? 1.4 : 1.0;
  return armBoost * Math.exp(-R / DISC_SCALE_PC);
});

// A sharp, strongly radially-concentrated peak at the centre - a crude
// stand-in for "a bulge is here" (spiralBoxyPeanutBulge, Amendment A4),
// with a MUCH shorter scale length than the disc so its whole extent sits
// well inside a handful of grid cells, same as the real bulge's ~700pc
// scale does against this project's 20000pc preview half-width.
const radialPlusBulge = gridOf((x, y) => {
  const R = Math.hypot(x, y);
  return Math.exp(-R / DISC_SCALE_PC) + 500 * Math.exp(-R / 400);
});

check('8 modulateArmsForDisplay reveals real azimuthal contrast: a field WITH a ' +
  'real azimuthal bump shows far more spread in the OUTPUT than the SAME field run ' +
  'through normaliseForDisplay alone (which is dominated by the radial falloff, not ' +
  'the arm) - the "arms invisible" bug this exists to close',
  (() => {
    const modulated = modulateArmsForDisplay(radialPlusArm, NX, NY, HALF_PC);
    const plainLog = normaliseForDisplay(radialPlusArm, { log: true });
    // Compare the value at a point ON the arm boost against a point at the
    // SAME radius but off it - modulateArmsForDisplay should show a much
    // bigger difference (the arm should visibly stand out) than plain log
    // normalisation does (where the radial gradient swamps it).
    const onArmIdx = (NX / 2 + 20) + NX * (NY / 2);        // x > 0, near y=0
    const offArmIdx = (NX / 2 - 20) + NX * (NY / 2);       // x < 0, near y=0, SAME |R|
    const modDiff = Math.abs(modulated[onArmIdx]! - modulated[offArmIdx]!);
    const plainDiff = Math.abs(plainLog[onArmIdx]! - plainLog[offArmIdx]!);
    return modDiff > plainDiff * 3;
  })());

check('9 modulateArmsForDisplay always returns values in [0, 1]',
  (() => {
    const out = modulateArmsForDisplay(radialPlusArm, NX, NY, HALF_PC);
    return out.every((v) => v >= 0 && v <= 1);
  })());

check('10 modulateArmsForDisplay does NOT erase a field\'s own radial concentration ' +
  '- on a field with a strong central peak (a bulge stand-in), the CENTRE displays ' +
  'brighter than a point far off-centre, never dimmer (the exact regression the ' +
  'retired emphasiseArmsForDisplay caused for the real boxy/peanut bulge, confirmed ' +
  'directly before this rewrite: centre 0.58, a point ~1750pc off-centre 0.94 - ' +
  'brighter than the centre)', (() => {
  const out = modulateArmsForDisplay(radialPlusBulge, NX, NY, HALF_PC);
  const centreIdx = (NX / 2) + NX * (NY / 2);
  const farIdx = (NX / 2 + 10) + NX * (NY / 2);   // ~6250pc off-centre (10 cells * 625pc/cell) - well past the ~400pc bulge stand-in, still inside the disc
  return out[centreIdx]! > out[farIdx]!;
})());

check('11 on a RADIALLY SYMMETRIC field (no azimuthal structure at all), ' +
  'modulateArmsForDisplay\'s output is uniform at fixed radius - every cell in a ' +
  'thin ring lands within a tight band, not spread out (nothing manufactured that ' +
  'is not there)', (() => {
  const out = modulateArmsForDisplay(radialOnly, NX, NY, HALF_PC);
  const ringVals: number[] = [];
  const targetR = HALF_PC * 0.2;
  for (let iy = 0; iy < NY; iy++) {
    for (let ix = 0; ix < NX; ix++) {
      const x = -HALF_PC + (ix + 0.5) * (2 * HALF_PC / NX), y = -HALF_PC + (iy + 0.5) * (2 * HALF_PC / NY);
      const R = Math.hypot(x, y);
      if (Math.abs(R - targetR) < HALF_PC * 0.02) ringVals.push(out[ix + NX * iy]!);
    }
  }
  if (ringVals.length < 4) return false;
  const mean = ringVals.reduce((a, b) => a + b, 0) / ringVals.length;
  return ringVals.every((v) => Math.abs(v - mean) < 0.15);
})());

check('12 modulateArmsForDisplay never renders a lit interarm/background cell as ' +
  'literal black - a genuinely below-ring-mean trough still clears ' +
  'ARM_MODULATION_FLOOR\'s multiplier (the fix for "between arms is black, the ' +
  'reference image has stars between arms")', (() => {
  const out = modulateArmsForDisplay(radialPlusArm, NX, NY, HALF_PC);
  // Sample a ring of cells at a moderate radius that sit OFF the artificial
  // arm boost (x < 0) - the "interarm" side of this fixture's own bump.
  // None should be literal zero.
  let sampled = 0;
  for (let iy = 0; iy < NY; iy++) {
    for (let ix = 0; ix < NX; ix++) {
      const x = -HALF_PC + (ix + 0.5) * (2 * HALF_PC / NX), y = -HALF_PC + (iy + 0.5) * (2 * HALF_PC / NY);
      const R = Math.hypot(x, y);
      if (x >= 0 || R > DISC_SCALE_PC * 3 || R < DISC_SCALE_PC * 0.5) continue;
      sampled++;
      if (out[ix + NX * iy]! <= 0) return false;
    }
  }
  return sampled > 0;
})());

check('13 the interarm floor does NOT erase the arm-vs-interarm contrast gate 8 already ' +
  'proved - an on-arm cell still reads meaningfully brighter than an off-arm cell at the ' +
  'same radius, floor and all', (() => {
  const out = modulateArmsForDisplay(radialPlusArm, NX, NY, HALF_PC);
  const onArmIdx = (NX / 2 + 20) + NX * (NY / 2);
  const offArmIdx = (NX / 2 - 20) + NX * (NY / 2);
  return out[onArmIdx]! > out[offArmIdx]! + 0.1;
})());

/* -- edgeOnDisplayField (16 Aug 2026) ---------------------------------------------- */

// Two synthetic GalaxyModel fixtures - NOT the real spiral model (keeps this
// file's own dependency footprint unchanged, same "build a minimal fixture
// that isolates the property under test" style the rest of this file
// already uses): one with NO theta-dependence at all (gate 16), one with a
// deliberate, strong azimuthal modulation standing in for a real arm (gate
// 17) - `1 + 0.4*cos(2*theta)` peaks at theta=0 and troughs at theta=pi/2,
// the same "on-arm vs off-arm" shape a real spiral's arm factor produces.
const axisymmetricModel: GalaxyModel = {
  morphology: 'elliptical', populations: [],
  densityAt: (R, _theta, z) => N0 * Math.exp(-R / 2500) * Math.exp(-Math.abs(z) / H),
  densityByPopulation: () => ({}),
};
// The arm amplitude itself TAPERS with R (peaking near R=8000, matching how
// a real arm's contrast varies with radius via `armInnerTaper`/the log
// -spiral's own R-dependence) rather than a flat `cos(2*theta)` at every R -
// a flat modulation is CONSTANT across the whole (R,z) grid at any one
// fixed angle, which degenerately triggers `hasStructure === false` (zero
// percentile spread, correctly - there is nothing to stretch) and would
// make this fixture unable to exercise the real contrast-boost path at all.
const spiralLikeModel: GalaxyModel = {
  morphology: 'spiral', populations: [],
  densityAt: (R, theta, z) => {
    const base = N0 * Math.exp(-R / 2500) * Math.exp(-Math.abs(z) / H);
    const armAmp = 0.4 * Math.max(0, 1 - Math.abs(R - 8000) / 6000);
    return base * (1 + armAmp * Math.cos(2 * theta));
  },
  densityByPopulation: () => ({}),
};
const EDGE_ON_RES = { nR: 40, nz: 30 };

check('14 edgeOnDisplayField always returns values in [0, 1]', (() => {
  const out = edgeOnDisplayField(spiralLikeModel, 0, 20000, 6000, EDGE_ON_RES);
  return out.every((v) => v >= 0 && v <= 1);
})());

check('15 edgeOnDisplayField is deterministic - bit-identical grid, no tolerance', (() => {
  const a = edgeOnDisplayField(spiralLikeModel, 0.7, 20000, 6000, EDGE_ON_RES);
  const b = edgeOnDisplayField(spiralLikeModel, 0.7, 20000, 6000, EDGE_ON_RES);
  return a.every((v, i) => v === b[i]);
})());

check('16 on a model with NO theta-dependence at all, edgeOnDisplayField does not ' +
  'manufacture azimuthal structure - identical output regardless of the selected angle', (() => {
  const a = edgeOnDisplayField(axisymmetricModel, 0, 20000, 6000, EDGE_ON_RES);
  const b = edgeOnDisplayField(axisymmetricModel, 2.3, 20000, 6000, EDGE_ON_RES);
  return a.every((v, i) => Math.abs(v - b[i]!) < 1e-9);
})());

check('17 on a model WITH real theta-dependence, edgeOnDisplayField DOES vary with the ' +
  'selected angle - the fix for "no idea what this side-on view is showing, no difference ' +
  'left to right"', (() => {
  const onArm = edgeOnDisplayField(spiralLikeModel, 0, 20000, 6000, EDGE_ON_RES);          // cos(0) peak
  const offArm = edgeOnDisplayField(spiralLikeModel, Math.PI / 2, 20000, 6000, EDGE_ON_RES); // cos(pi) trough
  return onArm.some((v, i) => Math.abs(v - offArm[i]!) > 0.05);
})());

if (failures > 0) throw new Error(`${failures} densityMap conformance failure(s)`);
console.log('\nall densityMap conformance checks passed');

// Reported numbers, for the record.
console.log('\n--- surface density at Sol, by ruled thickness ---');
for (const t of SLAB_THICKNESSES_PC) {
  const sigma = projectSlab(uniform, slab(t), { nx: 1, ny: 1 }).values[0]!;
  console.log(`  t=${String(t).padStart(2)} pc   sigma=${sigma.toFixed(3)} systems/pc^2   ` +
    `on-map spacing ${(0.5 / Math.sqrt(sigma)).toFixed(2)} pc   ` +
    `${(expectedSystemCount(uniform, slab(t))).toFixed(0)} systems in a 100x100 pc footprint`);
}
