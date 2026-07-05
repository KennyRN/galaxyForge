import { Plugin, TFile, TFolder, addIcon, Notice } from 'obsidian';
import { StarMapView, STAR_MAP_VIEW_TYPE } from './starMapView';
import { StarForgeSettings, StarForgeSettingTab, DEFAULT_SETTINGS } from './settings';
import { generateSysId, to2dp } from './types';
import { parseStarMapData } from './parser';
import { SetupModal } from './setupModal';
import { createDisplayClosestProcessor } from './displayClosest';
import { DistanceModal } from './distanceModal';

// Store the current starmap data for the post-processor
let currentStarMapData: import('./types').StarMapData | null = null;

addIcon(
  'starforge-logo',
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
    <path d="M17.734 17.734c4.524-4.524 5.624-10.759 2.458-13.926C17.627 1.244 13.05 1.478 9 4.062m-5.192 16.13c2.478 2.478 6.835 2.343 10.78 0M6.266 6.266C2.98 9.552 1.5 13.74 2.15 17"/>
    <path d="M16.915 7.085c-1.9-1.9-5.641-1.24-8.355 1.475s-3.375 6.455-1.475 8.355s5.641 1.24 8.356-1.474C17.09 13.79 17.98 11.764 18 10"/>
    <path d="M13.638 10.362c.634.633.414 1.88-.491 2.785s-2.152 1.125-2.785.491c-.634-.633-.414-1.88.491-2.785s2.152-1.125 2.785-.491Z"/>
  </svg>`
);

export default class StarForgePlugin extends Plugin {
  settings!: StarForgeSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // First-run setup
    if (!this.settings.setupComplete) {
      this.app.workspace.onLayoutReady(() => {
        new SetupModal(this.app, async (result) => {
          this.settings.starmapFolder = result.starmapFolder;
          this.settings.systemsFolder = result.systemsFolder;
          this.settings.setupComplete = true;
          await this.saveSettings();
          new Notice('StarForge setup complete!');
        }).open();
      });
    }

    this.registerView(
      STAR_MAP_VIEW_TYPE,
      (leaf) => new StarMapView(leaf)
    );

    this.addRibbonIcon('starforge-logo', 'Open Star Map', async () => {
      await this.activateView();
    });

    // Register commands
    this.addCommand({
      id: 'open-active-as-starmap',
      name: 'Open current note as Star Map',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          await this.activateView(activeFile);
        } else {
          await this.activateView();
        }
      },
    });

    this.addCommand({
      id: 'open-new-starmap',
      name: 'Open new blank Star Map',
      callback: async () => {
        await this.activateView();
      },
    });

    this.addCommand({
      id: 'expand-sector',
      name: 'Expand current sector with new systems',
      callback: async () => {
        await this.expandSector();
      },
    });

    this.addCommand({
      id: 'calculate-distance',
      name: 'Calculate distance between two systems',
      callback: async () => {
        if (!currentStarMapData || currentStarMapData.systems.length < 2) {
          new Notice('Open a starmap with at least two systems first.');
          return;
        }
        new DistanceModal(this.app, currentStarMapData.systems).open();
      },
    });

    this.addSettingTab(new StarForgeSettingTab(this.app, this));

    // Register the markdown post-processor for inline markers
    this.registerMarkdownPostProcessor(
      createDisplayClosestProcessor(() => currentStarMapData)
    );
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(STAR_MAP_VIEW_TYPE);
  }

  private async expandSector(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('Open a sector note first.');
      return;
    }

    const content = await this.app.vault.read(activeFile);
    const data = parseStarMapData(content);
    if (!data || data.systems.length === 0) {
      new Notice('No systems found in the current note.');
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const sys of data.systems) {
      if (sys.x < minX) minX = sys.x;
      if (sys.x > maxX) maxX = sys.x;
      if (sys.y < minY) minY = sys.y;
      if (sys.y > maxY) maxY = sys.y;
    }

    const sectorWidth = maxX - minX + 30;
    const sectorHeight = maxY - minY + 30;

    const dirs = [
      { dx: sectorWidth, dy: 0 },
      { dx: -sectorWidth, dy: 0 },
      { dx: 0, dy: sectorHeight },
      { dx: 0, dy: -sectorHeight },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];

    const count = 3 + Math.floor(Math.random() * 3);
    const newSystems: string[] = [];
    const usedIds = new Set(data.systems.map((s) => s.sysid));

    for (let i = 0; i < count; i++) {
      let sysid: string;
      do {
        sysid = generateSysId();
      } while (usedIds.has(sysid));
      usedIds.add(sysid);

      const x = to2dp(
        (minX + maxX) / 2 + dir.dx + (Math.random() - 0.5) * sectorWidth * 0.6
      );
      const y = to2dp(
        (minY + maxY) / 2 + dir.dy + (Math.random() - 0.5) * sectorHeight * 0.6
      );
      const z = to2dp((Math.random() - 0.5) * 10);

      newSystems.push(`  - sysid: "${sysid}"`);
      newSystems.push(`    x: ${x.toFixed(2)}`);
      newSystems.push(`    y: ${y.toFixed(2)}`);
      newSystems.push(`    z: ${z.toFixed(2)}`);
    }

    const starmapRegex = /```starmap\n[\s\S]*?```/;
    const blockMatch = content.match(starmapRegex);
    if (!blockMatch) return;

    const oldBlock = blockMatch[0];
    const tradeIdx = oldBlock.indexOf('tradeLines:');
    let newBlock: string;

    if (tradeIdx !== -1) {
      newBlock =
        oldBlock.slice(0, tradeIdx) +
        newSystems.join('\n') + '\n\n' +
        oldBlock.slice(tradeIdx);
    } else {
      const closeIdx = oldBlock.lastIndexOf('```');
      newBlock =
        oldBlock.slice(0, closeIdx) +
        '\n' + newSystems.join('\n') + '\n' +
        oldBlock.slice(closeIdx);
    }

    const newContent = content.replace(starmapRegex, newBlock);
    await this.app.vault.modify(activeFile, newContent);

    this.settings.boundaryShape = 'composite';
    await this.saveSettings();

    new Notice(`Added ${count} new system(s). Boundary switched to Composite.`);

    const leaf = this.app.workspace.getLeaf(false);
    if (leaf.view instanceof StarMapView) {
      leaf.view.setBoundaryShape('composite');
      await leaf.view.loadFromFile(activeFile);
    }
  }

  async activateView(file?: TFile): Promise<void> {
    let leaf = this.app.workspace.getLeaf(false);

    if (leaf.view instanceof StarMapView) {
      if (file) {
        await leaf.view.loadFromFile(file);
        currentStarMapData = leaf.view.getData();
      }
      leaf.view.setBoundaryShape(this.settings.boundaryShape);
      leaf.view.setSystemsFolder(this.settings.systemsFolder);
      return;
    }

    leaf = this.app.workspace.getLeaf('split');
    await leaf.setViewState({ type: STAR_MAP_VIEW_TYPE, active: true });

    this.app.workspace.revealLeaf(leaf);

    setTimeout(async () => {
      if (leaf.view instanceof StarMapView) {
        leaf.view.setBoundaryShape(this.settings.boundaryShape);
        leaf.view.setSystemsFolder(this.settings.systemsFolder);
        if (file) {
          await leaf.view.loadFromFile(file);
          currentStarMapData = leaf.view.getData();
        }
      }
    }, 100);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
