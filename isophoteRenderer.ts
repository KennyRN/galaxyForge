/**
 * isophoteRenderer - the isophote (hard-quantised, absolute-scale) density
 * map, Prompt P1 (arms bundle R2, 27 Aug 2026). Split out from
 * `galaxyCreationModals.ts` (which owns this module's only two callers)
 * for one structural reason: that file imports `obsidian` at module scope,
 * which poisons any Node-side import of ANYTHING it exports - including
 * pure, DOM-free functions with zero Obsidian dependency - so nothing in
 * it could ever be gate-tested. This module has no Obsidian import and no
 * `HTMLCanvasElement` dependency until `paintDensityField`/
 * `drawIsophoteLegend` right at the bottom (both take a canvas the CALLER
 * supplies; this module never creates one), so everything above those two
 * functions is plain, portable, gate-testable TypeScript.
 *
 * genVersion: does NOT participate. Display-only (Amendment A3), same as
 * `densityMap.ts` itself - nothing here touches a generated quantity.
 */

import type { GalaxyModel } from './galaxyModel';
import { R0_PC } from './galaxyModel';
import { fieldFromModel, projectSlab, simpsonWeights, sampleBilinear, type SlabRegionPc } from './densityMap';
import { complexParticipation, complexCellsOverlapping, complexCentresInCell, type ComplexCentre } from './starFormingComplexes';
import { densityByPopulationAtCartesian } from './galacticDensity';
import type { ComplexTierParams } from './galaxyParameters';
import type { FootprintShape } from './sectorFootprint';

/**
 * Complex-tier clump positions for the preview (16 Aug 2026, closing a real
 * promise: the "updated arm-creation method" (`starFormingComplexes.ts`'s
 * own seeded Poisson hierarchy, already wired into REAL generation via
 * `sectorFootprint.assembleSector`) was meant to account for clusters/
 * bright patches on the arms, but this GUI's own preview only ever painted
 * the smooth continuous field - the real mechanism existed and ran on
 * every actual "Generate Sector" commit, it just never reached what the
 * user could SEE beforehand. This draws the REAL complex centres - same
 * worldSeed, same positions eventual sector generation will actually place
 * - as small bright clumps layered on top of the isophote bands, not
 * invented decoration.
 *
 * DELIBERATE PREVIEW SIMPLIFICATIONS, stated rather than hidden - a
 * REAL sector's own complex layer places actual, individually-legible
 * complexes because a sector spans tens to hundreds of pc; the whole
 * GALAXY spans tens of THOUSANDS of pc, so the real complex population
 * over that whole area is genuinely enormous (this session's own
 * diagnostic script measured ~90 000 real complex centres for one typical
 * seed at the real pipeline's own density) - individually rendering that
 * many is neither legible (each one is far sub-pixel at this zoom, same
 * reasoning as the bar's own core scale) nor affordable. So this overlay
 * is a deliberately THINNED, representative sample of the real seeded
 * positions, not the true population:
 *  - `cellMeanSubGridN` is coarsened to `PREVIEW_COMPLEX_SUBGRID_N` (4, vs
 *    the real pipeline's default 32) and `cellSizePc` widened to
 *    `PREVIEW_COMPLEX_CELL_SIZE_PC` (3000, vs the real default 1200) - both
 *    purely computational-budget choices; the quadrature accuracy and fine
 *    cell binning real generation needs are wasted precision for a few
 *    hundred on-screen pixels.
 *  - `youngSurfaceAt` is scaled by `PREVIEW_COMPLEX_SURFACE_SCALE`, a
 *    DIMENSIONLESS render-budget knob, not a physical slab thickness (the
 *    galaxy-wide overview has no single real thickness to represent - a
 *    sector's own generation reads its own actual chosen thickness at
 *    commit time, completely independently of this preview). Tuned
 *    empirically (this session's own diagnostic script) to land in the low
 *    hundreds of complex centres across a typical seed's whole visible
 *    disc - enough to read as genuine patchy structure along the arms,
 *    far short of the real population, honestly a SAMPLE rather than a
 *    census.
 *  - each centre is drawn as a small FIXED-PIXEL-RADIUS cluster, not
 *    `sigmaPc` projected to true scale - at a whole-galaxy zoom a genuine
 *    150 pc complex is sub-pixel, so a literal projection would be
 *    invisible.
 *  - `MAX_PREVIEW_CLUMPS` is a hard safety cap (deterministic stride
 *    -thinning, not a random drop) for whatever seed/morphology combination
 *    produces an unusually high `complexParticipation` - render cost stays
 *    bounded regardless of how the underlying science happens to weight a
 *    given population.
 */
const PREVIEW_COMPLEX_SUBGRID_N = 4;
const PREVIEW_COMPLEX_CELL_SIZE_PC = 3000;
const PREVIEW_COMPLEX_SURFACE_SCALE = 0.05;
const MAX_PREVIEW_CLUMPS = 900;

