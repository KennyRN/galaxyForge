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
 */

import { Modal, Setting, Notice, type App } from 'obsidian';
import { createSpiralModel, createEllipticalModel, createLenticularModel, type GalaxyModel } from './galaxyModel';
import { upsilonFor } from './galacticDensity';
import { fieldFromModel, projectSlab, sampleVolume, normaliseForDisplay, type SlabRegionPc, type VolumeRegionPc } from './densityMap';
import { generateSector } from './sectorFootprint';
import { searchNearestSystem } from './sectorSearch';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { writeSystemNote } from './vault';
import type { RenderSystemInput } from './render';
import {
  type MorphologyChoice, type Screen1Draft, type Screen2Draft,
  defaultScreen1Draft, defaultScreen2Draft, resolveModelName, resolveBarEnabled,
  sizeStepsFor, sizeValueFor, sizeIsMass, thicknessPcFor, centrePcFromPolar,
  reconcileSizeFields, assembleSearchCriteria, isWithinFootprint,
} from './galaxyCreationState';
import type { FootprintShape } from './sectorFootprint';

const MORPHOLOGY_LABELS: Readonly<Record<MorphologyChoice, string>> = {
  lenticular: 'Lenticular', elliptical: 'Elliptical', barredSpiral: 'Barred', spiral: 'Spiral', milkyWayAnalogue: 'Milky Way Analogue',
};

/** Builds the real `GalaxyModel` a draft resolves to - the ONE place a
 *  morphology choice becomes an actual model, so screens never build one
 *  independently and risk disagreeing (Law 1). */
function modelFromDraft(d: Screen1Draft): GalaxyModel {
  const name = resolveModelName(d.morphology);
  const sizeValue = sizeValueFor(d.morphology, d.sizeStepIndex);
  if (name === 'spiral' || name === 'barredSpiral') return createSpiralModel(resolveBarEnabled(d.morphology));
  if (name === 'elliptical') return createEllipticalModel(sizeValue, upsilonFor);
  return createLenticularModel(sizeValue, upsilonFor, d.lenticularBulgeType);
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

/** Renders the density field as a textured scatter (importance-sampled
 *  stipple, not a smooth gradient) - per this session's own "should look
 *  like a map of the Milky Way complete with clumps, not just radiating
 *  lines". Purely visual dithering, `Math.random()` - NOT the plugin's own
 *  seeded/channelled RNG, since this draws nothing and generates no
 *  system; it is exactly `densityMap`'s own "reveals, does not roll"
 *  posture, extended to pixels. */
function renderDensityCanvas(
  canvas: HTMLCanvasElement, model: GalaxyModel,
  centrePc: { x: number; y: number; z: number }, halfWidthPc: number, thicknessPc: number,
  overlay: { readonly radiusPc: number; readonly shape: FootprintShape } | null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, w, h);

  const region: SlabRegionPc = { centre: centrePc, halfWidthPc, halfDepthPc: halfWidthPc, thicknessPc };
  const res = { nx: 80, ny: 80 };
  const surface = projectSlab(fieldFromModel(model), region, res);
  const norm = normaliseForDisplay(surface.values, { log: true });

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

  if (overlay) {
    const pts = boundaryPointsPc(overlay.radiusPc, overlay.shape);
    ctx.strokeStyle = '#e0b25a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = w / 2 + p.x * pcToPx, py = h / 2 - p.y * pcToPx;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    // Centre marker.
    ctx.fillStyle = '#e0b25a';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 2.5, 0, 2 * Math.PI);
    ctx.fill();
  }
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
function renderEdgeOnCanvas(canvas: HTMLCanvasElement, model: GalaxyModel, centrePc: { x: number; y: number; z: number }, halfDepthPc: number, halfHeightPc: number): void {
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
  private draft: Screen1Draft = defaultScreen1Draft();
  private canvas!: HTMLCanvasElement;

  constructor(app: App) { super(app); }

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
        .onChange((v) => { this.draft = { ...this.draft, worldSeed: v }; }))
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
    new Setting(contentEl).setName('Terraforming prevalence').setDesc(`${this.draft.terraformScale} / 6`)
      .addSlider((s) => s.setLimits(0, 6, 1).setValue(this.draft.terraformScale).setDynamicTooltip()
        .onChange((v) => { this.draft = { ...this.draft, terraformScale: v }; this.render(); }));

    this.canvas = contentEl.createEl('canvas', { attr: { width: '360', height: '360' } });
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '12px auto';
    const model = modelFromDraft(this.draft);
    renderDensityCanvas(this.canvas, model, { x: 0, y: 0, z: 0 }, 20000, 4000, null);

    const nav = contentEl.createDiv();
    nav.createEl('span');
    nav.createEl('button', { text: 'Next →', cls: 'mod-cta' }).onclick = () => {
      const seed = this.draft.worldSeed.trim().length > 0 ? this.draft.worldSeed : Math.random().toString(36).slice(2);
      this.close();
      new GalaxyScreen2Modal(this.app, { ...this.draft, worldSeed: seed }).open();
    };
  }
}

/* --------------------------------- screen 2 -------------------------------------- */

export class GalaxyScreen2Modal extends Modal {
  private draft: Screen2Draft = defaultScreen2Draft();
  private model: GalaxyModel;
  private topDownCanvas!: HTMLCanvasElement;
  private sideOnCanvas!: HTMLCanvasElement;

