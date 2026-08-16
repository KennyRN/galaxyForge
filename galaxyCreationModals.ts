/**
 * galaxyCreationModals - the three-screen galaxy-creation GUI, per this
 * session's own design conversation (15 Aug 2026). Amendment A3-exempt,
 * same as `render`/`vault`/`main` - presentation code, no ledger, not
 * conformance-gated (no Obsidian runtime exists in the gate harness). All
 * the logic that COULD be wrong in an interesting way already lives in
 * `galaxyCreationState.ts`, which IS gated; these three `Modal` subclasses
 * are kept deliberately thin - they read/write that state and call
 * `sectorSearch`/`sectorFootprint`/`systemConductor`/`vault`, nothing more.
 *
 * -- SCREEN 1: MORPHOLOGY, SIZE, SEED --------------------------------------------
 * Five morphology buttons, a discrete size slider (label-driven, not a raw
 * number - "left is smaller, right is larger"), a seed field with a
 * randomise button, and an "other options" section that changes contents
 * per morphology (lenticular's bulge-type choice) plus the always-present
 * terraformScale slider - this session's own instruction that "other
 * options to go here" was never a static placeholder, always "put whatever
 * is needed here". A density-map preview (the actual field, textured as a
 * scatter rather than smooth bands per this session's own "should look
 * like a map... complete with clumps, not just radiating lines").
 *
 * -- SCREEN 2: SECTOR CENTRING ---------------------------------------------------
 * The same density-map preview, larger, plus a side-on slice. "Menu
 * Options" from the wireframe is NOT reproduced as a persistent panel -
 * per this session's own clarification, it existed in the wireframe only
 * to show dropdown contents without covering other controls; here the
 * dropdowns just open normally. R/theta/z sliders position the sector
 * centre; shape/sys-density/total-systems/size-in-pc control its extent;
 * "system at centre" + multiplicity + sys type drive `sectorSearch` when
 * enabled, snapping the centre to a found match.
 *
 * -- SCREEN 3: POSITION-ONLY PREVIEW ----------------------------------------------
 * Runs the real `sectorFootprint.generateSector` and plots ONLY positions
 * - this session's own spec, "only the location with no other
 * information" - so the user can sanity-check the shape/density before
 * paying for the full per-system conductor pass on commit.
 *
 * UPDATED 16 Aug 2026: "Generate Sector" now shows a busy overlay
 * (spinner + label) if the commit takes longer than `SPINNER_DELAY_MS`,
 * and refuses a second concurrent commit while one is already running -
 * ported from a sibling build's own delayed-spinner pattern (the ONE
 * formatting asset explicitly asked for, `svg-spinners-eclipse.svg`, MIT
 * licensed - inlined below rather than added as a vault asset file, since
 * this project has no asset-loading mechanism to build just for one icon).
 * The 200ms delay avoids a flash of the overlay on a commit fast enough
 * that showing and immediately hiding it would just be visual noise.
 */

import { Modal, Setting, Notice, type App } from 'obsidian';
import { createSpiralModel, createEllipticalModel, createLenticularModel, type GalaxyModel } from './galaxyModel';
import { upsilonFor, densityByPopulationAtCartesian } from './galacticDensity';
import { fieldFromModel, projectSlab, sampleVolume, normaliseForDisplay, emphasiseArmsForDisplay, type SlabRegionPc, type VolumeRegionPc } from './densityMap';
import { DEFAULT_JURIC, makeDefaultGalaxyParameters, type GalaxyParameters, type ComplexTierParams } from './galaxyParameters';
import { generateSeededArms } from './spiralArms';
import { complexParticipation, complexCellsOverlapping, complexCentresInCell, type ComplexCentre } from './starFormingComplexes';
import { generateSector, assembleSector } from './sectorFootprint';
import { searchNearestSystem } from './sectorSearch';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { CURRENT_GEN_VERSION } from './genVersion';
import { writeSystemNote } from './vault';
import type { RenderSystemInput } from './render';
import {
  type MorphologyChoice, type Screen1Draft, type Screen2Draft,
  defaultScreen1Draft, defaultScreen2Draft, resolveModelName, resolveBarEnabled,
  sizeStepsFor, sizeValueFor, sizeIsMass, thicknessPcFor, centrePcFromPolar,
  reconcileSizeFields, assembleSearchCriteria, isWithinFootprint,
} from './galaxyCreationState';
import type { FootprintShape } from './sectorFootprint';
import type { StarForgeSettings } from './main';

/**
 * svg-spinners-eclipse (MIT licensed, from the "svg-spinners" icon set) -
 * a single rotating eclipse-arc icon, `currentColor`-filled so it inherits
 * the modal's own text colour in either theme. Inlined verbatim from the
 * sibling build's own `assets/` copy, MINUS its `xmlns` attribute - not
 * needed for inline SVG assigned via `innerHTML` (the HTML5 parser
 * auto-namespaces an `<svg>` element on sight; the attribute only matters
 * for a standalone `.svg` file served on its own), and gate S1's own
 * no-network-literal scanner - correctly - cannot tell an XML namespace
 * URI from a fetch target, so dropping the attribute is the honest fix,
 * not a workaround.
 */
const SPINNER_SVG = '<svg width="24" height="24" viewBox="0 0 24 24">' +
  '<style>.spinner_7mtw{transform-origin:center;animation:spinner_jgYN .6s linear infinite}' +
  '@keyframes spinner_jgYN{100%{transform:rotate(360deg)}}</style>' +
  '<path class="spinner_7mtw" d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z" fill="currentColor"/>' +
  '</svg>';
const SPINNER_DELAY_MS = 200;

/**
 * Shape-selector icons (16 Aug 2026, a user-found gap): the original
 * wireframe used icons for footprint shape deliberately, minimal-words by
 * design - a text dropdown was a placeholder that never got swapped out.
 * Each glyph matches `sectorFootprint.ts`'s own geometry convention (the
 * hexagon's vertex on the +x axis, "pointy" toward 3 o'clock - the same
 * orientation `isWithinFootprint`/`boundaryPointsPc` already draw).
 */
