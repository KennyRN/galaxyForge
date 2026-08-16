/**
 * sectorFootprint.conformance - the 7 SECTOR_FOOTPRINT_GATES.
 */

import {
  isWithinFootprint, isWithinSlab, cellsTouchingFootprint, generateSector, assembleSector, SECTOR_FOOTPRINT_GATES,
} from './sectorFootprint';
import { createSpiralModel } from './galaxyModel';
import { CELL_SIZE_PC, EXCLUSION_RADIUS_PC } from './placement';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const R = 100;   // pc, an arbitrary but fixed test circumradius

/* 1. circumradius holds - square/hexagon are subsets of circle -------------------- */

check('every point admitted by square or hexagon is also admitted by circle, sampled densely', (() => {
  for (let i = 0; i < 2000; i++) {
    const angle = (i / 2000) * 2 * Math.PI;
    const r = R * (0.5 + 0.5 * ((i * 37) % 100) / 100);
    const dx = r * Math.cos(angle), dy = r * Math.sin(angle);
    const inCircle = isWithinFootprint(dx, dy, R, 'circle');
    const inSquare = isWithinFootprint(dx, dy, R, 'square');
    const inHex = isWithinFootprint(dx, dy, R, 'hexagon');
    if ((inSquare && !inCircle) || (inHex && !inCircle)) return false;
  }
  return true;
})());

/* 2. square corners sit on the circumradius ---------------------------------------- */

check('the square\'s own corner sits exactly on the circumradius', (() => {
  const half = R / Math.SQRT2;
  return isWithinFootprint(half, half, R, 'square');
})());
check('nudging 1% further out on both axes puts the point outside the square', (() => {
  const half = (R / Math.SQRT2) * 1.01;
  return !isWithinFootprint(half, half, R, 'square');
})());

/* 3. hexagon vertex sits on the circumradius ----------------------------------------- */

check('the hexagon\'s own pointy-top vertex (R, 0) is admitted', isWithinFootprint(R, 0, R, 'hexagon'));
check('nudging 1% further out along the vertex direction puts the point outside the hexagon', !isWithinFootprint(R * 1.01, 0, R, 'hexagon'));

/* 4. area ordering: circle > hexagon > square, at fixed circumradius ------------------ */

check('a random sample admits more points to the circle than the hexagon than the square (area ordering)', (() => {
  let circleCount = 0, hexCount = 0, squareCount = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    // Deterministic pseudo-random sample over the bounding box [-R,R]^2.
    const dx = -R + 2 * R * (((i * 9301 + 49297) % 233280) / 233280);
    const dy = -R + 2 * R * (((i * 4181 + 12345) % 233280) / 233280);
    if (isWithinFootprint(dx, dy, R, 'circle')) circleCount++;
    if (isWithinFootprint(dx, dy, R, 'hexagon')) hexCount++;
    if (isWithinFootprint(dx, dy, R, 'square')) squareCount++;
  }
  return circleCount > hexCount && hexCount > squareCount;
})());

/* 5. slab symmetry ------------------------------------------------------------------- */

check('isWithinSlab admits exactly +/- thicknessPc/2', (() => {
  const t = 10;
  return isWithinSlab(t / 2, t) && isWithinSlab(-t / 2, t) && !isWithinSlab(t / 2 + 1e-6, t) && !isWithinSlab(-t / 2 - 1e-6, t);
})());

/* 6. exclusion runs on the whole sector, not per cell --------------------------------- */

check('generateSector never returns two systems closer than EXCLUSION_RADIUS_PC, across cell boundaries', (() => {
  const model = createSpiralModel(false);
  const centre = { x: 8178, y: 0, z: 0 };
  const sector = generateSector('footprint-gate-seed', model, centre, 60, 15, 'circle');
  const r2 = EXCLUSION_RADIUS_PC * EXCLUSION_RADIUS_PC;
  for (let i = 0; i < sector.length; i++) {
    for (let j = i + 1; j < sector.length; j++) {
      const a = sector[i]!.positionPc, b = sector[j]!.positionPc;
      const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
      if (d2 < r2) return false;
    }
  }
  return true;
})());

