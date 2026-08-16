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
 * `vault`, writing real system notes. Still deliberately NOT the full
 * product the brief describes - there is still no settings tab and no
 * standalone sector-map view (S4.8's second view; the GUI's screen-3
 * position-only preview covers the same ground for this workflow).
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
 */

import { Plugin, Notice, type TFile } from 'obsidian';
import { createSpiralModel } from './galaxyModel';
import { assembleSector } from './sectorFootprint';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { CURRENT_GEN_VERSION } from './genVersion';
import { writeSystemNote } from './vault';
import type { RenderSystemInput } from './render';
import { GalaxyScreen1Modal } from './galaxyCreationModals';

const TEST_WORLD_SEED = 'starforge-default-seed';
const TEST_CENTRE_PC = { x: 8178, y: 0, z: 0 };   // the Sun's own canonical placement default
const TEST_RADIUS_PC = 25;
const TEST_THICKNESS_PC = 10;

export default class StarForgePlugin extends Plugin {
  async onload(): Promise<void> {
    this.addCommand({
      id: 'starforge-generate-test-region',
      name: 'StarForge: generate a small test region',
      callback: () => { void this.generateTestRegion(); },
    });
    this.addCommand({
      id: 'starforge-create-galaxy',
      name: 'StarForge: create a galaxy',
      callback: () => { new GalaxyScreen1Modal(this.app).open(); },
    });
    this.addRibbonIcon('sparkles', 'StarForge: create a galaxy', () => {
      new GalaxyScreen1Modal(this.app).open();
    });
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
      // Full conductor, same as the GUI's own commit path (16 Aug 2026) -
      // this test command exercises the identical pipeline a real "Generate
      // Sector" commit does, not a thinner stand-in.
      const core = populationMeta ? generateSystemCore({
        sysid: s.sysid, genVersion: CURRENT_GEN_VERSION, worldSeed: TEST_WORLD_SEED, positionPc: s.positionPc,
        population: s.population, populationMeta, formationRank: s.formationRank, terraformScale: 3,
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
    new Notice(`StarForge: wrote ${written} system note(s) (${assembled.remnants.length} remnants) to StarForge/Systems/`);
  }

  onunload(): void {
    // Nothing to tear down - this plugin holds no external resources, no
    // timers, no network connections (Gate S1's own guarantee extends here).
  }
}

// Re-exported so a future settings/view module can reuse the file-listing
// helper without reaching into `vault.ts` twice for the same TFile type.
export type { TFile };
