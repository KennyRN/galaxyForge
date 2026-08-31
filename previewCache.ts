/**
 * previewCache - a one-slot memo for the sol-neighbourhood modal's cover
 * field (P17 preview-responsiveness package, item C).
 *
 * `GalaxySolNeighbourhoodModal.paintSector` generates ONE `generateSector`
 * call for the whole visible square (the "cover field"), then partitions it
 * with `isWithinFootprint` into the in-sector (white) and context (ghost-
 * grey) layers. Every shape has the same across, sits inside the same cover
 * square, and the cover square depends only on `(worldSeed, centre,
 * characteristic-across, slab thickness)` - NOT on the footprint shape. So a
 * shape click changes none of the cache inputs: the click costs one
 * re-partition (~1.5 ms for ~1800 systems), not a regenerate.
 *
 * This module owns ONLY the memo. The `generateSector` call itself stays in
 * the modal (passed here as a thunk), so `previewCache` pulls in nothing
 * heavy and is trivially unit-testable (previewCache.conformance.ts).
 *
 * NOT genVersion-bearing: presentation only, changes no generated output.
 */

import type { PlacedSystem } from './placement';

let slot: { key: string; field: readonly PlacedSystem[] } | null = null;
let generations = 0;

/** Round to a micro-parsec - see `coverFieldCacheKey`. */
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/**
 * The cover-field cache key.
 *
 * KEYED ON THE CHARACTERISTIC ACROSS, NOT THE COVER RADIUS. The cover radius
 * round-trips through sqrt(2) differently per shape (circumradius is
 * `across/2` for circle and hexagon but `across/SQRT2` for square), so
 * circle and square land one ULP apart even when the generated field is
 * bit-identical - moving no cell boundary and flipping no `isWithinFootprint`
 * verdict, but missing a raw-float key every single time, which would make
 * the whole optimisation silently inert. Rounding every component to 1e-6 pc
 * - far below any generation or visual significance, and still finer than any
 * size the UI can express - absorbs that drift while still invalidating on a
 * real centre / size / slab change. previewCache Gate 3 asserts the miss does
 * not happen across a full shape cycle.
 */
export function coverFieldCacheKey(
  worldSeed: string,
  centrePc: { readonly x: number; readonly y: number; readonly z: number },
  characteristicAcrossPc: number,
  thicknessPc: number,
): string {
  return [
    worldSeed,
    r6(centrePc.x), r6(centrePc.y), r6(centrePc.z),
    r6(characteristicAcrossPc), r6(thicknessPc),
  ].join('|');
}

/** True iff `coverField(key, ...)` would return without invoking its thunk.
 *  The modal reads this BEFORE it decides whether to yield a paint for the
 *  spinner (item D): a hit has no long synchronous block to hide. */
export function coverFieldIsCached(key: string): boolean {
  return slot !== null && slot.key === key;
}

/** Get-or-compute the cover field for `key`. `compute` runs the single
 *  `generateSector` call for the cover square and is invoked only on a miss. */
export function coverField(key: string, compute: () => readonly PlacedSystem[]): readonly PlacedSystem[] {
  if (slot !== null && slot.key === key) return slot.field;
  generations++;
  const field = compute();
  slot = { key, field };
  return field;
}

/** TEST-ONLY (previewCache Gate 3): how many times a `compute` thunk has
 *  actually run since the last reset. */
export function __coverFieldGenerations(): number { return generations; }

/** TEST-ONLY: drop the cached field and zero the generation counter. */
export function __resetCoverFieldCache(): void { slot = null; generations = 0; }

/**
 * Invariants this module + the modal partition owe
 * (see previewCache.conformance.ts):
 *  1. PARTITION IS TOTAL AND DISJOINT - every cover-field system lands in
 *     exactly one of {in-sector, ghost}, and the two never overlap. The
 *     white and grey layers cannot disagree at the seam.
 *  2. THE PREVIEW INVENTS NOTHING - every system the partition shows as
 *     in-sector also appears in a direct `generateSector(footprintShape)`
 *     call; the counts differ only by systems within one `EXCLUSION_RADIUS_PC`
 *     (0.1 pc) of the footprint edge, i.e. sub-pixel at preview scale.
 *  3. SHAPE SWITCH DOES NO GENERATION - cycling circle -> square -> hexagon
 *     -> circle at a fixed across runs `compute` exactly once (the sqrt(2)
 *     last-ULP key trap does not bite).
 */
export const PREVIEW_CACHE_GATES = 3 as const;
