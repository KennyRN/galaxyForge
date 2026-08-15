import {
  sampleVolume, projectSlab, expectedSystemCount, normaliseForDisplay,
  SLAB_THICKNESSES_PC, isSlabThickness, Z_SAMPLES,
  type DensityField, type PointPc, type SlabRegionPc,
} from './densityMap';
import { CHANNELS } from './types';

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
    return { youngThin: tot * 0.3, midThin: tot * 0.5, thick: tot * 0.2 };
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