  constructor(app: App, private readonly screen1: Screen1Draft) {
    super(app);
    this.model = modelFromDraft(screen1);
  }

  onOpen(): void {
    this.titleEl.setText('Create a Galaxy - Sector Centre');
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
    renderDensityCanvas(this.topDownCanvas, this.model, centre, Math.max(this.draft.sizeInPc * 4, 500), thickness, { radiusPc: this.draft.sizeInPc, shape: this.draft.footprintShape });

    this.sideOnCanvas = contentEl.createEl('canvas', { attr: { width: '400', height: '80' } });
    this.sideOnCanvas.style.display = 'block';
    this.sideOnCanvas.style.margin = '4px auto 12px';
    const halfDepthPc = Math.max(this.draft.sizeInPc * 4, 500);
    renderEdgeOnCanvas(this.sideOnCanvas, this.model, centre, halfDepthPc, Math.max(thickness * 3, 400));

    new Setting(contentEl).setName('Angle (θ)').setDesc(`${(this.draft.angleRad * 180 / Math.PI).toFixed(0)}°`)
      .addSlider((s) => s.setLimits(0, 359, 1).setValue(Math.round(this.draft.angleRad * 180 / Math.PI))
        .onChange((v) => this.setDraft({ angleRad: (v * Math.PI) / 180 })));
    new Setting(contentEl).setName('Distance from centre (R)').setDesc(`${this.draft.distanceFromCentrePc.toFixed(0)} pc`)
      .addSlider((s) => s.setLimits(0, 20000, 50).setValue(this.draft.distanceFromCentrePc)
        .onChange((v) => this.setDraft({ distanceFromCentrePc: v })));
    new Setting(contentEl).setName('Distance from galactic plane (z)').setDesc(`${this.draft.distanceFromPlanePc.toFixed(0)} pc`)
      .addSlider((s) => s.setLimits(-2000, 2000, 10).setValue(this.draft.distanceFromPlanePc)
        .onChange((v) => this.setDraft({ distanceFromPlanePc: v })));

    new Setting(contentEl).setName('Sector shape')
      .addDropdown((d) => d.addOption('circle', 'Circle').addOption('square', 'Square').addOption('hexagon', 'Hexagon')
        .setValue(this.draft.footprintShape).onChange((v) => this.setDraft({ footprintShape: v as FootprintShape })));
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
    nav.createEl('button', { text: '← Back' }).onclick = () => { this.close(); new GalaxyScreen1Modal(this.app).open(); };
    nav.createEl('button', { text: 'Next →', cls: 'mod-cta' }).onclick = () => {
      this.close();
      new GalaxyScreen3Modal(this.app, this.screen1, this.draft, this.model).open();
    };
  }

  private runSearch(): void {
    const origin = centrePcFromPolar(this.draft);
    const criteria = assembleSearchCriteria(this.draft);
    const result = searchNearestSystem(this.screen1.worldSeed, this.model, 2, this.screen1.terraformScale, origin, criteria, Math.max(this.draft.sizeInPc * 20, 2000));
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
  constructor(app: App, private readonly screen1: Screen1Draft, private readonly screen2: Screen2Draft, private readonly model: GalaxyModel) { super(app); }

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
    nav.createEl('button', { text: '← Back' }).onclick = () => { this.close(); new GalaxyScreen2Modal(this.app, this.screen1).open(); };
    nav.createEl('button', { text: 'Generate Sector', cls: 'mod-cta' }).onclick = () => { void this.commit(sector, centre); };
  }

  private async commit(sector: ReturnType<typeof generateSector>, centrePc: { x: number; y: number; z: number }): Promise<void> {
    new Notice(`Generating ${sector.length} systems - this may take a moment...`);
    let written = 0;
    for (const s of sector) {
      const populationMeta = this.model.populations.find((p) => p.key === s.population);
      if (!populationMeta) continue;
      const inputs: GenerateSystemInputs = {
        sysid: s.sysid, genVersion: 2, worldSeed: this.screen1.worldSeed, positionPc: s.positionPc,
        population: s.population, populationMeta, formationRank: s.formationRank, terraformScale: this.screen1.terraformScale,
      };
      // Full conductor runs here (screen 3 deliberately never calls it -
      // position-only preview) so every system is REALLY generated, not
      // merely placed - but its result is not yet rendered into the note.
      // render.ts's own RenderSystemInput still only carries
      // sysid/population/position (Stage 11's own honest scoping - see
      // its header) - extending it to show the full SystemCore (stars,
      // planets, habitability...) is real, separate follow-up work, not
      // done here. The conductor call is NOT a no-op though: it is what
      // makes "Generate Sector" a genuine full-pipeline commit rather than
      // a placement-only one, exercising every science module for real,
      // even though the note body doesn't display the result yet.
      const core = generateSystemCore(inputs);
      void core;
      const d = { x: s.positionPc.x - centrePc.x, y: s.positionPc.y - centrePc.y, z: s.positionPc.z - centrePc.z };
      const input: RenderSystemInput = {
        sysid: s.sysid, name: null, population: s.population, positionPc: s.positionPc,
        distanceFromSectorOriginPc: Math.hypot(d.x, d.y, d.z),
      };
      await writeSystemNote(this.app.vault, input, null);
      written++;
    }
    new Notice(`StarForge: wrote ${written} system note(s) to StarForge/Systems/`);
    this.close();
  }
}