export function complexCentresForOverview(
  model: GalaxyModel, worldSeed: string, complexTier: ComplexTierParams,
  centrePc: { readonly x: number; readonly y: number; readonly z: number }, radiusPc: number,
): readonly ComplexCentre[] {
  const youngPop = model.populations.find((p) => p.key === 'spiralYoungThin');
  if (!youngPop) return [];   // elliptical/lenticular/thick/halo-only morphologies: no young disc, no complexes
  const w = complexParticipation(youngPop, complexTier);
  if (!(w > 0)) return [];
  const preview: ComplexTierParams = {
    ...complexTier, cellMeanSubGridN: PREVIEW_COMPLEX_SUBGRID_N, cellSizePc: PREVIEW_COMPLEX_CELL_SIZE_PC,
  };
  const youngSurfaceAt = (x: number, y: number): number => {
    const d = densityByPopulationAtCartesian(model, x, y, 0);
    return PREVIEW_COMPLEX_SURFACE_SCALE * (d.spiralYoungThin ?? 0);
  };
  const guardPc = preview.guardBandSigma * preview.sigmaComplexPc;
  const cells = complexCellsOverlapping(centrePc.x, centrePc.y, radiusPc, preview.cellSizePc, guardPc, youngSurfaceAt, preview.cellMeanSubGridN);
  const meanSystemsPerGroup = youngPop.meanGroupSize ?? 12;
  const out: ComplexCentre[] = [];
  for (const cell of cells) out.push(...complexCentresInCell(cell, worldSeed, w, youngSurfaceAt, preview, meanSystemsPerGroup));
  if (out.length <= MAX_PREVIEW_CLUMPS) return out;
  const stride = Math.ceil(out.length / MAX_PREVIEW_CLUMPS);
  return out.filter((_, i) => i % stride === 0);
}

function boundaryPointsPc(radiusPc: number, shape: FootprintShape): { x: number; y: number }[] {
  if (shape === 'circle') {
    return Array.from({ length: 65 }, (_, i) => {
      const a = (i / 64) * 2 * Math.PI;
      return { x: radiusPc * Math.cos(a), y: radiusPc * Math.sin(a) };
    });
  }
  if (shape === 'square') {
    const half = radiusPc / Math.SQRT2;
    return [{ x: half, y: half }, { x: -half, y: half }, { x: -half, y: -half }, { x: half, y: -half }, { x: half, y: half }];
  }
  // hexagon, pointy-top - vertices at k*60deg, matching isWithinFootprint's own convention
  return Array.from({ length: 7 }, (_, k) => {
    const a = (k % 6) * (Math.PI / 3);
    return { x: radiusPc * Math.cos(a), y: radiusPc * Math.sin(a) };
  });
}

/**
 * ISOPHOTE RENDERER (Prompt P1, arms bundle R2, 27 Aug 2026). Full
 * replacement of the photographic pipeline that used to live here
 * (`computeAgeWarmth`, a two-endpoint RGB lerp, `DUST_TINT_RGB`, a single
 * gamma, sparse sparkle) - per the owner's own confirmation, given the
 * palette ruling below: inferno/magma/viridis/greyscale are exactly the
 * family built for a quantised isophote map, not a photographic blend. A
 * DIFFERENT display convention (`01-ISOPHOTE-RENDERER.md`'s own framing),
 * not a tuning of the old one - hence the wholesale replacement rather than
 * an incremental edit.
 *
 * Absolute, never percentile: `sigma` below is real systems/pc^2, and band
 * index is `floor(log2(sigma / SIGMA_MIN))` - identical density means
 * identical colour in every galaxy, which is what makes the plate
 * quantitatively honest (S1-S2 of the package doc) and is exactly what
 * gate 10 (below) leans on: band SPREAD around an annulus is directly
 * log2(contrast), decodable from the plate with zero ambiguity because the
 * palette is a hard 17-colour quantisation, not a continuous gradient.
 *
 * RULING 1 (palette) departs from the bundle's own PAL_ASTRO_DARK/
 * PAL_TOPO_DARK proposal - the owner chose inferno (default), magma,
 * viridis and greyscale instead. These are monotonically BRIGHTENING
 * colormaps (dark to pale, not dark-bright-dark), so the dense nucleus
 * reads as the BRIGHTEST band, not the "dark eye" the original two ramps
 * were designed around - a different, equally legitimate look (real
 * isophote/heatmap astronomy plots commonly saturate the core bright), not
 * a defect. RULING 2 (export plate): clean, no sector marker - the
 * in-app overlay is picker chrome, wrong on an exported data plate.
 */

/** Cell size is the PRIMARY constant (erratum 1.1) - grid dimension is
 *  DERIVED from it, never the other way around. 65 pc: below Reid's
 *  narrowest arm width (170 pc at 3.5 kpc) and the Efremov complex scale
 *  (~600 pc), so smoothing at this cell size removes sampling noise
 *  without touching real signal. This is what makes gate 1 (absolute
 *  levels invariant under frame extent) hold BY CONSTRUCTION: cell size
 *  and smoothing-in-parsecs never change with the frame, only the grid
 *  dimension does. */
export const ISOPHOTE_CELL_SIZE_PC = 65;
/** systems/pc^2, `tunable` (S2). Below this, background. */
export const ISOPHOTE_SIGMA_MIN = 0.25;
/** `tunable` (S2). Each band is a doubling (log2), so 17 bands spans
 *  0.25 to 0.25*2^17 = 32768 systems/pc^2, 5.12 dex total. */
