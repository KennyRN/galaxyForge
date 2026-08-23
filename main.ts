/**
 * main - the Obsidian Plugin entry point. Amendment A3 exempts this from
 * provenance headers and ledgers, same as `render`/`vault`.
 *
 * -- WHAT THIS IS, HONESTLY -----------------------------------------------------
 * A REAL, loadable plugin, not a mock-up. `onload` registers TWO entry
 * points into the same galaxy-creation flow - a command AND a ribbon icon,
 * both opening `GalaxyScreen1Modal` - plus the older single-command test
 * harness kept for direct pipeline exercise. The three-screen GUI
 * (`galaxyCreationModals.ts`) drives the full built pipeline: morphology ->
 * `galaxyModel` -> `sectorSearch`/`sectorFootprint` -> `systemConductor` ->
 * `vault`, writing ONE real sector-list document per generated sector (17
 * Aug 2026 - previously one canonical + one authored note per system; see
 * `vault.ts`'s own header for the full story and why that machinery
 * remains real, just no longer called from this flow). Still deliberately
 * NOT the full product the brief describes - there is still no settings
 * tab and no standalone sector-map view (S4.8's second view; the GUI's
 * screen-3 position-only preview covers the same ground for this
 * workflow).
 *
 * UPDATED 15 Aug 2026: previously walked a fixed, unfiltered 3x3 cell block
 * - this module's own header named that as a placeholder standing in for
 * work that did not exist yet. `sectorFootprint.generateSector` is that
 * work, now real: a proper circumradius-clipped, exclusion-resolved
 * sector, not a crude cell-block approximation.
 *
 * UPDATED 16 Aug 2026: added the ribbon icon (`sparkles`) alongside the
 * command palette entry - both open the same modal, so neither is more
 * "canonical" than the other.
 *
 * UPDATED 16 Aug 2026 (later the same day): this test command's own
 * generated notes now carry full `SystemCore` detail too (stars, planets,
 * habitability - `render.ts`'s new `RenderSystemInput.core` field), the
 * same fix applied to `galaxyCreationModals.ts`'s real commit path - an
 * audit found both call sites were running the full conductor and
 * discarding its result before it ever reached a note.
 *
 * UPDATED 16 Aug 2026 (settings): a real settings tab and `data.json`
 * persistence, closing this file's own former "no settings tab" gap.
 * Deliberately small - the ONLY thing worth persisting across restarts
 * that this GUI doesn't already ask for every time is the world seed
 * (rerolling it by hand every session is real friction; every other
 * screen-1 choice is cheap to reset) and the default terraforming
 * prevalence. `StarForgeSettings` is intentionally NOT the place for
 * anything Tier-G-pinned (`GalaxyParameters` already owns that, per-galaxy,
 * once created) - this is plugin-wide UI convenience only.
 */

import { Plugin, PluginSettingTab, Notice, Setting, type App, type TFile } from 'obsidian';
import { createSpiralModel } from './galaxyModel';
import { assembleSector } from './sectorFootprint';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { CURRENT_GEN_VERSION } from './genVersion';
import { writeSystemNote, CANONICAL_FOLDER } from './vault';
import type { RenderSystemInput } from './render';
import { GalaxyScreen1Modal } from './galaxyCreationModals';
import type { MorphologyChoice, LenticularBulgeType, Screen2Draft } from './galaxyCreationState';

const TEST_WORLD_SEED = 'starforge-default-seed';
const TEST_CENTRE_PC = { x: 8178, y: 0, z: 0 };   // the Sun's own canonical placement default
const TEST_RADIUS_PC = 25;
const TEST_THICKNESS_PC = 10;

export interface StarForgeSettings {
  /** The last world seed used to open the galaxy-creation flow - pre-fills
   *  Screen 1's own seed field so re-opening the GUI does not silently
   *  reset to a fresh random seed every time. Empty string means "no
   *  seed used yet", not a literal seed value (Screen 1's own placeholder
   *  behaviour on an empty field is unchanged: leave blank for random). */
  lastWorldSeed: string;
  /** Pre-fills Screen 1's terraforming-coverage slider (0-6) - of the worlds
   *  within reach (see `defaultTerraformIntensity`), how much of that pool
   *  actually gets terraformed, easiest worlds first. */
  defaultTerraformScale: number;
  /** Pre-fills Screen 1's terraforming-reach slider (0-6) - how difficult a
   *  world can be and still be a candidate at all. Paired with
   *  `defaultTerraformScale`, never a replacement for it - see
   *  `terraforming.ts`'s own header for why one dial could not carry both.
   *  Redesigned 16 Aug 2026 after a direct user correction; the field keeps
   *  its original name (Law 5) though its meaning changed. */
  defaultTerraformIntensity: number;
  /** Screen 1's own last-used morphology/size/bulge choice (16 Aug 2026,
   *  a direct user report: Screen 2's own reset problem, below, applies
   *  identically to the rest of Screen 1's draft - only `lastWorldSeed`
   *  and the two terraforming dials survived a re-open before this).
   *  Optional: absent until Screen 1 has actually been visited once. */
  lastScreen1Extras?: { morphology: MorphologyChoice; sizeStepIndex: number; lenticularBulgeType: LenticularBulgeType };
  /** Screen 2's own last-used draft, in full (16 Aug 2026, a direct user
   *  report: "when leave and come back to the 2nd page... everything is
   *  reset"). Optional: absent until Screen 2 has been visited once. */
  lastScreen2Draft?: Screen2Draft;
}

export const DEFAULT_SETTINGS: StarForgeSettings = {
  lastWorldSeed: '', defaultTerraformScale: 3, defaultTerraformIntensity: 3,
};

