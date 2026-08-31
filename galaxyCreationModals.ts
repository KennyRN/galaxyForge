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
 * -- START SCREEN: WHAT TO CREATE (30 Aug 2026) --------------------------------
 * `GalaxyStartModal`, opened first by `main.ts`, offers two icon-marked
 * routes: "create an entire galaxy" (the full Screen 1 -> 2 -> 3 flow
 * below) or "create a sector using sol-neighbourhood as a template", which
 * hands off to `GalaxySolNeighbourhoodModal` - a flow that ROLLS the sector
 * centre inside the sol-like neighbourhood band (randomly-seeded Milky Way
 * Analogue, terraforming off) rather than dialling it, but keeps Screen 2's
 * shape / slab / size / system-search controls; a separate
 * `SolNeighbourhoodHistoryModal` browses past rolls, and commit goes
 * through the same shared `writeSectorDocument` Screen 3 uses.
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
import { createSpiralModel, createEllipticalModel, createLenticularModel, scaleSpiralModel, R0_PC, type GalaxyModel, type PopulationKey } from './galaxyModel';
import { upsilonFor } from './galacticDensity';
import { fieldFromModel, projectSlab, diametralEdgeOnDisplayField, sampleBilinear, type SlabRegionPc } from './densityMap';
import { ismDensityAt, DEFAULT_ISM_PARAMS } from './ism';
import { DEFAULT_JURIC, makeDefaultGalaxyParameters, type GalaxyParameters, type ComplexTierParams } from './galaxyParameters';
import { generateSeededArms, rollArmClass, ARMS, type ArmDefinition } from './spiralArms';
import { degToRad, radToDeg } from './units';
import {
  computeDensityDisplayField, paintDensityField, drawIsophoteLegend, complexCentresForOverview,
  ISOPHOTE_BREAK_RADIUS_FRACTION,
  type DensityDisplayField, type IsophotePalette,
} from './isophoteRenderer';
import { generateSector, assembleSector } from './sectorFootprint';
import { coverFieldCacheKey, coverFieldIsCached, coverField } from './previewCache';
import { searchNearestSystem } from './sectorSearch';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { CURRENT_GEN_VERSION } from './genVersion';
import { writeSectorList, SECTOR_FOLDER } from './vault';
import { buildSectorListContent, formatPlanetTypesCell, formatBeltsCell, trueDistance3dPc, type SectorListRow, type SectorListMeta } from './render';
import type { HabTier } from './humanHabitability';
import type { SystemCore } from './types';
import {
  type MorphologyChoice, type Screen1Draft, type Screen2Draft, type SysDensityChoice,
  type SolNeighbourhoodSector,
  defaultScreen1Draft, defaultScreen2Draft, resolveModelName, resolveBarEnabled,
  sizeStepsFor, sizeValueFor, sizeIsMass, thicknessPcFor, centrePcFromPolar,
  reconcileSizeFields, assembleSearchCriteria, isWithinFootprint,
  solNeighbourhoodBand, rollSolNeighbourhoodCentre,
} from './galaxyCreationState';
import type { FootprintShape } from './sectorFootprint';
import type { GalaxyForgeSettings } from './main';

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
 * flow's real work is a per-system CPU loop (`generateSystemCore`) with a
 * periodic macrotask yield of its own (`writeSectorDocument`'s own `YIELD_EVERY`,
 * 17 Aug 2026 - the single `writeSectorList` at the end no longer gives the
 * many per-system yield points a `writeSystemNote`-per-system loop used to
 * provide "for free"), so the event loop still gets real chances to run a
 * pending `setTimeout` and the delayed-show race just works. The
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

/** Tabler `baseline-density-*` (xmlns omitted: gate S1), least lines to most:
 *  large / medium / small. Medium is three lines and the default selection. */
const SYS_DENSITY_ICONS: Readonly<Record<SysDensityChoice, string>> = {
  thin: '<svg width="26" height="26" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16M4 20h16"/></svg>',
  standard: '<svg width="26" height="26" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20h16M4 12h16M4 4h16"/></svg>',
  thick: '<svg width="26" height="26" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 3h16M4 9h16M4 15h16M4 21h16"/></svg>',
};
const SYS_DENSITY_ORDER: readonly SysDensityChoice[] = ['thin', 'standard', 'thick'];

/** Tabler `ruler-measure` (xmlns omitted: gate S1). */
const RULER_ICON = '<svg width="26" height="26" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.875 12c.621 0 1.125.512 1.125 1.143v5.714c0 .631-.504 1.143-1.125 1.143H4a1 1 0 0 1-1-1v-5.857C3 12.512 3.504 12 4.125 12zM9 12v2m-3-2v3m6-3v3m6-3v3m-3-3v2M3 3v4m0-2h18m0-2v4"/></svg>';

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
    // `.gf-shape-icon`/`.is-selected` (styles.css) - a direct user follow-up
    // to the FIRST version of this row, which highlighted the selected icon
    // with a filled background box. That still read as "a button" - the
    // ask was for the icon's own colour to change on hover/selection, no
    // box at all - which needs a real stylesheet (`:hover` has no inline-
    // style equivalent), not more `cssText`.
    const icon = row.createDiv({
      cls: isSelected ? 'gf-shape-icon is-selected' : 'gf-shape-icon',
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

const MINUS_ICON = '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3" d="M5 12h14"/></svg>';
const PLUS_ICON = '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="3" d="M12 5v14M5 12h14"/></svg>';

/** Fixed width for every slider row's number box (16 Aug 2026, a direct
 *  user ask: "all the text boxes the same size") - sized to comfortably
 *  fit the widest value any slider in the app can show, R's `20000.00`. */
const SLIDER_NUMBER_BOX_WIDTH_PX = 72;

/** The left slot of a slider row - EITHER a 30px icon (Screen 2's angle/R/z,
 *  "use the icon to replace ALL the text") OR a short text label (Screen
 *  1's own three sliders, which never got the icon treatment and are not
 *  gaining it now - only their control row is being unified). `title` is
 *  the full accessible name/tooltip in both cases - the fuller "what does
 *  this number mean" text (e.g. terraforming's own coverage/reach
 *  explanation) that used to live in a permanent `Setting.setDesc()` now
 *  lives here instead, on hover, not permanently on screen. */
interface SliderRowLeft { readonly icon?: string; readonly label?: string; readonly title: string; }

/** A reference BAND on a slider's own track, not a single value (16 Aug
 *  2026, a direct user question: "is there a slice which has 'reasonable'
 *  sol neighbourhood density and feel?" - yes, this is that slice) -
 *  `center` +/- `halfWidth` in the slider's own units. */
interface SliderRowMark { readonly center: number; readonly halfWidth: number; readonly title: string; }

/**
 * ONE shared slider row, used by all six sliders app-wide (16 Aug 2026, a
 * direct user follow-up on the icon-only Screen 2 sliders from two turns
 * ago: "extra precision that is currently lacking"). Replaces both
 * `renderIconSlider` (Screen 2's three) and the raw `Setting(...)
 * .addSlider(...)` calls (Screen 1's three) - the ONLY way "all the text
 * boxes the same size" is a meaningful statement is if more than one
 * screen's sliders share this exact control.
 *
 * Layout: `[icon OR label] [number box, fixed width] [native <input
 * type=range>, flex:1] [ONE pill-shaped -/+ container]` - the number box
 * moved to sit BEFORE the slider (16 Aug 2026, a direct user follow-up: it
 * previously sat after the slider, between it and the pills), and the two
 * separate pill buttons became ONE pill-shaped container split into two
 * clickable halves (a single `border-radius`+`overflow:hidden` div
 * clipping two plain, undecorated buttons inside it, not two individually
 * -rounded buttons). Three independent ways to reach the SAME value:
 *  - Dragging the slider moves in its own `step` - unchanged.
 *  - The number box accepts free text to `decimals` places, committed on
 *    blur/Enter (not per-keystroke - the exact bug just fixed for Total
 *    systems/Size (pc)). RIGHT-aligned with a fixed `decimals` count -
 *    "Excel accounting" alignment: since every value in one box always
 *    carries the same number of decimal places, right-aligning a
 *    fixed-width box keeps the decimal point the same distance from the
 *    right edge regardless of how many integer digits or a leading minus
 *    sign the current value happens to have.
 *  - The pill halves nudge by exactly HALF of `step`.
 *
 * `mark` (optional) draws a shaded band (see `SliderRowMark`) plus a
 * bolder centre line, DOM-ordered before the native slider so it paints
 * behind it, EXTENDING slightly above/below the slider's own height so it
 * stays visible past the native track - a mark confined to exactly the
 * track's own height was found to be almost entirely hidden by it (a
 * direct user follow-up: "the slider itself hides the bar").
 */
function renderSliderRow(
  container: HTMLElement, left: SliderRowLeft,
  min: number, max: number, step: number, decimals: number, value: number, onChange: (v: number) => void,
  mark?: SliderRowMark,
): void {
  const row = container.createDiv();
  row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:8px 0;';

  if (left.icon !== undefined) {
    const iconEl = row.createDiv({ attr: { title: left.title, 'aria-label': left.title } });
    iconEl.style.cssText = 'flex:0 0 30px;width:30px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);';
    iconEl.innerHTML = left.icon;
  } else {
    const labelEl = row.createDiv({ text: left.label ?? left.title, attr: { title: left.title } });
    labelEl.style.cssText = 'flex:0 0 auto;min-width:150px;color:var(--text-normal);font-size:var(--font-ui-small);';
  }

  const numberInput = row.createEl('input', { attr: { type: 'text', inputmode: 'decimal' } });
  numberInput.value = value.toFixed(decimals);
  numberInput.style.cssText = `flex:0 0 ${SLIDER_NUMBER_BOX_WIDTH_PX}px;width:${SLIDER_NUMBER_BOX_WIDTH_PX}px;text-align:right;` +
    'background:var(--background-modifier-form-field);border:1px solid var(--background-modifier-border);' +
    'border-radius:4px;color:var(--text-normal);padding:2px 6px;font-variant-numeric:tabular-nums;';

  const sliderWrap = row.createDiv();
  sliderWrap.style.cssText = 'position:relative;flex:1 1 auto;display:flex;align-items:center;';
  if (mark !== undefined && max > min) {
    const centrePct = Math.min(1, Math.max(0, (mark.center - min) / (max - min))) * 100;
    const halfPct = (Math.max(0, mark.halfWidth) / (max - min)) * 100;
    const band = sliderWrap.createDiv({ attr: { title: mark.title } });
    band.style.cssText = `position:absolute;left:${Math.max(0, centrePct - halfPct)}%;` +
      `width:${Math.min(100, halfPct * 2)}%;top:-5px;bottom:-5px;` +
      'background:rgba(200,205,220,0.22);pointer-events:none;z-index:0;border-radius:2px;';
    const centreLine = sliderWrap.createDiv({ attr: { title: mark.title } });
    centreLine.style.cssText = `position:absolute;left:${centrePct}%;top:-5px;bottom:-5px;width:2px;` +
      'background:var(--text-muted);pointer-events:none;transform:translateX(-1px);z-index:0;';
  }
  const slider = new SliderComponent(sliderWrap).setLimits(min, max, step).setValue(value).setDynamicTooltip()
    .onChange((v) => { numberInput.value = v.toFixed(decimals); onChange(v); });
  slider.sliderEl.style.cssText = 'flex:1 1 auto;width:100%;position:relative;z-index:1;';

  const commit = (raw: string): void => {
    const n = Number(raw);
    if (!Number.isFinite(n)) { numberInput.value = slider.getValue().toFixed(decimals); return; }
    const rounded = Number(Math.min(max, Math.max(min, n)).toFixed(decimals));
    numberInput.value = rounded.toFixed(decimals);
    slider.setValue(rounded);
    onChange(rounded);
  };
  numberInput.addEventListener('blur', () => commit(numberInput.value));
  numberInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); numberInput.blur(); } });

  const nudge = step / 2;
  const pill = row.createDiv();
  pill.style.cssText = 'flex:0 0 auto;display:flex;border-radius:999px;overflow:hidden;background:var(--interactive-normal);';
  const makeHalf = (glyph: string, title: string, delta: number): void => {
    const btn = pill.createEl('button', { cls: 'gf-pill-btn', attr: { title, 'aria-label': title } });
    btn.style.cssText = 'flex:0 0 auto;width:22px;height:22px;padding:0;border-radius:0;border:none;' +
      'display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-normal);';
    btn.innerHTML = glyph;
    btn.onclick = () => commit(String(Math.min(max, Math.max(min, slider.getValue() + delta))));
  };
  makeHalf(MINUS_ICON, 'Decrease', -nudge);
  pill.createDiv().style.cssText = 'flex:0 0 1px;width:1px;background:var(--background-modifier-border);';
  makeHalf(PLUS_ICON, 'Increase', nudge);
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
    // rollArmClass (17 Aug 2026, Amendment A6) - only for a SEEDED galaxy;
    // 'Milky Way Analogue' fixes its own class to 'multipleArm' by omitting
    // the argument (makeDefaultGalaxyParameters's own default), matching
    // how it already keeps the real ARMS table instead of a seeded one.
    // Rolled once into a local, not called twice - channelRng would give the
    // SAME class either way (pure function of worldSeed), but one call is
    // the honest reading of "rolled once per galaxy".
    const seededArmClass = isRealMilkyWay ? undefined : rollArmClass(d.worldSeed);
    // barEnabled (P14, 28 Aug 2026, a direct user report: an unbarred Spiral
    // rendered as a smooth circular blob - arm-start was pinned to the
    // bar-END radius even with no bar). Threaded explicitly, not read off
    // `params.morphology` (never authoritative for bar state) - `resolveBar
    // Enabled` is the SAME source of truth `createSpiralModel`'s own
    // `barEnabled` argument below already uses, so the two can never
    // disagree about whether this galaxy has a bar.
    const barEnabled = resolveBarEnabled(d.morphology);
    const baseParams = isRealMilkyWay
      ? makeDefaultGalaxyParameters(d.worldSeed, ARMS, 'observed-mw', 'multipleArm', barEnabled)
      : makeDefaultGalaxyParameters(d.worldSeed, generateSeededArms(d.worldSeed, seededArmClass), 'seeded', seededArmClass, barEnabled);
    // scaleSpiralModel (16 Aug 2026, a found bug this session's own
    // investigation surfaced: "Galaxy size" had NO EFFECT on this whole
    // morphology family - `params.scale` was always 1.0 and never read
    // anywhere) - see that function's own header for why a coordinate
    // -transform wrapper is mathematically exact here, not an
    // approximation. `params.scale` is stamped to the REAL chosen value
    // for honest provenance, even though the wrapper - not `params.scale`
    // being read internally - is what actually produces the effect.
    const params: GalaxyParameters = { ...baseParams, scale: sizeValue };
    // `upsilonFor` (17 Aug 2026, Amendment A4) - injected here the same way
    // it already is for `createEllipticalModel`/`createLenticularModel`
    // below, rather than left at `createSpiralModel`'s own flat `calibrated`
    // fallback (`DEFAULT_BULGE_UPSILON`); this is the GUI's one real
    // generation entry point, so it should use the population-accurate
    // (age/feh-dependent) mass-to-count conversion wherever one is
    // available, exactly like every other mass-normalised population here.
    const model = scaleSpiralModel(createSpiralModel(barEnabled, params, upsilonFor), sizeValue);
    return { model, params };
  }
  const params = makeDefaultGalaxyParameters(d.worldSeed);
  if (name === 'elliptical') return { model: createEllipticalModel(sizeValue, upsilonFor, params), params };
  return { model: createLenticularModel(sizeValue, upsilonFor, d.lenticularBulgeType, params), params };
}

