/**
 * sectorFootprint - the missing piece between `placement`'s per-cell
 * Thomas process and an actual SECTOR: which cells does a footprint touch,
 * which of their systems fall inside the requested shape, and (this
 * module's other half) assembling that into one final, exclusion-resolved
 * candidate set. `main.ts`'s own header already named this gap directly -
 * its one test command manually walks a fixed 3x3 cell block with NO shape
 * or radius filtering at all, because nothing else existed to call.
 *
 * -- SHAPE, AND THE ONE CONVENTION THIS MODULE HAD TO INVENT ------------------
 * `SectorRecipe.radiusPc` is documented as "CIRCUMRADIUS of the footprint,
 * FOR EVERY SHAPE" - so a circle, square or hexagon of the same `radiusPc`
 * all fit inside the identical bounding circle, which is what makes cell
 * enumeration shape-agnostic (below). The shape TEST itself needed a
 * concrete geometry no prior module specified:
 *   - circle: the trivial case, `distance(point, centre) <= radiusPc`.
 *   - square: AXIS-ALIGNED (no rotation parameter exists anywhere in the
 *     schema), half-side = `radiusPc / sqrt(2)` so the CORNERS - not the
 *     edges - sit on the circumradius, matching "circumradius" literally.
 *   - hexagon: REGULAR, POINTY-TOP (a vertex on the +x axis, i.e. at
 *     `centrePc + (radiusPc, 0)`) - an arbitrary but explicit choice, since
 *     nothing in the schema states an orientation. Implemented as the
 *     intersection of six half-planes (a regular N-gon's standard
 *     representation), apothem = `radiusPc * cos(pi/6)`.
 * All three graded `calibrated` - UI/geometry conventions, not sourced
 * figures.
 *
 * -- SLAB THICKNESS -------------------------------------------------------------
 * `SectorRecipe.thicknessPc` is documented as "FULL thickness, not half" -
 * so the admitted z-range is `[centrePc.z - thicknessPc/2, centrePc.z +
 * thicknessPc/2]`, independent of the horizontal footprint shape.
 *
 * -- WHY CELL ENUMERATION NEEDS NO SHAPE-SPECIFIC LOGIC --------------------------
 * Every shape here is a subset of the circle of the SAME `radiusPc` (a
 * circumradius, by definition, circumscribes the shape) - so the cell
 * bounding box is always the same simple cube around `centrePc`
 * (`+/- radiusPc` in x/y, `+/- thicknessPc/2` in z), regardless of
 * `footprintShape`. The shape only matters for the per-SYSTEM filter that
 * runs after `placement.rollCell`, never for which cells get visited.
 *
 * genVersion: this module reads `placement`'s own output and filters it -
 * it draws nothing of its own, so it does not participate in genVersion
 * directly, but `radiusPc`/`thicknessPc`/`footprintShape` ARE hashed into
 * `galaxyConfigHash` where thickness moves lambda (R15) - see `types.ts`'s
 * own `SectorRecipe` comments, not repeated here.
 */

import type { GalaxyModel } from './galaxyModel';
import {
  rollCell, applyExclusion, mergeLocalSymmetric, CELL_SIZE_PC, EXCLUSION_RADIUS_PC,
  type CellKey, type PlacedSystem, type MergeCandidate,
} from './placement';
import { rollRemnantCell, type RemnantSystem } from './remnants';
import { conatalProbability, drawGroup, groupRng } from './conatal';

export type FootprintShape = 'circle' | 'square' | 'hexagon';

/** Regular-hexagon half-plane apothem, pointy-top (see header). */
const HEX_APOTHEM_RATIO = Math.cos(Math.PI / 6);
/** Axis-aligned square, corners on the circumradius (see header). */
const SQUARE_HALF_SIDE_RATIO = 1 / Math.SQRT2;

