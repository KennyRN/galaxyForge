/**
 * previewCache.conformance - the 5 PREVIEW_CACHE_GATES (P17 preview-
 * responsiveness package, item C; rulings C1/D).
 *
 *  1  the cover-square PARTITION is total and disjoint (white | grey = all).
 *  2  the partition's in-sector layer is POSITION-IDENTICAL, by sysid, to a
 *     native `generateSector(footprintShape)` call - the preview shows
 *     exactly what a native footprint generation would (C1 structural
 *     invariant; measured shortfall 0 to ~19k systems).
 *  3  NEGATIVE CONTROL for gate 2 - an undersized cover that fails to
 *     contain the footprint provably makes the partition diverge (under-
 *     count). Proves gate 2 can actually detect divergence rather than
 *     passing vacuously (C1: "do not assert shortfall happens to be 0").
 *  4  a full shape cycle runs the generation thunk EXACTLY ONCE (the
 *     sqrt(2) last-ULP key trap does not bite).
 *  5  BUDGET (ruling D) - the synchronous cache-hit path (re-partition, no
 *     generation) for the largest battery cover field stays under one frame.
 *     Fails loudly if a future change makes the hit path heavy enough to
 *     need its own yield.
 *
 * The pickShape / paintSector arithmetic is inlined here (its helpers live in
 * galaxyCreationModals.ts, which imports `obsidian` and cannot load in this
 * harness) - kept identical to the source so the trap is reproduced faithfully.
 */

import {
  coverFieldCacheKey, coverFieldIsCached, coverField,
  __coverFieldGenerations, __resetCoverFieldCache, PREVIEW_CACHE_GATES,
} from './previewCache';
import { generateSector, isWithinFootprint, type FootprintShape } from './sectorFootprint';
import { EXCLUSION_RADIUS_PC } from './placement';
import { createSpiralModel } from './galaxyModel';

let failures = 0;
function check(name: string, cond: boolean): void {
  if (!cond) { failures++; console.error(`FAIL - ${name}`); } else { console.log(`ok - ${name}`); }
}

const SEED = 'preview-cache-conformance';
const MODEL = createSpiralModel(false);
const THICKNESS_PC = 10;
const SHAPES: FootprintShape[] = ['circle', 'square', 'hexagon'];
const CENTRES = [
  { x: 8178, y: 0, z: 0 },
  { x: 3000, y: 1200, z: 20 },
  { x: 8178, y: 0, z: 120 },
];
const MARGIN = 0.10;

// pickShape / paintSector geometry, verbatim from galaxyCreationModals.ts.
const charFromCirc = (shape: FootprintShape, r: number): number => (shape === 'square' ? r * Math.SQRT2 : r * 2);
const circFromChar = (shape: FootprintShape, a: number): number => (shape === 'square' ? a / Math.SQRT2 : a / 2);
const coverCircumradius = (characteristicPc: number): number =>
  ((characteristicPc / 2) / (1 - 2 * MARGIN)) * Math.SQRT2;

/** What `paintSector` does for a given shape + circumradius: key, get-or-
 *  compute the cover field, partition it. */
function paint(centre: { x: number; y: number; z: number }, shape: FootprintShape, radiusPc: number) {
  const characteristicPc = charFromCirc(shape, radiusPc);
  const key = coverFieldCacheKey(SEED, centre, characteristicPc, THICKNESS_PC);
  const coverR = coverCircumradius(characteristicPc);
  const field = coverField(key, () => generateSector(SEED, MODEL, centre, coverR, THICKNESS_PC, 'square'));
  const inSector: string[] = [];
  const ghost: string[] = [];
  for (const s of field) {
    const inFp = isWithinFootprint(s.positionPc.x - centre.x, s.positionPc.y - centre.y, radiusPc, shape);
    (inFp ? inSector : ghost).push(s.sysid);
  }
  return { fieldLen: field.length, inSector, ghost, key };
}

/* 1. PARTITION IS TOTAL AND DISJOINT ---------------------------------------- */

check('1 every cover-field system lands in exactly one of {in-sector, ghost} - ' +
  'the white and grey layers partition one merged set',
  CENTRES.every((centre) => SHAPES.every((shape) => {
    __resetCoverFieldCache();
    const across = 30;
    const { fieldLen, inSector, ghost } = paint(centre, shape, circFromChar(shape, across));
    const union = new Set([...inSector, ...ghost]);
    return inSector.length + ghost.length === fieldLen && union.size === fieldLen;
  })));

/* 2. THE PARTITION IS POSITION-IDENTICAL TO NATIVE FOOTPRINT GENERATION ---- */

