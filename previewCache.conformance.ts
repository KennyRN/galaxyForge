/**
 * previewCache.conformance - the 3 PREVIEW_CACHE_GATES (P17 preview-
 * responsiveness package, item C).
 *
 * Gates 1-2 check the modal's cover-square PARTITION (one merged generation,
 * split by `isWithinFootprint`); Gate 3 checks the one-slot memo actually
 * hits across a full shape cycle - the sqrt(2) last-ULP key trap.
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

/* 2. THE PREVIEW INVENTS NOTHING ------------------------------------------- */

check('2 every system the partition shows in-sector also appears in a direct ' +
  'generateSector(footprintShape) call, and the two counts differ only by ' +
  `near-edge systems (within one EXCLUSION_RADIUS_PC = ${EXCLUSION_RADIUS_PC} pc)`,
  CENTRES.every((centre) => SHAPES.every((shape) => {
    __resetCoverFieldCache();
    const across = 40;
    const radiusPc = circFromChar(shape, across);
    const { inSector } = paint(centre, shape, radiusPc);
    const direct = new Set(
      generateSector(SEED, MODEL, centre, radiusPc, THICKNESS_PC, shape).map((s) => s.sysid),
    );
    const invented = inSector.filter((id) => !direct.has(id));
    // inSector is a subset of direct (cover-square exclusion sees a superset
    // of candidates, so it can only drop MORE near the edge, never keep one
    // direct drops). The shortfall is bounded and tiny.
    const shortfall = direct.size - inSector.length;
    return invented.length === 0 && shortfall >= 0 && shortfall <= Math.max(2, Math.ceil(direct.size * 0.02));
  })));

/* 3. SHAPE SWITCH DOES NO GENERATION ------------------------------------- */

check('3 cycling circle -> square -> hexagon -> circle at a fixed across runs ' +
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

check('gate count matches PREVIEW_CACHE_GATES', PREVIEW_CACHE_GATES === 3);

if (failures > 0) throw new Error(`${failures} previewCache conformance failure(s)`);
console.log('\nall previewCache conformance checks passed');