/** `dx`/`dy` relative to the footprint's own centre, in pc. */
export function isWithinFootprint(dx: number, dy: number, radiusPc: number, shape: FootprintShape): boolean {
  if (shape === 'circle') return Math.hypot(dx, dy) <= radiusPc;
  if (shape === 'square') {
    const half = radiusPc * SQUARE_HALF_SIDE_RATIO;
    return Math.abs(dx) <= half && Math.abs(dy) <= half;
  }
  // hexagon - intersection of six half-planes, normals every 60 deg,
  // offset 30 deg from the pointy-top vertex direction (see header).
  const apothem = radiusPc * HEX_APOTHEM_RATIO;
  for (let k = 0; k < 6; k++) {
    const normalAngle = (Math.PI / 6) + k * (Math.PI / 3);
    const projection = dx * Math.cos(normalAngle) + dy * Math.sin(normalAngle);
    if (projection > apothem) return false;
  }
  return true;
}

export function isWithinSlab(dz: number, thicknessPc: number): boolean {
  return Math.abs(dz) <= thicknessPc / 2;
}

function cellIndexOf(coordPc: number): number { return Math.floor(coordPc / CELL_SIZE_PC); }

/**
 * Every cell whose volume could contain a point inside the footprint - a
 * simple bounding cube (see header: shape-agnostic, since every shape fits
 * inside the same circumradius), padded by one cell so a candidate near a
 * cell's own far edge is never missed.
 */
export function cellsTouchingFootprint(
  centrePc: { readonly x: number; readonly y: number; readonly z: number }, radiusPc: number, thicknessPc: number,
): CellKey[] {
  const ixLo = cellIndexOf(centrePc.x - radiusPc) - 1, ixHi = cellIndexOf(centrePc.x + radiusPc) + 1;
  const iyLo = cellIndexOf(centrePc.y - radiusPc) - 1, iyHi = cellIndexOf(centrePc.y + radiusPc) + 1;
  const izLo = cellIndexOf(centrePc.z - thicknessPc / 2) - 1, izHi = cellIndexOf(centrePc.z + thicknessPc / 2) + 1;
  const out: CellKey[] = [];
  for (let ix = ixLo; ix <= ixHi; ix++) {
    for (let iy = iyLo; iy <= iyHi; iy++) {
      for (let iz = izLo; iz <= izHi; iz++) out.push({ ix, iy, iz });
    }
  }
  return out;
}

/**
 * Generates one complete sector: every cell touching the footprint, every
 * system in each, filtered to the requested shape and slab, minimum
 * -separation resolved (`placement.applyExclusion`) across the WHOLE
 * candidate set at once - never per-cell, which would let a pair straddling
 * a cell boundary both survive. This is the function `main.ts`'s own header
 * names as missing, and what a "commit and generate" GUI action calls.
 */
export function generateSector(
  worldSeed: string, model: GalaxyModel,
  centrePc: { readonly x: number; readonly y: number; readonly z: number },
  radiusPc: number, thicknessPc: number, footprintShape: FootprintShape,
): PlacedSystem[] {
  const candidates: PlacedSystem[] = [];
  for (const cell of cellsTouchingFootprint(centrePc, radiusPc, thicknessPc)) {
    for (const s of rollCell(worldSeed, model, cell)) {
      const dx = s.positionPc.x - centrePc.x, dy = s.positionPc.y - centrePc.y, dz = s.positionPc.z - centrePc.z;
      if (isWithinFootprint(dx, dy, radiusPc, footprintShape) && isWithinSlab(dz, thicknessPc)) candidates.push(s);
    }
  }
  return applyExclusion(candidates);
}

/* --------------------------- the full assembled sector --------------------------- */

export interface AssembledStellarSystem {
  readonly placed: PlacedSystem;
  /** Present iff `placed` belongs to a co-natal cluster - see
   *  `systemConductor.ts`'s own `GenerateSystemInputs.conatal` doc comment,
   *  which this is built to feed directly. */
  readonly conatal?: { readonly groupId: string; readonly ageGyr: number; readonly fehMeanDex: number };
}

export interface AssembledSector {
  readonly stellar: readonly AssembledStellarSystem[];
  readonly remnants: readonly RemnantSystem[];
}

