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

import { Modal, Setting, Notice, SliderComponent, DropdownComponent, type App } from 'obsidian';
import { createSpiralModel, createEllipticalModel, createLenticularModel, type GalaxyModel } from './galaxyModel';
import { upsilonFor, densityByPopulationAtCartesian } from './galacticDensity';
import { fieldFromModel, projectSlab, normaliseForDisplay, emphasiseArmsForDisplay, type SlabRegionPc } from './densityMap';
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
  type MorphologyChoice, type Screen1Draft, type Screen2Draft, type SysDensityChoice,
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
 * `showBusyOverlay`/`hideBusyOverlay`/`nextPaint` (16 Aug 2026) - extracted
 * from Screen 3's own commit flow (the only place this pattern existed
 * before) so Screen 1/2's own density-preview recompute can use the
 * identical spinner, closing a real gap a user found: the seeded-arm
 * table's own one-time cost (`spiralArms.generateSeededArms`'s contrast
 * -calibration re-solve, ~0.5-1s on a new seed) made those two screens
 * visibly "jump" - the whole preview freezing then updating with no
 * feedback in between.
 *
 * `nextPaint` is the part Screen 3's OWN commit flow never needed: that
 * flow's real work is a sequence of `await`ed I/O calls (`writeSystemNote`
 * per system), so the event loop gets real chances to run a pending
 * `setTimeout` between them and the delayed-show race just works. The
 * density-field recompute here is ONE long SYNCHRONOUS call with no
 * `await` inside it at all - a `setTimeout(..., SPINNER_DELAY_MS)` raced
 * against it would never fire: by the time the synchronous work returns
 * and the event loop is free to run the timer, the calling code has
 * already reached its own `finally` block and cancelled it in the same
 * tick, so the overlay would never actually paint. `nextPaint` sidesteps
 * the race entirely - show the overlay, explicitly yield past TWO animation
 * frames (one frame is not enough to guarantee the FIRST has already been
 * flushed to the screen; two is the standard reliable pattern), THEN run
 * the blocking computation. The tradeoff, stated honestly: unlike Screen
 * 3's delayed show, this shows unconditionally rather than only past a
 * threshold - a fast recompute (elliptical/lenticular, or any cache hit
 * that skips this path entirely) shows the overlay for only the ~2 frames
 * the yield itself takes, which reads as a brief flicker rather than a
 * freeze either way.
 */
function showBusyOverlay(contentEl: HTMLElement, label: string): HTMLElement {
  const overlay = contentEl.createDiv();
  overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:8px;background:var(--background-primary);opacity:0.92;z-index:10;';
  const spinner = overlay.createDiv();
  spinner.innerHTML = SPINNER_SVG;
  overlay.createEl('span', { text: label });
  contentEl.style.position = 'relative';
  contentEl.appendChild(overlay);
  return overlay;
}

function hideBusyOverlay(overlay: HTMLElement | null): void {
  overlay?.remove();
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Shape-selector icons (16 Aug 2026, a user-found gap): the original
 * wireframe used icons for footprint shape deliberately, minimal-words by
 * design - a text dropdown was a placeholder that never got swapped out.
 * Each glyph matches `sectorFootprint.ts`'s own geometry convention (the
 * hexagon's vertex on the +x axis, "pointy" toward 3 o'clock - the same
 * orientation `isWithinFootprint`/`boundaryPointsPc` already draw).
 *
 * Sized 26px inside a 40px box (16 Aug 2026, a user follow-up) - up from a
 * 22px glyph in a bare padded button.
 */
const SHAPE_ICONS: Readonly<Record<FootprintShape, string>> = {
  circle: '<svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  square: '<svg width="26" height="26" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  hexagon: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M21,12 L16.5,4.2 L7.5,4.2 L3,12 L7.5,19.8 L16.5,19.8 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};
const SHAPE_LABELS: Readonly<Record<FootprintShape, string>> = { circle: 'Circle', square: 'Square', hexagon: 'Hexagon' };

const SYS_DENSITY_LABELS: Readonly<Record<SysDensityChoice, string>> = {
  thin: 'Low density', standard: 'Standard density', thick: 'High density',
};