check('cellsTouchingFootprint returns a superset that comfortably covers the requested radius/thickness', (() => {
  const centre = { x: 8178, y: 0, z: 0 };
  const cells = cellsTouchingFootprint(centre, 60, 15);
  // The bounding box in cell-index terms must at least span the requested
  // radius in x/y and half-thickness in z.
  const xs = cells.map((c) => c.ix), ys = cells.map((c) => c.iy), zs = cells.map((c) => c.iz);
  const spanPc = (arr: number[]) => (Math.max(...arr) - Math.min(...arr)) * CELL_SIZE_PC;
  return spanPc(xs) >= 120 && spanPc(ys) >= 120 && spanPc(zs) >= 15;
})());

/* 7. determinism ---------------------------------------------------------------------- */

check('generateSector is deterministic', (() => {
  const model = createSpiralModel(false);
  const centre = { x: 8178, y: 0, z: 0 };
  const a = generateSector('footprint-gate-seed', model, centre, 40, 10, 'hexagon');
  const b = generateSector('footprint-gate-seed', model, centre, 40, 10, 'hexagon');
  return JSON.stringify(a) === JSON.stringify(b);
})());

/* 8-11. assembleSector - the real sector conductor, wiring remnants + conatal
 *       chemistry into actual sector generation for the first time ---------------- */

{
  const model = createSpiralModel(false);
  const centre = { x: 8178, y: 0, z: 0 };
  // Kept deliberately small - assembleSector's exclusion pass is O(n^2) in
  // candidate count (same as generateSector's own applyExclusion), and the
  // solar-circle cell density is high enough that a much larger radius here
  // was measured to make this suite take minutes rather than seconds.
  const RADIUS = 25, THICK = 15;
  const sectorOnce = assembleSector('assemble-gate-seed', model, centre, RADIUS, THICK, 'circle');
  const sectorTwice = assembleSector('assemble-gate-seed', model, centre, RADIUS, THICK, 'circle');

  check('8 assembleSector is deterministic', JSON.stringify(sectorOnce) === JSON.stringify(sectorTwice));

  check('9 remnants actually appear in an assembled sector at this radius (the gap the ' +
    'audit found: remnants.ts was fully built and gated but never called from anything ' +
    'that produces a real sector)', sectorOnce.remnants.length > 0);

  check('10 at least one stellar system in the sector carries a conatal group ' +
    '(shared age/[Fe/H] chemistry, not independently rolled)',
    sectorOnce.stellar.some((m) => m.conatal !== undefined));

  check('10b every conatal member\'s age is EXACTLY its group\'s stored age - every member ' +
    'sharing the same groupId shares the same ageGyr, not just internal self-consistency', (() => {
    const withGroup = sectorOnce.stellar.filter((m) => m.conatal !== undefined);
    if (withGroup.length === 0) return true;   // covered by gate 10; do not double-fail here
    const byGroup = new Map<string, number[]>();
    for (const m of withGroup) {
      const arr = byGroup.get(m.conatal!.groupId) ?? [];
      arr.push(m.conatal!.ageGyr);
      byGroup.set(m.conatal!.groupId, arr);
    }
    return [...byGroup.values()].every((ages) => ages.every((a) => a === ages[0]));
  })());

  check('11 exclusion runs across BOTH layers together - no stellar/remnant pair in the ' +
    'assembled sector is closer than EXCLUSION_RADIUS_PC', (() => {
    const all = [
      ...sectorOnce.stellar.map((m) => m.placed.positionPc),
      ...sectorOnce.remnants.map((r) => r.positionPc),
    ];
    const r2 = EXCLUSION_RADIUS_PC * EXCLUSION_RADIUS_PC;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!, b = all[j]!;
        const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
        if (d2 < r2) return false;
      }
    }
    return true;
  })());
}

/* 12. the complex-tier path is actually exercised, not merely latent -------------- */

check('12 a complex-tier stellar system ("complex." sysid prefix) appears in at ' +
  'least one of several nearby sectors - proves placeYoungClustered/complexParticipation ' +
  'are actually wired into assembleSector, not just compiling', (() => {
  const model = createSpiralModel(false);
  const centre = { x: 8178, y: 0, z: 0 };
  for (let i = 0; i < 20; i++) {
    const s = assembleSector(`complex-tier-gate-seed-${i}`, model, centre, 40, 15, 'circle');
    if (s.stellar.some((m) => m.placed.sysid.startsWith('complex.'))) return true;
  }
  return false;
})());

check('gate count matches SECTOR_FOOTPRINT_GATES', SECTOR_FOOTPRINT_GATES === 12);

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nsectorFootprint.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nsectorFootprint.conformance: all checks passed.');
}