const SHAPE_ICONS: Readonly<Record<FootprintShape, string>> = {
  circle: '<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  square: '<svg width="22" height="22" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  hexagon: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M21,12 L16.5,4.2 L7.5,4.2 L3,12 L7.5,19.8 L16.5,19.8 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};
const SHAPE_LABELS: Readonly<Record<FootprintShape, string>> = { circle: 'Circle', square: 'Square', hexagon: 'Hexagon' };

/**
 * A row of icon buttons, one per footprint shape - replaces a text
 * dropdown with the icon-only, minimal-words control the wireframe
 * actually called for. `title`/`aria-label` carry the name for
 * accessibility without putting it on screen.
 */
function renderShapeSelector(container: HTMLElement, selected: FootprintShape, onSelect: (shape: FootprintShape) => void): void {
  const row = container.createDiv();
  row.style.cssText = 'display:flex;gap:8px;margin:4px 0 12px;';
  for (const shape of ['circle', 'square', 'hexagon'] as FootprintShape[]) {
    const btn = row.createEl('button', { attr: { title: SHAPE_LABELS[shape], 'aria-label': SHAPE_LABELS[shape] } });
    btn.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:6px;';
    btn.innerHTML = SHAPE_ICONS[shape];
    if (shape === selected) btn.addClass('mod-cta');
    btn.onclick = () => onSelect(shape);
  }
}

const MORPHOLOGY_LABELS: Readonly<Record<MorphologyChoice, string>> = {
  lenticular: 'Lenticular', elliptical: 'Elliptical', barredSpiral: 'Barred', spiral: 'Spiral', milkyWayAnalogue: 'Milky Way Analogue',
};

/** `modelFromDraft`'s own result - the model AND the params that built it,
 *  since a caller now genuinely needs both (the model to sample density,
 *  `params.complexTier`/`worldSeed` to also preview the complex-tier clump
 *  overlay - see `complexCentresForOverview`). */
interface DraftModel {
  readonly model: GalaxyModel;
  readonly params: GalaxyParameters;
}

/**
 * Builds the real `GalaxyModel` a draft resolves to - the ONE place a
 * morphology choice becomes an actual model, so screens never build one
 * independently and risk disagreeing (Law 1).
 *
 * SEEDED ARMS (16 Aug 2026, a user-found gap): "Milky Way Analogue" keeps
 * the REAL Reid et al. 2019 arm table (`makeDefaultGalaxyParameters`'s own
 * default) - it is explicitly meant to model the actual galaxy, so its
 * shape should not vary by seed. Plain "Spiral"/"Barred" now call
 * `generateSeededArms(d.worldSeed)` instead - previously EVERY spiral
 * -family choice used the identical fixed real-arm geometry regardless of
 * seed, so "Randomise" only ever changed which stars populated a fixed
 * shape, never the shape itself. See `spiralArms.generateSeededArms`'s own
 * header for the full design.
 */
function modelFromDraft(d: Screen1Draft): DraftModel {
  const name = resolveModelName(d.morphology);
  const sizeValue = sizeValueFor(d.morphology, d.sizeStepIndex);
  if (name === 'spiral' || name === 'barredSpiral') {
    const isRealMilkyWay = d.morphology === 'milkyWayAnalogue';
    const params = isRealMilkyWay
      ? makeDefaultGalaxyParameters(d.worldSeed)
      : makeDefaultGalaxyParameters(d.worldSeed, generateSeededArms(d.worldSeed), 'seeded');
    return { model: createSpiralModel(resolveBarEnabled(d.morphology), params), params };
  }
  const params = makeDefaultGalaxyParameters(d.worldSeed);
  if (name === 'elliptical') return { model: createEllipticalModel(sizeValue, upsilonFor, params), params };
  return { model: createLenticularModel(sizeValue, upsilonFor, d.lenticularBulgeType, params), params };
}

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
 * - as small bright clumps layered on the smooth stipple, not invented
 * decoration.
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
 *    invisible. Same "legible, not literal" principle the stipple density
 *    mapping already uses elsewhere in this file (the quadratic dot-count
 *    curve, the jittered scatter).
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