/**
 * Shape icons + the sys-density dropdown, ONE row, no header, no label text
 * (16 Aug 2026, a user follow-up on the icon-only shape selector above):
 * previously a "Sector shape" heading sat above the icon row, and "Sys
 * density" was its own `Setting` (name + description) underneath. The user
 * asked for both on a single line with none of that chrome - shape choice
 * plus density both read at a glance from icon/dropdown alone.
 *
 * The icons are DIVs, not `<button>`s - a real button carries Obsidian's
 * own border/background chrome, which reads as "a button" rather than the
 * "highlighted icon" look asked for; selection is shown purely as a
 * background highlight (`--interactive-accent`), same information as the
 * old `mod-cta` class conveyed, different visual language. `role="button"`
 * plus a keydown handler keep it keyboard-operable since a div carries
 * neither by default.
 */
function renderShapeAndDensityRow(
  container: HTMLElement,
  selectedShape: FootprintShape, onSelectShape: (shape: FootprintShape) => void,
  selectedDensity: SysDensityChoice, onSelectDensity: (density: SysDensityChoice) => void,
): void {
  const row = container.createDiv();
  row.style.cssText = 'display:flex;align-items:center;gap:10px;margin:8px 0 12px;';
  for (const shape of ['circle', 'square', 'hexagon'] as FootprintShape[]) {
    const isSelected = shape === selectedShape;
    // `.sf-shape-icon`/`.is-selected` (styles.css) - a direct user follow-up
    // to the FIRST version of this row, which highlighted the selected icon
    // with a filled background box. That still read as "a button" - the
    // ask was for the icon's own colour to change on hover/selection, no
    // box at all - which needs a real stylesheet (`:hover` has no inline-
    // style equivalent), not more `cssText`.
    const icon = row.createDiv({
      cls: isSelected ? 'sf-shape-icon is-selected' : 'sf-shape-icon',
      attr: { title: SHAPE_LABELS[shape], 'aria-label': SHAPE_LABELS[shape], role: 'button', tabindex: '0' },
    });
    icon.style.cssText = 'flex:0 0 40px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    icon.innerHTML = SHAPE_ICONS[shape];
    icon.onclick = () => onSelectShape(shape);
    icon.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelectShape(shape); } };
  }
  row.createDiv().style.cssText = 'flex:1 1 auto;';   // pushes the dropdown to the far side of the shape icons
  new DropdownComponent(row)
    .addOption('thin', SYS_DENSITY_LABELS.thin).addOption('standard', SYS_DENSITY_LABELS.standard).addOption('thick', SYS_DENSITY_LABELS.thick)
    .setValue(selectedDensity)
    .onChange((v) => onSelectDensity(v as SysDensityChoice));
}

/**
 * Angle/distance icons (16 Aug 2026, a user follow-up): "at-icons--angle",
 * "ci--arrow-left-right" and "ci--arrow-down-up" from the same icon set the
 * spinner/shape glyphs already draw from, `xmlns` stripped as `renderShape
 * Selector`'s own glyphs already do (Gate S1 flags the `http://www.w3.org/...`
 * namespace URL as network-looking text otherwise).
 */
const ANGLE_ICON = '<svg width="22" height="22" viewBox="0 0 16 16"><path fill="currentColor" d="M8.106 2.43A1 1 0 0 1 9.75 3.57L6.766 7.874a7 7 0 0 1 1.39 1.79A7 7 0 0 1 8.925 12H14a1 1 0 0 1 0 2H2a1 1 0 0 1-.822-1.57zM3.91 12h2.988a5 5 0 0 0-.5-1.382a5 5 0 0 0-.787-1.075z"/></svg>';
const DISTANCE_FROM_CENTRE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 13l3 3m0 0l-3 3m3-3H5m3-5L5 8m0 0l3-3M5 8h14"/></svg>';
const DISTANCE_FROM_PLANE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m11 16l-3 3m0 0l-3-3m3 3V5m5 3l3-3m0 0l3 3m-3-3v14"/></svg>';

/**
 * Icon + slider, ONE row, no name/description text at all (16 Aug 2026, a
 * user follow-up: "use the icon to replace ALL the text"). Deliberately
 * NOT built on `Setting`'s own `.addSlider` - Obsidian's `.setting-item
 * -control` reserves a fixed max-width for a slider control that would
 * leave dead space on the right; rule 4 asks the slider to fill every
 * pixel between the 30px icon and the far edge, so this is a bare flex row
 * plus a raw `SliderComponent` (still real Obsidian slider behaviour -
 * dynamic tooltip, native drag - just laid out by hand) instead.
 */
