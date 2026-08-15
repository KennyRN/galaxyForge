/**
 * main - the Obsidian Plugin entry point. Amendment A3 exempts this from
 * provenance headers and ledgers, same as `render`/`vault`.
 *
 * -- WHAT THIS IS, HONESTLY -----------------------------------------------------
 * A REAL, loadable plugin skeleton, not a mock-up: `onload` registers one
 * working command that exercises the actual pipeline built so far
 * (`galaxyModel` -> `sectorFootprint` -> `vault`) end to end, writing real
 * system notes into the vault. It is deliberately NOT the full product the
 * brief describes - there is no galaxy-creation modal, no settings tab, no
 * sector-map view (S4.8's two views), no sector-centring search UI wired in
 * (the engine behind it, `sectorSearch.ts`, exists and is gated - only the
 * UI to drive it does not). This command is scoped to what IS wired
 * together: a real circular-footprint sector, positions/population/
 * formationRank per system.
 *
 * UPDATED 15 Aug 2026: previously walked a fixed, unfiltered 3x3 cell block
 * - this module's own header named that as a placeholder standing in for
 * work that did not exist yet. `sectorFootprint.generateSector` is that
 * work, now real: a proper circumradius-clipped, exclusion-resolved
 * sector, not a crude cell-block approximation.
 */

import { Plugin, Notice, type TFile } from 'obsidian';
import { createSpiralModel } from './galaxyModel';
import { generateSector } from './sectorFootprint';
import { writeSystemNote } from './vault';
import type { RenderSystemInput } from './render';

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
  }

  private async generateTestRegion(): Promise<void> {
    const model = createSpiralModel(false);
    const systems = generateSector(TEST_WORLD_SEED, model, TEST_CENTRE_PC, TEST_RADIUS_PC, TEST_THICKNESS_PC, 'circle');

    let written = 0;
    for (const s of systems) {
      const dx = s.positionPc.x - TEST_CENTRE_PC.x, dy = s.positionPc.y - TEST_CENTRE_PC.y, dz = s.positionPc.z - TEST_CENTRE_PC.z;
      const input: RenderSystemInput = {
        sysid: s.sysid, name: null, population: s.population,
        positionPc: s.positionPc, distanceFromSectorOriginPc: Math.hypot(dx, dy, dz),
      };
      await writeSystemNote(this.app.vault, input, null);
      written++;
    }
    new Notice(`StarForge: wrote ${written} system note(s) to StarForge/Systems/`);
  }

  onunload(): void {
    // Nothing to tear down - this plugin holds no external resources, no
    // timers, no network connections (Gate S1's own guarantee extends here).
  }
}

// Re-exported so a future settings/view module can reuse the file-listing
// helper without reaching into `vault.ts` twice for the same TFile type.
export type { TFile };