check('2 the partition in-sector layer equals a native generateSector(footprintShape) ' +
  'call EXACTLY, by sysid - same set, no shortfall, nothing invented ' +
  `(EXCLUSION_RADIUS_PC = ${EXCLUSION_RADIUS_PC} pc is far below the system spacing ` +
  'the battery reaches, so cover-square exclusion drops nothing native keeps)',
  CENTRES.every((centre) => SHAPES.every((shape) => {
    __resetCoverFieldCache();
    const across = 40;
    const radiusPc = circFromChar(shape, across);
    const inSector = new Set(paint(centre, shape, radiusPc).inSector);
    const direct = new Set(
      generateSector(SEED, MODEL, centre, radiusPc, THICKNESS_PC, shape).map((s) => s.sysid),
    );
    if (inSector.size !== direct.size) return false;
    for (const id of direct) if (!inSector.has(id)) return false;
    return true;
  })));

/* 3. NEGATIVE CONTROL - an undersized cover provably diverges -------------- */

check('3 negative control: a cover square that does NOT contain the footprint makes ' +
  'the partition under-count vs native generation (shortfall > 0) - proving gate 2 ' +
  'can detect divergence and is not passing vacuously',
  (() => {
    __resetCoverFieldCache();
    const centre = CENTRES[1]!;              // R~3200 pc, dense
    const shape: FootprintShape = 'circle';
    const radiusPc = 40;
    // deliberately generate the "cover" SMALLER than the footprint, so the
    // footprint's outer annulus is never sampled
    const undersizedCoverR = radiusPc * 0.6;
    const cover = generateSector(SEED, MODEL, centre, undersizedCoverR, THICKNESS_PC, 'square');
    const inSector = cover.filter((s) =>
      isWithinFootprint(s.positionPc.x - centre.x, s.positionPc.y - centre.y, radiusPc, shape)).length;
    const direct = generateSector(SEED, MODEL, centre, radiusPc, THICKNESS_PC, shape).length;
    return direct - inSector > 0;
  })());

/* 4. SHAPE SWITCH DOES NO GENERATION ------------------------------------- */

check('4 cycling circle -> square -> hexagon -> circle at a fixed across runs ' +
  'the generation thunk EXACTLY ONCE (the sqrt(2) last-ULP key trap does not bite)',
  (() => {
    __resetCoverFieldCache();
    const centre = CENTRES[0]!;
    const ACROSS = 25;
    let shape: FootprintShape = 'circle';
    let radiusPc = circFromChar('circle', ACROSS);
    const cycle: FootprintShape[] = ['circle', 'square', 'hexagon', 'circle'];
    let firstKey: string | null = null;
    let everyStateHitAfterFirst = true;
    for (let i = 0; i < cycle.length; i++) {
      if (i > 0) {
        // exactly the pickShape transition
        const shown = charFromCirc(shape, radiusPc);
        shape = cycle[i]!;
        radiusPc = circFromChar(shape, shown);
      }
      const characteristicPc = charFromCirc(shape, radiusPc);
      const key = coverFieldCacheKey(SEED, centre, characteristicPc, THICKNESS_PC);
      if (i === 0) firstKey = key;
      else if (!coverFieldIsCached(key)) everyStateHitAfterFirst = false;
      paint(centre, shape, radiusPc);
    }
    return __coverFieldGenerations() === 1 && everyStateHitAfterFirst && firstKey !== null;
  })());

/* 5. BUDGET - the cache-hit path stays under one frame (ruling D) ---------- */

check('5 the synchronous cache-hit path (re-partition only, no generation) for the ' +
  'largest battery cover field completes well under one 60 Hz frame (~8 ms)',
  (() => {
    __resetCoverFieldCache();
    // biggest field the battery produces: dense inner centre, generous across
    const centre = CENTRES[1]!;
    const across = 60;
    const shape: FootprintShape = 'square';
    const radiusPc = circFromChar(shape, across);
    const characteristicPc = charFromCirc(shape, radiusPc);
    const key = coverFieldCacheKey(SEED, centre, characteristicPc, THICKNESS_PC);
    const coverR = coverCircumradius(characteristicPc);
    const field = coverField(key, () => generateSector(SEED, MODEL, centre, coverR, THICKNESS_PC, 'square'));
    // now time ONLY the hit-path work: re-partition the cached field
    const t0 = Date.now();
    const REPS = 20;
    for (let r = 0; r < REPS; r++) {
      let a = 0, b = 0;
      for (const s of field) {
        (isWithinFootprint(s.positionPc.x - centre.x, s.positionPc.y - centre.y, radiusPc, shape) ? a++ : b++);
      }
      if (a + b !== field.length) return false;
    }
    const perPartitionMs = (Date.now() - t0) / REPS;
    console.log(`    (cover field ${field.length} systems, re-partition ${perPartitionMs.toFixed(2)} ms)`);
    return perPartitionMs < 8;
  })());

check('gate count matches PREVIEW_CACHE_GATES', PREVIEW_CACHE_GATES === 5);

if (failures > 0) throw new Error(`${failures} previewCache conformance failure(s)`);
console.log('\nall previewCache conformance checks passed');