export const ISOPHOTE_BANDS = 17;
const ISOPHOTE_BG_HEX = '050710';

/** `log2(sigma/SIGMA_MIN)`, continuous - UNCLAMPED, un-floored. The one
 *  shared formula `isophoteBandIndex` (the discrete, legend/measurement
 *  quantity) and `interpolatedBandColor` (the smooth, PAINTING quantity,
 *  28 Aug 2026) both build from, so the two can never drift apart - a
 *  pixel sitting exactly ON a band boundary reproduces the same integer
 *  either way. */
function continuousBandPosition(sigmaSystemsPerPc2: number): number {
  return Math.log2(sigmaSystemsPerPc2 / ISOPHOTE_SIGMA_MIN);
}

/**
 * Band index for a surface density - `floor(log2(sigma/SIGMA_MIN))`,
 * clamped: below the floor is background (-1), at/above the ceiling
 * clamps to the top band (16) rather than erroring - "a dense nucleus
 * saturating into the top band is honest, not an artefact" (S2). Pure,
 * trivially monotonic (gate 9: band index is non-decreasing in density,
 * including both clamps, because `floor(log2(.))` already is one).
 *
 * This is the DISCRETE quantity - the legend's own swatches, gate 10's
 * arm-amplitude-in-bands measurement, and every other gate that reads a
 * band index all keep using this, unchanged. `paintDensityField` itself
 * moved off it (28 Aug 2026) to `interpolatedBandColor` below - see that
 * function's own header for why painting a hands-on-found problem.
 */
export function isophoteBandIndex(sigmaSystemsPerPc2: number): number {
  if (!(sigmaSystemsPerPc2 > 0)) return -1;
  const raw = Math.floor(continuousBandPosition(sigmaSystemsPerPc2));
  if (raw < 0) return -1;
  return Math.min(ISOPHOTE_BANDS - 1, raw);
}

/**
 * Smoothly interpolated RGB colour for a continuous surface density -
 * hands-on found, 28 Aug 2026: `paintDensityField` used to paint each
 * pixel a FLAT, solid colour from `bandRgb[isophoteBandIndex(s)]` - since
 * each band is a full DOUBLING (5.12 dex across 17 bands total), any real
 * density difference that does not cross a whole band boundary was
 * completely invisible, painted identically either side of it. A seeded
 * spiral's own genuine, gated arm/interarm contrast (roughly x2.5-x5
 * depending on armClass) mostly landed INSIDE one band's own flat colour
 * almost everywhere except right at a pre-existing boundary - reading, on
 * an actual rendered plate, as "an elliptical galaxy with the arms only
 * poking out slightly" rather than visible spiral structure, even though
 * the underlying field (confirmed directly, disposable diagnostic script)
 * has real, substantial azimuthal structure throughout.
 *
 * THE ABSOLUTE LOG2 SCALE ITSELF IS UNCHANGED - this does not touch
 * `isophoteBandIndex`, the legend, or gate 10's own arm-amplitude-in
 * -bands measurement, all of which keep reading the discrete, physically
 * -decodable band index exactly as before. This is a PAINTING refinement
 * only: instead of jumping from one band's flat colour to the next in one
 * step exactly at the boundary, the colour is linearly interpolated
 * between the two nearest band colours by the density's own fractional
 * position within that doubling (`continuousBandPosition`, the same
 * formula `isophoteBandIndex` floors) - continuous, so a pixel sitting
 * EXACTLY on a boundary still reproduces the discrete `bandRgb[n]` colour
 * exactly (fractional part 0), and the legend's own swatches never
 * disagree with the plate at the boundaries themselves; only the flat
 * interior a discrete step used to leave untouched now varies smoothly.
 * Saturates to the top band's own flat colour at/above the ceiling
 * (unchanged behaviour - "a dense nucleus saturating into the top band is
 * honest, not an artefact", `isophoteBandIndex`'s own header) - there is
 * no band 17 to interpolate toward. Below `SIGMA_MIN`, fades smoothly
 * INTO the background colour rather than a hard cut at the floor either -
 * the same reasoning applied one boundary further down (background is
 * treated as a virtual "band -1" for exactly this purpose).
 */
export function interpolatedBandColor(
  sigmaSystemsPerPc2: number,
  bandRgb: readonly (readonly [number, number, number])[],
  bgRgb: readonly [number, number, number],
): [number, number, number] {
  if (!(sigmaSystemsPerPc2 > 0)) return [bgRgb[0], bgRgb[1], bgRgb[2]];
  const pos = continuousBandPosition(sigmaSystemsPerPc2);
  if (pos >= ISOPHOTE_BANDS - 1) {
    const top = bandRgb[ISOPHOTE_BANDS - 1]!;
    return [top[0], top[1], top[2]];
  }
  const lo = Math.floor(pos);
  const t = pos - lo;
  const colourAt = (band: number): readonly [number, number, number] => (band < 0 ? bgRgb : bandRgb[band]!);
  const [r0, g0, b0] = colourAt(lo);
  const [r1, g1, b1] = colourAt(lo + 1);
  return [r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t];
}