/* ------------------------------- shared canvas rendering ------------------------ */
// complexCentresForOverview and its own PREVIEW_COMPLEX_* constants moved to
// isophoteRenderer.ts (Prompt P1, 27 Aug 2026) - see that file's own header
// for the full "deliberate preview simplifications" rationale, unchanged.

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

/** Strips characters Obsidian/most filesystems reject in a filename (a
 *  world seed is free-text the user typed - `Screen1Draft`'s own seed field
 *  has no character restriction) - collapses each run of disallowed
 *  characters to a single hyphen rather than deleting them outright, so
 *  two different seeds that only differ in punctuation don't collide into
 *  the same sanitised name. */
function sanitiseFilenamePart(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'seed';
}

/** `YYYY-MM-DD HHmmss`, local time - colon-free (Obsidian rejects `:` in a
 *  filename) but still human-sortable and human-readable, unlike a bare
 *  epoch/ISO string. */
function filenameTimestamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// boundaryPointsPc moved to isophoteRenderer.ts (Prompt P1, 27 Aug 2026) -
// paintDensityField, its only caller, moved there with it.

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
 * .armWidthPc`) and coarser than the bulge's own core scale (700/440pc,
 * `DEFAULT_BULGE.scalePc` - renamed from `DEFAULT_BAR` 17 Aug 2026, see
 * `galaxyParameters.ts`'s own `BulgeParams` header). Verified directly (this session's own diagnostic
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
const GALAXY_OVERVIEW_THICKNESS_BASE_PC = 4000;
// GALAXY_OVERVIEW_RES (fixed 200x200) retired, Prompt P1 (27 Aug 2026) -
// grid resolution is now DERIVED from halfWidthPc via `isophoteGridRes`,
// erratum 1.1/1.2's fix for gate 1 (absolute levels invariant under frame
// extent): a fixed grid against a varying frame was in tension with that
// gate by construction.

/** `params.scale` only means anything for the locally-anchored spiral
 *  family (`scaleSpiralModel`'s own header explains why) - elliptical/
 *  lenticular already scale via `galaxyMassSol` and keep the BASE preview
 *  window unconditionally (`1`), same as every existing generated galaxy
 *  at those two morphologies today. */
function previewScaleFor(model: GalaxyModel, params: GalaxyParameters): number {
  return model.morphology === 'spiral' || model.morphology === 'barredSpiral' ? params.scale : 1;
}

/**
 * DERIVED FRAMING (17 Aug 2026, Amendment A7's own patch v3.0 Section 5.4,
 * Step 6) - `GALAXY_OVERVIEW_HALF_WIDTH_BASE_PC`, a single fixed 20000pc
 * constant scaled only by `previewScale`, is RETIRED outright: the patch's
 * own root-cause analysis (S1.3) found it was "about right" for a
 * Standard-scale spiral only by coincidence (~10 100pc R90 at that one
 * scale) - it carried no relationship to a DIFFERENT morphology's own real
 * extent (elliptical/lenticular's mass-driven size, S4.5/S4.6, was never
 * reflected in it at all) and would have needed hand-retuning every time a
 * model's own physical scale changed for any reason. `R90_MARGIN x R90
 * (model)` scales with `params.scale` AND with morphology for free, because
 * it is computed FROM the model's own real field, not asserted independent
 * of it.
 *
 * R90_MARGIN: `measured` off the owner's own reference frame (ESA/Gaia/DPAC
 * artist's impression, S8's own citation) - 90% of its light lies inside
 * 0.55 of the frame half-width, so half-width = R90/0.55 ~= 1.818 x R90,
 * rounded to `1.8`. `tunable`, per S8's own explicit ruling that every
 * `measured` figure in this patch is a visual target only, never `sourced`.
 */
const R90_MARGIN = 1.8;
const R90_TARGET_FRACTION = 0.9;
/** Coarse resolution for the R90 SEARCH only (not the real display grid) -
 *  cheap by design: this runs once per model change, alongside (and at
 *  comparable but not dominant cost to) the real `GALAXY_OVERVIEW_RES`
 *  field computation it precedes, purely to PLACE a framing radius, not to
 *  reproduce a gated science quantity.
 *
 *  REDUCED 80x80 -> 48x48, 28 Aug 2026 (hands-on found - "should be
 *  quicker, takes about the same time"): measured directly at 80x80, this
 *  search alone cost ~1-1.2s EVERY render, on top of the main field
 *  below - real cost for something whose own doc comment already called
 *  it "coarse... not the real display grid". A radial CDF used only to
 *  place a framing radius (R90_MARGIN already adds 80% headroom on top)
 *  does not need fine angular/radial resolution - 48 bins is still ample
 *  for a smooth, monotonic cumulative profile. See
 *  `ISOPHOTE_PREVIEW_MAX_CELLS_PER_AXIS`'s own header, immediately below,
 *  for the main field's own (larger) share of the same finding. */
const R90_SEARCH_RES = { nx: 48, ny: 48 };
/**
 * Caps the MAIN preview field's own grid resolution (28 Aug 2026,
 * hands-on found - "should be quicker, takes about the same time").
 * Measured directly, disposable diagnostic script: a real Standard-scale
 * Milky-Way-Analogue's own R90-derived frame (halfWidthPc ~ 19,100pc)
 * derives to 588x588 = 345,744 cells at the isophote's own uncapped 65pc
 * cell size - 8.6x the OLD (pre-P1) fixed 200x200 preview grid - and
 * measured ~17.5 SECONDS to compute, fully synchronous, freezing the
 * whole modal. Even the package doc's own 400x400 worked example (a
 * 26kpc frame) measures ~8s at this project's own per-cell cost - the
 * spec's own reference case is already too slow for an interactive,
 * slider-driven preview, not merely this large-galaxy edge case.
 *
 * 220 chosen empirically (same diagnostic script) to land the worst
 * -case (MW-Analogue) preview around ~2-2.5s, comparable to what the OLD
 * fixed-200x200 renderer itself delivered - a real fix, not a token
 * reduction, while staying close enough to 200 that this is recognisably
 * "restore roughly the old interactive budget", not an arbitrary number.
 *
 * DOES NOT WEAKEN THE ABSOLUTE, FIXED-CELL-SIZE INVARIANT ITSELF - see
 * `isophoteGridRes`'s own header (`isophoteRenderer.ts`) for the full
 * reasoning: this cap is this FILE's own explicit opt-in for the live,
 * transient, never-saved preview canvas specifically. Every conformance
 * gate, and any future precise/exportable plate, calls the same
 * functions with NO cap and gets the full, uncompromised 65pc-cell
 * field, exactly as the package spec requires - unaffected by this
 * constant's existence.
 *
 * 220 -> 100, ALONGSIDE `ISOPHOTE_PREVIEW_Z_SAMPLES` (28 Aug 2026, a
 * direct hands-on follow-up report: "still 20+ seconds" even after the
 * 220 cap shipped). In-session instrumentation on the reporting machine
 * traced this to raw per-call cost, not a pipeline defect: the identical
 * `model.densityAt` call measured ~105us/call there against this
 * project's own ~5.2us/call reference figure - a genuine ~20x gap in the
 * SAME code on the SAME hardware (Rosetta translation, a monkey-patched
 * Math builtin, and DevTools overhead were all checked directly and
 * ruled out; the cause is some other property of Obsidian's own
 * execution context this project has no way to fix from inside a
 * plugin). Since the per-operation cost cannot be trusted to match this
 * project's own reference machine, the fix is to cut how many operations
 * the live preview needs, further and on two independent axes at once
 * (grid cells AND z-samples per cell) rather than assume 220 alone still
 * lands in budget everywhere. 100 x 100 x `ISOPHOTE_PREVIEW_Z_SAMPLES`
 * keeps the worst-case preview under ~3s even at that reporting
 * machine's own measured (much slower than expected) per-call cost.
 */
const ISOPHOTE_PREVIEW_MAX_CELLS_PER_AXIS = 100;
/**
 * Z-quadrature samples for the LIVE PREVIEW field only (28 Aug 2026, same
 * follow-up as the cap reduction immediately above) - a straight pass
 * -through to `projectSlab`'s own `opts.zSamples` via `computeDensity
 * DisplayField`'s new `previewZSamples` parameter. `Z_SAMPLES=5`
 * (`densityMap.ts`) exists for `expectedSystemCount` - a number the user
 * reads and relies on, where a ~1% z-integral bias would be a real,
 * silently-wrong figure. The preview's OWN field is not that number: it
 * gets smoothed (`smoothGrid1Cell`), broken (`applyOuterBreak`), radially
 * jittered (`applyRadialGranularity`) and hard-quantised into 17 bands
 * before a viewer ever sees it - a coarser z-integral is completely
 * invisible in that final plate. 3 (the minimum Simpson allows, still
 * placing a node exactly on the z=0 cusp `Z_SAMPLES`'s own header
 * describes) cuts this axis's own share of the cost by 40% on top of the
 * grid-cell reduction above, independent of it.
 */
const ISOPHOTE_PREVIEW_Z_SAMPLES = 3;
/** Generous, not physics - 3x the old fixed 20000pc window, which the
 *  patch's own root-cause analysis (S1.3) already measured as containing a
 *  Standard-scale spiral's own R90 comfortably (~10 100pc, well under half
 *  this bound). Scaled by `previewScale` so a "Grand" (scale=2) spiral's
 *  genuinely larger extent stays safely inside the search bound too. */
function r90SearchHalfWidthPc(previewScale: number): number {
  return 3 * 20000 * previewScale;
}

/**
 * The radius enclosing `R90_TARGET_FRACTION` of a model's own PROJECTED
 * (through-the-preview-slab) surface density - radially bins the SAME
 * `DensitySurface` quantity (`projectSlab`, `densityMap.ts`'s own "systems
 * pc^-2, integrated through the slab") the preview itself paints from, at
 * the SAME thickness the caller will actually display, so "R90" means
 * exactly the quantity a viewer looking at the rendered slab would
 * recognise - not an abstract full-3D-to-infinity integral this file has
 * no reason to claim. Falls back to the search bound itself if 90% is never
 * reached inside it (degrades gracefully rather than throwing - D3 still
 * holds mechanically even in that edge case, since `R90_MARGIN > 1`).
 */
function computeR90Pc(model: GalaxyModel, thicknessPc: number, previewScale: number): number {
  const halfWidth = r90SearchHalfWidthPc(previewScale);
  const region: SlabRegionPc = { centre: GALAXY_OVERVIEW_CENTRE_PC, halfWidthPc: halfWidth, halfDepthPc: halfWidth, thicknessPc };
  // zSamples: 3 (28 Aug 2026, same hands-on follow-up as ISOPHOTE_PREVIEW_
  // Z_SAMPLES's own header) - this search was ALREADY documented as
  // "coarse... not the real display grid", placing a framing radius only,
  // never claiming Z_SAMPLES=5's own expectedSystemCount-grade precision.
  const surface = projectSlab(fieldFromModel(model), region, R90_SEARCH_RES, { zSamples: 3 });
  const { nx, ny } = R90_SEARCH_RES;
  const cellPc = (2 * halfWidth) / nx;   // square cells (nx === ny)
  const nBins = nx;
  const rMax = halfWidth * Math.SQRT2;
  const binWidth = rMax / nBins;
  const massInBin = new Float64Array(nBins);
  let total = 0;
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const cx = -halfWidth + (ix + 0.5) * cellPc, cy = -halfWidth + (iy + 0.5) * cellPc;
      const r = Math.hypot(cx, cy);
      const mass = surface.values[ix + nx * iy]! * cellPc * cellPc;
      total += mass;
      massInBin[Math.min(nBins - 1, Math.floor(r / binWidth))]! += mass;
    }
  }
  if (!(total > 0)) return halfWidth;
  let cum = 0;
  for (let b = 0; b < nBins; b++) {
    cum += massInBin[b]!;
    if (cum / total >= R90_TARGET_FRACTION) return (b + 1) * binWidth;
  }
  return halfWidth;
}

/**
 * The furthest any arm in `params.arms` actually reaches, in the MODEL's
 * own (unscaled) coordinate frame - the `oldThin` cohort's termination
 * radius (`ARM_COHORT_TERMINUS_FACTOR.oldThin === 1`, `spiralArms.ts`'s own
 * header), since that cohort's own factor is 1 and every other cohort
 * terminates strictly inside it. Returns 0 for an arm table with no
 * `terminusPc` set at all (there is none today, but a future arm table
 * omitting it degrades to "no arm-based constraint" rather than throwing,
 * same discipline `terminusEnvelope`'s own `undefined` branch already
 * uses). NOT scaled by `previewScale` here - the one caller,
 * `framingHalfWidthPcFor`, applies that itself, at the same point it
 * already scales `computeR90Pc`'s own result, so the two stay comparable.
 */
function armExtentPc(params: GalaxyParameters): number {
  return params.arms.reduce((max, a) => Math.max(max, a.terminusPc ?? 0), 0);
}

/**
 * Preview half-width (28 Aug 2026, a direct user finding: "the outer
 * limits of a spiral galaxy looks like a perfectly round circle") -
 * R90-based framing alone answers "how far does this galaxy's TOTAL
 * light reach", a purely axisymmetric question that has no relationship
 * to where the ARMS themselves stop (Stage C's own resonance-based
 * termination, `ARM_TERMINUS_SHARED_PC` and its seeded-class siblings).
 * Measured directly (hands-on diagnostic, this session): for a Standard
 * -scale seeded spiral, R90 framing reaches ~19 100pc while every arm's
 * own amplitude is already EXACTLY zero (0.000x azimuthal contrast,
 * sampled directly) from ~13 860pc outward - a genuinely featureless,
 * perfectly circular ring spanning 27% of the visible radius, well
 * before `applyOuterBreak`'s own fade even begins.
 *
 * Fixed by taking whichever of R90-based and arm-extent-based framing is
 * SMALLER, for spiral/barredSpiral only (elliptical/lenticular/any arm
 * -free table keep pure R90 framing, unchanged) - never enlarges the
 * frame past what R90 alone would already have chosen (a compact galaxy
 * stays compact), but caps it at just past the last arm's own terminus
 * when that would otherwise be the tighter constraint (the overwhelmingly
 * common case in practice). The divisor is
 * `ISOPHOTE_BREAK_RADIUS_FRACTION` - the SAME constant `applyOuterBreak`
 * itself uses (imported, not re-hardcoded) - chosen so that the outer
 * break's own fade begins almost exactly where the arms already reached
 * zero, rather than adding a second, independent bald ring on top of it.
 */
function framingHalfWidthPcFor(model: GalaxyModel, params: GalaxyParameters, thicknessPc: number, previewScale: number): number {
  const r90HalfWidthPc = R90_MARGIN * computeR90Pc(model, thicknessPc, previewScale);
  if (model.morphology !== 'spiral' && model.morphology !== 'barredSpiral') return r90HalfWidthPc;
  const armExtent = armExtentPc(params) * previewScale;
  if (!(armExtent > 0)) return r90HalfWidthPc;
  return Math.min(r90HalfWidthPc, armExtent / ISOPHOTE_BREAK_RADIUS_FRACTION);
}

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
 *
 * BASE value at `scale === 1` - see `previewScaleFor`.
 */
const EDGE_ON_HALF_HEIGHT_BASE_PC = 6000;

// The isophote renderer (constants, band index, grid derivation, smoothing,
// the field terms, the solar anchor, palette data, DensityDisplayField,
// computeDensityDisplayField, paintDensityField, drawIsophoteLegend) moved to
// isophoteRenderer.ts (Prompt P1, 27 Aug 2026) - that module has no Obsidian
// import, so it is gate-testable; this file could not be, and importing
// anything from it drags in the obsidian module at Node runtime.


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
 *  computes and paints in one step. Grid resolution is no longer a
 *  parameter (Prompt P1) - derived from `halfWidthPc` inside
 *  `computeDensityDisplayField` itself. */
function renderDensityCanvas(
  canvas: HTMLCanvasElement, model: GalaxyModel,
  centrePc: { x: number; y: number; z: number }, halfWidthPc: number, thicknessPc: number,
  overlay: { readonly radiusPc: number; readonly shape: FootprintShape } | null,
  complexOverlay?: { readonly worldSeed: string; readonly complexTier: ComplexTierParams },
): void {
  const field = computeDensityDisplayField(model, centrePc, halfWidthPc, thicknessPc, complexOverlay);
  paintDensityField(canvas, field, overlay ? { centrePc, radiusPc: overlay.radiusPc, shape: overlay.shape } : null);
}

/** Reference ISM density at the solar radius/midplane (17 Aug 2026, Step 6,
 *  Amendment A8's visual payoff) - `ismDensityAt`'s own return is "peak
 *  order-unity... not tied to absolute" (see its header), so this
 *  normalises it into a RELATIVE proxy for display. Computed once - pure,
 *  never changes. */
const ISM_REFERENCE_DENSITY = ismDensityAt(R0_PC, 0, 0);

/**
 * How strongly the side-on view's star-field dot density is suppressed by
 * relative ISM density - `calibrated`, tuned (disposable diagnostic script,
 * this session) so the solar-radius midplane reads as a genuinely visible,
 * thin dark lane against the surrounding disc without ever fully erasing
 * it: at `ISM_EXTINCTION_STRENGTH=6`, midplane extinction lands at ~0.36 (a
 * real, visible thinning), recovers to ~0.73 by z=300pc (the stellar thin
 * disc's OWN scale height, matching the sourced "the molecular layer is
 * substantially thinner than the 300pc stellar thin disc" physics - the
 * lane genuinely reads as THIN, not just dim), and is fully recovered
 * (>0.999) by z=1000pc, well before the halo zone (~2000pc+, `EDGE_ON_HALF
 * _HEIGHT_BASE_PC`'s own header) would dominate anyway. `ISM_EXTINCTION
 * _FLOOR` is the same "never fully erase, extinction is real attenuation
 * not literal opacity" discipline `EDGE_ON_MODULATION_FLOOR`/`ARM
 * _MODULATION_FLOOR` already apply elsewhere in this file's own rendering.
 */
const ISM_EXTINCTION_STRENGTH = 6;
const ISM_EXTINCTION_FLOOR = 0.25;

function ismExtinctionAt(R_pc: number, theta_rad: number, z_pc: number): number {
  const ratio = ismDensityAt(R_pc, theta_rad, z_pc, DEFAULT_ISM_PARAMS) / ISM_REFERENCE_DENSITY;
  return ISM_EXTINCTION_FLOOR + (1 - ISM_EXTINCTION_FLOOR) / (1 + ISM_EXTINCTION_STRENGTH * ratio);
}

/**
 * Coarse-grid + bilinear upsample for `ismExtinctionAt` (25 Aug 2026, a
 * found perf regression, timed directly - a disposable diagnostic script
 * this session measured 16 000 direct `ismDensityAt` calls (100x80 grid x
 * near+far, `renderEdgeOnCanvas`'s own per-redraw count) at ~630ms, on top
 * of the ~29ms the surrounding density sampling itself costs - PER REDRAW,
 * and this fires on every slider `input` tick (see `renderEdgeOnCanvas`'s
 * own header). That is the "extremely long" preview render: Step 6 wired
 * `ismExtinctionAt` straight into the innermost per-cell loop and was never
 * re-timed after.
 *
 * `ismDensityAt` is smooth at this scale - sech^2 vertical profiles and a
 * broad arm-contrast modulation, no sharp small-scale features - so this
 * mirrors `densityMap.ts`'s own `edgeOnBaselineAndShape` pattern exactly:
 * evaluate once on a coarse grid, bilinear-interpolate the rest. Cuts the
 * call count from 8 000 to 384 per side (~21x), landing comfortably under
 * the same live-slider-drag budget the surrounding density grid already
 * meets. NOT shared between near/far like `edgeOnBaselineAndShape`'s own
 * baseline is - extinction genuinely depends on theta, which differs
 * completely between the two sides, so each gets its own coarse grid.
 */
const ISM_EXTINCTION_COARSE_RES = { nR: 24, nz: 16 } as const;

function ismExtinctionCoarseGrid(theta_rad: number, maxRadiusPc: number, halfHeightPc: number): Float64Array {
  const { nR, nz } = ISM_EXTINCTION_COARSE_RES;
  const grid = new Float64Array(nR * nz);
  for (let iz = 0; iz < nz; iz++) {
    const zPc = -halfHeightPc + ((iz + 0.5) / nz) * 2 * halfHeightPc;
    for (let iR = 0; iR < nR; iR++) {
      const R = ((iR + 0.5) / nR) * maxRadiusPc;
      grid[iR + nR * iz] = ismExtinctionAt(R, theta_rad, zPc);
    }
  }
  return grid;
}

/**
 * Top-down dust lanes (25 Aug 2026, direct user request + a real reference
 * photo of the Milky Way: "do dust-lane rendering in the top down view").
 * Reuses `ism.ts`'s own `ismDensityAt` (G5's second, still-legitimate call
 * site WITHIN this one module - `ism.conformance.ts`'s own gate 8 checks
 * "called from exactly one FILE", not one call site, so this does not
 * violate it) rather than inventing a second dust model (Law 1) - the same
 * discipline the side-on view's `ismExtinctionAt` above already follows.
 *
 * COLUMN, not a single z-slice: the top-down view looks straight down
 * through the disc, so what a viewer would actually see is the INTEGRAL of
 * dust density through the slab, not one plane's worth - `ismDensityAt`
 * summed over a small z range (`ISM_TOPDOWN_HALF_THICKNESS_PC` = 900pc,
 * comfortably covering the molecular layer, which `ismExtinctionAt`'s own
 * header already establishes is "fully recovered by z=1000pc" - dust
 * beyond that contributes negligibly). Same floor/strength opacity SHAPE
 * as `ismExtinctionAt` (never fully opaque - "extinction is real
 * attenuation, not literal opacity"), normalised against a self-consistent
 * reference column computed the SAME way at the same (R0, theta=0)
 * reference point `ISM_REFERENCE_DENSITY` already uses, rather than a
 * second hand-picked constant.
 *
 * COARSE POLAR grid + WRAP-AWARE bilinear sample, not a direct per-cell
 * call: `ismDensityAt` is smooth at this scale (that module's own header),
 * and the side-on view's own `ismExtinctionCoarseGrid` already established
 * this exact pattern is the fix for a found perf regression from calling
 * it directly per grid cell - reused here rather than re-learning that
 * lesson. WRAP-AWARE specifically because a plain clamped-edge bilinear
 * (`sampleBilinear` above) would seam visibly at theta=0/2*pi, unlike the
 * side-on view's own (R, z) grid which never wraps.
 */
const ISM_TOPDOWN_COARSE_RES = { nR: 48, nTheta: 96 } as const;
const ISM_TOPDOWN_Z_SAMPLES = 5;
const ISM_TOPDOWN_HALF_THICKNESS_PC = 900;

function ismTopDownColumnAt(R_pc: number, theta_rad: number, arms: readonly ArmDefinition[]): number {
  const dz = (2 * ISM_TOPDOWN_HALF_THICKNESS_PC) / (ISM_TOPDOWN_Z_SAMPLES - 1);
  let column = 0;
  for (let k = 0; k < ISM_TOPDOWN_Z_SAMPLES; k++) {
    const z = -ISM_TOPDOWN_HALF_THICKNESS_PC + k * dz;
    column += ismDensityAt(R_pc, theta_rad, z, DEFAULT_ISM_PARAMS, arms) * dz;
  }
  return column;
}

/** Self-consistent column reference - the SAME (R0, theta=0) point
 *  `ISM_REFERENCE_DENSITY` uses, integrated the SAME way `ismTopDownColumnAt`
 *  integrates every other point, rather than a second hand-picked constant
 *  that could silently drift out of step with it. Depends only on `ARMS`
 *  (the real table) - a stable, load-time constant, matching `ISM_REFERENCE
 *  _DENSITY`'s own convention. */
const ISM_TOPDOWN_REFERENCE_COLUMN = ismTopDownColumnAt(R0_PC, 0, ARMS);

/** Own strength/power for the top-down COLUMN opacity - deliberately NOT
 *  `ISM_EXTINCTION_STRENGTH` (6): that constant was calibrated against the
 *  side-on view's own VOLUME-density ratio at the midplane, a different
 *  quantity with a different natural dynamic range - reusing it here
 *  (checked directly, a disposable diagnostic script rendering real PNGs)
 *  made the ENTIRE disc read as uniformly dusty-grey, since a "typical"
 *  column ratio near 1 already darkened toward the floor. RATIO RAISED TO
 *  `ISM_TOPDOWN_EXTINCTION_POWER` before the same floor/strength shape: at
 *  ratio=1 (the reference point itself) this is unchanged by the power, so
 *  a typical column still stays near-clear (`_STRENGTH`=0.15 alone gives
 *  ~0.9 there), while a genuinely dust-concentrated region (arm-boosted
 *  ratio well above 1) gets driven hard toward the floor - dust lanes
 *  concentrate visibly where the model actually concentrates gas, rather
 *  than a flat grey wash over the whole disc. */
const ISM_TOPDOWN_EXTINCTION_STRENGTH = 0.15;
const ISM_TOPDOWN_EXTINCTION_POWER = 3;

function ismTopDownOpacityCoarseGrid(maxRadiusPc: number, arms: readonly ArmDefinition[]): Float64Array {
  const { nR, nTheta } = ISM_TOPDOWN_COARSE_RES;
  const grid = new Float64Array(nR * nTheta);
  for (let it = 0; it < nTheta; it++) {
    const theta = (it / nTheta) * 2 * Math.PI;
    for (let iR = 0; iR < nR; iR++) {
      const R = ((iR + 0.5) / nR) * maxRadiusPc;
      const ratio = ismTopDownColumnAt(R, theta, arms) / ISM_TOPDOWN_REFERENCE_COLUMN;
      const weighted = ISM_TOPDOWN_EXTINCTION_STRENGTH * Math.pow(ratio, ISM_TOPDOWN_EXTINCTION_POWER);
      grid[iR + nR * it] = ISM_EXTINCTION_FLOOR + (1 - ISM_EXTINCTION_FLOOR) / (1 + weighted);
    }
  }
  return grid;
}

/** Wrap-aware bilinear sample of a (R, theta) polar grid - `theta` wraps at
 *  2*pi (unlike `sampleBilinear`'s clamped-edge R/z axes) so the dust field
 *  does not seam at the theta=0 boundary. */
function sampleBilinearPolarWrap(
  grid: Float64Array, nR: number, nTheta: number, R_pc: number, maxRadiusPc: number, theta_rad: number,
): number {
  const fracR = Math.min(1, Math.max(0, R_pc / maxRadiusPc));
  const bR = Math.min(nR - 1, Math.max(0, fracR * nR - 0.5));
  const bR0 = Math.floor(bR), bR1 = Math.min(nR - 1, bR0 + 1), fR = bR - bR0;
  const twoPi = 2 * Math.PI;
  const wrapped = ((theta_rad % twoPi) + twoPi) % twoPi;
  const bT = (wrapped / twoPi) * nTheta - 0.5;
  const bT0raw = Math.floor(bT), fT = bT - bT0raw;
  const wrapIdx = (i: number) => ((i % nTheta) + nTheta) % nTheta;
  const bT0 = wrapIdx(bT0raw), bT1 = wrapIdx(bT0raw + 1);
  const v00 = grid[bR0 + nR * bT0]!, v10 = grid[bR1 + nR * bT0]!;
  const v01 = grid[bR0 + nR * bT1]!, v11 = grid[bR1 + nR * bT1]!;
  const v0 = v00 * (1 - fR) + v10 * fR, v1 = v01 * (1 - fR) + v11 * fR;
  return v0 * (1 - fT) + v1 * fT;
}

/**
 * The side-on view - DIAMETRAL (17 Aug 2026, Amendment R4, morphology patch
 * v3.0 Step 6, superseding the single-`theta`-half-plane redesign from the
 * previous session in full): the galactic CENTRE now sits at the canvas's
 * own horizontal centre, the RIGHT half sampled at `angleRad` (the same
 * side the top-down view's own angle slider points at - the "near" side),
 * the LEFT half at `angleRad + PI` (the "far" side, diametrically
 * opposite) - one continuous slice straight through the disc, rather than
 * a half-plane starting at the centre and reaching one direction only.
 * `diametralEdgeOnDisplayField` (`densityMap.ts`) supplies both halves from
 * ONE shared percentile-stretch pool, so a genuinely quieter far side reads
 * as genuinely dimmer/flatter, not independently re-normalised to look
 * equally busy (see that function's own header).
 *
 * ISM EXTINCTION (Amendment A8's visual payoff, "R3 and R4 land together" -
 * this is that landing): each star-field cell's own dot count is now
 * multiplied by `ismExtinctionAt` at that cell's real (R, theta, z) - the
 * genuinely thin (sub-300pc), arm-modulated molecular+atomic gas layer
 * `ism.ts` computes suppresses star density most right at the midplane and
 * recovers within a few hundred pc, which is what makes a visible dark
 * LANE bisect the thicker stellar disc rather than merely dimming
 * everything uniformly. `ism.ts` is consumed ONLY here (G5) - Law 1, this
 * file never re-derives gas/dust structure of its own.
 *
 * VERTICAL EXAGGERATION (R1): the stated ratio of vertical to horizontal
 * pixels-per-pc is rendered directly on the canvas as text - a silent
 * stretch is not permitted, and at an honest 1:1 aspect the thin disc would
 * be single-digit pixels tall (S2's own reasoning), so some exaggeration is
 * unavoidable and stating it is what keeps it honest.
 *
 * The sector's own position marker (magenta) draws on the RIGHT (near,
 * `angleRad`) half ONLY - the one place a sign error would be invisible
 * until a user noticed their own sector mirrored across the galaxy (S5.4's
 * own explicit warning); it never belongs on the far side, which shows a
 * DIFFERENT angle the sector is not actually at.
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

  // res unchanged from the prior single-side redesign (16 Aug 2026's own
  // timing note below still applies per SIDE - diametralEdgeOnDisplayField
  // does roughly 2x the single-angle work, still comfortable for a live
  // slider-drag redraw at this resolution).
  //
  // nR/nz DOWN from 150/110 (16 Aug 2026, alongside that fix) - the real
  // `model.densityAt` call this now makes per cell is markedly more
  // expensive than the plain exponential the old `sampleVolume`-routed
  // version evaluated (arm/bar factors, not just disc/halo terms), and
  // `edgeOnDisplayField`'s own baseline needs SEVERAL such calls per cell
  // on top of that. Timed directly (this session's own diagnostic script,
  // bundled, deleted after use): 150x110 cost ~54ms/redraw even after
  // trimming the baseline sub-grid itself down to a cheap 24x16x6-angle
  // average; 100x80 lands at ~29ms, comfortable for a live slider-drag
  // redraw (this fires on every `input` tick, not once per model change)
  // while still resolving the thin disc (300pc scale height) across
  // several cells against the 12 000pc total vertical range shown.
  const res = { nR: 100, nz: 80 };
  const { near, far } = diametralEdgeOnDisplayField(model, angleRad, maxRadiusPc, halfHeightPc, res);
  const cx = w / 2;
  const pcToPxR = (w / 2) / maxRadiusPc, pcToPxZ = h / (2 * halfHeightPc);

  const paintHalf = (norm: Float64Array, sideSign: 1 | -1, theta: number): void => {
    // Coarse ISM grid, once per half - see `ismExtinctionCoarseGrid`'s own
    // header for why this replaced a direct per-cell `ismExtinctionAt` call.
    const ismGrid = ismExtinctionCoarseGrid(theta, maxRadiusPc, halfHeightPc);
    const { nR: ismNR, nz: ismNz } = ISM_EXTINCTION_COARSE_RES;
    for (let iz = 0; iz < res.nz; iz++) {
      for (let iR = 0; iR < res.nR; iR++) {
        const v = norm[iR + res.nR * iz]!;
        const R = ((iR + 0.5) / res.nR) * maxRadiusPc;
        const zPc = -halfHeightPc + ((iz + 0.5) / res.nz) * 2 * halfHeightPc;
        const px = cx + sideSign * R * pcToPxR, py = h - (zPc + halfHeightPc) * pcToPxZ;
        const ext = sampleBilinear(ismGrid, ismNR, ismNz, (iR + 0.5) / res.nR, (iz + 0.5) / res.nz);
        const n = stochasticRound(v * v * 10 * ext);   // stochasticRound - see that function's own header
        for (let p = 0; p < n; p++) {
          const jx = px + (Math.random() - 0.5) * (w / res.nR);
          const jy = py + (Math.random() - 0.5) * (h / res.nz);
          ctx.fillStyle = `rgba(205,215,255,${(0.25 + 0.65 * Math.random()).toFixed(2)})`;
          ctx.fillRect(jx, jy, 1, 1);
        }
      }
    }
  };
  paintHalf(near, 1, angleRad);           // right half: theta (near)
  paintHalf(far, -1, angleRad + Math.PI); // left half: theta+PI (far)

  // Galactic-centre guide - a faint vertical line at the shared centre
  // both halves are sampled outward from, so "this is the middle" reads
  // unambiguously on a view that is now symmetric-framed even when the
  // model itself is not.
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
  ctx.stroke();

  // The sys-density slab band, positioned at wherever `distanceFromPlanePc`
  // actually falls inside the FIXED [-halfHeightPc,+halfHeightPc] frame -
  // spans the FULL width now (both halves share the same z framing).
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

  // Radial position marker (S5.4: "the sector marker draws on the theta
  // half only") - the RIGHT half exclusively, at whatever pixel the
  // sector's own distanceFromCentrePc maps to THERE; never drawn on the
  // left (far, angleRad+PI) side, which is a different angle entirely.
  const rPx = cx + Math.min(distanceFromCentrePc, maxRadiusPc) * pcToPxR;
  ctx.strokeStyle = 'rgba(255,64,190,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rPx, 0);
  ctx.lineTo(rPx, h);
  ctx.stroke();

  // Vertical exaggeration factor (R1) - stated on-canvas, never silent.
  const exaggeration = pcToPxZ / pcToPxR;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`vertical scale ×${exaggeration.toFixed(1)}`, 6, 4);
}

/** 40% of the way from black to white. */
const GHOST_GREY = '#666666';

/** 10% of the preview box on each side is empty of the sector shape
 *  (white stars sit inside; grey stars still fill the whole square). */
const SOL_PREVIEW_MARGIN_FRACTION = 0.10;

/**
 * Characteristic size shown in the sol-neighbourhood size box.
 * Internally `sizeInPc` remains circumradius. Display/input convert
 * so the box names the shape's own across (circle diameter = square
 * edge = hexagon long diagonal). Shape switches keep that across, and
 * the preview is scaled from it, so the map does not zoom.
 */
const SIZE_DIMENSION_LABEL: Readonly<Record<FootprintShape, string>> = {
  circle: 'Diameter',
  square: 'Edge',
  hexagon: 'Long diagonal',
};

/** Default across (pc) for a new sol-neighbourhood sector. */
const SOL_DEFAULT_CHARACTERISTIC_PC = 25;

/** SI: a space between the number and the unit symbol. */
function formatCharacteristicPc(n: number): string {
  return `${n.toFixed(2)} pc`;
}

function parseCharacteristicPc(raw: string): number {
  return Number(raw.replace(/\s*pc\s*$/i, '').trim());
}

function characteristicFromCircumradius(shape: FootprintShape, circumradiusPc: number): number {
  if (shape === 'square') return circumradiusPc * Math.SQRT2;
  return circumradiusPc * 2;
}

function circumradiusFromCharacteristic(shape: FootprintShape, characteristicPc: number): number {
  if (shape === 'square') return characteristicPc / Math.SQRT2;
  return characteristicPc / 2;
}

function plotPositions(
  ctx: CanvasRenderingContext2D, w: number, h: number, pcToPx: number,
  centrePc: { x: number; y: number; z: number },
  positions: readonly { x: number; y: number; z: number }[],
): void {
  for (const p of positions) {
    const px = w / 2 + (p.x - centrePc.x) * pcToPx, py = h / 2 - (p.y - centrePc.y) * pcToPx;
    ctx.fillRect(px - 0.75, py - 0.75, 1.5, 1.5);
  }
}

function renderPositionOnlyCanvas(
  canvas: HTMLCanvasElement, centrePc: { x: number; y: number; z: number }, halfWidthPc: number,
  positions: readonly { x: number; y: number; z: number }[],
  ghostPositions?: readonly { x: number; y: number; z: number }[],
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, w, h);
  // Scale off the SHORTER axis so the whole sector stays visible even if
  // the canvas is not perfectly square (Screen 3's is 420x420; the
  // sol-neighbourhood modal's tracks a CSS aspect-ratio and can be a pixel
  // or two off) - the long axis just shows a sliver more empty sky.
  const pcToPx = Math.min(w, h) / (2 * halfWidthPc);
  if (ghostPositions && ghostPositions.length > 0) {
    ctx.fillStyle = GHOST_GREY;
    plotPositions(ctx, w, h, pcToPx, centrePc, ghostPositions);
  }
  ctx.fillStyle = '#ffffff';
  plotPositions(ctx, w, h, pcToPx, centrePc, positions);
}

/** Sector-tape navigation glyphs (Tabler "reicon" set; xmlns omitted: gate
 *  S1). Single chevrons step one sector; the duotone double-arrows jump to
 *  the first roll / straight to a fresh one. The history glyph opens the
 *  full tape; the globe-search glyph runs the centre-system search.
 *
 *  The double-arrow art only fills ~15 of its 24-unit box vertically, vs
 *  ~18 for the filled chevrons - so the arrows carry a tightened
 *  `viewBox="2 2 20 20"` that crops the dead margin and makes all four
 *  glyphs render at one height (user follow-up 31 Aug 2026). */
const NAV_CHEVRON_LEFT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M15.333 21.333a1 1 0 0 1-.706-.293l-8.334-8.333a1 1 0 0 1 0-1.415l8.334-8.332a1 1 0 1 1 1.414 1.415L8.415 12l7.626 7.627a1 1 0 0 1-.706 1.708Z"/></svg>';
const NAV_CHEVRON_RIGHT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M17.707 11.293L9.373 2.96A1 1 0 1 0 7.96 4.375L15.585 12L7.96 19.628a1 1 0 0 0 1.413 1.415l8.333-8.334a1 1 0 0 0 0-1.414Z"/></svg>';
const NAV_ARROWS_LEFT_SVG = '<svg viewBox="2 2 20 20" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><g fill="currentColor"><path d="M17.75 19a.75.75 0 0 1-1.32.488l-6-7a.75.75 0 0 1 0-.976l6-7A.75.75 0 0 1 17.75 5z" opacity=".5"/><path fill-rule="evenodd" d="M13.488 19.57a.75.75 0 0 0 .081-1.058L7.988 12l5.581-6.512a.75.75 0 1 0-1.138-.976l-6 7a.75.75 0 0 0 0 .976l6 7a.75.75 0 0 0 1.057.082" clip-rule="evenodd"/></g></svg>';
const NAV_ARROWS_RIGHT_SVG = '<svg viewBox="2 2 20 20" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><g fill="currentColor"><path d="M6.25 19a.75.75 0 0 0 1.32.488l6-7a.75.75 0 0 0 0-.976l-6-7A.75.75 0 0 0 6.25 5z" opacity=".5"/><path fill-rule="evenodd" d="M10.512 19.57a.75.75 0 0 1-.081-1.058L16.012 12l-5.581-6.512a.75.75 0 1 1 1.139-.976l6 7a.75.75 0 0 1 0 .976l-6 7a.75.75 0 0 1-1.058.082" clip-rule="evenodd"/></g></svg>';
const GLOBAL_SEARCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10"/><path d="M8 3h1a28.42 28.42 0 0 0 0 18H8m7-18c.97 2.92 1.46 5.96 1.46 9"/><path d="M3 16v-1c2.92.97 5.96 1.46 9 1.46M3 9a28.42 28.42 0 0 1 18 0m-2.8 12.4a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4m3.8.6l-1-1"/></g></svg>';
const HISTORY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z" fill="none"/><g fill="currentColor"><path fill-rule="evenodd" d="M5.079 5.069c3.795-3.79 9.965-3.75 13.783.069c3.82 3.82 3.86 9.993.064 13.788s-9.968 3.756-13.788-.064a9.81 9.81 0 0 1-2.798-8.28a.75.75 0 1 1 1.487.203a8.31 8.31 0 0 0 2.371 7.017c3.245 3.244 8.468 3.263 11.668.064c3.199-3.2 3.18-8.423-.064-11.668c-3.243-3.242-8.463-3.263-11.663-.068l.748.003a.75.75 0 1 1-.007 1.5l-2.546-.012a.75.75 0 0 1-.746-.747L3.575 4.33a.75.75 0 1 1 1.5-.008z" clip-rule="evenodd"/><path d="M12 7.25a.75.75 0 0 1 .75.75v3.69l2.28 2.28a.75.75 0 1 1-1.06 1.06l-2.427-2.426a1 1 0 0 1-.293-.708V8a.75.75 0 0 1 .75-.75" opacity=".5"/></g></svg>';
/** Arrow pointing into a box - load this preview from the history list. */
const ARROW_INTO_BOX_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M3 12h12M11 8l4 4l-4 4"/></svg>';

/* --------------------------- shared sector commit ----------------------------- */

/**
 * Best `HabTier` across a system's own planets - `null` when there is
 * nothing to grade (no planets, or no planet carries a habitability
 * verdict) - same convention `types.ts`'s own `SystemSummary.bestHabTier`
 * already establishes.
 */
function bestHabTierOf(core: SystemCore): HabTier | null {
  let best: HabTier | null = null;
  for (const h of core.humanHabitability) {
    if (h && (best === null || h.tier > best)) best = h.tier;
  }
  return best;
}

/**
 * Runs the real generation pipeline for a committed sector and writes ONE
 * sector-list document to the vault. Extracted from `GalaxyScreen3Modal`'s
 * own commit (30 Aug 2026) so the sol-neighbourhood sector flow commits
 * through the byte-identical path - one commit implementation, never two
 * that could quietly disagree (Law 1). Owns no modal lifecycle: the caller
 * closes its own modal once this resolves.
 *
 * `sectorFootprint.assembleSector` (16 Aug 2026) composes the stellar,
 * remnant AND co-natal-chemistry layers together - real computation the
 * position-only preview deliberately skips. `generateSystemCore` then runs
 * for every stellar system: that is where the list's habitability / planet
 * -type / belt columns come from. Only the sector-list note is written (17
 * Aug 2026) - the per-system canonical/authored writers remain real, gated
 * infrastructure for a future lazy detail note, just not called here.
 *
 * Yields the event loop every `YIELD_EVERY` systems so a large sector's
 * (genuinely CPU-bound) generation still lets the caller's delayed busy
 * spinner paint, rather than freezing the UI silently for its whole run.
 */
async function writeSectorDocument(app: App, screen1: Screen1Draft, screen2: Screen2Draft, model: GalaxyModel): Promise<void> {
  const centrePc = centrePcFromPolar(screen2);
  const thickness = thicknessPcFor(screen2.sysDensity);
  const assembled = assembleSector(screen1.worldSeed, model, centrePc, screen2.sizeInPc, thickness, screen2.footprintShape);
  const total = assembled.stellar.length + assembled.remnants.length;
  new Notice(`Generating ${total} systems (${assembled.remnants.length} remnants) - this may take a moment...`);

  const rows: SectorListRow[] = [];
  const YIELD_EVERY = 25;
  const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

  for (let mi = 0; mi < assembled.stellar.length; mi++) {
    if (mi > 0 && mi % YIELD_EVERY === 0) await yieldToEventLoop();
    const m = assembled.stellar[mi]!;
    const s = m.placed;
    const populationMeta = model.populations.find((p) => p.key === s.population);
    if (!populationMeta) continue;
    const inputs: GenerateSystemInputs = {
      sysid: s.sysid, genVersion: CURRENT_GEN_VERSION, worldSeed: screen1.worldSeed, positionPc: s.positionPc,
      population: s.population, populationMeta, formationRank: s.formationRank,
      terraformScale: screen1.terraformScale, terraformIntensity: screen1.terraformIntensity,
      conatal: m.conatal,
    };
    const core = generateSystemCore(inputs);
    rows.push({
      sysid: s.sysid,
      // TRUE distance from the SECTOR's own origin (centrePc) - the owner's
      // own explicit spec for this list's sort order (17 Aug 2026).
      distancePc: trueDistance3dPc(s.positionPc, centrePc),
      multiplicity: core.stars.length,
      primaryType: core.stars[0]!.class,
      bestHabTier: bestHabTierOf(core),
      planetTypes: formatPlanetTypesCell(core.planets),
      belts: formatBeltsCell(core.belts),
    });
  }

  // Remnants get a row too - position/kind only, same honest scoping the
  // per-system note used to carry for them.
  for (const r of assembled.remnants) {
    rows.push({
      sysid: r.sysid,
      distancePc: trueDistance3dPc(r.positionPc, centrePc),
      multiplicity: 1,
      primaryType: r.kind,
      bestHabTier: null,
      planetTypes: formatPlanetTypesCell([]),
      belts: formatBeltsCell([]),
    });
  }

  const meta: SectorListMeta = {
    worldSeed: screen1.worldSeed, centrePc, radiusPc: screen2.sizeInPc, thicknessPc: thickness,
    footprintShape: screen2.footprintShape, stellarCount: assembled.stellar.length,
    remnantCount: assembled.remnants.length, generatedIso: new Date().toISOString(),
  };
  const content = buildSectorListContent(meta, rows);
  const filename = `Sector - ${sanitiseFilenamePart(screen1.worldSeed)} - ${filenameTimestamp()}`;
  await writeSectorList(app.vault, filename, content);

  new Notice(`galaxyForge: wrote a ${rows.length}-system sector list to ${SECTOR_FOLDER}/${filename}.md`);
}

/* --------------------------------- start screen -------------------------------- */

/**
 * Icons for the two start-screen routes (30 Aug 2026, a direct user ask) -
 * "streamline-plump--galaxy-2-solid" and "at-icons--stars", `currentColor`
 * -filled so they inherit the button's own text colour. `xmlns` stripped
 * (Gate S1's URL-literal scanner cannot tell an XML namespace from a fetch
 * target - same treatment `SHAPE_ICONS`/`ANGLE_ICON` already get).
 */
/** Just the `<path>` of the galaxy glyph, in a 0 0 48 48 coordinate space -
 *  shared by `GALAXY_ICON` (below, for the modal's own route button) and by
 *  `main.ts`'s `addIcon` call, which scales it into Obsidian's fixed
 *  0 0 100 100 icon viewport for the ribbon. */
export const GALAXY_ICON_BODY = '<path fill="currentColor" fill-rule="evenodd" d="M31.85 1.466C32.22.97 32.894.675 33.61.99c9.6 4.23 14.948 14.94 12.149 25.387c-2.925 10.917-14.124 17.407-25.042 14.533c-7.525-2.641-10.687-9.47-9.883-15.538c.41-3.099 1.852-5.958 4.245-7.964c2.378-1.993 5.798-3.23 10.338-2.911a1.5 1.5 0 1 0 .21-2.993c-5.222-.366-9.434 1.055-12.476 3.605c-3.027 2.538-4.793 6.109-5.29 9.869c-.759 5.72 1.408 11.975 6.614 15.958a27 27 0 0 0 1.783 3.763c.364.63.255 1.35-.107 1.835c-.37.498-1.044.792-1.758.478c-9.6-4.23-14.949-14.94-12.15-25.387c2.926-10.92 14.13-17.41 25.05-14.53c7.52 2.642 10.679 9.467 9.875 15.534c-.41 3.099-1.852 5.958-4.245 7.964c-2.378 1.993-5.798 3.23-10.337 2.911a1.5 1.5 0 0 0-.21 2.993c5.22.366 9.433-1.055 12.475-3.605c3.027-2.538 4.793-6.109 5.29-9.869c.759-5.72-1.408-11.975-6.614-15.958a27 27 0 0 0-1.782-3.762a1.67 1.67 0 0 1 .106-1.836M24 29a5 5 0 1 0 0-10a5 5 0 0 0 0 10" clip-rule="evenodd"/>';
export const GALAXY_ICON = `<svg width="50" height="50" viewBox="0 0 48 48">${GALAXY_ICON_BODY}</svg>`;
/** `GALAXY_ICON_BODY` scaled 48 -> 100 for Obsidian's `addIcon` viewport. */
export const GALAXY_ICON_100 = `<g transform="scale(2.0833)">${GALAXY_ICON_BODY}</g>`;
const STARS_ICON = '<svg width="50" height="50" viewBox="0 0 16 16"><path fill="currentColor" d="M6.5 8.75L9 10l-2.5 1.25L5 15l-1.5-3.75L1 10l2.5-1.25L5 5zM10 12a1 1 0 1 1 0 2a1 1 0 0 1 0-2m3-3a1 1 0 1 1 0 2a1 1 0 0 1 0-2m.269-5.692L15 4l-1.731.691L12.5 7l-.77-2.309L10 4l1.73-.692L12.5 1zM3 2a1 1 0 1 1 0 2a1 1 0 0 1 0-2"/></svg>';

/** How many past sol-neighbourhood rolls `GalaxySolNeighbourhoodModal`
 *  keeps in `GalaxyForgeSettings.solNeighbourhoodHistory` - newest first,
 *  older entries dropped off the end. Generous enough to be a real
 *  "sectors I've looked at" list, bounded so the settings file cannot
 *  grow without limit. */
const SOL_NEIGHBOURHOOD_HISTORY_MAX = 30;

/**
 * The mode chooser shown before anything else (30 Aug 2026, a direct user
 * ask) - two routes into generation, one per row:
 *
 *  - "create an entire galaxy" (galaxy icon, top) - the full three-screen
 *    flow, unchanged: `GalaxyScreen1Modal` (morphology/size/seed) ->
 *    Screen 2 (sector centring) -> Screen 3 (position-only preview + commit).
 *
 *  - "create a sector using sol-neighbourhood as a template" (stars icon) -
 *    hands off to `GalaxySolNeighbourhoodModal`, which offers NO
 *    positioning dials at all (a direct user instruction): the sector
 *    centre is rolled inside the sol-like neighbourhood band, not chosen.
 *
 * No header, no primary/secondary distinction (31 Aug 2026, a direct user
 * follow-up): both rows are the SAME plain, chrome-free target - a 50px
 * left-aligned icon whose `currentColor` lifts from muted to normal on
 * hover, the whole row clickable, styled by `.gf-start-route` (styles.css,
 * since :hover has no inline equivalent - same reason `.gf-shape-icon`
 * exists). The rows are DIVs with `role="button"`, NOT `<button>`s - a real
 * button in a modal inherits Obsidian's own centring, background and
 * min-height (which beat a single-class rule on specificity), the exact
 * chrome the "hover-icon, not a button" look has to avoid - the identical
 * reason `renderShapeAndDensityRow` already uses divs for its icons.
 * Writes no state and persists nothing itself - it only picks which modal
 * opens next.
 */
export class GalaxyStartModal extends Modal {
  constructor(
    app: App,
    private readonly settings: GalaxyForgeSettings,
    private readonly onSettingsChange: (s: GalaxyForgeSettings) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    const list = contentEl.createDiv();
    list.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin:4px 0;';

    const addRoute = (icon: string, label: string, onPick: () => void): void => {
      // No `title`/`aria-label` - the visible label span IS the accessible
      // name; a tooltip here would only echo the text already on screen.
      const row = list.createDiv({ cls: 'gf-start-route', attr: { role: 'button', tabindex: '0' } });
      row.createSpan({ cls: 'gf-start-route-icon' }).innerHTML = icon;
      row.createSpan({ cls: 'gf-start-route-label', text: label });
      row.onclick = onPick;
      row.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(); } };
    };

    addRoute(GALAXY_ICON, 'create an entire galaxy', () => {
      this.close();
      new GalaxyScreen1Modal(this.app, this.settings, this.onSettingsChange).open();
    });
    addRoute(STARS_ICON, 'create a sector using sol-neighbourhood as a template', () => {
      this.close();
      new GalaxySolNeighbourhoodModal(this.app, this.settings, this.onSettingsChange).open();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    super.onClose();
  }
}

/* ------------------------ sol-neighbourhood sector flow ----------------------- */

/** The rolled sector centre in galactic polar coordinates, as three fields
 *  `[θ ...°, R ... pc, z ±... pc]` - shared by `GalaxySolNeighbourhoodModal`
 *  and its history modal so both label a sector the same way. The history
 *  modal lays the three out as columns; everywhere else joins them with a
 *  dot. */
function solSectorCoordParts(angleRad: number, distanceFromCentrePc: number, distanceFromPlanePc: number): [string, string, string] {
  const z = distanceFromPlanePc.toFixed(0);
  const signedZ = distanceFromPlanePc >= 0 ? `+${z}` : z;
  return [
    `θ ${radToDeg(angleRad).toFixed(1)}°`,
    `R ${distanceFromCentrePc.toFixed(0)} pc`,
    `z ${signedZ} pc`,
  ];
}

function solSectorCoordLabel(angleRad: number, distanceFromCentrePc: number, distanceFromPlanePc: number): string {
  return solSectorCoordParts(angleRad, distanceFromCentrePc, distanceFromPlanePc).join('  ·  ');
}

function solSectorKey(worldSeed: string, angleRad: number, distanceFromCentrePc: number, distanceFromPlanePc: number): string {
  return `${worldSeed}|${angleRad}|${distanceFromCentrePc}|${distanceFromPlanePc}`;
}

/**
 * `GalaxySolNeighbourhoodModal` (30 Aug 2026) - the "create a sector using
 * sol-neighbourhood as a template" branch of `GalaxyStartModal`.
 *
 * The galaxy is a fresh, randomly-seeded Milky Way Analogue
 * (`milkyWayAnalogue` - real Reid et al. 2019 arm table, Standard scale),
 * terraforming forced fully OFF (a direct user instruction - "the default
 * for terraforming for this galaxy is none at all").
 *
 * The sector CENTRE is never dialled in - it is ROLLED, uniformly, from the
 * sol-like band Screen 2 already defines as a reference mark
 * (`solNeighbourhoodBand` - R within +/-10% of R0, z within one thin-disc
 * scale height either side of the plane, so a sector can land above OR
 * below it), theta anywhere on the circle. Left/right chevrons walk a
 * persisted history tape one step at a time (oldest → newest); right at
 * the newest end rolls a new centre. Flanking them, the duotone
 * double-arrows jump to the first roll / straight to a fresh one. A
 * history glyph next to Generate opens
 * `SolNeighbourhoodHistoryModal` to jump to any past roll. Each entry
 * carries its own worldSeed so re-selecting one is the SAME sector, not
 * just the same point in a different galaxy.
 *
 * Everything ELSE about the sector IS the user's to set (31 Aug 2026, a
 * direct user follow-up: "need sizing, shape, and slab options" +
 * "need the centre on system options") - the same footprint-shape,
 * slab-thickness, size/count and system-search controls Screen 2 carries,
 * held in a full `Screen2Draft` whose angle/R/z fields the roll owns and
 * the rest the controls own. "generate sector" (on one row with "<- back",
 * a direct user follow-up) commits through the shared `writeSectorDocument`
 * - the byte-identical path Screen 3 uses, no second copy.
 *
 * SIZE/COUNT REACTIVITY IS NOT USED HERE (P17 preview-responsiveness, items
 * B1/B2). `reconcileSizeFields` keeps `sizeInPc` <-> `totalSystems` in step
 * for Screen 2's Total-systems box by running a 32x32xZ_SAMPLES `projectSlab`
 * on every edit. This modal has no Total-systems box, never reads
 * `draft.totalSystems`, and does not persist it (`SolNeighbourhoodSector`
 * stores only seed + angle/R/z + rolledIso). So every `reconcileSizeFields`
 * call on a Sol path was pure discarded work - up to several seconds per
 * shape/history click. All removed; `solNeighbourhoodDraft` stamps
 * `totalSystems: NaN` so a future reader who wires the box in gets a loud
 * signal rather than a plausible-looking 0.
 */
function solNeighbourhoodDraft(d: Screen2Draft): Screen2Draft {
  return { ...d, totalSystems: NaN };
}

export class GalaxySolNeighbourhoodModal extends Modal {
  private settings: GalaxyForgeSettings;
  private seed!: string;
  /** Full sector draft. `angleRad`/`distanceFromCentrePc`/
   *  `distanceFromPlanePc` are owned by the roll (and by history-load /
   *  system-search); every other field is owned by the controls below. */
  private draft!: Screen2Draft;
  private model!: GalaxyModel;
  private params!: GalaxyParameters;
  private previewScale!: number;

  private generating = false;
  private busyOverlay: HTMLElement | null = null;
  private countEl!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  /** Wraps the canvas so `paintSector`'s busy overlay scopes to just the
   *  preview, leaving every control live - same pattern as the numbered
   *  screens. */
  private mapPane!: HTMLElement;
  /** Debounce for the size text field - same rationale as Screen 2. */
  private sizeFieldRefreshTimer: number | null = null;
  /**
   * Index into chronological history (oldest = 0, newest = length-1).
   * Right at the newest end rolls a new sector rather than wrapping.
   */
  private historyCursor = 0;

  constructor(app: App, settings: GalaxyForgeSettings, private readonly onSettingsChange: (s: GalaxyForgeSettings) => void) {
    super(app);
    this.settings = settings;
  }

  onOpen(): void {
    // Default modal width, kept (31 Aug 2026, a direct user correction - the
    // preview is meant to be a SQUARE the width of the modal, not a wide
    // banner). For the preview to sit flush to the TOP edge, three separate
    // bits of default modal chrome have to go: the close cross, the (empty
    // but still space-taking) `.modal-title`/`.modal-header`, and the
    // `.modal`/`.modal-content` padding - the last via `.gf-sol-modal` in
    // styles.css since Obsidian may set it `!important`. "<- back", Escape
    // and click-outside all still dismiss the modal.
    this.modalEl.addClass('gf-sol-modal');
    this.modalEl.querySelector('.modal-close-button')?.remove();
    this.modalEl.querySelector('.modal-title')?.remove();
    this.modalEl.querySelector('.modal-header')?.remove();
    this.modalEl.style.overflow = 'hidden';   // rounded corners clip the square's corners - accepted

    const recent = this.settings.solNeighbourhoodHistory[0];
    if (recent) {
      // Re-open on the last sector the user was looking at - seed included,
      // so it is genuinely the same sector, not just the same point.
      this.seed = recent.worldSeed;
      this.rebuildModel();
      this.draft = solNeighbourhoodDraft(defaultScreen2Draft({
        angleRad: recent.angleRad, distanceFromCentrePc: recent.distanceFromCentrePc, distanceFromPlanePc: recent.distanceFromPlanePc,
        sizeInPc: circumradiusFromCharacteristic('circle', SOL_DEFAULT_CHARACTERISTIC_PC),
      }));
      this.historyCursor = Math.max(0, this.chronoHistory().length - 1);
    } else {
      this.seed = Math.random().toString(36).slice(2);
      this.rebuildModel();
      const p = this.roll();
      this.draft = solNeighbourhoodDraft(defaultScreen2Draft({
        angleRad: p.angleRad, distanceFromCentrePc: p.distanceFromCentrePc, distanceFromPlanePc: p.distanceFromPlanePc,
        sizeInPc: circumradiusFromCharacteristic('circle', SOL_DEFAULT_CHARACTERISTIC_PC),
      }));
      this.recordCurrent();
      this.historyCursor = 0;
    }
    this.render(true);
  }

  onClose(): void {
    if (this.sizeFieldRefreshTimer !== null) { window.clearTimeout(this.sizeFieldRefreshTimer); this.sizeFieldRefreshTimer = null; }
    this.contentEl.empty();
    super.onClose();
  }

  /** `milkyWayAnalogue` + this modal's current seed, terraforming OFF. */
  private screen1Draft(): Screen1Draft {
    return defaultScreen1Draft({ morphology: 'milkyWayAnalogue', worldSeed: this.seed, terraformScale: 0, terraformIntensity: 0 });
  }

  private rebuildModel(): void {
    const built = modelFromDraft(this.screen1Draft());
    this.model = built.model;
    this.params = built.params;
    this.previewScale = previewScaleFor(this.model, this.params);
  }

  private roll(): { angleRad: number; distanceFromCentrePc: number; distanceFromPlanePc: number } {
    const band = solNeighbourhoodBand(this.params.R0Pc, this.params.juric.hThin, this.previewScale);
    return rollSolNeighbourhoodCentre(band, Math.random);
  }

  /**
   * Merge a control change into the draft and repaint. Unlike Screen 2's own
   * `setDraft`, this does NOT call `reconcileSizeFields` (P17 preview-
   * responsiveness package, item B): that reconcile runs a 32x32xZ_SAMPLES
   * `projectSlab` - thousands of `densityAt` calls - purely to keep
   * `draft.totalSystems` in step, and this modal has no Total-systems control.
   * Its own comment already records why: "the Total systems box that used to
   * consume it is gone; the preview count under the map is always the
   * generator." The count under the map is `field`'s own length, set in
   * `paintSector`; `totalSystems` is written and never read here, and the
   * commit path (`writeSectorDocument` -> `assembleSector`) takes
   * `sizeInPc` / `footprintShape` only. So the reconcile's entire result is
   * discarded - dropping it removes ~4.7 s of work per shape/density click.
   */
  private setDraft(partial: Partial<Screen2Draft>): void {
    this.draft = { ...this.draft, ...partial };
    this.render();
  }

  /** Oldest-first copy of the persisted tape. */
  private chronoHistory(): SolNeighbourhoodSector[] {
    return this.settings.solNeighbourhoodHistory.slice().reverse();
  }

  private applyEntry(entry: SolNeighbourhoodSector): void {
    this.seed = entry.worldSeed;
    this.rebuildModel();
    this.draft = {
      ...this.draft, angleRad: entry.angleRad, distanceFromCentrePc: entry.distanceFromCentrePc, distanceFromPlanePc: entry.distanceFromPlanePc,
    };
    this.render(true);
  }

  /** Hover-icon (not a button) for the sector tape - a div carrying the
   *  shared `.gf-sol-nav-icon` colour rules, keyboard-activated like the
   *  shape selector's own icons. `disabled` greys it out and drops the
   *  handler. */
  private addNavIcon(host: HTMLElement, svg: string, label: string, disabled: boolean, onActivate: () => void, extraCls?: string): void {
    const cls = ['gf-sol-nav-icon'];
    if (disabled) cls.push('is-disabled');
    if (extraCls) cls.push(extraCls);
    const icon = host.createDiv({
      cls: cls.join(' '),
      attr: { title: label, 'aria-label': label, role: 'button', tabindex: disabled ? '-1' : '0' },
    });
    icon.innerHTML = svg;
    if (disabled) return;
    icon.onclick = onActivate;
    icon.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onActivate(); } };
  }

  private viewOlder(): void {
    if (this.historyCursor <= 0) return;
    const chrono = this.chronoHistory();
    this.historyCursor -= 1;
    const entry = chrono[this.historyCursor];
    if (entry) this.applyEntry(entry);
  }

  /** Jump straight to the oldest roll on the tape. */
  private viewFirst(): void {
    if (this.historyCursor <= 0) return;
    const entry = this.chronoHistory()[0];
    this.historyCursor = 0;
    if (entry) this.applyEntry(entry);
  }

  /** Walk toward newer history; at the newest end, roll a new sector. */
  private viewNewerOrNew(): void {
    const chrono = this.chronoHistory();
    if (this.historyCursor < chrono.length - 1) {
      this.historyCursor += 1;
      const entry = chrono[this.historyCursor];
      if (entry) this.applyEntry(entry);
      return;
    }
    this.rollNew();
  }

  /** Roll a brand-new sector, record it, and park the cursor at the newest
   *  end - the double-right-arrow's action regardless of tape position. */
  private rollNew(): void {
    const p = this.roll();
    this.draft = {
      ...this.draft, angleRad: p.angleRad, distanceFromCentrePc: p.distanceFromCentrePc, distanceFromPlanePc: p.distanceFromPlanePc,
    };
    this.recordCurrent();
    this.historyCursor = this.chronoHistory().length - 1;
    this.render(true);
  }

  private recordCurrent(): void {
    const entry: SolNeighbourhoodSector = {
      worldSeed: this.seed,
      angleRad: this.draft.angleRad,
      distanceFromCentrePc: this.draft.distanceFromCentrePc,
      distanceFromPlanePc: this.draft.distanceFromPlanePc,
      rolledIso: new Date().toISOString(),
    };
    const history = [entry, ...this.settings.solNeighbourhoodHistory].slice(0, SOL_NEIGHBOURHOOD_HISTORY_MAX);
    this.settings = { ...this.settings, solNeighbourhoodHistory: history };
    this.onSettingsChange(this.settings);
  }

  private loadEntry(entry: SolNeighbourhoodSector): void {
    const key = solSectorKey(entry.worldSeed, entry.angleRad, entry.distanceFromCentrePc, entry.distanceFromPlanePc);
    const chrono = this.chronoHistory();
    const i = chrono.findIndex((e) => solSectorKey(e.worldSeed, e.angleRad, e.distanceFromCentrePc, e.distanceFromPlanePc) === key);
    this.historyCursor = i >= 0 ? i : Math.max(0, chrono.length - 1);
    this.applyEntry(entry);
  }

  private runSearch(): void {
    const origin = centrePcFromPolar(this.draft);
    const criteria = assembleSearchCriteria(this.draft);
    const result = searchNearestSystem(
      this.seed, this.model, CURRENT_GEN_VERSION, 0, 0,
      origin, criteria, Math.max(this.draft.sizeInPc * 20, 2000),
    );
    if (!result.found) {
      new Notice('No matching system found within the search radius - try widening your criteria.');
      return;
    }
    const R = Math.hypot(result.positionPc.x, result.positionPc.y);
    const theta = Math.atan2(result.positionPc.y, result.positionPc.x);
    // A search re-establishes the sector centre; the count under the map
    // refreshes from the generator on the next paint (render(true)) - same as
    // a fresh roll. No size/count reconcile (B1 - this modal has no count box).
    this.draft = {
      ...this.draft, distanceFromCentrePc: R, angleRad: theta < 0 ? theta + 2 * Math.PI : theta, distanceFromPlanePc: result.positionPc.z,
    };
    this.render(true);
    new Notice(`Found ${result.sysid}, ${result.distancePc.toFixed(1)} pc away - centred.`);
  }

  /** Rebuild the controls. `syncCount` is kept so open / re-roll / search
   *  still call `render(true)` - the Total systems box that used to consume
   *  it is gone; the preview count under the map is always the generator. */
  private render(syncCount = false): void {
    const { contentEl } = this;
    contentEl.empty();
    // Full-bleed SQUARE preview (31 Aug 2026, a direct user follow-up: fill
    // the entire top of the modal, at the modal's OWN width, kept square).
    // `.modal-content`'s padding is dropped here and re-added on the `body`
    // wrapper below, so only the preview goes edge to edge; `aspect-ratio`
    // makes its height track that width. The modal's rounded corners clip
    // the square/hex sector corners; the user accepted that.
    contentEl.style.padding = '0';
    contentEl.style.margin = '0';

    const mapPane = contentEl.createDiv();
    mapPane.style.cssText = 'position:relative;width:100%;aspect-ratio:1 / 1;background:#05050a;';
    this.mapPane = mapPane;
    // Backing-store size is set in `paintSector` once the pane has been laid
    // out (it fills the pane); CSS keeps it stretched to that box.
    this.canvas = mapPane.createEl('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;';

    const body = contentEl.createDiv();
    body.style.cssText = 'padding:12px 16px 16px;';

    // Sector-tape nav: the four glyphs cluster either side of the centre
    // text (a small gap, not flush - user follow-up 31 Aug 2026). They are
    // hover-icons, not buttons - grey (--text-muted, matching an unselected
    // shape/density icon) at rest, --interactive-accent on hover, exactly
    // like the shape selector's own selected state.
    const metaRow = body.createDiv({ cls: 'gf-sol-meta-row' });
    const atFirst = this.historyCursor <= 0;

    const navLeft = metaRow.createDiv({ cls: 'gf-sol-meta-nav' });
    this.addNavIcon(navLeft, NAV_ARROWS_LEFT_SVG, 'Back to the first previewed sector', atFirst, () => this.viewFirst());
    this.addNavIcon(navLeft, NAV_CHEVRON_LEFT_SVG, 'Previous previewed sector', atFirst, () => this.viewOlder());

    const metaText = metaRow.createDiv({ cls: 'gf-sol-meta-text' });
    this.countEl = metaText.createEl('p', { text: 'Placing systems…' });
    metaText.createEl('p', {
      cls: 'gf-sol-coord',
      text: solSectorCoordLabel(this.draft.angleRad, this.draft.distanceFromCentrePc, this.draft.distanceFromPlanePc),
    });

    const navRight = metaRow.createDiv({ cls: 'gf-sol-meta-nav' });
    this.addNavIcon(navRight, NAV_CHEVRON_RIGHT_SVG, 'Next previewed sector, or a new one', false, () => this.viewNewerOrNew());
    this.addNavIcon(navRight, NAV_ARROWS_RIGHT_SVG, 'Find a new sector', false, () => this.rollNew());

    const chromeRow = body.createDiv({ cls: 'gf-sol-chrome-row' });
    const cluster = chromeRow.createDiv({ cls: 'gf-sol-shape-cluster' });
    for (const shape of ['circle', 'square', 'hexagon'] as FootprintShape[]) {
      const isSelected = shape === this.draft.footprintShape;
      const icon = cluster.createDiv({
        cls: isSelected ? 'gf-shape-icon is-selected' : 'gf-shape-icon',
        attr: { title: SHAPE_LABELS[shape], 'aria-label': SHAPE_LABELS[shape], role: 'button', tabindex: '0' },
      });
      icon.style.cssText = 'flex:0 0 40px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
      icon.innerHTML = SHAPE_ICONS[shape];
      const pickShape = (): void => {
        if (shape === this.draft.footprintShape) return;
        const shown = characteristicFromCircumradius(this.draft.footprintShape, this.draft.sizeInPc);
        this.setDraft({
          footprintShape: shape,
          sizeEditMode: 'sizeInPc',
          sizeInPc: circumradiusFromCharacteristic(shape, shown),
        });
      };
      icon.onclick = pickShape;
      icon.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pickShape(); } };
    }
    cluster.createDiv({ cls: 'gf-sol-chrome-split' });
    for (const density of SYS_DENSITY_ORDER) {
      const isSelected = density === this.draft.sysDensity;
      const icon = cluster.createDiv({
        cls: isSelected ? 'gf-shape-icon is-selected' : 'gf-shape-icon',
        attr: { title: SYS_DENSITY_LABELS[density], 'aria-label': SYS_DENSITY_LABELS[density], role: 'button', tabindex: '0' },
      });
      icon.style.cssText = 'flex:0 0 40px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
      icon.innerHTML = SYS_DENSITY_ICONS[density];
      const pickDensity = (): void => {
        if (density === this.draft.sysDensity) return;
        this.setDraft({ sysDensity: density });
      };
      icon.onclick = pickDensity;
      icon.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pickDensity(); } };
    }

    const sizeCluster = chromeRow.createDiv({ cls: 'gf-sol-size-cluster' });
    const ruler = sizeCluster.createDiv({
      cls: 'gf-sol-size-ruler',
      attr: {
        title: SIZE_DIMENSION_LABEL[this.draft.footprintShape],
        'aria-hidden': 'true',
      },
    });
    ruler.innerHTML = RULER_ICON;
    const sizeInput = sizeCluster.createEl('input', {
      cls: 'gf-sol-size-input',
      type: 'text',
      attr: {
        inputmode: 'decimal',
        maxlength: '14',
        'aria-label': SIZE_DIMENSION_LABEL[this.draft.footprintShape],
      },
    });
    sizeInput.value = formatCharacteristicPc(characteristicFromCircumradius(this.draft.footprintShape, this.draft.sizeInPc));
    sizeInput.addEventListener('change', () => {
      const n = parseCharacteristicPc(sizeInput.value);
      if (!Number.isFinite(n) || n <= 0) return;
      this.setDraft({
        sizeEditMode: 'sizeInPc',
        sizeInPc: circumradiusFromCharacteristic(this.draft.footprintShape, n),
      });
    });

    const centreRow = body.createDiv({ cls: 'gf-sol-centre-row' });
    const centreCol = centreRow.createDiv({ cls: 'gf-sol-centre-label-col' });
    centreCol.createDiv({ cls: 'gf-sol-centre-heading', text: 'System at centre' });
    const toggleHost = centreCol.createDiv({ cls: 'gf-sol-centre-toggle' });
    new Setting(toggleHost)
      .addToggle((t) => t.setValue(this.draft.systemAtCentre).onChange((v) => this.setDraft({ systemAtCentre: v })));
    const centreAside = centreRow.createDiv({ cls: 'gf-sol-centre-aside' });
    if (!this.draft.systemAtCentre) {
      centreAside.createEl('p', {
        cls: 'gf-sol-centre-desc',
        text: 'Search for a specific system to centre the sector on, instead of the rolled point',
      });
    } else {
      const multiplicityField = centreAside.createDiv({ cls: 'gf-sol-centre-field' });
      const multiplicity = new DropdownComponent(multiplicityField)
        .addOption('any', 'Any').addOption('solo', 'Solo').addOption('binary', 'Binary or more')
        .setValue(this.draft.multiplicity)
        .onChange((v) => this.setDraft({ multiplicity: v as Screen2Draft['multiplicity'] }));
      multiplicity.selectEl.setAttribute('aria-label', 'Multiplicity');
      multiplicityField.createDiv({ cls: 'gf-sol-centre-field-label', text: 'Multiplicity' });
      const sysTypeField = centreAside.createDiv({ cls: 'gf-sol-centre-field' });
      const sysType = new DropdownComponent(sysTypeField)
        .addOption('nearest', 'Nearest').addOption('interesting', 'Interesting')
        .addOption('marginal', 'Nearest Marginal').addOption('tolerable', 'Nearest Tolerable').addOption('earthLike', 'Nearest Earth-like')
        .setValue(this.draft.sysType)
        .onChange((v) => this.setDraft({ sysType: v as Screen2Draft['sysType'] }));
      sysType.selectEl.setAttribute('aria-label', 'Sys type');
      sysTypeField.createDiv({ cls: 'gf-sol-centre-field-label', text: 'Sys type' });
      // Search is a hover-icon (globe-search glyph), formatted exactly like
      // the history icon - button-height, grey → accent on hover. It sits
      // inside the bounding box, pushed to its right edge, vertically centred.
      this.addNavIcon(centreRow, GLOBAL_SEARCH_SVG, 'Search for the centre system', false, () => this.runSearch(), 'gf-sol-nav-icon--btn-height gf-sol-centre-search');
    }

    const nav = body.createDiv();
    nav.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:12px;';
    nav.createEl('button', { text: '← back' }).onclick = () => {
      this.close();
      new GalaxyStartModal(this.app, this.settings, this.onSettingsChange).open();
    };
    const generateWrap = nav.createDiv({ cls: 'gf-sol-generate-wrap' });
    // Hover-icon (not a button), same colour language as the tape arrows,
    // sized to match the button height beside it.
    this.addNavIcon(
      generateWrap, HISTORY_SVG, 'Previously viewed sectors', false,
      () => {
        new SolNeighbourhoodHistoryModal(
          this.app, this.settings.solNeighbourhoodHistory,
          solSectorKey(this.seed, this.draft.angleRad, this.draft.distanceFromCentrePc, this.draft.distanceFromPlanePc),
          (entry) => this.loadEntry(entry),
        ).open();
      },
      'gf-sol-nav-icon--btn-height',
    );
    const generateBtn = generateWrap.createEl('button', { text: 'generate sector', cls: 'mod-cta' });
    generateBtn.onclick = () => { void this.commit(); };

    void this.paintSector(syncCount);
  }

  private async paintSector(_syncCount: boolean): Promise<void> {
    const centre = centrePcFromPolar(this.draft);
    const thickness = thicknessPcFor(this.draft.sysDensity);
    const radiusPc = this.draft.sizeInPc;
    const shape = this.draft.footprintShape;
    const characteristicPc = characteristicFromCircumradius(shape, radiusPc);
    const viewHalfPc = (characteristicPc / 2) / (1 - 2 * SOL_PREVIEW_MARGIN_FRACTION);
    const coverCircumradiusPc = viewHalfPc * Math.SQRT2;
    const key = coverFieldCacheKey(this.seed, centre, characteristicPc, thickness);
    const willGenerate = !coverFieldIsCached(key);

    // Delayed spinner (item D): the overlay is only ever inserted if the work
    // outlasts SPINNER_DELAY_MS. A shape/density click hits the cover-field
    // cache and re-partitions ~1800 systems in ~1.5 ms, so the timer is
    // always cleared first and the spinner never flashes - which is the
    // symptom the user actually reported.
    let overlay: HTMLElement | null = null;
    const spinnerTimer = window.setTimeout(
      () => { overlay = showBusyOverlay(this.mapPane, 'Rendering preview…'); }, SPINNER_DELAY_MS,
    );
    try {
      // Yield one paint so the spinner can show BEFORE the synchronous
      // generation block - but only when we are about to generate. On a cache
      // hit there is no long block to hide, so no yield at all (item D).
      if (willGenerate) await nextPaint();

      // Match the backing store to the laid-out pane (it fills the modal's
      // top). `renderPositionOnlyCanvas` fits the sector to the SHORTER axis,
      // so a non-square pane just letterboxes rather than cropping.
      this.canvas.width = Math.max(1, Math.round(this.mapPane.clientWidth));
      this.canvas.height = Math.max(1, Math.round(this.mapPane.clientHeight));

      // ONE generation for the whole visible square (item C). Every footprint
      // shape sits inside this cover square, so `isWithinFootprint`
      // partitions the SAME merged, exclusion-resolved set into white
      // (in-sector) and ghost-grey (context) - the two layers cannot
      // disagree at the seam, and switching shape just re-partitions this
      // cached field.
      const field = coverField(key, () =>
        generateSector(this.seed, this.model, centre, coverCircumradiusPc, thickness, 'square'));

      const inSector: { x: number; y: number; z: number }[] = [];
      const ghost: { x: number; y: number; z: number }[] = [];
      for (const s of field) {
        const p = s.positionPc;
        if (isWithinFootprint(p.x - centre.x, p.y - centre.y, radiusPc, shape)) inSector.push(p);
        else ghost.push(p);
      }
      this.countEl.setText(`${inSector.length} systems in this sector`);
      renderPositionOnlyCanvas(this.canvas, centre, viewHalfPc, inSector, ghost);
    } finally {
      window.clearTimeout(spinnerTimer);
      hideBusyOverlay(overlay);
    }
  }

  /** Same guard + delayed-spinner pattern as Screen 3's own commit; the
   *  generation/write itself is the shared `writeSectorDocument`. */
  private async commit(): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    const spinnerTimer = window.setTimeout(() => { this.busyOverlay = showBusyOverlay(this.contentEl, 'Generating…'); }, SPINNER_DELAY_MS);
    try {
      await writeSectorDocument(this.app, this.screen1Draft(), this.draft, this.model);
      this.close();
    } finally {
      window.clearTimeout(spinnerTimer);
      hideBusyOverlay(this.busyOverlay);
      this.busyOverlay = null;
      this.generating = false;
    }
  }
}

/**
 * `SolNeighbourhoodHistoryModal` (31 Aug 2026, a direct user follow-up:
 * "previously viewed sectors should be in a separate modal") - a plain
 * scrollable list of every past sol-neighbourhood roll, newest first,
 * numbered 1..N with 1 = oldest, laid out as number + θ / R / z columns.
 * The current sector is pinned above the scroll pane. Picking one closes
 * this modal and hands the entry back to the still-open
 * `GalaxySolNeighbourhoodModal` via `onPick`, which reloads it (seed +
 * centre). Read-only otherwise: it never rolls, records or commits.
 */
class SolNeighbourhoodHistoryModal extends Modal {
  constructor(
    app: App,
    private readonly history: readonly SolNeighbourhoodSector[],
    private readonly currentKey: string,
    private readonly onPick: (entry: SolNeighbourhoodSector) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    this.modalEl.addClass('gf-sol-hist-modal');
    contentEl.empty();

    if (this.history.length === 0) {
      contentEl.createEl('p', { text: 'No sectors viewed yet.' });
      return;
    }

    // `this.history` is newest-first; walk it in reverse so the list reads
    // oldest → newest, numbered 1..N (user follow-up 31 Aug 2026).
    const chrono = [...this.history].reverse();
    const currentIndex = chrono.findIndex((e) =>
      solSectorKey(e.worldSeed, e.angleRad, e.distanceFromCentrePc, e.distanceFromPlanePc) === this.currentKey);

    // The current sector is pinned above the scroll pane so it stays in
    // view no matter how far the rest is scrolled; the pane shows ~10 rows
    // before it scrolls (user follow-up 31 Aug 2026).
    if (currentIndex >= 0) {
      const pinned = contentEl.createDiv({ cls: 'gf-sol-hist-grid gf-sol-hist-pinned' });
      this.renderRow(pinned, chrono[currentIndex], currentIndex + 1, true);
    }

    // List runs newest → oldest so the newest rows sit right under the
    // pinned current one (user follow-up 31 Aug 2026); numbers still count
    // 1 = oldest.
    const listEl = contentEl.createDiv({ cls: 'gf-sol-hist-grid gf-sol-hist-list' });
    for (let i = chrono.length - 1; i >= 0; i--) {
      if (i === currentIndex) continue;
      this.renderRow(listEl, chrono[i], i + 1, false);
    }
  }

  private renderRow(host: HTMLElement, entry: SolNeighbourhoodSector, number: number, isCurrent: boolean): void {
    const row = host.createDiv({ cls: isCurrent ? 'gf-sol-hist-row is-current' : 'gf-sol-hist-row' });
    row.createSpan({ cls: 'gf-sol-hist-num', text: String(number) });
    const [theta, radius, height] = solSectorCoordParts(entry.angleRad, entry.distanceFromCentrePc, entry.distanceFromPlanePc);
    row.createSpan({ cls: 'gf-sol-hist-field', text: theta });
    row.createSpan({ cls: 'gf-sol-hist-field', text: radius });
    row.createSpan({ cls: 'gf-sol-hist-field', text: height });
    const load = row.createEl('button', {
      cls: 'gf-sol-hist-load',
      attr: { type: 'button', 'aria-label': 'Load this preview' },
    });
    load.innerHTML = ARROW_INTO_BOX_SVG;
    load.onclick = () => { this.close(); this.onPick(entry); };
  }

  onClose(): void {
    this.contentEl.empty();
    super.onClose();
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
  /** Wraps just the canvas (24 Aug 2026, "the whole modal opens first, then
   *  the map pane") - `showBusyOverlay` scopes to this instead of the whole
   *  `contentEl`, so the busy spinner covers only the density-preview area
   *  while every control around it stays visible and interactive. */
  private mapPane!: HTMLElement;
  /** Debounce handle for the seed TEXT field's own preview refresh - see
   *  the `addText` handler below for why this does NOT call `this.render()`
   *  directly. */
  private seedRefreshTimer: number | null = null;
  private busyOverlay: HTMLElement | null = null;
  /** Staleness guard (25 Aug 2026, a found race - see `computeAndCacheField`'s
   *  own header) - bumped by every render REQUEST (`render()`, and the
   *  seed field's own debounced handler), never by a completion. A completed
   *  request compares its own captured value against the current one before
   *  touching `cachedField`/`cachedFieldKey` or painting the canvas; a
   *  mismatch means a newer request has since started, so this one's result
   *  is silently discarded rather than clobbering something fresher. */
  private renderGeneration = 0;

  /**
   * `settings`/`onSettingsChange` (16 Aug 2026) are a plain data + callback
   * pair, not the whole `GalaxyForgePlugin` instance - this modal only ever
   * needs to READ two persisted values and report the ones it changed,
   * never anything else a Plugin object carries (vault access, other
   * commands, ...). Keeps this file's own dependency on `main.ts` to a
   * single type-only import.
   */
  constructor(app: App, private readonly settings: GalaxyForgeSettings, private readonly onSettingsChange: (s: GalaxyForgeSettings) => void) {
    super(app);
    this.draft = defaultScreen1Draft({
      worldSeed: settings.lastWorldSeed,
      terraformScale: settings.defaultTerraformScale,
      terraformIntensity: settings.defaultTerraformIntensity,
      ...settings.lastScreen1Extras,
    });
  }

  /**
   * Persistence checkpoint (16 Aug 2026, a direct user report: Screen 2's
   * own draft resetting on every close, below, applies identically to the
   * rest of THIS screen's draft - only `lastWorldSeed` and the two
   * terraforming dials survived a re-open before this). `onClose` is a
   * real `Modal` lifecycle hook fired on every dismissal path (Back - N/A
   * here, Next, Escape, click-outside), not just forward progress, so this
   * is the ONE place persistence needs to happen, replacing the old
   * write-only-on-"Next →" below. Also clears a pending seed-preview
   * timer, closing a latent "the timer fires after contentEl is gone" edge
   * case while already touching this code.
   */
  onClose(): void {
    if (this.seedRefreshTimer !== null) { window.clearTimeout(this.seedRefreshTimer); this.seedRefreshTimer = null; }
    this.onSettingsChange({
      ...this.settings, lastWorldSeed: this.draft.worldSeed,
      defaultTerraformScale: this.draft.terraformScale, defaultTerraformIntensity: this.draft.terraformIntensity,
      lastScreen1Extras: {
        morphology: this.draft.morphology, sizeStepIndex: this.draft.sizeStepIndex, lenticularBulgeType: this.draft.lenticularBulgeType,
      },
    });
    super.onClose();
  }

  /**
   * The cache-miss path, WITH a spinner - split out of the old synchronous
   * `fieldForCurrentDraft` (16 Aug 2026, a user-found gap: "a slight
   * jumpy" - the seeded-arm table's own one-time contrast-calibration cost,
   * ~0.5-1s, made the whole preview freeze then jump with no feedback).
   * Shows the overlay unconditionally, yields to let it actually paint
   * (`nextPaint`'s own header explains why a delayed-show race does not
   * work for a synchronous computation), THEN runs the real work.
   *
   * RACE FIXED (25 Aug 2026, reproduced directly - rapid "Randomise" clicks
   * left the preview stuck on "Rendering preview..." permanently). Root
   * cause: the overlay this function REMOVED was read from the shared
   * `this.busyOverlay` instance field, not from what THIS call itself
   * created - with two overlapping calls in flight, whichever one happened
   * to finish could remove the OTHER's overlay (or its own already-replaced
   * one), leaving an orphan with no code path left to ever remove it. Fixed
   * by capturing the overlay in a LOCAL variable and always removing
   * exactly that one, regardless of completion order - no more possible
   * orphan. `myGeneration` (captured from the caller, which bumped
   * `renderGeneration` at the REQUEST, not here) separately guards against
   * a slower, older request overwriting the cache after a faster, newer one
   * already has - `this.busyOverlay` itself is no longer read for removal,
   * only kept for any other code that might introspect "is something
   * rendering right now".
   */
  private async computeAndCacheField(
    model: GalaxyModel, params: GalaxyParameters, key: string, myGeneration: number,
  ): Promise<DensityDisplayField> {
    const overlay = showBusyOverlay(this.mapPane, 'Rendering preview…');
    this.busyOverlay = overlay;
    await nextPaint();
    const previewScale = previewScaleFor(model, params);
    const thicknessPc = GALAXY_OVERVIEW_THICKNESS_BASE_PC * previewScale;
    const halfWidthPc = framingHalfWidthPcFor(model, params, thicknessPc, previewScale);
    const field = computeDensityDisplayField(
      model, GALAXY_OVERVIEW_CENTRE_PC, halfWidthPc, thicknessPc,
      { worldSeed: this.draft.worldSeed, complexTier: params.complexTier },
      undefined, ISOPHOTE_PREVIEW_MAX_CELLS_PER_AXIS, ISOPHOTE_PREVIEW_Z_SAMPLES,
    );
    hideBusyOverlay(overlay);   // ALWAYS remove the overlay THIS call created - never racy
    if (this.busyOverlay === overlay) this.busyOverlay = null;
    if (myGeneration === this.renderGeneration) {
      // Only the LATEST requested render gets to update the cache - an
      // older, slower request finishing after a newer one must not clobber it.
      this.cachedField = field;
      this.cachedFieldKey = key;
    }
    return field;
  }

  private async fieldForCurrentDraft(model: GalaxyModel, params: GalaxyParameters, myGeneration: number): Promise<DensityDisplayField> {
    const key = `${this.draft.morphology}:${this.draft.sizeStepIndex}:${this.draft.lenticularBulgeType}:${this.draft.worldSeed}`;
    if (this.cachedFieldKey === key && this.cachedField) return this.cachedField;
    return this.computeAndCacheField(model, params, key, myGeneration);
  }

  onOpen(): void {
    this.render();
  }

  /**
   * SYNC (24 Aug 2026, "the whole modal opens first, then the pane for
   * viewing the galaxy map") - `buildDom` below runs to completion (every
   * button/slider/field, plus a blank canvas) before this function returns,
   * so the modal is fully present and interactive the instant it opens.
   * `paintCanvas` then fills in the (possibly slow) density preview a
   * moment later, fired off but not awaited - it used to be the other way
   * around, with NOTHING on screen at all until the field was ready.
   */
  private render(): void {
    const { model, params } = modelFromDraft(this.draft);
    this.buildDom();
    void this.paintCanvas(model, params, ++this.renderGeneration);
  }

  private async paintCanvas(model: GalaxyModel, params: GalaxyParameters, myGeneration: number): Promise<void> {
    const field = await this.fieldForCurrentDraft(model, params, myGeneration);
    // A newer render has since been requested - painting this stale result
    // would flicker the canvas back to an earlier seed/morphology's field.
    if (myGeneration !== this.renderGeneration) return;
    paintDensityField(this.canvas, field, null);
  }

  private buildDom(): void {
    const { contentEl } = this;
    contentEl.empty();

    const morphRow = contentEl.createDiv();
    for (const choice of ['lenticular', 'elliptical', 'barredSpiral', 'spiral', 'milkyWayAnalogue'] as MorphologyChoice[]) {
      const btn = morphRow.createEl('button', { text: MORPHOLOGY_LABELS[choice] });
      if (choice === this.draft.morphology) btn.addClass('mod-cta');
      btn.onclick = () => { this.draft = { ...this.draft, morphology: choice }; void this.render(); };
    }

    renderSliderRow(
      contentEl, { label: 'Galaxy size', title: `Galaxy size - ${sizeStepsFor(this.draft.morphology)[this.draft.sizeStepIndex]!.label}` },
      0, 4, 1, 0, this.draft.sizeStepIndex,
      (v) => { this.draft = { ...this.draft, sizeStepIndex: Math.round(v) }; void this.render(); },
    );

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
            const myGeneration = ++this.renderGeneration;
            void (async () => {
              const { model, params } = modelFromDraft(this.draft);
              const field = await this.fieldForCurrentDraft(model, params, myGeneration);
              // Same staleness guard paintCanvas uses - see its own header.
              if (myGeneration !== this.renderGeneration) return;
              paintDensityField(this.canvas, field, null);
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
    renderSliderRow(
      contentEl, { label: 'Terraforming coverage', title: 'Terraforming coverage - how much of what\'s within reach actually gets terraformed, easiest worlds first' },
      0, 6, 1, 0, this.draft.terraformScale,
      (v) => { this.draft = { ...this.draft, terraformScale: Math.round(v) }; void this.render(); },
    );
    renderSliderRow(
      contentEl, { label: 'Terraforming reach', title: 'Terraforming reach - how difficult a world can be and still be attempted at all' },
      0, 6, 1, 0, this.draft.terraformIntensity,
      (v) => { this.draft = { ...this.draft, terraformIntensity: Math.round(v) }; void this.render(); },
    );

    const mapPane = contentEl.createDiv();
    mapPane.style.cssText = 'position:relative;';
    this.mapPane = mapPane;
    this.canvas = mapPane.createEl('canvas', { attr: { width: '360', height: '360' } });
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '12px auto';

    const nav = contentEl.createDiv();
    nav.createEl('span');
    nav.createEl('button', { text: 'Next →', cls: 'mod-cta' }).onclick = () => {
      const seed = this.draft.worldSeed.trim().length > 0 ? this.draft.worldSeed : Math.random().toString(36).slice(2);
      // Resolve the RESOLVED seed, typed or randomly generated, onto the
      // draft itself BEFORE closing - "continue where you left off" is the
      // useful default (re-opening the GUI pre-fills the seed that made
      // your last galaxy), and "Randomise" is right there if a fresh one
      // is wanted instead. `onClose` (above) is what actually persists it
      // now, reading `this.draft` at that point, so the draft needs to
      // already carry the resolved value by the time `close()` triggers it.
      this.draft = { ...this.draft, worldSeed: seed };
      this.close();
      new GalaxyScreen2Modal(this.app, { ...this.draft, worldSeed: seed }, this.settings, this.onSettingsChange).open();
    };
  }
}

/* --------------------------------- screen 2 -------------------------------------- */

export class GalaxyScreen2Modal extends Modal {
  private draft: Screen2Draft;
  private model: GalaxyModel;
  private topDownCanvas!: HTMLCanvasElement;
  private sideOnCanvas!: HTMLCanvasElement;
  /** Wraps both canvases (24 Aug 2026, "the whole modal opens first, then
   *  the map pane") - `initGalaxyOverview`'s own busy overlay scopes to
   *  this, not the whole modal, so the sliders/controls around it are
   *  built and usable immediately, before `galaxyOverview` resolves. */
  private mapPane!: HTMLElement;

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
  /** `undefined` until `initGalaxyOverview` resolves (24 Aug 2026) - `render`
   *  below now runs once, synchronously, before this is ever set (the
   *  modal-opens-first split), so it can no longer assume the field is
   *  already in hand the way the definite-assignment version used to. */
  private galaxyOverview: DensityDisplayField | undefined;

  /** `settings`/`onSettingsChange` carried through purely so the "← Back"
   *  button can reconstruct `GalaxyScreen1Modal` faithfully - this screen
   *  never reads or changes them itself. */
  private params: GalaxyParameters;

  /** `previewScaleFor(this.model, this.params)`, computed once - `this.model`
   *  never changes for this modal's whole lifetime, so neither does this. */
  private previewScale!: number;

  /** The sol-like neighbourhood's own R (16 Aug 2026, a direct user ask,
   *  "adjusted per galaxy size as needed") - `params.R0Pc * previewScale`,
   *  the model's own solar-neighbourhood anchor radius scaled the SAME way
   *  `scaleSpiralModel` scales everything else, so this stays correct
   *  automatically at every galaxy size. `null` for elliptical/lenticular -
   *  a pressure-supported spheroid has no disc/plane, so no sol-like
   *  neighbourhood concept applies there at all. */
  private solRadiusPc: number | null = null;

  /** How far from `solRadiusPc`/the plane still "feels" roughly sol-like
   *  (16 Aug 2026, a direct user question: "is there a slice which has
   *  'reasonable' sol neighbourhood density and feel?") - answered with
   *  real, sourced, ALREADY-SCALED model quantities rather than an
   *  invented tolerance: the R band is +/-10% of the solar radius itself
   *  (a plain, symmetric "still close to R0" reading); the z band is one
   *  full thin-disc scale height (`params.juric.hThin`, Juric et al. 2008
   *  - "within the thin disc's own characteristic thickness of the
   *  plane"), both scaled by `previewScale` the same way `solRadiusPc` is. */
  private solRHalfWidthPc: number | null = null;
  private solZHalfWidthPc: number | null = null;

  constructor(
    app: App, private readonly screen1: Screen1Draft,
    private readonly settings: GalaxyForgeSettings, private readonly onSettingsChange: (s: GalaxyForgeSettings) => void,
  ) {
    super(app);
    // Seeded from the persisted draft (16 Aug 2026, a direct user report:
    // "when leave and come back to the 2nd page... everything is reset") -
    // `defaultScreen2Draft`'s own `overrides` parameter, mirroring how
    // `defaultScreen1Draft` already seeds Screen 1 from settings.
    this.draft = defaultScreen2Draft(settings.lastScreen2Draft ?? {});
    const built = modelFromDraft(screen1);
    this.model = built.model;
    this.params = built.params;
    this.previewScale = previewScaleFor(this.model, this.params);
    if (this.model.morphology === 'spiral' || this.model.morphology === 'barredSpiral') {
      // The SAME band the sol-neighbourhood sector flow rolls a centre from
      // (`solNeighbourhoodBand`, galaxyCreationState) - one definition, so
      // the reference mark drawn here and the roll there cannot disagree.
      const band = solNeighbourhoodBand(this.params.R0Pc, this.params.juric.hThin, this.previewScale);
      this.solRadiusPc = band.rCentrePc;
      this.solRHalfWidthPc = band.rHalfWidthPc;
      this.solZHalfWidthPc = band.zHalfWidthPc;
    }
  }

  onOpen(): void {
    this.render();
    void this.initGalaxyOverview();
  }

  /** Persistence checkpoint - see `GalaxyScreen1Modal.onClose`'s own doc
   *  comment for why `onClose` (fires on every dismissal path) rather than
   *  a specific button's own click handler. Screen 2 previously persisted
   *  nothing at all. */
  onClose(): void {
    if (this.sizeFieldRefreshTimer !== null) { window.clearTimeout(this.sizeFieldRefreshTimer); this.sizeFieldRefreshTimer = null; }
    this.onSettingsChange({ ...this.settings, lastScreen2Draft: this.draft });
    super.onClose();
  }

  /**
   * Async (16 Aug 2026) so the initial `galaxyOverview` computation - the
   * same potentially-slow seeded-arm field build Screen 1 pays, since
   * `this.model` was built by the same `modelFromDraft` - can show a
   * spinner instead of freezing the transition from Screen 1. See
   * `showBusyOverlay`'s own header for why this yields via `nextPaint`
   * rather than racing a delayed `setTimeout` against synchronous work.
   *
   * RENAMED from `initAndRender` (24 Aug 2026) - `onOpen` now calls
   * `render()` itself, synchronously, before this even starts (the modal
   * -opens-first split), so this function's own job shrank to just "compute
   * `galaxyOverview`, then trigger a repaint" - the overlay it shows scopes
   * to `this.mapPane` (set by that first synchronous `render()` call), not
   * the whole modal, since every slider/control is already live by then.
   */
  private async initGalaxyOverview(): Promise<void> {
    const overlay = showBusyOverlay(this.mapPane, 'Rendering preview…');
    await nextPaint();
    const thicknessPc = GALAXY_OVERVIEW_THICKNESS_BASE_PC * this.previewScale;
    const halfWidthPc = framingHalfWidthPcFor(this.model, this.params, thicknessPc, this.previewScale);
    this.galaxyOverview = computeDensityDisplayField(
      this.model, GALAXY_OVERVIEW_CENTRE_PC, halfWidthPc, thicknessPc,
      { worldSeed: this.screen1.worldSeed, complexTier: this.params.complexTier },
      undefined, ISOPHOTE_PREVIEW_MAX_CELLS_PER_AXIS, ISOPHOTE_PREVIEW_Z_SAMPLES,
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

    // mapPane (24 Aug 2026, "the whole modal opens first, then the map
    // pane") - wraps BOTH canvases so `initGalaxyOverview`'s own busy
    // overlay can scope to just this pane. `render()` itself now runs
    // before `galaxyOverview` necessarily exists (the very first call, from
    // `onOpen`), so the two canvases are always CREATED here but only
    // PAINTED below when the field is actually in hand - they start blank
    // rather than blocking the rest of this screen's own controls.
    const mapPane = contentEl.createDiv();
    mapPane.style.cssText = 'position:relative;';
    this.mapPane = mapPane;

    this.topDownCanvas = mapPane.createEl('canvas', { attr: { width: '400', height: '400' } });
    this.topDownCanvas.style.display = 'block';
    this.topDownCanvas.style.margin = '8px auto';

    // height 80 -> 220 (16 Aug 2026, alongside EDGE_ON_HALF_HEIGHT_BASE_PC's
    // own widening) - a 12 000 pc total vertical range read at 80px was ~150 pc
    // per pixel, too coarse to show the thin disc as anything but a hairline
    // even before the halo fix; 220px brought that down to a legible ~55 pc/px.
    // 220 -> 110 (25 Aug 2026, direct user request: "make the side-on view
    // half the height it is now") - a pure display-size choice, the
    // underlying field/resolution this paints from is untouched.
    this.sideOnCanvas = mapPane.createEl('canvas', { attr: { width: '400', height: '110' } });
    this.sideOnCanvas.style.display = 'block';
    this.sideOnCanvas.style.margin = '4px auto 12px';

    if (this.galaxyOverview) {
      // The cached whole-galaxy field, repainted (cheap - no resampling) with
      // the sector overlay at its ACTUAL world position every time the draft
      // changes - see `galaxyOverview`'s own doc comment.
      paintDensityField(this.topDownCanvas, this.galaxyOverview, { centrePc: centre, radiusPc: this.draft.sizeInPc, shape: this.draft.footprintShape });
      drawPositionGuides(this.topDownCanvas, this.galaxyOverview, this.draft.angleRad, this.draft.distanceFromCentrePc);
      renderEdgeOnCanvas(
        this.sideOnCanvas, this.model, this.draft.angleRad, this.draft.distanceFromCentrePc, this.draft.distanceFromPlanePc,
        // Each side of the now-diametral view reaches as far as the top-down
        // window's own real (R90-derived) half-width - both views share one
        // real notion of "how big is this galaxy" now, not two independently
        // -tuned constants (17 Aug 2026, Step 6).
        this.galaxyOverview.halfWidthPc, EDGE_ON_HALF_HEIGHT_BASE_PC * this.previewScale, thickness,
      );
    }

    renderSliderRow(
      contentEl, { icon: ANGLE_ICON, title: `Angle (θ) - ${radToDeg(this.draft.angleRad)}°` },
      0, 359, 1, 2, radToDeg(this.draft.angleRad), (v) => this.setDraft({ angleRad: degToRad(v) }),
    );
    renderSliderRow(
      contentEl, { icon: DISTANCE_FROM_CENTRE_ICON, title: `Distance from centre (R) - ${this.draft.distanceFromCentrePc} pc` },
      0, 20000, 50, 2, this.draft.distanceFromCentrePc, (v) => this.setDraft({ distanceFromCentrePc: v }),
      this.solRadiusPc !== null && this.solRHalfWidthPc !== null
        ? { center: this.solRadiusPc, halfWidth: this.solRHalfWidthPc, title: 'Roughly where a sol-like neighbourhood would sit' }
        : undefined,
    );
    renderSliderRow(
      contentEl, { icon: DISTANCE_FROM_PLANE_ICON, title: `Distance from galactic plane (z) - ${this.draft.distanceFromPlanePc} pc` },
      -2000, 2000, 10, 2, this.draft.distanceFromPlanePc, (v) => this.setDraft({ distanceFromPlanePc: v }),
      this.solZHalfWidthPc !== null
        ? { center: 0, halfWidth: this.solZHalfWidthPc, title: 'Roughly the thin disc\'s own thickness around the plane' }
        : undefined,
    );

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
  private countEl!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  /** Wraps the canvas (24 Aug 2026, "the whole modal opens first, then the
   *  map pane") - `paintSector`'s own busy overlay scopes to this, not the
   *  whole modal, so the Back/Generate buttons are live immediately. */
  private mapPane!: HTMLElement;

  /** `settings`/`onSettingsChange` carried through purely for the "← Back"
   *  chain back to Screen 1 - this screen never reads or changes them. */
  constructor(
    app: App, private readonly screen1: Screen1Draft, private readonly screen2: Screen2Draft, private readonly model: GalaxyModel,
    private readonly settings: GalaxyForgeSettings, private readonly onSettingsChange: (s: GalaxyForgeSettings) => void,
  ) { super(app); }

  onOpen(): void {
    this.render();
  }

  /**
   * SYNC (24 Aug 2026, "the whole modal opens first, then the pane for
   * viewing the galaxy map") - builds the count placeholder, the (blank)
   * canvas and the Back/Generate buttons immediately; `paintSector` below
   * then runs the real `generateSector` call and paints the scatter a
   * moment later. Previously this whole screen waited on `generateSector`
   * before anything at all appeared.
   */
  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    const centre = centrePcFromPolar(this.screen2);

    this.countEl = contentEl.createEl('p', { text: 'Placing systems…' });

    const mapPane = contentEl.createDiv();
    mapPane.style.cssText = 'position:relative;';
    this.mapPane = mapPane;
    this.canvas = mapPane.createEl('canvas', { attr: { width: '420', height: '420' } });
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '8px auto';

    const nav = contentEl.createDiv();
    nav.createEl('button', { text: '← Back' }).onclick = () => {
      this.close();
      new GalaxyScreen2Modal(this.app, this.screen1, this.settings, this.onSettingsChange).open();
    };
    nav.createEl('button', { text: 'Generate Sector', cls: 'mod-cta' }).onclick = () => { void this.commit(); };

    void this.paintSector(centre);
  }

  private async paintSector(centre: { x: number; y: number; z: number }): Promise<void> {
    const overlay = showBusyOverlay(this.mapPane, 'Rendering preview…');
    await nextPaint();
    const thickness = thicknessPcFor(this.screen2.sysDensity);
    const sector = generateSector(this.screen1.worldSeed, this.model, centre, this.screen2.sizeInPc, thickness, this.screen2.footprintShape);
    this.countEl.setText(`${sector.length} systems in this sector - position only, nothing generated yet.`);
    renderPositionOnlyCanvas(this.canvas, centre, this.screen2.sizeInPc * 1.15, sector.map((s) => s.positionPc));
    hideBusyOverlay(overlay);
  }

  /**
   * Guarded against a second concurrent commit (`this.generating`), and
   * shows a busy overlay (spinner + label) ONLY if the commit is still
   * running after `SPINNER_DELAY_MS` - a commit fast enough to finish
   * before then never flashes it at all. Safe to race a plain `setTimeout`
   * here (unlike Screen 1/2's own recompute, see `showBusyOverlay`'s own
   * header) because `writeSectorDocument` is a sequence of `await`ed I/O
   * calls, not one long synchronous block - the event loop gets real
   * chances to run the pending timer between them.
   *
   * The actual generation + write is `writeSectorDocument` (module scope) -
   * shared verbatim with the sol-neighbourhood sector flow so there is
   * exactly one commit path, not two that could drift.
   */
  private async commit(): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    const spinnerTimer = window.setTimeout(() => { this.busyOverlay = showBusyOverlay(this.contentEl, 'Generating…'); }, SPINNER_DELAY_MS);
    try {
      await writeSectorDocument(this.app, this.screen1, this.screen2, this.model);
      this.close();
    } finally {
      window.clearTimeout(spinnerTimer);
      hideBusyOverlay(this.busyOverlay);
      this.busyOverlay = null;
      this.generating = false;
    }
  }
}
