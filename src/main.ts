import { Plugin, TFile, addIcon, Notice } from 'obsidian';
import { StarMapView, STAR_MAP_VIEW_TYPE } from './starMapView';
import { StarForgeSettings, StarForgeSettingTab, DEFAULT_SETTINGS } from './settings';
import { generateSysId, to2dp } from './types';

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

    this.registerView(
      STAR_MAP_VIEW_TYPE,
      (leaf) => new StarMapView(leaf)
    );

    this.addRibbonIcon('starforge-logo', 'Open Star Map', async () => {
      await this.activateView();
    });

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
      id: 'create-new-sector',
      name: 'Create new adjacent sector',
      callback: async () => {
        await this.createNewSector();
      },
    });

    this.addSettingTab(new StarForgeSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(STAR_MAP_VIEW_TYPE);
  }

  /**
   * Create a new sector note that abuts the current sector.
   * The new sector's systems are offset so they sit just outside
   * the current explored region boundary.
   */
  private async createNewSector(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('Open a sector note first.');
      return;
    }

    const content = await this.app.vault.read(activeFile);
    const { parseStarMapData } = await import('./parser');
    const data = parseStarMapData(content);
    if (!data || data.systems.length === 0) {
      new Notice('No systems found in the current note.');
      return;
    }

    // Find the bounding box of existing systems
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

    // Pick a random direction: right, left, up, or down
    const dirs = [
      { dx: sectorWidth, dy: 0 },
      { dx: -sectorWidth, dy: 0 },
      { dx: 0, dy: sectorHeight },
      { dx: 0, dy: -sectorHeight },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];

    // Generate 3-5 new systems in the new sector
    const count = 3 + Math.floor(Math.random() * 3);
    const newSystems: string[] = [];
    const lines: string[] = [];
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

      lines.push(`  - sysid: "${sysid}"`);
      lines.push(`    x: ${x.toFixed(2)}`);
      lines.push(`    y: ${y.toFixed(2)}`);
      lines.push(`    z: ${z.toFixed(2)}`);
      newSystems.push(sysid);
    }

    // Create the new sector note
    const sectorName = `Sector-${generateSysId()}`;
    const folderPath = 'Sectors';
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof import('obsidian').TFolder)) {
      await this.app.vault.createFolder(folderPath).catch(() => {});
    }

    const filePath = `${folderPath}/${sectorName}.md`;
    const starmapContent = [
      `# ${sectorName}`,
      '',
      '```starmap',
      'systems:',
      ...lines,
      '```',
      '',
      `Adjacent to: [[${activeFile.basename}]]`,
    ].join('\n');

    const newFile = await this.app.vault.create(filePath, starmapContent);
    new Notice(`Created new sector: ${sectorName}`);

    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(newFile);
  }

  async activateView(file?: TFile): Promise<void> {
    let leaf = this.app.workspace.getLeaf(false);

    if (leaf.view instanceof StarMapView) {
      if (file) {
        await leaf.view.loadFromFile(file);
      }
      // Push current boundary shape setting
      leaf.view.setBoundaryShape(this.settings.boundaryShape);
      return;
    }

    leaf = this.app.workspace.getLeaf('split');
    await leaf.setViewState({ type: STAR_MAP_VIEW_TYPE, active: true });

    this.app.workspace.revealLeaf(leaf);

    setTimeout(async () => {
      if (leaf.view instanceof StarMapView) {
        leaf.view.setBoundaryShape(this.settings.boundaryShape);
        if (file) {
          await leaf.view.loadFromFile(file);
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