/**
 * Grid dimension is DERIVED from the frame extent and the fixed cell
 * size (erratum 1.1/1.2's fix for gate 1 and gate 3) - `ceil(frameExtent
 * / cellSizePc)`. A 26 kpc frame (halfWidthPc=13000) gives ceil(26000/65)
 * = 400, matching the package doc's own worked example exactly.
 *
 * `maxCellsPerAxis` (28 Aug 2026, hands-on found - "should be quicker,
 * takes about the same time") is OPTIONAL and, omitted, reproduces this
 * exact formula with NO cap at all - every existing caller (every
 * conformance gate, gate 1's own 400x400 worked-example check included)
 * is completely unaffected. When supplied, it CAPS the derived dimension
 * (never raises it - a frame small enough to stay under the cap already
 * gets its full, uncompromised 65pc cells either way).
 *
 * WHY A CAP EXISTS AT ALL, stated plainly: for a real "Standard"-scale
 * Milky-Way-Analogue (R90 ~ 10.6kpc, `galaxyCreationModals.ts`'s own
 * R90_MARGIN=1.8 framing), the derived grid is 588x588 = 345,744 cells -
 * 8.6x the OLD (pre-P1) fixed 200x200 preview grid - and each cell's own
 * 5-sample vertical Simpson quadrature makes this a genuinely expensive
 * computation: measured directly (disposable diagnostic script, this
 * session), ~17.5 SECONDS for that one case, fully synchronous, freezing
 * the whole modal. Even the package doc's own 400x400 worked example
 * measures ~8s at this project's own per-cell cost - the spec's
 * reference case is ALREADY too slow for an interactive, slider-driven
 * preview, not merely the large-galaxy edge case.
 *
 * THE ABSOLUTE, FIXED-CELL-SIZE INVARIANT ITSELF IS NOT WEAKENED - it is
 * SCOPED. `isophoteGridRes`/`computeDensityDisplayField` called with NO
 * cap (as every gate does, and as any future precise/exportable plate
 * should) still produce the exact, uncompromised, erratum-1.1/1.2-correct
 * 65pc-cell field - identical physical resolution regardless of frame
 * extent, exactly as that erratum requires. The cap is an EXPLICIT, only
 * ever opted-into-by-the-caller relaxation for the live, transient,
 * never-saved interactive preview canvas specifically
 * (`galaxyCreationModals.ts`'s own call sites pass one; nothing else
 * does) - the caller's own choice to trade some absolute resolution for
 * responsiveness while a user is actively dragging a slider, stated
 * honestly rather than silently baked into the one function every
 * caller shares.
 */
export function isophoteGridRes(halfWidthPc: number, maxCellsPerAxis?: number): { nx: number; ny: number } {
  const n = Math.max(1, Math.ceil((2 * halfWidthPc) / ISOPHOTE_CELL_SIZE_PC));
  const capped = maxCellsPerAxis !== undefined ? Math.min(n, maxCellsPerAxis) : n;
  return { nx: capped, ny: capped };
}

/** 5-tap separable Gaussian, sigma = 1 CELL (S4: "smooth on the grid at
 *  sigma=1 cell, THEN upsample, then quantise" - upsampling first would
 *  double-blur through the interpolation kernel). Weights are the standard
 *  sigma=1 kernel at integer offsets -2..2 (exp(-x^2/2), normalised).
 *  Edge-clamped (nearest valid cell), not wrapped - the field is a bounded
 *  view of the galaxy, not a periodic domain. */
const GAUSSIAN_1CELL_KERNEL = [0.0545, 0.2442, 0.4026, 0.2442, 0.0545] as const;
export function smoothGrid1Cell(values: Float64Array, nx: number, ny: number): Float64Array {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const tmp = new Float64Array(nx * ny);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      let sum = 0;
      for (let k = -2; k <= 2; k++) sum += values[clamp(ix + k, 0, nx - 1) + nx * iy]! * GAUSSIAN_1CELL_KERNEL[k + 2]!;
      tmp[ix + nx * iy] = sum;
    }
  }
  const out = new Float64Array(nx * ny);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      let sum = 0;
      for (let k = -2; k <= 2; k++) sum += tmp[ix + nx * clamp(iy + k, 0, ny - 1)]! * GAUSSIAN_1CELL_KERNEL[k + 2]!;
      out[ix + nx * iy] = sum;
    }
  }
  return out;
}

/** Type II broken exponential (S6) - without an outer break the disc never
 *  ends and the lowest bands run off the frame edge. Sourced IN KIND to
 *  van der Kruit 1979 / Pohlen & Trujillo 2006 (a real, well-attested
 *  outer-truncation FORM in real disc galaxies); the specific break radius
 *  and outer scale for a procedurally generated galaxy are `tunable` - set
 *  relative to the frame itself (80%/15% of halfWidthPc) rather than an
 *  absolute figure, so the truncation always lands inside frame, at any
 *  scale. Display-side only (S6: "if wired into the field `placement`
 *  reads, it becomes a shape break") - applied here, after the raw
 *  surface density is sampled, never touching the generated field.
 *
 *  `ISOPHOTE_BREAK_RADIUS_FRACTION` EXPORTED (28 Aug 2026, a direct user
 *  finding: "the outer limits... looks like a perfectly round circle") -
 *  `galaxyCreationModals.ts`'s own framing now derives `halfWidthPc` for
 *  arm-bearing morphologies from the arm class's own termination radius
 *  (Stage C) rather than R90 alone, specifically so THIS fraction of that
 *  frame lands at the real arm terminus - the caller needs the same
 *  constant, not a second hardcoded 0.80 that could drift out of sync. */