/**
 * The REAL sector conductor (16 Aug 2026) - `generateSector` above only ever
 * produced the stellar-placement layer; `remnants.ts` and `conatal.ts` were
 * both fully built and gated but never called from anywhere that produces a
 * real sector, so an actual generated sector had zero remnant systems and
 * no shared co-natal chemistry despite both being finished science (found
 * by audit, closed here). Composes, per footprint:
 *
 *  1. The stellar layer (`placement.rollCell`, unchanged).
 *  2. The remnant layer (`remnants.rollRemnantCell`, additive - Law 5).
 *  3. Co-natal group chemistry (`conatal.drawGroup`) for every Thomas-process
 *     cluster that has offspring - the realism ruling `SystemContext`'s own
 *     `conatalGroupId` doc comment already specified: EVERY placed group is
 *     conatal, there is no separate "is this cluster co-natal" coin flip.
 *  4. ONE exclusion merge across BOTH layers together (`mergeLocalSymmetric`,
 *     Law 1 - the same generic core `applyExclusion` uses), stellar sorting
 *     first so a remnant within `EXCLUSION_RADIUS_PC` of a kept star is the
 *     one dropped - mirrors a sibling build's own `mergeStellarThenRemnants`
 *     ordering rationale: a dropped remnant is never converted into a
 *     companion, `multiplicity.ts`'s own WD-companion promotion already
 *     models that case, and merging here too would double-count it.
 */