function renderIconSlider(
  container: HTMLElement, icon: string, label: string,
  min: number, max: number, step: number, value: number, onChange: (v: number) => void,
): void {
  const row = container.createDiv();
  row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:8px 0;';
  const iconEl = row.createDiv({ attr: { title: label, 'aria-label': label } });
  iconEl.style.cssText = 'flex:0 0 30px;width:30px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);';
  iconEl.innerHTML = icon;
  const slider = new SliderComponent(row).setLimits(min, max, step).setValue(value).setDynamicTooltip().onChange(onChange);
  slider.sliderEl.style.cssText = 'flex:1 1 auto;width:100%;';
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

/**
 * Stochastic rounding (16 Aug 2026, a direct user follow-up: "no gradual
 * fading of the stars, but a solid cutoff") - `Math.round` on a fractional
 * expected dot-count has a hard threshold: any cell whose expected count
 * sits below 0.5 rounds to EXACTLY 0, every time, at exactly the same
 * display value. Near a fade edge that produces a visible wall - a whole
 * band of cells all crossing that 0.5 threshold together, dots simply
 * stopping rather than thinning out. Rounding stochastically instead means
 * a cell expecting 0.3 dots still DRAWS one about 30% of the time - across
 * many neighbouring cells that reads as a genuinely gradual thinning
 * (fewer and fewer cells still drawing anything as the expectation drops
 * toward 0), the same trick dithering uses to fake a smooth gradient from
 * discrete pixels.
 */
function stochasticRound(expected: number): number {
  const whole = Math.floor(expected);
  return whole + (Math.random() < expected - whole ? 1 : 0);
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

/**
 * The edge-on view's own vertical half-extent (16 Aug 2026, a direct user
 * follow-up: "I can see no stars in the halo at all"). Previously
 * `Math.max(thickness * 3, 400)` - since `thickness` is the 5/10/15 pc slab
 * choice, that floor of 400 pc was in practice the ENTIRE vertical range
 * shown, always. Verified numerically (this session's own diagnostic
 * script, sampling `densityByPopulation` at R0 across a spread of |z|) that
 * the halo never exceeds a few percent of the local total below |z| ~
 * 1000 pc, crosses 18% around 2000 pc, 38% around 3000 pc and dominates
 * (80%+) by 5000 pc - so a 400 pc window could not have shown so much as a
 * trace of it, regardless of any display tuning; the halo is a real,
 * physically distinct off-plane population (`haloTerm`'s own oblate power
 * law) that this view was simply never tall enough to reach. 6000 pc
 * reaches well into the region where halo genuinely dominates while still
 * leaving the thin/thick disc resolvable as a distinct central band -
 * `renderEdgeOnCanvas`'s own `nz` resolution was raised alongside this so
 * that band does not collapse to 1-2 blurry cells at the new scale.
 */
const EDGE_ON_HALF_HEIGHT_PC = 6000;

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
      // v^1.5 (softened from a straight square, 16 Aug 2026, alongside
      // densityMap.ts's own INTERARM_FLOOR raise) - still pushes contrast
      // toward a clumpy, high-dynamic-range starfield look rather than a
      // smooth linear wash, just less starkly than v^2 did: a direct user
      // follow-up ("reduce the contrast more, so you can see more stars
      // between the arms") - v^2 was itself compounding densityMap's own
      // stretch on top of an already-floored value, so even a floored
      // interarm cell (v=0.4) rounded down to very few dots. At v^1.5 the
      // SAME floor value keeps noticeably more of its own brightness
      // relative to a bright arm peak (v=1), reading as sparser stars
      // rather than emptiness, without flattening the arms themselves.
      // stochasticRound, not Math.round - see that function's own header.
      const n = stochasticRound(Math.pow(v, 1.5) * 18);
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

/**
 * Angle/radius positioning guides (16 Aug 2026, a user follow-up): a
 * dashed line from the GALACTIC centre out to the map edge at the
 * selected angle, plus a dashed ring at the selected distance-from-centre
 * - drawn against the same `field`/`pcToPx` scale `paintDensityField`'s
 * own sector-boundary overlay uses, but anchored to `field.centrePc` (the
 * galaxy's own origin on the whole-galaxy overview - see `GALAXY_OVERVIEW
 * _CENTRE_PC`) rather than the sector's - these two sliders choose WHERE
 * the sector centre sits, so the guide has to read against the galaxy,
 * not the sector marker `paintDensityField` already draws. A distinct
 * dashed blue rather than the sector marker's solid amber, so the two
 * never get confused for each other on the same canvas.
 *
 * Kept as its own pass, called after `paintDensityField` rather than
 * folded into it - `paintDensityField` draws WHAT the field/overlay is;
 * this draws a cursor-like reference for a control that hasn't been
 * committed to anything yet, a different enough concern to earn its own
 * function per this file's own "screens read/write state, nothing more"
 * discipline.
 */
function drawPositionGuides(canvas: HTMLCanvasElement, field: DensityDisplayField, angleRad: number, distanceFromCentrePc: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const { centrePc, halfWidthPc } = field;
  const pcToPx = w / (2 * halfWidthPc);
  // World origin (0,0) in this field's own pixel space - NOT (w/2,h/2)
  // unconditionally, in case `field.centrePc` is ever not the galaxy's own
  // origin (it always is on Screen 2 today, but the formula should still
  // hold if that ever changes, same as the complex-clump loop above).
  const originPx = w / 2 - centrePc.x * pcToPx, originPy = h / 2 + centrePc.y * pcToPx;

  // Solid, wide, saturated magenta at near-full opacity (16 Aug 2026, a
  // direct user follow-up: "aren't rendering") - the FIRST version (a 1px,
  // 65%-alpha, DASHED pale blue that sits close in hue to both the star
  // colour rgba(205,215,255,...) and the sector marker's amber #e0b25a)
  // checked out completely on paper - both calls are wired correctly, both
  // coordinates are finite and on-canvas for every default/reachable draft
  // - so the "not rendering" was very likely "rendering but lost in the
  // noise", not absent. Magenta shares no hue with anything else already
  // drawn on this canvas (starfield: white/blue, sector marker: amber), so
  // this can no longer blend into either regardless of exactly how the
  // starfield happens to be jittered.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,64,190,0.95)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(originPx, originPy, distanceFromCentrePc * pcToPx, 0, 2 * Math.PI);
  ctx.stroke();

  // Length just needs to reach past the canvas edge in every direction -
  // the canvas itself clips anything drawn beyond its own bounds, so the
  // exact intersection with the edge is not worth computing.
  const beyondEdge = Math.hypot(w, h);
  const tipX = originPx + Math.cos(angleRad) * beyondEdge, tipY = originPy - Math.sin(angleRad) * beyondEdge;
  ctx.beginPath();
  ctx.moveTo(originPx, originPy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Crosshair at the actual (angle, R) point - where the line and ring
  // cross is the one point that answers BOTH questions at once, so it
  // earns its own marker rather than making the reader trace two thin
  // strokes to the same conclusion.
  const targetX = originPx + Math.cos(angleRad) * distanceFromCentrePc * pcToPx;
  const targetY = originPy - Math.sin(angleRad) * distanceFromCentrePc * pcToPx;
  ctx.fillStyle = 'rgba(255,64,190,0.95)';
  ctx.beginPath();
  ctx.arc(targetX, targetY, 3.5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
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

/** The top-down view's own square runs `[-halfWidth, +halfWidth]` on a
 *  side; a ray from its centre reaches a CORNER at `halfWidth * sqrt(2)`
 *  - "as far as the far corners of the square" (16 Aug 2026, a direct user
 *  spec for the side-on view's new radial reach) is exactly that. */
const EDGE_ON_MAX_RADIUS_PC = GALAXY_OVERVIEW_HALF_WIDTH_PC * Math.SQRT2;

/**
 * The side-on view - a MAJOR redesign (16 Aug 2026, three direct user
 * follow-ups on the one complaint): the previous version sampled a tiny,
 * near-fixed patch centred on wherever the sector currently sat (a 2pc-
 * wide x-slice, y +/- `halfDepthPc` around the SECTOR's own y, z +/-
 * `halfHeightPc` around the SECTOR's own z) - density barely varies across
 * a window that size (a few hundred pc against a galaxy tens of thousands
 * of pc across), so the view looked the same everywhere and never showed
 * an arm or the bulge, exactly the "no idea what this is showing, there's
 * no difference left to right" the user reported. Two structural changes
 * fix that at the root instead of re-tuning the old view's constants:
 *
 *  (1) FIXED z framing - the vertical window sampled here is now always
 *      `[-halfHeightPc, +halfHeightPc]` around the WORLD galactic plane
 *      (z=0), independent of `distanceFromPlanePc`. The plane sits
 *      dead-centre and never moves; the CURRENT z choice is drawn as the
 *      amber slab band at whatever pixel row that z actually maps to
 *      inside this fixed frame - "the bar moves, not the map".
 *  (2) The horizontal axis is RADIAL DISTANCE from the galactic centre
 *      (R=0 at the left edge) out to `EDGE_ON_MAX_RADIUS_PC` (right edge),
 *      swept along the SAME angle the top-down view's own angle slider
 *      selects - `angleRad` IS `model.densityAt`'s own `theta` parameter,
 *      so this calls it directly, one point at a time, rather than
 *      routing through `densityMap.ts`'s axis-aligned `sampleVolume` (that
 *      primitive samples an (x,y,z) BOX; this slice is a rotated ray
 *      through the disc, which a box sampler cannot express without
 *      resampling the whole galaxy and throwing most of it away). Whatever
 *      arm or the bulge that angle actually crosses now shows up as a
 *      real density gradient left-to-right, which the old local-patch view
 *      could never show regardless of how it was tuned.
 *
 * A magenta vertical line marks the sector's own `distanceFromCentrePc`
 * on this new radial axis - the same colour `drawPositionGuides` uses for
 * the top-down view's own angle/radius crosshair, so "your current
 * position" reads as one consistent visual language across both canvases.
 */
function renderEdgeOnCanvas(
  canvas: HTMLCanvasElement, model: GalaxyModel, angleRad: number, distanceFromCentrePc: number, distanceFromPlanePc: number,
  maxRadiusPc: number, halfHeightPc: number, slabThicknessPc: number | null = null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, w, h);

  const res = { nR: 150, nz: 110 };
  const raw = new Float64Array(res.nR * res.nz);
  for (let iz = 0; iz < res.nz; iz++) {
    const zPc = -halfHeightPc + ((iz + 0.5) / res.nz) * 2 * halfHeightPc;
    for (let iR = 0; iR < res.nR; iR++) {
      const R = ((iR + 0.5) / res.nR) * maxRadiusPc;
      raw[iR + res.nR * iz] = model.densityAt(R, angleRad, zPc);
    }
  }
  const norm = normaliseForDisplay(raw, { log: true });
  const pcToPxR = w / maxRadiusPc, pcToPxZ = h / (2 * halfHeightPc);
  for (let iz = 0; iz < res.nz; iz++) {
    for (let iR = 0; iR < res.nR; iR++) {
      const v = norm[iR + res.nR * iz]!;
      const R = ((iR + 0.5) / res.nR) * maxRadiusPc;
      const zPc = -halfHeightPc + ((iz + 0.5) / res.nz) * 2 * halfHeightPc;
      const px = R * pcToPxR, py = h - (zPc + halfHeightPc) * pcToPxZ;
      const n = stochasticRound(v * v * 10);   // stochasticRound - see that function's own header
      for (let p = 0; p < n; p++) {
        const jx = px + (Math.random() - 0.5) * (w / res.nR);
        const jy = py + (Math.random() - 0.5) * (h / res.nz);
        ctx.fillStyle = `rgba(205,215,255,${(0.25 + 0.65 * Math.random()).toFixed(2)})`;
        ctx.fillRect(jx, jy, 1, 1);
      }
    }
  }

  // The sys-density slab band, now positioned at wherever `distanceFrom
  // PlanePc` actually falls inside the FIXED [-halfHeightPc,+halfHeightPc]
  // frame - it used to always land at h/2 because the whole map recentred
  // on the sector's own z instead; now the map never moves, so this is the
  // one thing here that does.
  if (slabThicknessPc !== null) {
    const bandCentrePx = h - (distanceFromPlanePc + halfHeightPc) * pcToPxZ;
    const bandPx = Math.max(3, slabThicknessPc * pcToPxZ);
    ctx.fillStyle = 'rgba(224,178,90,0.22)';
    ctx.fillRect(0, bandCentrePx - bandPx / 2, w, bandPx);
    ctx.strokeStyle = '#e0b25a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, bandCentrePx - bandPx / 2); ctx.lineTo(w, bandCentrePx - bandPx / 2);
    ctx.moveTo(0, bandCentrePx + bandPx / 2); ctx.lineTo(w, bandCentrePx + bandPx / 2);
    ctx.stroke();
  }

  // Radial position marker - where the sector's own `distanceFromCentrePc`
  // falls on this view's new R axis, same magenta as the top-down guides.
  const rPx = Math.min(distanceFromCentrePc, maxRadiusPc) * pcToPxR;
  ctx.strokeStyle = 'rgba(255,64,190,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rPx, 0);
  ctx.lineTo(rPx, h);
  ctx.stroke();
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
  private busyOverlay: HTMLElement | null = null;

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

  /**
   * The cache-miss path, WITH a spinner - split out of the old synchronous
   * `fieldForCurrentDraft` (16 Aug 2026, a user-found gap: "a slight
   * jumpy" - the seeded-arm table's own one-time contrast-calibration cost,
   * ~0.5-1s, made the whole preview freeze then jump with no feedback).
   * Shows the overlay unconditionally, yields to let it actually paint
   * (`nextPaint`'s own header explains why a delayed-show race does not
   * work for a synchronous computation), THEN runs the real work.
   */
  private async computeAndCacheField(model: GalaxyModel, params: GalaxyParameters, key: string): Promise<DensityDisplayField> {
    this.busyOverlay = showBusyOverlay(this.contentEl, 'Rendering preview…');
    await nextPaint();
    const field = computeDensityDisplayField(
      model, GALAXY_OVERVIEW_CENTRE_PC, GALAXY_OVERVIEW_HALF_WIDTH_PC, GALAXY_OVERVIEW_THICKNESS_PC, GALAXY_OVERVIEW_RES,
      { worldSeed: this.draft.worldSeed, complexTier: params.complexTier },
    );
    this.cachedField = field;
    this.cachedFieldKey = key;
    hideBusyOverlay(this.busyOverlay);
    this.busyOverlay = null;
    return field;
  }

  private async fieldForCurrentDraft(model: GalaxyModel, params: GalaxyParameters): Promise<DensityDisplayField> {
    const key = `${this.draft.morphology}:${this.draft.sizeStepIndex}:${this.draft.lenticularBulgeType}:${this.draft.worldSeed}`;
    if (this.cachedFieldKey === key && this.cachedField) return this.cachedField;
    return this.computeAndCacheField(model, params, key);
  }

  onOpen(): void {
    this.titleEl.setText('Create a Galaxy - Morphology, Size, Seed');
    void this.render();
  }

  /**
   * ASYNC (16 Aug 2026) so the field recompute above can genuinely show its
   * spinner before blocking - `buildDom` below still does the synchronous
   * `contentEl.empty()` + rebuild, but only AFTER the (possibly slow) field
   * is already in hand, so the DOM never sits half-built while a spinner is
   * up.
   */
  private async render(): Promise<void> {
    const { model, params } = modelFromDraft(this.draft);
    const field = await this.fieldForCurrentDraft(model, params);
    this.buildDom(field);
  }

  private buildDom(field: DensityDisplayField): void {
    const { contentEl } = this;
    contentEl.empty();

    const morphRow = contentEl.createDiv();
    for (const choice of ['lenticular', 'elliptical', 'barredSpiral', 'spiral', 'milkyWayAnalogue'] as MorphologyChoice[]) {
      const btn = morphRow.createEl('button', { text: MORPHOLOGY_LABELS[choice] });
      if (choice === this.draft.morphology) btn.addClass('mod-cta');
      btn.onclick = () => { this.draft = { ...this.draft, morphology: choice }; void this.render(); };
    }

    new Setting(contentEl).setName('Galaxy size').setDesc(sizeStepsFor(this.draft.morphology)[this.draft.sizeStepIndex]!.label)
      .addSlider((s) => s.setLimits(0, 4, 1).setValue(this.draft.sizeStepIndex).setDynamicTooltip()
        .onChange((v) => { this.draft = { ...this.draft, sizeStepIndex: v }; void this.render(); }));

    new Setting(contentEl).setName('Seed')
      .addText((t) => t.setValue(this.draft.worldSeed).setPlaceholder('(random)')
        .onChange((v) => {
          this.draft = { ...this.draft, worldSeed: v };
          // NOT void this.render() - that would rebuild this very text
          // input on every keystroke (contentEl.empty() + rebuild),
          // stealing focus and the cursor position while typing. Since
          // seeded arms (16 Aug 2026) mean the typed seed now genuinely
          // changes the preview, debounce a canvas-only repaint instead of
          // ignoring it entirely (the prior behaviour, back when the seed
          // never affected shape).
          if (this.seedRefreshTimer !== null) window.clearTimeout(this.seedRefreshTimer);
          this.seedRefreshTimer = window.setTimeout(() => {
            void (async () => {
              const { model, params } = modelFromDraft(this.draft);
              paintDensityField(this.canvas, await this.fieldForCurrentDraft(model, params), null);
            })();
          }, 400);
        }))
      .addButton((b) => b.setButtonText('Randomise').onClick(() => {
        const seed = Math.random().toString(36).slice(2);
        this.draft = { ...this.draft, worldSeed: seed };
        void this.render();
      }));

    contentEl.createEl('h4', { text: 'Other options' });
    if (this.draft.morphology === 'lenticular') {
      new Setting(contentEl).setName('Bulge type')
        .addDropdown((d) => d.addOption('composite', 'Composite (pseudo + classical)').addOption('classical', 'Classical only')
          .setValue(this.draft.lenticularBulgeType)
          .onChange((v) => { this.draft = { ...this.draft, lenticularBulgeType: v as 'composite' | 'classical' }; }));
    }
    // Two independent dials, redesigned 16 Aug 2026 after a direct user
    // correction - see `terraforming.ts`'s own header for the full story.
    // Reach sets how difficult a world can be and still be a candidate at
    // all; coverage then fills that eligible range from the easiest world
    // up. Neither slider triggers a recompute (`this.render()`) any more
    // than it used to - terraforming affects nothing about the density
    // field, so both just update the draft's own description text via a
    // full rebuild, which hits the CACHE (no spinner, no recompute).
    new Setting(contentEl).setName('Terraforming coverage').setDesc(`${this.draft.terraformScale} / 6 - how much of what's within reach actually gets terraformed, easiest worlds first`)
      .addSlider((s) => s.setLimits(0, 6, 1).setValue(this.draft.terraformScale).setDynamicTooltip()
        .onChange((v) => { this.draft = { ...this.draft, terraformScale: v }; void this.render(); }));
    new Setting(contentEl).setName('Terraforming reach').setDesc(`${this.draft.terraformIntensity} / 6 - how difficult a world can be and still be attempted at all`)
      .addSlider((s) => s.setLimits(0, 6, 1).setValue(this.draft.terraformIntensity).setDynamicTooltip()
        .onChange((v) => { this.draft = { ...this.draft, terraformIntensity: v }; void this.render(); }));

    this.canvas = contentEl.createEl('canvas', { attr: { width: '360', height: '360' } });
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '12px auto';
    paintDensityField(this.canvas, field, null);

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

  /** Debounce timer for the Total systems / Size (pc) text fields - see
   *  their own `onChange` handlers below for why this exists. */
  private sizeFieldRefreshTimer: number | null = null;

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
    void this.initAndRender();
  }

  /**
   * Async (16 Aug 2026) so the initial `galaxyOverview` computation - the
   * same potentially-slow seeded-arm field build Screen 1 pays, since
   * `this.model` was built by the same `modelFromDraft` - can show a
   * spinner instead of freezing the transition from Screen 1. See
   * `showBusyOverlay`'s own header for why this yields via `nextPaint`
   * rather than racing a delayed `setTimeout` against synchronous work.
   */
  private async initAndRender(): Promise<void> {
    const overlay = showBusyOverlay(this.contentEl, 'Rendering preview…');
    await nextPaint();
    this.galaxyOverview = computeDensityDisplayField(
      this.model, GALAXY_OVERVIEW_CENTRE_PC, GALAXY_OVERVIEW_HALF_WIDTH_PC, GALAXY_OVERVIEW_THICKNESS_PC, GALAXY_OVERVIEW_RES,
      { worldSeed: this.screen1.worldSeed, complexTier: this.params.complexTier },
    );
    hideBusyOverlay(overlay);
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
    drawPositionGuides(this.topDownCanvas, this.galaxyOverview, this.draft.angleRad, this.draft.distanceFromCentrePc);

    // height 80 -> 220 (16 Aug 2026, alongside EDGE_ON_HALF_HEIGHT_PC's own
    // widening) - a 12 000 pc total vertical range read at 80px was ~150 pc
    // per pixel, too coarse to show the thin disc as anything but a hairline
    // even before the halo fix; 220px brings that down to a legible ~55 pc/px.
    this.sideOnCanvas = contentEl.createEl('canvas', { attr: { width: '400', height: '220' } });
    this.sideOnCanvas.style.display = 'block';
    this.sideOnCanvas.style.margin = '4px auto 12px';
    renderEdgeOnCanvas(
      this.sideOnCanvas, this.model, this.draft.angleRad, this.draft.distanceFromCentrePc, this.draft.distanceFromPlanePc,
      EDGE_ON_MAX_RADIUS_PC, EDGE_ON_HALF_HEIGHT_PC, thickness,
    );

    renderIconSlider(contentEl, ANGLE_ICON, `Angle (θ) - ${(this.draft.angleRad * 180 / Math.PI).toFixed(0)}°`,
      0, 359, 1, Math.round(this.draft.angleRad * 180 / Math.PI), (v) => this.setDraft({ angleRad: (v * Math.PI) / 180 }));
    renderIconSlider(contentEl, DISTANCE_FROM_CENTRE_ICON, `Distance from centre (R) - ${this.draft.distanceFromCentrePc.toFixed(0)} pc`,
      0, 20000, 50, this.draft.distanceFromCentrePc, (v) => this.setDraft({ distanceFromCentrePc: v }));
    renderIconSlider(contentEl, DISTANCE_FROM_PLANE_ICON, `Distance from galactic plane (z) - ${this.draft.distanceFromPlanePc.toFixed(0)} pc`,
      -2000, 2000, 10, this.draft.distanceFromPlanePc, (v) => this.setDraft({ distanceFromPlanePc: v }));

    renderShapeAndDensityRow(
      contentEl, this.draft.footprintShape, (shape) => this.setDraft({ footprintShape: shape }),
      this.draft.sysDensity, (density) => this.setDraft({ sysDensity: density }),
    );

    // Debounced (16 Aug 2026, a user-found gap: "lag... sometimes I can't
    // even write 15 into size") - `setDraft` runs `reconcileSizeFields`
    // (a root-find over the density model, not free) then a full
    // `contentEl.empty()` + rebuild, which includes THIS very text field.
    // Calling it straight from `onChange` meant every single keystroke
    // rebuilt the input out from under itself mid-type, dropping focus and
    // the caret - typing "15" could land as "1", or as nothing at all if
    // the rebuild landed between keydown events. Same fix as Screen 1's
    // seed field (`seedRefreshTimer`): wait for a pause in typing before
    // touching the draft at all, so the browser's own native text-input
    // behaviour (which needs no help from us) carries every keystroke
    // while the user is still typing.
    // Same row (16 Aug 2026, a user follow-up) - two `Setting`s side by side
    // rather than stacked, each stretched to half the row via its own
    // `settingEl` (still real Obsidian `Setting`/`TextComponent` instances,
    // so the input keeps the app's own text-field styling; only the outer
    // layout is overridden).
    const sizeRow = contentEl.createDiv();
    sizeRow.style.cssText = 'display:flex;gap:16px;';
    const totalSystemsSetting = new Setting(sizeRow).setName('Total systems');
    totalSystemsSetting.settingEl.style.cssText = 'flex:1 1 0;border:none;padding-left:0;padding-right:0;';
    totalSystemsSetting.addText((t) => t.setValue(String(this.draft.totalSystems))
      .onChange((v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) return;
        if (this.sizeFieldRefreshTimer !== null) window.clearTimeout(this.sizeFieldRefreshTimer);
        this.sizeFieldRefreshTimer = window.setTimeout(() => this.setDraft({ sizeEditMode: 'totalSystems', totalSystems: Math.round(n) }), 400);
      }));
    const sizeInPcSetting = new Setting(sizeRow).setName('Size (pc)');
    sizeInPcSetting.settingEl.style.cssText = 'flex:1 1 0;border:none;padding-left:0;padding-right:0;';
    sizeInPcSetting.addText((t) => t.setValue(this.draft.sizeInPc.toFixed(1))
      .onChange((v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) return;
        if (this.sizeFieldRefreshTimer !== null) window.clearTimeout(this.sizeFieldRefreshTimer);
        this.sizeFieldRefreshTimer = window.setTimeout(() => this.setDraft({ sizeEditMode: 'sizeInPc', sizeInPc: n }), 400);
      }));

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
   * before then never flashes it at all. Safe to race a plain `setTimeout`
   * here (unlike Screen 1/2's own recompute, see `showBusyOverlay`'s own
   * header) because `commitInner` is a sequence of `await`ed I/O calls, not
   * one long synchronous block - the event loop gets real chances to run
   * the pending timer between them.
   */
  private async commit(centrePc: { x: number; y: number; z: number }): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    const spinnerTimer = window.setTimeout(() => { this.busyOverlay = showBusyOverlay(this.contentEl, 'Generating…'); }, SPINNER_DELAY_MS);
    try {
      await this.commitInner(centrePc);
    } finally {
      window.clearTimeout(spinnerTimer);
      hideBusyOverlay(this.busyOverlay);
      this.busyOverlay = null;
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