export const ISOPHOTE_BREAK_RADIUS_FRACTION = 0.80;
const ISOPHOTE_BREAK_SCALE_FRACTION = 0.15;
export function applyOuterBreak(values: Float64Array, nx: number, ny: number, halfWidthPc: number): Float64Array {
  const breakRPc = ISOPHOTE_BREAK_RADIUS_FRACTION * halfWidthPc;
  const hOutPc = ISOPHOTE_BREAK_SCALE_FRACTION * halfWidthPc;
  const out = new Float64Array(values.length);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = -halfWidthPc + ((ix + 0.5) / nx) * 2 * halfWidthPc;
      const y = -halfWidthPc + ((iy + 0.5) / ny) * 2 * halfWidthPc;
      const R = Math.hypot(x, y);
      const i = ix + nx * iy;
      out[i] = values[i]! * (R > breakRPc ? Math.exp(-(R - breakRPc) / hOutPc) : 1);
    }
  }
  return out;
}

/** Radially growing granularity (S6) - relative Poisson fluctuation goes
 *  as 1/sqrt(N), so outer isophotes are genuinely patchier than inner
 *  ones. Amplitude grows linearly with R, capped at
 *  `ISOPHOTE_GRANULARITY_MAX` so it modulates rather than dominates.
 *  ONE octave, deliberately - "noise octaves must be capped at the grid"
 *  (S6): at this cell size, a second (finer) octave would already be
 *  below the grid's own resolution and is exactly the wasted-work case
 *  the package doc warns against, so a single grid-resolution octave IS
 *  the correct implementation here, not a shortcut.
 *
 *  `Math.random()`, not the plugin's seeded/channelled RNG - draws no
 *  system and rolls nothing generated, the same "reveals, does not roll,
 *  extended to pixels" exemption the old sparkle pass already used.
 *  Computed ONCE per field (not per repaint) so it stays stable across
 *  redraws of the same cached field, rather than flickering. */
const ISOPHOTE_GRANULARITY_MAX = 0.35;
export function applyRadialGranularity(values: Float64Array, nx: number, ny: number, halfWidthPc: number): Float64Array {
  const out = new Float64Array(values.length);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = -halfWidthPc + ((ix + 0.5) / nx) * 2 * halfWidthPc;
      const y = -halfWidthPc + ((iy + 0.5) / ny) * 2 * halfWidthPc;
      const R = Math.hypot(x, y);
      const amp = ISOPHOTE_GRANULARITY_MAX * Math.min(1, R / halfWidthPc);
      const i = ix + nx * iy;
      out[i] = values[i]! * (1 + amp * (Math.random() * 2 - 1));   // factor in [1-amp, 1+amp], always > 0
    }
  }
  return out;
}

/**
 * The solar-neighbourhood column anchor, systems/pc^2, for the legend's
 * marker (S1: "do not hard-code 48.1 - compute it at render time by
 * evaluating the galaxy's own field at the model's solar radius and
 * integrating its own vertical profile"). Simpson quadrature over a
 * generous +/-6000 pc window (past thick-disc AND halo scale heights, not
 * just the thin disc's ~300 pc), reusing `densityMap.ts`'s own exported
 * `simpsonWeights`/`cellCentres` (Law 1 - one quadrature technique, not a
 * second hand-rolled copy) rather than assuming an analytic exponential
 * form, so a future non-exponential vertical profile integrates correctly
 * with no change needed here.
 */
const ISOPHOTE_ANCHOR_Z_HALF_WINDOW_PC = 6000;
const ISOPHOTE_ANCHOR_Z_SAMPLES = 41;   // odd, Simpson
export function computeSolarAnchorSystemsPerPc2(model: GalaxyModel): number {
  // NOTE: deliberately NOT `cellCentres` here, despite reusing its sibling
  // `simpsonWeights` - `cellCentres` returns CELL-CENTRED points (offset
  // half a step inward from both ends), which is right for a volume grid
  // but wrong for Simpson's rule, which requires nodes AT both endpoints.
  // Endpoints computed directly instead.
  const half = ISOPHOTE_ANCHOR_Z_HALF_WINDOW_PC;
  const n = ISOPHOTE_ANCHOR_Z_SAMPLES;
  const h = (2 * half) / (n - 1);
  const weights = simpsonWeights(n);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += weights[i]! * model.densityAt(R0_PC, 0, -half + i * h);
  return sum * (h / 3);   // Simpson's rule: integral ~= (h/3) * sum(weight_i * f_i)
}