export default class StarForgePlugin extends Plugin {
  settings: StarForgeSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: 'starforge-generate-test-region',
      name: 'StarForge: generate a small test region',
      callback: () => { void this.generateTestRegion(); },
    });
    this.addCommand({
      id: 'starforge-create-galaxy',
      name: 'StarForge: create a galaxy',
      callback: () => { this.openGalaxyCreation(); },
    });
    this.addRibbonIcon('sparkles', 'StarForge: create a galaxy', () => {
      this.openGalaxyCreation();
    });
    this.addSettingTab(new StarForgeSettingTab(this.app, this));
  }

  private openGalaxyCreation(): void {
    new GalaxyScreen1Modal(this.app, this.settings, (updated) => {
      this.settings = updated;
      void this.saveSettings();
    }).open();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async generateTestRegion(): Promise<void> {
    const model = createSpiralModel(false);
    // assembleSector (16 Aug 2026), not generateSector: composes the
    // stellar, remnant AND co-natal-chemistry layers together - see
    // sectorFootprint.ts's own header for why generateSector alone left
    // remnants.ts/conatal.ts unreachable from any real sector.
    const assembled = assembleSector(TEST_WORLD_SEED, model, TEST_CENTRE_PC, TEST_RADIUS_PC, TEST_THICKNESS_PC, 'circle');

    let written = 0;
    for (const m of assembled.stellar) {
      const s = m.placed;
      const populationMeta = model.populations.find((p) => p.key === s.population);
      const dx = s.positionPc.x - TEST_CENTRE_PC.x, dy = s.positionPc.y - TEST_CENTRE_PC.y, dz = s.positionPc.z - TEST_CENTRE_PC.z;
      // Full conductor, same as the GUI's own commit path (16 Aug 2026).
      // UPDATED 17 Aug 2026: the GUI's real "Generate Sector" commit no
      // longer writes per-system notes at all (it writes ONE sector-list
      // document instead - see vault.ts's own header) - this test command
      // now deliberately DIVERGES from it to remain the one place
      // `writeSystemNote`/render.ts's fence machinery still gets exercised
      // directly, real infrastructure for a future lazy on-click detail
      // note, not dead code.
      const core = populationMeta ? generateSystemCore({
        sysid: s.sysid, genVersion: CURRENT_GEN_VERSION, worldSeed: TEST_WORLD_SEED, positionPc: s.positionPc,
        population: s.population, populationMeta, formationRank: s.formationRank, terraformScale: 3, terraformIntensity: 3,
        conatal: m.conatal,
      } satisfies GenerateSystemInputs) : undefined;
      const input: RenderSystemInput = {
        sysid: s.sysid, name: null, population: s.population,
        positionPc: s.positionPc, distanceFromSectorOriginPc: Math.hypot(dx, dy, dz), core,
      };
      await writeSystemNote(this.app.vault, input, null);
      written++;
    }
    for (const r of assembled.remnants) {
      const dx = r.positionPc.x - TEST_CENTRE_PC.x, dy = r.positionPc.y - TEST_CENTRE_PC.y, dz = r.positionPc.z - TEST_CENTRE_PC.z;
      const input: RenderSystemInput = {
        sysid: r.sysid, name: null, population: r.kind,
        positionPc: r.positionPc, distanceFromSectorOriginPc: Math.hypot(dx, dy, dz),
      };
      await writeSystemNote(this.app.vault, input, null);
      written++;
    }
    new Notice(`StarForge: wrote ${written} system note(s) (${assembled.remnants.length} remnants) to ${CANONICAL_FOLDER}/`);
  }

  onunload(): void {
    // Nothing to tear down - this plugin holds no external resources, no
    // timers, no network connections (Gate S1's own guarantee extends here).
  }
}

class StarForgeSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: StarForgePlugin) { super(app, plugin); }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'StarForge' });

    new Setting(containerEl)
      .setName('Last world seed')
      .setDesc('Pre-fills the seed field when you open "Create a galaxy". Leave blank to always start from a random seed.')
      .addText((t) => t.setValue(this.plugin.settings.lastWorldSeed).setPlaceholder('(random)')
        .onChange((v) => {
          this.plugin.settings = { ...this.plugin.settings, lastWorldSeed: v };
          void this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default terraforming coverage')
      .setDesc(`${this.plugin.settings.defaultTerraformScale} / 6 - of the worlds within reach (see below), how much of that pool gets terraformed by default, easiest worlds first.`)
      .addSlider((s) => s.setLimits(0, 6, 1).setValue(this.plugin.settings.defaultTerraformScale).setDynamicTooltip()
        .onChange((v) => {
          this.plugin.settings = { ...this.plugin.settings, defaultTerraformScale: v };
          void this.plugin.saveSettings();
          this.display();   // refresh the description's own "X / 6" text
        }));

    new Setting(containerEl)
      .setName('Default terraforming reach')
      .setDesc(`${this.plugin.settings.defaultTerraformIntensity} / 6 - how difficult a world can be and still be a candidate at all, by default (separate from coverage above).`)
      .addSlider((s) => s.setLimits(0, 6, 1).setValue(this.plugin.settings.defaultTerraformIntensity).setDynamicTooltip()
        .onChange((v) => {
          this.plugin.settings = { ...this.plugin.settings, defaultTerraformIntensity: v };
          void this.plugin.saveSettings();
          this.display();
        }));
  }
}

// Re-exported so a future settings/view module can reuse the file-listing
// helper without reaching into `vault.ts` twice for the same TFile type.
export type { TFile };
