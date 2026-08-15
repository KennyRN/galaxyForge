/**
 * main - the Obsidian Plugin entry point. Amendment A3 exempts this from
 * provenance headers and ledgers, same as `render`/`vault`.
 *
 * -- WHAT THIS IS, HONESTLY -----------------------------------------------------
 * A REAL, loadable plugin skeleton, not a mock-up: `onload` registers one
 * working command that exercises the actual pipeline built so far
 * (`galaxyModel` -> `placement` -> `vault`) end to end, writing real system
 * notes into the vault. It is deliberately NOT the full product the brief
 * describes - there is no galaxy-creation modal, no settings tab, no
 * sector-map view (S4.8's two views), no sector-centring search UI. Those
 * all need the full conductor (`ctx.age`/`ctx.feh` threaded from
 * `placement` through `stellarPopulation`, `multiplicity`, `planets`,
 * `atmosphere`, `biosphere`) that `galacticDensity.ts`'s and
 * `goldenMaster.conformance.ts`'s own headers already flag as not yet
 * built. This command is scoped to what IS wired together: positions,
 * population and formationRank for a small, fixed test region.
 */

import { Plugin, Notice, type TFile } from 'obsidian';
import { createSpiralModel } from './galaxyModel';
import { rollCell, type CellKey, CELL_SIZE_PC } from './placement';
import { writeSystemNote } from './vault';
import type { RenderSystemInput } from './render';

const TEST_WORLD_SEED = 'starforge-default-seed';

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
    const originIx = Math.floor(8178 / CELL_SIZE_PC);
    const cells: CellKey[] = [];
    for (let ix = originIx - 1; ix <= originIx + 1; ix++) {
      for (let iy = -1; iy <= 1; iy++) cells.push({ ix, iy, iz: 0 });
    }

    let written = 0;
    for (const cell of cells) {
      const systems = rollCell(TEST_WORLD_SEED, model, cell);
      for (const s of systems) {
        const input: RenderSystemInput = {
          sysid: s.sysid, name: null, population: s.population,
          positionPc: s.positionPc, distanceFromSectorOriginPc: 0,
        };
        await writeSystemNote(this.app.vault, input, null);
        written++;
      }
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