/** RGB linear interpolation between named anchor stops - generates an
 *  N-point palette from a small, honestly-sourced set of control points
 *  rather than hand-transcribing N hex values (error-prone at N=17,
 *  and this way the actual anchors - the part with any claim to being
 *  "the real colormap" - are the only thing on the page). */
export function interpolatePaletteFromAnchors(anchors: readonly { readonly t: number; readonly hex: string }[], n: number): readonly string[] {
  const hexToRgb = (hex: string): [number, number, number] =>
    [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    let lo = anchors[0]!, hi = anchors[anchors.length - 1]!;
    for (let k = 0; k < anchors.length - 1; k++) {
      if (t >= anchors[k]!.t && t <= anchors[k + 1]!.t) { lo = anchors[k]!; hi = anchors[k + 1]!; break; }
    }
    const span = hi.t - lo.t;
    const f = span > 0 ? (t - lo.t) / span : 0;
    const [r0, g0, b0] = hexToRgb(lo.hex), [r1, g1, b1] = hexToRgb(hi.hex);
    out.push(toHex(r0 + (r1 - r0) * f) + toHex(g0 + (g1 - g0) * f) + toHex(b0 + (b1 - b0) * f));
  }
  return out;
}

/**
 * RULING 1 (27 Aug 2026): inferno (default), magma, viridis, greyscale -
 * replaces the bundle's own PAL_ASTRO_DARK/PAL_TOPO_DARK proposal
 * entirely. These are matplotlib's own perceptually-uniform sequential
 * colormaps (Nathaniel Smith, Stefan van der Walt, and for viridis, Eric
 * Firing - public domain, CC0). Reproduced here as a 5-anchor
 * APPROXIMATION of each colormap's own well-known key colours, linearly
 * interpolated to 17 stops - NOT pixel-exact against matplotlib's full
 * 256-entry table, and labelled as such rather than implied to be exact.
 * If byte-exact reproduction is ever needed, replace the anchor tables
 * below with the real published RGB arrays; nothing else in this module
 * would need to change.
 */
export type IsophotePalette = 'inferno' | 'magma' | 'viridis' | 'greyscale';
const ISOPHOTE_PALETTE_ANCHORS: Readonly<Record<IsophotePalette, readonly { readonly t: number; readonly hex: string }[]>> = {
  inferno: [{ t: 0, hex: '000004' }, { t: 0.25, hex: '56106e' }, { t: 0.5, hex: 'bc3754' }, { t: 0.75, hex: 'f98c0a' }, { t: 1, hex: 'fcffa4' }],
  magma: [{ t: 0, hex: '000004' }, { t: 0.25, hex: '51127c' }, { t: 0.5, hex: 'b73779' }, { t: 0.75, hex: 'fb8861' }, { t: 1, hex: 'fcfdbf' }],
  viridis: [{ t: 0, hex: '440154' }, { t: 0.25, hex: '3b528b' }, { t: 0.5, hex: '21908c' }, { t: 0.75, hex: '5dc963' }, { t: 1, hex: 'fde725' }],
  greyscale: [{ t: 0, hex: '000000' }, { t: 1, hex: 'ffffff' }],
};
export const ISOPHOTE_PALETTES: Readonly<Record<IsophotePalette, readonly string[]>> = {
  inferno: interpolatePaletteFromAnchors(ISOPHOTE_PALETTE_ANCHORS.inferno, ISOPHOTE_BANDS),
  magma: interpolatePaletteFromAnchors(ISOPHOTE_PALETTE_ANCHORS.magma, ISOPHOTE_BANDS),
  viridis: interpolatePaletteFromAnchors(ISOPHOTE_PALETTE_ANCHORS.viridis, ISOPHOTE_BANDS),
  greyscale: interpolatePaletteFromAnchors(ISOPHOTE_PALETTE_ANCHORS.greyscale, ISOPHOTE_BANDS),
};
export const ISOPHOTE_DEFAULT_PALETTE: IsophotePalette = 'inferno';

/** The reduced-and-display-scaled field a canvas is painted from, computed
 *  once and reusable across repaints (the overlay alone changes far more
 *  often than the field itself does). `complexCentres` (16 Aug 2026) rides
 *  along on the same cache. `sigma` is the SMOOTHED-but-not-yet-quantised
 *  surface density, systems/pc^2, at grid resolution (`res`) - band index
 *  is computed at PAINT time, per canvas pixel, after bilinear upsampling
 *  (S4's exact ordering: smooth, then upsample, then quantise). */
export interface DensityDisplayField {
  readonly sigma: Float64Array;
  readonly res: { nx: number; ny: number };
  readonly centrePc: { x: number; y: number; z: number };
  readonly halfWidthPc: number;
  readonly complexCentres: readonly ComplexCentre[];
  readonly solarAnchorSystemsPerPc2: number;
  readonly palette: IsophotePalette;
}

