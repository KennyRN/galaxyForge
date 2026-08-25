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
import { createSpiralModel, createEllipticalModel, createLenticularModel, scaleSpiralModel, R0_PC, type GalaxyModel, type PopulationKey } from './galaxyModel';
import { upsilonFor, densityByPopulationAtCartesian } from './galacticDensity';
import { fieldFromModel, projectSlab, normaliseForDisplay, modulateArmsForDisplay, diametralEdgeOnDisplayField, type SlabRegionPc } from './densityMap';
import { ismDensityAt, DEFAULT_ISM_PARAMS } from './ism';
import { DEFAULT_JURIC, makeDefaultGalaxyParameters, type GalaxyParameters, type ComplexTierParams } from './galaxyParameters';
import { generateSeededArms, rollArmClass } from './spiralArms';
import { complexParticipation, complexCellsOverlapping, complexCentresInCell, type ComplexCentre } from './starFormingComplexes';
import { generateSector, assembleSector } from './sectorFootprint';
import { searchNearestSystem } from './sectorSearch';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { CURRENT_GEN_VERSION } from './genVersion';
import { writeSectorList, SECTOR_FOLDER } from './vault';
import { buildSectorListContent, formatPlanetTypesCell, formatBeltsCell, trueDistance3dPc, type SectorListRow, type SectorListMeta } from './render';
import type { HabTier } from './humanHabitability';
import type { SystemCore } from './types';
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
 * flow's real work is a per-system CPU loop (`generateSystemCore`) with a
 * periodic macrotask yield of its own (`commitInner`'s own `YIELD_EVERY`,
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
    const btn = pill.createEl('button', { cls: 'sf-pill-btn', attr: { title, 'aria-label': title } });
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
    const baseParams = isRealMilkyWay
      ? makeDefaultGalaxyParameters(d.worldSeed)
      : makeDefaultGalaxyParameters(d.worldSeed, generateSeededArms(d.worldSeed, seededArmClass), 'seeded', seededArmClass);
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
    const model = scaleSpiralModel(createSpiralModel(resolveBarEnabled(d.morphology), params, upsilonFor), sizeValue);
    return { model, params };
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
const GALAXY_OVERVIEW_RES = { nx: 200, ny: 200 };

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
 *  reproduce a gated science quantity. */
const R90_SEARCH_RES = { nx: 80, ny: 80 };
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
  const surface = projectSlab(fieldFromModel(model), region, R90_SEARCH_RES);
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

/** The reduced-and-display-scaled field a canvas is painted from, computed
 *  once and reusable across repaints (the overlay alone changes far more
 *  often than the field itself does). `complexCentres` (16 Aug 2026) rides
 *  along on the same cache - it is exactly as expensive to recompute as
 *  the smooth field itself and depends on the same (model, worldSeed,
 *  region) inputs, so caching one without the other would just move the
 *  waste rather than remove it. */
interface DensityDisplayField {
  readonly norm: Float64Array;
  /** Per-cell population-age warmth, in [0,1], 0 = as young as
   *  `COLOUR_YOUNG_AGE_REF_GYR`, 1 = as old as `COLOUR_OLD_AGE_REF_GYR` -
   *  same index convention as `norm` (Amendment A8's own patch, Section 5.4,
   *  "colour by population"; see `paintDensityField`). */
  readonly warmth: Float64Array;
  readonly res: { nx: number; ny: number };
  readonly centrePc: { x: number; y: number; z: number };
  readonly halfWidthPc: number;
  readonly complexCentres: readonly ComplexCentre[];
}

/** Reference age span for the population-colour warmth mapping (17 Aug 2026,
 *  morphology patch v3.0, Step 5) - `calibrated`, a display choice, not a
 *  physical constant. Chosen to cover the shipped population set's own
 *  `ageMeanGyr` range with a little headroom either side (`spiralYoungThin`
 *  at 1.5 Gyr is the youngest population in the codebase, `ellipticalAccreted`
 *  at 12.2 Gyr the oldest) so no shipped population saturates fully at either
 *  end of the interpolation. */
const COLOUR_YOUNG_AGE_REF_GYR = 1;
const COLOUR_OLD_AGE_REF_GYR = 13;

/** Blue-white (young) / warm amber (old) endpoints for the population-colour
 *  interpolation - `calibrated`, chosen for legibility against this canvas's
 *  own `#05050a` ground, not measured off a blackbody curve. The DIRECTION
 *  is real stellar-colour-temperature physics (hot young O/B stars read
 *  blue-white, cool old K/M giants read amber/red) - only these specific RGB
 *  values are a display choice. Per the patch document's own Section 5.4:
 *  "old populations warm, young populations blue-white". */
const COLOUR_YOUNG_RGB: readonly [number, number, number] = [190, 210, 255];
const COLOUR_OLD_RGB: readonly [number, number, number] = [255, 195, 130];

/**
 * Per-cell population-age warmth (17 Aug 2026, morphology patch v3.0, Step
 * 5). Weighted-mean `ageMeanGyr` across whichever populations contribute
 * density at that cell, weighted by their own column-density share there -
 * NOT a winner-take-all "which population dominates" classification, so a
 * cell where two populations of different age genuinely overlap (routine
 * near the bulge/disc boundary) reads as a genuine blend, not a hard edge
 * that isn't really there in the field.
 *
 * Reuses `Population.ageMeanGyr` directly (Law 1) - no new age concept is
 * invented for display, and no per-key colour table needs maintaining as
 * populations are added: a new population's age alone places it correctly
 * on the warm/cool axis.
 */
function computeAgeWarmth(
  model: GalaxyModel, byPopulation: Readonly<Partial<Record<PopulationKey, Float64Array>>> | undefined, n: number,
): Float64Array {
  const warmth = new Float64Array(n);
  if (!byPopulation) { warmth.fill(0.5); return warmth; }   // no split data - neutral, not misleading
  const ageByKey = new Map<PopulationKey, number>();
  for (const pop of model.populations) ageByKey.set(pop.key, pop.ageMeanGyr);
  const entries = Object.entries(byPopulation) as [PopulationKey, Float64Array][];
  const span = COLOUR_OLD_AGE_REF_GYR - COLOUR_YOUNG_AGE_REF_GYR;
  for (let i = 0; i < n; i++) {
    let weighted = 0, total = 0;
    for (const [key, arr] of entries) {
      const v = arr[i]!;
      if (v <= 0) continue;
      const age = ageByKey.get(key);
      if (age === undefined) continue;
      weighted += v * age;
      total += v;
    }
    warmth[i] = total > 0 ? Math.min(1, Math.max(0, (weighted / total - COLOUR_YOUNG_AGE_REF_GYR) / span)) : 0.5;
  }
  return warmth;
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
  // taperOuterFraction (25 Aug 2026) - OPTIONAL, defaults to 1 (no taper).
  // Pass `1 / R90_MARGIN` when `halfWidthPc` was itself derived as
  // `R90_MARGIN * computeR90Pc(...)` - see `modulateArmsForDisplay`'s own
  // header (densityMap.ts) for why the frame's margin band needs this at
  // all: arm contrast does not naturally fade with radius in this model.
  taperOuterFraction = 1,
): DensityDisplayField {
  const region: SlabRegionPc = { centre: centrePc, halfWidthPc, halfDepthPc: halfWidthPc, thicknessPc };
  // byPopulation:true (17 Aug 2026, Step 5) - needed for computeAgeWarmth
  // below; `projectSlab` already supports and gates this split for every
  // morphology (densityMap.ts's own gate 5), this is the first call site
  // that actually asks for it.
  const surface = projectSlab(fieldFromModel(model), region, res, { byPopulation: true });
  // modulateArmsForDisplay (17 Aug 2026, rewritten - see densityMap.ts's own
  // header) for spiral/barred - plain log normalisation alone still makes
  // arm structure invisible on a galaxy-wide view (the radial falloff,
  // centre to outskirts, many orders of magnitude, swamps the much smaller
  // azimuthal arm contrast once both are log-compressed into the same
  // [0,1] range), but the retired `emphasiseArmsForDisplay` fixed that by
  // discarding the radial shape entirely, which made the boxy/peanut bulge
  // (Amendment A4) undisplayable - the rewrite modulates the real
  // log-normalised shape instead of replacing it, so both the bulge's
  // radial concentration and the arm's azimuthal contrast survive together.
  // Elliptical/lenticular have no arms to lose, so they stay on the
  // simpler plain-log path.
  const isSpiralLike = model.morphology === 'spiral' || model.morphology === 'barredSpiral';
  const norm = isSpiralLike
    ? modulateArmsForDisplay(surface.values, res.nx, res.ny, halfWidthPc, taperOuterFraction)
    : normaliseForDisplay(surface.values, { log: true });
  const complexCentres = complexOverlay
    ? complexCentresForOverview(model, complexOverlay.worldSeed, complexOverlay.complexTier, centrePc, halfWidthPc)
    : [];
  const warmth = computeAgeWarmth(model, surface.byPopulation, res.nx * res.ny);
  return { norm, warmth, res, centrePc, halfWidthPc, complexCentres };
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

  const { norm, warmth, res, centrePc, halfWidthPc, complexCentres } = field;
  const pcToPx = w / (2 * halfWidthPc);
  for (let iy = 0; iy < res.ny; iy++) {
    for (let ix = 0; ix < res.nx; ix++) {
      const i = ix + res.nx * iy;
      const v = norm[i]!;
      const cxPc = -halfWidthPc + ((ix + 0.5) / res.nx) * 2 * halfWidthPc;
      const cyPc = -halfWidthPc + ((iy + 0.5) / res.ny) * 2 * halfWidthPc;
      const px = w / 2 + cxPc * pcToPx, py = h / 2 - cyPc * pcToPx;
      // Population-age colour (17 Aug 2026, Step 5) - lerped once per CELL,
      // not per dot, and reused across every dot the cell draws below.
      const wm = warmth[i]!;
      const r = Math.round(COLOUR_YOUNG_RGB[0] + (COLOUR_OLD_RGB[0] - COLOUR_YOUNG_RGB[0]) * wm);
      const g = Math.round(COLOUR_YOUNG_RGB[1] + (COLOUR_OLD_RGB[1] - COLOUR_YOUNG_RGB[1]) * wm);
      const b = Math.round(COLOUR_YOUNG_RGB[2] + (COLOUR_OLD_RGB[2] - COLOUR_YOUNG_RGB[2]) * wm);
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
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
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

/** Bilinear sample of a coarse grid at a fractional (0..1, 0..1) position -
 *  same clamped-edge convention `edgeOnBaselineAndShape` already uses. */
function sampleBilinear(grid: Float64Array, nR: number, nz: number, fracR: number, fracZ: number): number {
  const bR = Math.min(nR - 1, Math.max(0, fracR * nR - 0.5));
  const bR0 = Math.floor(bR), bR1 = Math.min(nR - 1, bR0 + 1), fR = bR - bR0;
  const bZ = Math.min(nz - 1, Math.max(0, fracZ * nz - 0.5));
  const bZ0 = Math.floor(bZ), bZ1 = Math.min(nz - 1, bZ0 + 1), fZ = bZ - bZ0;
  const v00 = grid[bR0 + nR * bZ0]!, v10 = grid[bR1 + nR * bZ0]!;
  const v01 = grid[bR0 + nR * bZ1]!, v11 = grid[bR1 + nR * bZ1]!;
  const v0 = v00 * (1 - fR) + v10 * fR, v1 = v01 * (1 - fR) + v11 * fR;
  return v0 * (1 - fZ) + v1 * fZ;
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
   */
  private async computeAndCacheField(model: GalaxyModel, params: GalaxyParameters, key: string): Promise<DensityDisplayField> {
    this.busyOverlay = showBusyOverlay(this.mapPane, 'Rendering preview…');
    await nextPaint();
    const previewScale = previewScaleFor(model, params);
    const thicknessPc = GALAXY_OVERVIEW_THICKNESS_BASE_PC * previewScale;
    const halfWidthPc = R90_MARGIN * computeR90Pc(model, thicknessPc, previewScale);
    const field = computeDensityDisplayField(
      model, GALAXY_OVERVIEW_CENTRE_PC, halfWidthPc, thicknessPc, GALAXY_OVERVIEW_RES,
      { worldSeed: this.draft.worldSeed, complexTier: params.complexTier },
      1 / R90_MARGIN,
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
    void this.paintCanvas(model, params);
  }

  private async paintCanvas(model: GalaxyModel, params: GalaxyParameters): Promise<void> {
    const field = await this.fieldForCurrentDraft(model, params);
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
    private readonly settings: StarForgeSettings, private readonly onSettingsChange: (s: StarForgeSettings) => void,
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
      this.solRadiusPc = this.params.R0Pc * this.previewScale;
      this.solRHalfWidthPc = this.params.R0Pc * 0.1 * this.previewScale;
      this.solZHalfWidthPc = this.params.juric.hThin * this.previewScale;
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
    const halfWidthPc = R90_MARGIN * computeR90Pc(this.model, thicknessPc, this.previewScale);
    this.galaxyOverview = computeDensityDisplayField(
      this.model, GALAXY_OVERVIEW_CENTRE_PC, halfWidthPc, thicknessPc, GALAXY_OVERVIEW_RES,
      { worldSeed: this.screen1.worldSeed, complexTier: this.params.complexTier },
      1 / R90_MARGIN,
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
    // even before the halo fix; 220px brings that down to a legible ~55 pc/px.
    this.sideOnCanvas = mapPane.createEl('canvas', { attr: { width: '400', height: '220' } });
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
      contentEl, { icon: ANGLE_ICON, title: `Angle (θ) - ${this.draft.angleRad * 180 / Math.PI}°` },
      0, 359, 1, 2, this.draft.angleRad * 180 / Math.PI, (v) => this.setDraft({ angleRad: (v * Math.PI) / 180 }),
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
    private readonly settings: StarForgeSettings, private readonly onSettingsChange: (s: StarForgeSettings) => void,
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
    nav.createEl('button', { text: 'Generate Sector', cls: 'mod-cta' }).onclick = () => { void this.commit(centre); };

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

  /**
   * Best `HabTier` across a system's own planets - `null` when there is
   * nothing to grade (no planets, or no planet carries a habitability
   * verdict) - same convention `types.ts`'s own `SystemSummary.bestHabTier`
   * already establishes; this is that convention's first real consumer.
   */
  private bestHabTierOf(core: SystemCore): HabTier | null {
    let best: HabTier | null = null;
    for (const h of core.humanHabitability) {
      if (h && (best === null || h.tier > best)) best = h.tier;
    }
    return best;
  }

  private async commitInner(centrePc: { x: number; y: number; z: number }): Promise<void> {
    const thickness = thicknessPcFor(this.screen2.sysDensity);
    const assembled = assembleSector(this.screen1.worldSeed, this.model, centrePc, this.screen2.sizeInPc, thickness, this.screen2.footprintShape);
    const total = assembled.stellar.length + assembled.remnants.length;
    new Notice(`Generating ${total} systems (${assembled.remnants.length} remnants) - this may take a moment...`);

    // Sector creation (17 Aug 2026) now writes ONLY the sector-list document
    // - see vault.ts's own header for why the per-system canonical/authored
    // writes below were removed from THIS flow specifically (they remain
    // real, gated infrastructure for a future lazy on-click detail note,
    // not deleted). `generateSystemCore` still runs for real, for every
    // stellar system - that is where the list's own rich columns
    // (habitability, planet types, belts) come from; only the WRITTEN
    // artifact changed, not the computation.
    const rows: SectorListRow[] = [];

    // Yields the event loop every YIELD_EVERY systems (17 Aug 2026) - the
    // old loop's own per-system `await writeSystemNote` gave the busy
    // overlay's `setTimeout` (`commit`'s own SPINNER_DELAY_MS race) real
    // chances to run between iterations; a single list write at the very
    // end removes those chances entirely, so a large sector's generation
    // (still real CPU work, `generateSystemCore` unchanged) would freeze
    // the UI with no spinner for its whole duration. A macrotask yield
    // (`setTimeout(0)`, not `nextPaint`'s costlier double-rAF) restores
    // that without materially slowing generation for a typical sector.
    const YIELD_EVERY = 25;
    const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

    for (let mi = 0; mi < assembled.stellar.length; mi++) {
      if (mi > 0 && mi % YIELD_EVERY === 0) await yieldToEventLoop();
      const m = assembled.stellar[mi]!;
      const s = m.placed;
      const populationMeta = this.model.populations.find((p) => p.key === s.population);
      if (!populationMeta) continue;
      const inputs: GenerateSystemInputs = {
        sysid: s.sysid, genVersion: CURRENT_GEN_VERSION, worldSeed: this.screen1.worldSeed, positionPc: s.positionPc,
        population: s.population, populationMeta, formationRank: s.formationRank,
        terraformScale: this.screen1.terraformScale, terraformIntensity: this.screen1.terraformIntensity,
        conatal: m.conatal,
      };
      const core = generateSystemCore(inputs);
      rows.push({
        sysid: s.sysid,
        // TRUE distance from the SECTOR's own origin (centrePc) - the
        // owner's own explicit spec for this list's sort order (17 Aug
        // 2026, corrected - an earlier draft measured from the galactic
        // origin (0,0,0) instead, a real misreading of the spec).
        distancePc: trueDistance3dPc(s.positionPc, centrePc),
        multiplicity: core.stars.length,
        primaryType: core.stars[0]!.class,
        bestHabTier: this.bestHabTierOf(core),
        planetTypes: formatPlanetTypesCell(core.planets),
        belts: formatBeltsCell(core.belts),
      });
    }

    // Remnants get a row too - position/kind only, same honest scoping the
    // per-system note used to carry for them (full remnant detail is a
    // separately-scoped remaining gap, unaffected by this change).
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
      worldSeed: this.screen1.worldSeed, centrePc, radiusPc: this.screen2.sizeInPc, thicknessPc: thickness,
      footprintShape: this.screen2.footprintShape, stellarCount: assembled.stellar.length,
      remnantCount: assembled.remnants.length, generatedIso: new Date().toISOString(),
    };
    const content = buildSectorListContent(meta, rows);
    const filename = `Sector - ${sanitiseFilenamePart(this.screen1.worldSeed)} - ${filenameTimestamp()}`;
    await writeSectorList(this.app.vault, filename, content);

    new Notice(`StarForge: wrote a ${rows.length}-system sector list to ${SECTOR_FOLDER}/${filename}.md`);
    this.close();
  }
}