function complexCentresForOverview(
  model: GalaxyModel, worldSeed: string, complexTier: ComplexTierParams,
  centrePc: { readonly x: number; readonly y: number; readonly z: number }, radiusPc: number,
): readonly ComplexCentre[] {
  const youngPop = model.populations.find((p) => p.key === 'youngThin');
  if (!youngPop) return [];   // elliptical/lenticular/thick/halo-only morphologies: no young disc, no complexes
  const w = complexParticipation(youngPop, complexTier);
  if (!(w > 0)) return [];
  const preview: ComplexTierParams = {
    ...complexTier, cellMeanSubGridN: PREVIEW_COMPLEX_SUBGRID_N, cellSizePc: PREVIEW_COMPLEX_CELL_SIZE_PC,
  };
  const youngSurfaceAt = (x: number, y: number): number => {
    const d = densityByPopulationAtCartesian(model, x, y, 0);
    return PREVIEW_COMPLEX_SURFACE_SCALE * (d.youngThin ?? 0);
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

/* ------------------------------- shared canvas rendering ------------------------ */

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
 * The whole-galaxy overview - the SAME view on both Screen 1 and Screen 2
 * (16 Aug 2026, a user-found gap: Screen 2's top-down view previously
 * showed a small local patch zoomed to the sector's own neighbourhood,
 * which "doesn't look anything like" Screen 1's view of the whole galaxy -
 * the actual spec is one picture, unzoomed, with the sector marked on it so
 * a user can see WHERE in the galaxy they are, not a different picture of
 * just the sector's own surroundings).
 *
 * RESOLUTION (200x200, up from an earlier 80x80): a cell at 80x80 over this
 * span is 500pc across - coarser than a spiral arm's own perpendicular
 * width (183-511pc across this project's radius range, `spiralArms
 * .armWidthPc`) and coarser than the bar's own core scale (700/440pc,
 * `DEFAULT_BAR.scalePc`). Verified directly (this session's own diagnostic
 * script, ASCII-rendered the field at several resolutions): at 500pc/cell
 * an arm ridge is aliased into blocky noise rather than a resolvable curve,
 * which is a real contributor to "just a uniform collection of dots" - not
 * only the contrast/normalisation bug `emphasiseArmsForDisplay` itself
 * fixes. 200x200 (100pc/cell) resolves an arm's own width across roughly
 * 1.5-2 cells, comfortably past the aliasing threshold, at an acceptable
 * cost (measured ~150-250ms warm on this session's own hardware) BECAUSE
 * it is computed once per model and cached (`GalaxyScreen1Modal`'s
 * `fieldForCurrentDraft`, `GalaxyScreen2Modal.onOpen`'s `galaxyOverview`),
 * never recomputed on a slider tick that does not change the model itself.
 */
const GALAXY_OVERVIEW_CENTRE_PC = { x: 0, y: 0, z: 0 } as const;
const GALAXY_OVERVIEW_HALF_WIDTH_PC = 20000;
const GALAXY_OVERVIEW_THICKNESS_PC = 4000;
const GALAXY_OVERVIEW_RES = { nx: 200, ny: 200 };

/** The reduced-and-display-scaled field a canvas is painted from, computed
 *  once and reusable across repaints (the overlay alone changes far more
 *  often than the field itself does). `complexCentres` (16 Aug 2026) rides
 *  along on the same cache - it is exactly as expensive to recompute as
 *  the smooth field itself and depends on the same (model, worldSeed,
 *  region) inputs, so caching one without the other would just move the
 *  waste rather than remove it. */
interface DensityDisplayField {
  readonly norm: Float64Array;
  readonly res: { nx: number; ny: number };
  readonly centrePc: { x: number; y: number; z: number };
  readonly halfWidthPc: number;
  readonly complexCentres: readonly ComplexCentre[];
}

/** Samples and display-scales a model's density field over a square region
 *  - the expensive half of what used to be `renderDensityCanvas` alone,
 *  split out so a caller whose region never changes (Screen 2's galaxy
 *  overview) can compute it once and only repaint. `complexOverlay` (16 Aug
 *  2026), when supplied, also computes the real seeded complex-tier clump
 *  positions for the same region - see `complexCentresForOverview`'s own
 *  header. Omitted entirely for callers that do not want it (Screen 3's
 *  position-only preview uses its own separate renderer and never reaches
 *  this at all). */
function computeDensityDisplayField(
  model: GalaxyModel, centrePc: { x: number; y: number; z: number },
  halfWidthPc: number, thicknessPc: number, res: { nx: number; ny: number } = { nx: 80, ny: 80 },
  complexOverlay?: { readonly worldSeed: string; readonly complexTier: ComplexTierParams },
): DensityDisplayField {
  const region: SlabRegionPc = { centre: centrePc, halfWidthPc, halfDepthPc: halfWidthPc, thicknessPc };
  const surface = projectSlab(fieldFromModel(model), region, res);
  // emphasiseArmsForDisplay (16 Aug 2026) for spiral/barred - plain log
  // normalisation was found to make arm structure invisible on a
  // galaxy-wide view: the radial falloff (centre to outskirts, many
  // orders of magnitude) swamps the much smaller azimuthal arm contrast
  // once both are log-compressed into the same [0,1] range. Elliptical/
  // lenticular have no arms to lose, so they stay on the simpler path.
  const isSpiralLike = model.morphology === 'spiral' || model.morphology === 'barredSpiral';
  const norm = isSpiralLike
    ? emphasiseArmsForDisplay(surface.values, res.nx, res.ny, halfWidthPc, DEFAULT_JURIC.lThin, 1)
    : normaliseForDisplay(surface.values, { log: true });
  const complexCentres = complexOverlay
    ? complexCentresForOverview(model, complexOverlay.worldSeed, complexOverlay.complexTier, centrePc, halfWidthPc)
    : [];
  return { norm, res, centrePc, halfWidthPc, complexCentres };
}

/** Renders a precomputed field as a textured scatter (importance-sampled
 *  stipple, not a smooth gradient) - per this session's own "should look
 *  like a map of the Milky Way complete with clumps, not just radiating
 *  lines". Purely visual dithering, `Math.random()` - NOT the plugin's own
 *  seeded/channelled RNG, since this draws nothing and generates no
 *  system; it is exactly `densityMap`'s own "reveals, does not roll"
 *  posture, extended to pixels.
 *
 *  `overlay.centrePc` (16 Aug 2026) is a WORLD position, independent of the
 *  field's own `centrePc` - the field may be a fixed whole-galaxy view
 *  while the overlay marks wherever the sector actually sits within it. */
function paintDensityField(
  canvas: HTMLCanvasElement, field: DensityDisplayField,
  overlay: { readonly centrePc: { readonly x: number; readonly y: number }; readonly radiusPc: number; readonly shape: FootprintShape } | null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, w, h);

  const { norm, res, centrePc, halfWidthPc, complexCentres } = field;
  const pcToPx = w / (2 * halfWidthPc);
  for (let iy = 0; iy < res.ny; iy++) {
    for (let ix = 0; ix < res.nx; ix++) {
      const v = norm[ix + res.nx * iy]!;
      const cxPc = -halfWidthPc + ((ix + 0.5) / res.nx) * 2 * halfWidthPc;
      const cyPc = -halfWidthPc + ((iy + 0.5) / res.ny) * 2 * halfWidthPc;
      const px = w / 2 + cxPc * pcToPx, py = h / 2 - cyPc * pcToPx;
      // Quadratic in v: pushes contrast toward a clumpy, high-dynamic-range
      // starfield look rather than a smooth linear wash.
      const n = Math.round(v * v * 18);
      for (let p = 0; p < n; p++) {
        const jx = px + (Math.random() - 0.5) * (w / res.nx);
        const jy = py + (Math.random() - 0.5) * (h / res.ny);
        const alpha = 0.25 + 0.65 * Math.random();
        ctx.fillStyle = `rgba(205,215,255,${alpha.toFixed(2)})`;
        ctx.fillRect(jx, jy, 1, 1);
      }
    }
  }

  // Complex-tier clumps (16 Aug 2026) - the REAL seeded star-forming-complex
  // positions (`complexCentresForOverview`), drawn as small bright clusters
  // on top of the smooth stipple above, patchy rather than a uniform band.
  // See that function's own header for why the visual size here is a fixed
  // pixel radius rather than a literal projection of `sigmaPc`.
  for (const c of complexCentres) {
    const px = w / 2 + (c.x - centrePc.x) * pcToPx, py = h / 2 - (c.y - centrePc.y) * pcToPx;
    if (px < -8 || px > w + 8 || py < -8 || py > h + 8) continue;   // off-canvas, skip
    const nDots = 8 + Math.floor(Math.random() * 10);
    for (let k = 0; k < nDots; k++) {
      const ang = Math.random() * 2 * Math.PI, r = Math.random() * 3.2;
      const jx = px + Math.cos(ang) * r, jy = py + Math.sin(ang) * r;
      const alpha = 0.4 + 0.5 * Math.random();
      ctx.fillStyle = `rgba(230,238,255,${alpha.toFixed(2)})`;
      ctx.fillRect(jx, jy, 1, 1);
    }
  }

  if (overlay) {
    const offsetX = overlay.centrePc.x - centrePc.x, offsetY = overlay.centrePc.y - centrePc.y;
    const pts = boundaryPointsPc(overlay.radiusPc, overlay.shape);
    ctx.strokeStyle = '#e0b25a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = w / 2 + (p.x + offsetX) * pcToPx, py = h / 2 - (p.y + offsetY) * pcToPx;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    // Centre marker - fixed pixel radius regardless of `overlay.radiusPc`,
    // so a sector far too small to show its own boundary at this zoom
    // (routine on the galaxy overview - a 25pc sector against a 20 000pc
    // half-width view) still marks WHERE it is.
    ctx.fillStyle = '#e0b25a';
    ctx.beginPath();
    ctx.arc(w / 2 + offsetX * pcToPx, h / 2 - offsetY * pcToPx, 2.5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/** Convenience wrapper for a one-shot render (no caching) - anywhere that
 *  computes and paints in one step. */
function renderDensityCanvas(
  canvas: HTMLCanvasElement, model: GalaxyModel,
  centrePc: { x: number; y: number; z: number }, halfWidthPc: number, thicknessPc: number,
  overlay: { readonly radiusPc: number; readonly shape: FootprintShape } | null,
  res?: { nx: number; ny: number },
  complexOverlay?: { readonly worldSeed: string; readonly complexTier: ComplexTierParams },
): void {
  const field = computeDensityDisplayField(model, centrePc, halfWidthPc, thicknessPc, res, complexOverlay);
  paintDensityField(canvas, field, overlay ? { centrePc, radiusPc: overlay.radiusPc, shape: overlay.shape } : null);
}

/**
 * The edge-on slice - "Pin the axis names: plan view is (x,y), edge-on
 * slice is (y,z)" (S4.8). `densityMap.ts`'s own `projectSlab`/
 * `SlabRegionPc` only ever integrates through z (the plan view) - there is
 * no shipped edge-on projector, so this builds one directly from
 * `sampleVolume`'s own 3D primitive (its own header: "the v2 map... every
 * 2D render already goes through it"), summing over x here instead of
 * reimplementing the field sampling loop (Law 1 - one sampling primitive).
 */
/**
 * `slabThicknessPc` (16 Aug 2026, a user-found gap): the actual slab this
 * sector will be cut from was invisible on the side view - only the
 * broader density field showed, with nothing marking WHERE within it the
 * chosen "sys density" (slab thickness) band actually sits. Drawn as a
 * horizontal band centred on the view's own z-centre (`centrePc.z`, which
 * this function's own coordinate convention always places at the canvas's
 * vertical midline), height floored at 3px so a genuinely thin slab
 * (5-15 pc against a hundreds-to-thousands-of-pc view) stays visible
 * rather than rounding to nothing.
 */
function renderEdgeOnCanvas(
  canvas: HTMLCanvasElement, model: GalaxyModel, centrePc: { x: number; y: number; z: number },
  halfDepthPc: number, halfHeightPc: number, slabThicknessPc: number | null = null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, w, h);

  const res = { nx: 24, ny: 80, nz: 40 };
  const region: VolumeRegionPc = {
    min: { x: centrePc.x - 1, y: centrePc.y - halfDepthPc, z: centrePc.z - halfHeightPc },
    max: { x: centrePc.x + 1, y: centrePc.y + halfDepthPc, z: centrePc.z + halfHeightPc },
  };
  const vol = sampleVolume(fieldFromModel(model), region, res);
  const yz = new Float64Array(res.ny * res.nz);
  for (let iz = 0; iz < res.nz; iz++) {
    for (let iy = 0; iy < res.ny; iy++) {
      let acc = 0;
      for (let ix = 0; ix < res.nx; ix++) acc += vol.values[ix + res.nx * (iy + res.ny * iz)]!;
      yz[iy + res.ny * iz] = acc;
    }
  }
  const norm = normaliseForDisplay(yz, { log: true });
  const pcToPxY = w / (2 * halfDepthPc), pcToPxZ = h / (2 * halfHeightPc);
  for (let iz = 0; iz < res.nz; iz++) {
    for (let iy = 0; iy < res.ny; iy++) {
      const v = norm[iy + res.ny * iz]!;
      const yPc = -halfDepthPc + ((iy + 0.5) / res.ny) * 2 * halfDepthPc;
      const zPc = -halfHeightPc + ((iz + 0.5) / res.nz) * 2 * halfHeightPc;
      const px = (yPc + halfDepthPc) * pcToPxY, py = h - (zPc + halfHeightPc) * pcToPxZ;
      const n = Math.round(v * v * 10);
      for (let p = 0; p < n; p++) {
        const jx = px + (Math.random() - 0.5) * (w / res.ny);
        const jy = py + (Math.random() - 0.5) * (h / res.nz);
        ctx.fillStyle = `rgba(205,215,255,${(0.25 + 0.65 * Math.random()).toFixed(2)})`;
        ctx.fillRect(jx, jy, 1, 1);
      }
    }
  }

  if (slabThicknessPc !== null) {
    const bandPx = Math.max(3, slabThicknessPc * pcToPxZ);
    ctx.fillStyle = 'rgba(224,178,90,0.22)';
    ctx.fillRect(0, h / 2 - bandPx / 2, w, bandPx);
    ctx.strokeStyle = '#e0b25a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 - bandPx / 2); ctx.lineTo(w, h / 2 - bandPx / 2);
    ctx.moveTo(0, h / 2 + bandPx / 2); ctx.lineTo(w, h / 2 + bandPx / 2);
    ctx.stroke();
  }
}

function renderPositionOnlyCanvas(canvas: HTMLCanvasElement, centrePc: { x: number; y: number; z: number }, halfWidthPc: number, positions: readonly { x: number; y: number; z: number }[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, w, h);
  const pcToPx = w / (2 * halfWidthPc);
  ctx.fillStyle = '#ffffff';
  for (const p of positions) {
    const px = w / 2 + (p.x - centrePc.x) * pcToPx, py = h / 2 - (p.y - centrePc.y) * pcToPx;
    ctx.fillRect(px - 0.75, py - 0.75, 1.5, 1.5);
  }
}

/* --------------------------------- screen 1 -------------------------------------- */

export class GalaxyScreen1Modal extends Modal {
  private draft: Screen1Draft;
  private canvas!: HTMLCanvasElement;

  /** Cache key = whatever `modelFromDraft` actually reads (morphology, size
   *  step, bulge type, AND worldSeed - seeded arms (16 Aug 2026) mean the
   *  seed now genuinely changes a spiral/barred galaxy's own SHAPE, not
   *  just its placement, so it belongs in the key too now) - NOT
   *  terraforming, which affects nothing about the density field. Without
   *  this, dragging either terraforming slider recomputed the full
   *  galaxy-overview field on every tick for no visible reason (a
   *  pre-existing waste this session's own resolution bump would otherwise
   *  have made noticeably more expensive). */
  private cachedFieldKey: string | null = null;
  private cachedField: DensityDisplayField | null = null;
  /** Debounce handle for the seed TEXT field's own preview refresh - see
   *  the `addText` handler below for why this does NOT call `this.render()`
   *  directly. */
  private seedRefreshTimer: number | null = null;

  /**
   * `settings`/`onSettingsChange` (16 Aug 2026) are a plain data + callback
   * pair, not the whole `StarForgePlugin` instance - this modal only ever
   * needs to READ two persisted values and report the ones it changed,
   * never anything else a Plugin object carries (vault access, other
   * commands, ...). Keeps this file's own dependency on `main.ts` to a
   * single type-only import.
   */
  constructor(app: App, private readonly settings: StarForgeSettings, private readonly onSettingsChange: (s: StarForgeSettings) => void) {
    super(app);
    this.draft = defaultScreen1Draft({
      worldSeed: settings.lastWorldSeed,
      terraformScale: settings.defaultTerraformScale,
      terraformIntensity: settings.defaultTerraformIntensity,
    });
  }

  private fieldForCurrentDraft(model: GalaxyModel, params: GalaxyParameters): DensityDisplayField {
    const key = `${this.draft.morphology}:${this.draft.sizeStepIndex}:${this.draft.lenticularBulgeType}:${this.draft.worldSeed}`;
    if (this.cachedFieldKey !== key || !this.cachedField) {
      this.cachedField = computeDensityDisplayField(
        model, GALAXY_OVERVIEW_CENTRE_PC, GALAXY_OVERVIEW_HALF_WIDTH_PC, GALAXY_OVERVIEW_THICKNESS_PC, GALAXY_OVERVIEW_RES,
        { worldSeed: this.draft.worldSeed, complexTier: params.complexTier },
      );
      this.cachedFieldKey = key;
    }
    return this.cachedField;
  }

  onOpen(): void {
    this.titleEl.setText('Create a Galaxy - Morphology, Size, Seed');
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    const morphRow = contentEl.createDiv();
    for (const choice of ['lenticular', 'elliptical', 'barredSpiral', 'spiral', 'milkyWayAnalogue'] as MorphologyChoice[]) {
      const btn = morphRow.createEl('button', { text: MORPHOLOGY_LABELS[choice] });
      if (choice === this.draft.morphology) btn.addClass('mod-cta');
      btn.onclick = () => { this.draft = { ...this.draft, morphology: choice }; this.render(); };
    }

    new Setting(contentEl).setName('Galaxy size').setDesc(sizeStepsFor(this.draft.morphology)[this.draft.sizeStepIndex]!.label)
      .addSlider((s) => s.setLimits(0, 4, 1).setValue(this.draft.sizeStepIndex).setDynamicTooltip()
        .onChange((v) => { this.draft = { ...this.draft, sizeStepIndex: v }; this.render(); }));

    new Setting(contentEl).setName('Seed')
      .addText((t) => t.setValue(this.draft.worldSeed).setPlaceholder('(random)')
        .onChange((v) => {
          this.draft = { ...this.draft, worldSeed: v };
          // NOT this.render() - that would rebuild this very text input on
          // every keystroke (contentEl.empty() + rebuild), stealing focus
          // and the cursor position while typing. Since seeded arms (16 Aug
          // 2026) mean the typed seed now genuinely changes the preview,
          // debounce a canvas-only repaint instead of ignoring it entirely
          // (the prior behaviour, back when the seed never affected shape).
          if (this.seedRefreshTimer !== null) window.clearTimeout(this.seedRefreshTimer);
          this.seedRefreshTimer = window.setTimeout(() => {
            const { model, params } = modelFromDraft(this.draft);
            paintDensityField(this.canvas, this.fieldForCurrentDraft(model, params), null);
          }, 400);
        }))
      .addButton((b) => b.setButtonText('Randomise').onClick(() => {
        const seed = Math.random().toString(36).slice(2);
        this.draft = { ...this.draft, worldSeed: seed };
        this.render();
      }));

    contentEl.createEl('h4', { text: 'Other options' });
    if (this.draft.morphology === 'lenticular') {
      new Setting(contentEl).setName('Bulge type')
        .addDropdown((d) => d.addOption('composite', 'Composite (pseudo + classical)').addOption('classical', 'Classical only')
          .setValue(this.draft.lenticularBulgeType)
          .onChange((v) => { this.draft = { ...this.draft, lenticularBulgeType: v as 'composite' | 'classical' }; }));
    }
    // Two independent dials (16 Aug 2026, a user-found gap): a single
    // "prevalence" slider conflated HOW MANY worlds get terraformed with
    // HOW FAR each one has progressed - see `terraforming.ts`'s own header
    // for why one number could not carry both questions honestly.
    new Setting(contentEl).setName('Terraforming coverage').setDesc(`${this.draft.terraformScale} / 6 - how many worlds get selected`)
      .addSlider((s) => s.setLimits(0, 6, 1).setValue(this.draft.terraformScale).setDynamicTooltip()
        .onChange((v) => { this.draft = { ...this.draft, terraformScale: v }; this.render(); }));
    new Setting(contentEl).setName('Terraforming intensity').setDesc(`${this.draft.terraformIntensity} / 6 - how far a selected world has progressed`)
      .addSlider((s) => s.setLimits(0, 6, 1).setValue(this.draft.terraformIntensity).setDynamicTooltip()
        .onChange((v) => { this.draft = { ...this.draft, terraformIntensity: v }; this.render(); }));

    this.canvas = contentEl.createEl('canvas', { attr: { width: '360', height: '360' } });
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '12px auto';
    const { model, params } = modelFromDraft(this.draft);
    paintDensityField(this.canvas, this.fieldForCurrentDraft(model, params), null);

    const nav = contentEl.createDiv();
    nav.createEl('span');
    nav.createEl('button', { text: 'Next →', cls: 'mod-cta' }).onclick = () => {
      const seed = this.draft.worldSeed.trim().length > 0 ? this.draft.worldSeed : Math.random().toString(36).slice(2);
      // Persist the RESOLVED seed, typed or randomly generated - "continue
      // where you left off" is the useful default (re-opening the GUI
      // pre-fills the seed that made your last galaxy, so you can find it
      // again after an Obsidian restart), and "Randomise" is right there
      // if a fresh one is wanted instead.
      this.onSettingsChange({
        ...this.settings, lastWorldSeed: seed,
        defaultTerraformScale: this.draft.terraformScale, defaultTerraformIntensity: this.draft.terraformIntensity,
      });
      this.close();
      new GalaxyScreen2Modal(this.app, { ...this.draft, worldSeed: seed }, this.settings, this.onSettingsChange).open();
    };
  }
}

/* --------------------------------- screen 2 -------------------------------------- */

export class GalaxyScreen2Modal extends Modal {
  private draft: Screen2Draft = defaultScreen2Draft();
  private model: GalaxyModel;
  private topDownCanvas!: HTMLCanvasElement;
  private sideOnCanvas!: HTMLCanvasElement;

  /** The whole-galaxy field for the top-down view (16 Aug 2026) - computed
   *  ONCE in `onOpen`, never per-render. `this.model` is fixed for this
   *  modal's whole lifetime (set once in the constructor, from `screen1`),
   *  and NOTHING on this screen's own draft (angle/R/z/shape/size/density)
   *  changes the model - every one of those only moves where the sector
   *  OVERLAY sits on this same fixed picture (the fix for "the top-down
   *  view doesn't look anything like screen 1's" - it should be, and now
   *  is, the identical galaxy-wide view, with the sector marked on it). */
  private galaxyOverview!: DensityDisplayField;

  /** `settings`/`onSettingsChange` carried through purely so the "← Back"
   *  button can reconstruct `GalaxyScreen1Modal` faithfully - this screen
   *  never reads or changes them itself. */
  private params: GalaxyParameters;

  constructor(
    app: App, private readonly screen1: Screen1Draft,
    private readonly settings: StarForgeSettings, private readonly onSettingsChange: (s: StarForgeSettings) => void,
  ) {
    super(app);
    const built = modelFromDraft(screen1);
    this.model = built.model;
    this.params = built.params;
  }

  onOpen(): void {
    this.titleEl.setText('Create a Galaxy - Sector Centre');
    this.galaxyOverview = computeDensityDisplayField(
      this.model, GALAXY_OVERVIEW_CENTRE_PC, GALAXY_OVERVIEW_HALF_WIDTH_PC, GALAXY_OVERVIEW_THICKNESS_PC, GALAXY_OVERVIEW_RES,
      { worldSeed: this.screen1.worldSeed, complexTier: this.params.complexTier },
    );
    this.draft = reconcileSizeFields(this.model, this.draft);
    this.render();
  }

  private setDraft(partial: Partial<Screen2Draft>): void {
    this.draft = reconcileSizeFields(this.model, { ...this.draft, ...partial });
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    const centre = centrePcFromPolar(this.draft);
    const thickness = thicknessPcFor(this.draft.sysDensity);

    this.topDownCanvas = contentEl.createEl('canvas', { attr: { width: '400', height: '400' } });
    this.topDownCanvas.style.display = 'block';
    this.topDownCanvas.style.margin = '8px auto';
    // The cached whole-galaxy field, repainted (cheap - no resampling) with
    // the sector overlay at its ACTUAL world position every time the draft
    // changes - see `galaxyOverview`'s own doc comment.
    paintDensityField(this.topDownCanvas, this.galaxyOverview, { centrePc: centre, radiusPc: this.draft.sizeInPc, shape: this.draft.footprintShape });

    this.sideOnCanvas = contentEl.createEl('canvas', { attr: { width: '400', height: '80' } });
    this.sideOnCanvas.style.display = 'block';
    this.sideOnCanvas.style.margin = '4px auto 12px';
    const halfDepthPc = Math.max(this.draft.sizeInPc * 4, 500);
    renderEdgeOnCanvas(this.sideOnCanvas, this.model, centre, halfDepthPc, Math.max(thickness * 3, 400), thickness);

    new Setting(contentEl).setName('Angle (θ)').setDesc(`${(this.draft.angleRad * 180 / Math.PI).toFixed(0)}°`)
      .addSlider((s) => s.setLimits(0, 359, 1).setValue(Math.round(this.draft.angleRad * 180 / Math.PI))
        .onChange((v) => this.setDraft({ angleRad: (v * Math.PI) / 180 })));
    new Setting(contentEl).setName('Distance from centre (R)').setDesc(`${this.draft.distanceFromCentrePc.toFixed(0)} pc`)
      .addSlider((s) => s.setLimits(0, 20000, 50).setValue(this.draft.distanceFromCentrePc)
        .onChange((v) => this.setDraft({ distanceFromCentrePc: v })));
    new Setting(contentEl).setName('Distance from galactic plane (z)').setDesc(`${this.draft.distanceFromPlanePc.toFixed(0)} pc`)
      .addSlider((s) => s.setLimits(-2000, 2000, 10).setValue(this.draft.distanceFromPlanePc)
        .onChange((v) => this.setDraft({ distanceFromPlanePc: v })));

    contentEl.createEl('div', { text: 'Sector shape', cls: 'setting-item-name' });
    renderShapeSelector(contentEl, this.draft.footprintShape, (shape) => this.setDraft({ footprintShape: shape }));
    new Setting(contentEl).setName('Sys density').setDesc('Thin (5 pc) / Standard (10 pc) / Thick (15 pc) slab thickness')
      .addDropdown((d) => d.addOption('thin', 'Thin').addOption('standard', 'Standard').addOption('thick', 'Thick')
        .setValue(this.draft.sysDensity).onChange((v) => this.setDraft({ sysDensity: v as Screen2Draft['sysDensity'] })));

    new Setting(contentEl).setName('Total systems')
      .addText((t) => t.setValue(String(this.draft.totalSystems))
        .onChange((v) => { const n = Number(v); if (Number.isFinite(n) && n >= 0) this.setDraft({ sizeEditMode: 'totalSystems', totalSystems: Math.round(n) }); }));
    new Setting(contentEl).setName('Size (pc)')
      .addText((t) => t.setValue(this.draft.sizeInPc.toFixed(1))
        .onChange((v) => { const n = Number(v); if (Number.isFinite(n) && n > 0) this.setDraft({ sizeEditMode: 'sizeInPc', sizeInPc: n }); }));

    new Setting(contentEl).setName('System at centre').setDesc('Search for a specific system to centre the sector on, instead of the point above')
      .addToggle((t) => t.setValue(this.draft.systemAtCentre).onChange((v) => this.setDraft({ systemAtCentre: v })));
    if (this.draft.systemAtCentre) {
      new Setting(contentEl).setName('Multiplicity')
        .addDropdown((d) => d.addOption('any', 'Any').addOption('solo', 'Solo').addOption('binary', 'Binary or more')
          .setValue(this.draft.multiplicity).onChange((v) => this.setDraft({ multiplicity: v as Screen2Draft['multiplicity'] })));
      new Setting(contentEl).setName('Sys type')
        .addDropdown((d) => d.addOption('nearest', 'Nearest').addOption('interesting', 'Interesting')
          .addOption('marginal', 'Nearest Marginal').addOption('tolerable', 'Nearest Tolerable').addOption('earthLike', 'Nearest Earth-like')
          .setValue(this.draft.sysType).onChange((v) => this.setDraft({ sysType: v as Screen2Draft['sysType'] })));
      new Setting(contentEl).addButton((b) => b.setButtonText('Search').setCta().onClick(() => this.runSearch()));
    }

    const nav = contentEl.createDiv();
    nav.createEl('button', { text: '← Back' }).onclick = () => {
      this.close();
      new GalaxyScreen1Modal(this.app, this.settings, this.onSettingsChange).open();
    };
    nav.createEl('button', { text: 'Next →', cls: 'mod-cta' }).onclick = () => {
      this.close();
      new GalaxyScreen3Modal(this.app, this.screen1, this.draft, this.model, this.settings, this.onSettingsChange).open();
    };
  }

  private runSearch(): void {
    const origin = centrePcFromPolar(this.draft);
    const criteria = assembleSearchCriteria(this.draft);
    const result = searchNearestSystem(
      this.screen1.worldSeed, this.model, CURRENT_GEN_VERSION, this.screen1.terraformScale, this.screen1.terraformIntensity,
      origin, criteria, Math.max(this.draft.sizeInPc * 20, 2000),
    );
    if (!result.found) {
      new Notice(`No matching system found within the search radius - try widening your criteria.`);
      return;
    }
    const R = Math.hypot(result.positionPc.x, result.positionPc.y);
    const theta = Math.atan2(result.positionPc.y, result.positionPc.x);
    this.setDraft({ distanceFromCentrePc: R, angleRad: theta < 0 ? theta + 2 * Math.PI : theta, distanceFromPlanePc: result.positionPc.z });
    new Notice(`Found ${result.sysid}, ${result.distancePc.toFixed(1)} pc away - centred.`);
  }
}

/* --------------------------------- screen 3 -------------------------------------- */

export class GalaxyScreen3Modal extends Modal {
  private generating = false;
  private busyOverlay: HTMLElement | null = null;

  /** `settings`/`onSettingsChange` carried through purely for the "← Back"
   *  chain back to Screen 1 - this screen never reads or changes them. */
  constructor(
    app: App, private readonly screen1: Screen1Draft, private readonly screen2: Screen2Draft, private readonly model: GalaxyModel,
    private readonly settings: StarForgeSettings, private readonly onSettingsChange: (s: StarForgeSettings) => void,
  ) { super(app); }

  onOpen(): void {
    this.titleEl.setText('Create a Galaxy - Preview');
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    const centre = centrePcFromPolar(this.screen2);
    const thickness = thicknessPcFor(this.screen2.sysDensity);
    const sector = generateSector(this.screen1.worldSeed, this.model, centre, this.screen2.sizeInPc, thickness, this.screen2.footprintShape);

    contentEl.createEl('p', { text: `${sector.length} systems in this sector - position only, nothing generated yet.` });
    const canvas = contentEl.createEl('canvas', { attr: { width: '420', height: '420' } });
    canvas.style.display = 'block';
    canvas.style.margin = '8px auto';
    renderPositionOnlyCanvas(canvas, centre, this.screen2.sizeInPc * 1.15, sector.map((s) => s.positionPc));

    const nav = contentEl.createDiv();
    nav.createEl('button', { text: '← Back' }).onclick = () => {
      this.close();
      new GalaxyScreen2Modal(this.app, this.screen1, this.settings, this.onSettingsChange).open();
    };
    nav.createEl('button', { text: 'Generate Sector', cls: 'mod-cta' }).onclick = () => { void this.commit(centre); };
  }

  private showBusyOverlay(): void {
    const overlay = this.contentEl.createDiv();
    overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:8px;background:var(--background-primary);opacity:0.92;z-index:10;';
    const spinner = overlay.createDiv();
    spinner.innerHTML = SPINNER_SVG;
    overlay.createEl('span', { text: 'Generating…' });
    this.contentEl.style.position = 'relative';
    this.contentEl.appendChild(overlay);
    this.busyOverlay = overlay;
  }

  private hideBusyOverlay(): void {
    this.busyOverlay?.remove();
    this.busyOverlay = null;
  }

  /**
   * `sectorFootprint.assembleSector` (16 Aug 2026) is called ONLY here, not
   * from the cheap position-only preview above - it composes the stellar,
   * remnant AND co-natal-chemistry layers together, which costs real
   * computation the preview does not need to pay. This is the fix for a
   * real gap an audit found: `remnants.ts`/`conatal.ts` were both fully
   * built and gated but never called from anything that produced an actual
   * sector, so every sector this GUI generated had zero remnants and no
   * shared birth chemistry despite both being finished science.
   *
   * Guarded against a second concurrent commit (`this.generating`), and
   * shows a busy overlay (spinner + label) ONLY if the commit is still
   * running after `SPINNER_DELAY_MS` - a commit fast enough to finish
   * before then never flashes it at all.
   */
  private async commit(centrePc: { x: number; y: number; z: number }): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    const spinnerTimer = window.setTimeout(() => this.showBusyOverlay(), SPINNER_DELAY_MS);
    try {
      await this.commitInner(centrePc);
    } finally {
      window.clearTimeout(spinnerTimer);
      this.hideBusyOverlay();
      this.generating = false;
    }
  }

  private async commitInner(centrePc: { x: number; y: number; z: number }): Promise<void> {
    const thickness = thicknessPcFor(this.screen2.sysDensity);
    const assembled = assembleSector(this.screen1.worldSeed, this.model, centrePc, this.screen2.sizeInPc, thickness, this.screen2.footprintShape);
    const total = assembled.stellar.length + assembled.remnants.length;
    new Notice(`Generating ${total} systems (${assembled.remnants.length} remnants) - this may take a moment...`);
    let written = 0;

    for (const m of assembled.stellar) {
      const s = m.placed;
      const populationMeta = this.model.populations.find((p) => p.key === s.population);
      if (!populationMeta) continue;
      const inputs: GenerateSystemInputs = {
        sysid: s.sysid, genVersion: CURRENT_GEN_VERSION, worldSeed: this.screen1.worldSeed, positionPc: s.positionPc,
        population: s.population, populationMeta, formationRank: s.formationRank,
        terraformScale: this.screen1.terraformScale, terraformIntensity: this.screen1.terraformIntensity,
        conatal: m.conatal,
      };
      // Full conductor runs here (screen 3's own preview deliberately never
      // calls it) so every system is REALLY generated, not merely placed.
      // The result now REACHES the note (16 Aug 2026 - previously computed
      // and thrown away, `void core;` - an audit found the science ran for
      // real on every commit but the note body stayed thin regardless).
      const core = generateSystemCore(inputs);
      const d = { x: s.positionPc.x - centrePc.x, y: s.positionPc.y - centrePc.y, z: s.positionPc.z - centrePc.z };
      const input: RenderSystemInput = {
        sysid: s.sysid, name: null, population: s.population, positionPc: s.positionPc,
        distanceFromSectorOriginPc: Math.hypot(d.x, d.y, d.z), core,
      };
      await writeSystemNote(this.app.vault, input, null);
      written++;
    }

    // Remnants get a note too - position/kind only for now, same honest
    // scoping as the stellar layer above (full remnant detail - mass,
    // radius, temperature, a surviving planet - is the same follow-up work
    // as full stellar SystemCore rendering, not done here).
    for (const r of assembled.remnants) {
      const d = { x: r.positionPc.x - centrePc.x, y: r.positionPc.y - centrePc.y, z: r.positionPc.z - centrePc.z };
      const input: RenderSystemInput = {
        sysid: r.sysid, name: null, population: r.kind, positionPc: r.positionPc,
        distanceFromSectorOriginPc: Math.hypot(d.x, d.y, d.z),
      };
      await writeSystemNote(this.app.vault, input, null);
      written++;
    }

    new Notice(`StarForge: wrote ${written} system note(s) to StarForge/Systems/`);
    this.close();
  }
}