/** Samples a model's density field over a square region and reduces it to
 *  the isophote display field - the expensive half of what used to be
 *  `renderDensityCanvas` alone, split out so a caller whose region never
 *  changes (Screen 2's galaxy overview) can compute it once and only
 *  repaint. `complexOverlay` (16 Aug 2026), when supplied, also computes
 *  the real seeded complex-tier clump positions for the same region.
 *
 *  Grid resolution is no longer a parameter (erratum 1.1/1.2) - it is
 *  DERIVED from `halfWidthPc` via `isophoteGridRes`, never passed in, so
 *  gate 1 (absolute levels invariant under frame extent) holds by
 *  construction rather than by a caller remembering to keep `res` in sync
 *  with the frame.
 *
 *  No arm-contrast modulation and no dust-lane tinting here (both were
 *  named for retirement in the package doc's own "what it replaces") -
 *  the isophote map shows the RAW sampled surface density, because gate
 *  01-G10 needs the DECODED plate to reproduce the model's own sourced A2
 *  directly; an artificial contrast boost would break that gate's whole
 *  premise by inflating the measured contrast past what the field itself
 *  actually carries.
 *
 *  `previewMaxCellsPerAxis` (28 Aug 2026, OPTIONAL, no default - omitted
 *  reproduces the exact prior signature and behaviour bit-for-bit) is a
 *  straight pass-through to `isophoteGridRes`'s own new cap parameter -
 *  see that function's own header for the full reasoning (a real,
 *  measured ~17.5s freeze on a Standard-scale Milky-Way-Analogue preview,
 *  and why the fix is scoped to the CALLER's own choice rather than
 *  weakening the function's default, uncapped behaviour). */
export function computeDensityDisplayField(
  model: GalaxyModel, centrePc: { x: number; y: number; z: number },
  halfWidthPc: number, thicknessPc: number,
  complexOverlay?: { readonly worldSeed: string; readonly complexTier: ComplexTierParams },
  palette: IsophotePalette = ISOPHOTE_DEFAULT_PALETTE,
  previewMaxCellsPerAxis?: number,
): DensityDisplayField {
  const res = isophoteGridRes(halfWidthPc, previewMaxCellsPerAxis);
  const region: SlabRegionPc = { centre: centrePc, halfWidthPc, halfDepthPc: halfWidthPc, thicknessPc };
  const surface = projectSlab(fieldFromModel(model), region, res);
  const smoothed = smoothGrid1Cell(surface.values, res.nx, res.ny);
  const broken = applyOuterBreak(smoothed, res.nx, res.ny, halfWidthPc);
  const sigma = applyRadialGranularity(broken, res.nx, res.ny, halfWidthPc);
  const complexCentres = complexOverlay
    ? complexCentresForOverview(model, complexOverlay.worldSeed, complexOverlay.complexTier, centrePc, halfWidthPc)
    : [];
  const solarAnchorSystemsPerPc2 = computeSolarAnchorSystemsPerPc2(model);
  return { sigma, res, centrePc, halfWidthPc, complexCentres, solarAnchorSystemsPerPc2, palette };
}

/**
 * Renders a precomputed field as a hard-quantised 17-band isophote plate
 * (Prompt P1, 27 Aug 2026 - full replacement, see the section header
 * above). Bilinearly upsamples the smoothed-but-continuous `field.sigma`
 * grid onto every canvas pixel (S4's exact ordering: smooth on the grid,
 * THEN upsample, THEN quantise - upsampling before smoothing would
 * double-blur through the interpolation kernel), band-indexes and
 * palette-looks-up AT the pixel, and writes the flat band colour directly
 * - no gamma, no blend, no gradient: a hard quantisation is the entire
 * point of this convention (S2 "why this convention": a band edge is an
 * edge detector, and quantisation makes small overdensities MORE visible,
 * not less).
 *
 * RULING 2 (export/overlay): the sector-boundary overlay and centre
 * marker are drawn only when `overlay` is supplied - the export path
 * (`suppressOverlay`-style callers) simply omits it, giving a clean plate
 * with no picker chrome, per the owner's ruling. Complex-tier clumps
 * (real seeded star-forming-complex positions, not decorative) still draw
 * on top, in the same pink/magenta as before - they were never named for
 * retirement by the package doc, which replaces the DENSITY field's own
 * display convention, not every overlay on the canvas.
 */