export function assembleSector(
  worldSeed: string, model: GalaxyModel,
  centrePc: { readonly x: number; readonly y: number; readonly z: number },
  radiusPc: number, thicknessPc: number, footprintShape: FootprintShape,
): AssembledSector {
  const cells = cellsTouchingFootprint(centrePc, radiusPc, thicknessPc);

  const stellarCandidates: PlacedSystem[] = [];
  const remnantCandidates: RemnantSystem[] = [];
  const conatalByGroupKey = new Map<string, { groupId: string; ageGyr: number; fehMeanDex: number }>();

  for (const cell of cells) {
    const cellStellar = rollCell(worldSeed, model, cell);
    stellarCandidates.push(...cellStellar);
    remnantCandidates.push(...rollRemnantCell(worldSeed, model, cell));

    const parentsWithOffspring = new Set<number>();
    for (const s of cellStellar) {
      if (s.isOffspring && s.parentOrdinal !== undefined) parentsWithOffspring.add(s.parentOrdinal);
    }
    for (const parentOrdinal of parentsWithOffspring) {
      const parent = cellStellar.find((s) => s.ordinal === parentOrdinal && !s.isOffspring);
      if (!parent) continue;   // a parentOrdinal always has its own parent record; defensive only
      const popMeta = model.populations.find((p) => p.key === parent.population);
      if (!popMeta || conatalProbability(popMeta) <= 0) continue;
      const group = drawGroup(groupRng(worldSeed, cell, parentOrdinal), cell, parentOrdinal, popMeta);
      conatalByGroupKey.set(
        `${cell.ix}.${cell.iy}.${cell.iz}.${parentOrdinal}`,
        { groupId: group.groupId, ageGyr: group.ageGyr, fehMeanDex: group.fehMeanDex },
      );
    }
  }

  const withinFootprint = (p: { readonly x: number; readonly y: number; readonly z: number }): boolean => {
    const dx = p.x - centrePc.x, dy = p.y - centrePc.y, dz = p.z - centrePc.z;
    return isWithinFootprint(dx, dy, radiusPc, footprintShape) && isWithinSlab(dz, thicknessPc);
  };
  const inFootprintStellar = stellarCandidates.filter((s) => withinFootprint(s.positionPc));
  const inFootprintRemnants = remnantCandidates.filter((r) => withinFootprint(r.positionPc));

  interface Tagged extends MergeCandidate { readonly kind: 'stellar' | 'remnant'; readonly index: number; }
  const tagged: Tagged[] = [
    ...inFootprintStellar.map((s, index): Tagged => ({
      key: `0,${s.cellKey.ix},${s.cellKey.iy},${s.cellKey.iz},${s.ordinal}`,
      x: s.positionPc.x, y: s.positionPc.y, z: s.positionPc.z, kind: 'stellar', index,
    })),
    ...inFootprintRemnants.map((r, index): Tagged => ({
      key: `1,${r.cellKey.ix},${r.cellKey.iy},${r.cellKey.iz},${r.ordinal}`,
      x: r.positionPc.x, y: r.positionPc.y, z: r.positionPc.z, kind: 'remnant', index,
    })),
  ];
  const kept = mergeLocalSymmetric(tagged, EXCLUSION_RADIUS_PC);

  const stellar: AssembledStellarSystem[] = kept
    .filter((c) => c.kind === 'stellar')
    .map((c): AssembledStellarSystem => {
      const placed = inFootprintStellar[c.index]!;
      const groupKey = placed.isOffspring
        ? `${placed.cellKey.ix}.${placed.cellKey.iy}.${placed.cellKey.iz}.${placed.parentOrdinal}`
        : `${placed.cellKey.ix}.${placed.cellKey.iy}.${placed.cellKey.iz}.${placed.ordinal}`;
      return { placed, conatal: conatalByGroupKey.get(groupKey) };
    });
  const remnants: RemnantSystem[] = kept.filter((c) => c.kind === 'remnant').map((c) => inFootprintRemnants[c.index]!);

  return { stellar, remnants };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. CIRCUMRADIUS HOLDS - every point admitted by ANY shape lies within
 *     `radiusPc` of centre (the circle is the loosest of the three, so this
 *     is really "square/hexagon are subsets of circle at the same radius").
 *  2. SQUARE CORNERS SIT ON THE CIRCUMRADIUS - the point (radiusPc/sqrt(2),
 *     radiusPc/sqrt(2)) is admitted; nudged 1% further out on either axis,
 *     it is not.
 *  3. HEXAGON VERTEX SITS ON THE CIRCUMRADIUS - (radiusPc, 0) is admitted;
 *     nudged 1% further out, it is not.
 *  4. AREA ORDERING - for the same radiusPc, more points from a random
 *     sample fall inside the circle than the hexagon than the square (the
 *     well-known area ordering for inscribed regular polygons - hexagon >
 *     square in area at fixed circumradius, both < the circle itself).
 *  5. SLAB SYMMETRY - `isWithinSlab` admits +/-thicknessPc/2 exactly and
 *     rejects anything beyond, symmetric about zero.
 *  6. EXCLUSION RUNS ON THE WHOLE SECTOR, NOT PER CELL - two systems from
 *     ADJACENT cells within the exclusion radius of each other are
 *     resolved by `generateSector` (verified directly: a pair placed to
 *     straddle a cell boundary is not both kept).
 *  7. DETERMINISM - same inputs give a bit-identical sector, always.
 *  8. assembleSector (16 Aug 2026) is deterministic, same as generateSector.
 *  9. assembleSector's remnant layer is actually populated - the gap the
 *     audit found (remnants.ts fully built and gated, never called from
 *     anything that produces a real sector).
 *  10. assembleSector's stellar layer carries real conatal-group chemistry
 *      for Thomas-process clusters - every member of the SAME group shares
 *      EXACTLY the same age, verified directly.
 *  11. Exclusion runs across the stellar AND remnant layers TOGETHER, not
 *      as two independent passes that could leave a too-close pair standing.
 */
export const SECTOR_FOOTPRINT_GATES = 11 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Sector footprint shape', status: 'calibrated',
    short: 'The 2D outline (circle, square or hexagon) a sector is clipped to, around its centre point.',
    long: 'radiusPc is documented as the CIRCUMRADIUS for every shape. Square is axis-aligned with corners on the circumradius; hexagon is regular and pointy-top with one vertex on the circumradius - both orientation choices this module had to invent, since nothing in the schema specifies one.',
    source: 'Shape choices (axis-aligned square, pointy-top hexagon) are geometric conventions invented for this module - not sourced from any external reference. The circumradius convention itself is types.ts\'s own SectorRecipe documentation.',
  },
];