export function paintDensityField(
  canvas: HTMLCanvasElement, field: DensityDisplayField,
  overlay: { readonly centrePc: { readonly x: number; readonly y: number }; readonly radiusPc: number; readonly shape: FootprintShape } | null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;

  const { sigma, res, centrePc, halfWidthPc, complexCentres, palette } = field;
  const pcToPx = w / (2 * halfWidthPc);
  const bandHex = ISOPHOTE_PALETTES[palette];
  const bgHex = ISOPHOTE_BG_HEX;
  const hexToRgb = (hex: string): [number, number, number] =>
    [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  const bandRgb = bandHex.map(hexToRgb);
  const [bgR, bgG, bgB] = hexToRgb(bgHex);

  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let py = 0; py < h; py++) {
    const cyPc = (h / 2 - py) / pcToPx;
    const fracY = (cyPc + halfWidthPc) / (2 * halfWidthPc);
    for (let px = 0; px < w; px++) {
      const cxPc = (px - w / 2) / pcToPx;
      const fracX = (cxPc + halfWidthPc) / (2 * halfWidthPc);
      const s = sampleBilinear(sigma, res.nx, res.ny, fracX, fracY);
      const [r, g, b] = interpolatedBandColor(s, bandRgb, [bgR, bgG, bgB]);
      const i4 = (py * w + px) * 4;
      data[i4 + 0] = r; data[i4 + 1] = g; data[i4 + 2] = b; data[i4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Complex-tier clumps - real seeded star-forming-complex positions, kept
  // (not named for retirement; see the function's own header above).
  for (const c of complexCentres) {
    const px = w / 2 + (c.x - centrePc.x) * pcToPx, py = h / 2 - (c.y - centrePc.y) * pcToPx;
    if (px < -8 || px > w + 8 || py < -8 || py > h + 8) continue;   // off-canvas, skip
    const nDots = 8 + Math.floor(Math.random() * 10);
    for (let k = 0; k < nDots; k++) {
      const ang = Math.random() * 2 * Math.PI, r = Math.random() * 3.2;
      const jx = px + Math.cos(ang) * r, jy = py + Math.sin(ang) * r;
      const alpha = 0.4 + 0.5 * Math.random();
      ctx.fillStyle = `rgba(255,150,180,${alpha.toFixed(2)})`;
      ctx.fillRect(jx, jy, 1, 1);
    }
  }

  if (overlay) {
    // RULING 2: cyan, not the amber the photographic pipeline used - amber
    // sits inside every one of the new palettes' own ramps (all three run
    // through orange/gold), where the old two-way-dark PAL_ASTRO_DARK/
    // PAL_TOPO_DARK ramps never reached full saturation at either end.
    // Cyan appears nowhere in inferno/magma/viridis/greyscale.
    const offsetX = overlay.centrePc.x - centrePc.x, offsetY = overlay.centrePc.y - centrePc.y;
    const pts = boundaryPointsPc(overlay.radiusPc, overlay.shape);
    ctx.strokeStyle = '#28e8e0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = w / 2 + (p.x + offsetX) * pcToPx, py = h / 2 - (p.y + offsetY) * pcToPx;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.fillStyle = '#28e8e0';
    ctx.beginPath();
    ctx.arc(w / 2 + offsetX * pcToPx, h / 2 - offsetY * pcToPx, 2.5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/**
 * The legend (S3) - not optional: "an absolute scale the reader cannot
 * decode is no better than a percentile one." Draws, in order: a strip of
 * all 17 band colours; tick marks/labels at decade boundaries (0.25, 1,
 * 10, 100, 1k, 10k); a white marker at the solar-neighbourhood value
 * (`field.solarAnchorSystemsPerPc2`, computed, never a literal); and a
 * caption stating the smoothing radius (S3's own reasoning: a display
 * parameter that changes what the reader sees is never silent, the same
 * rule the side-on view's own vertical-exaggeration caption already
 * follows).
 */
export function drawIsophoteLegend(canvas: HTMLCanvasElement, field: DensityDisplayField): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const bandHex = ISOPHOTE_PALETTES[field.palette];
  const stripY = 6, stripH = 14;
  const margin = 8;
  const stripW = w - 2 * margin;
  for (let i = 0; i < ISOPHOTE_BANDS; i++) {
    ctx.fillStyle = `#${bandHex[i]}`;
    ctx.fillRect(margin + (i / ISOPHOTE_BANDS) * stripW, stripY, stripW / ISOPHOTE_BANDS + 0.5, stripH);
  }
  // Decade tick marks (0.25, 1, 10, 100, 1k, 10k systems/pc^2), positioned
  // by the SAME log2 the banding itself uses, so the ticks and the bands
  // cannot drift apart (S3's own explicit requirement).
  ctx.fillStyle = '#c8ccd6';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  const decadeLabels: readonly [number, string][] = [[0.25, '0.25'], [1, '1'], [10, '10'], [100, '100'], [1000, '1k'], [10000, '10k']];
  for (const [sigma, label] of decadeLabels) {
    const bandPos = Math.log2(sigma / ISOPHOTE_SIGMA_MIN);
    if (bandPos < 0 || bandPos > ISOPHOTE_BANDS) continue;
    const x = margin + (bandPos / ISOPHOTE_BANDS) * stripW;
    ctx.fillRect(x, stripY + stripH, 1, 3);
    ctx.fillText(label, x, stripY + stripH + 13);
  }
  // Solar-neighbourhood marker - white, through the strip, positioned by
  // the same log2 (S3).
  const solarBandPos = Math.log2(field.solarAnchorSystemsPerPc2 / ISOPHOTE_SIGMA_MIN);
  const solarX = margin + (Math.max(0, Math.min(ISOPHOTE_BANDS, solarBandPos)) / ISOPHOTE_BANDS) * stripW;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(solarX, stripY - 2);
  ctx.lineTo(solarX, stripY + stripH + 2);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Solar neighbourhood - ${field.solarAnchorSystemsPerPc2.toFixed(1)} systems/pc²`, margin, stripY + stripH + 26);
  ctx.fillStyle = '#8890a0';
  ctx.fillText(
    `System surface density · each band ×2 · absolute scale, identical in every galaxy · ` +
    `smoothed at ${ISOPHOTE_CELL_SIZE_PC} pc`,
    margin, stripY + stripH + 40,
  );
}
