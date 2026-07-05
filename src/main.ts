import { Plugin, TFile } from 'obsidian';
import { StarMapView, STAR_MAP_VIEW_TYPE } from './starMapView';
import { StarForgeSettings, StarForgeSettingTab, DEFAULT_SETTINGS } from './settings';

export default class StarForgePlugin extends Plugin {
  settings!: StarForgeSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register the star map view
    this.registerView(
      STAR_MAP_VIEW_TYPE,
      (leaf) => new StarMapView(leaf)
    );

    // Add ribbon icon to open an empty star map
    this.addRibbonIcon('globe', 'Open Star Map', async () => {
      await this.activateView();
    });

    // Register command: Open active note as star map
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

    // Register command: Open new blank star map
    this.addCommand({
      id: 'open-new-starmap',
      name: 'Open new blank Star Map',
      callback: async () => {
        await this.activateView();
      },
    });

    // Add settings tab
    this.addSettingTab(new StarForgeSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(STAR_MAP_VIEW_TYPE);
  }

  async activateView(file?: TFile): Promise<void> {
    // Detach existing star map leaves (optional; we could keep multiple)
    // this.app.workspace.detachLeavesOfType(STAR_MAP_VIEW_TYPE);

    let leaf = this.app.workspace.getLeaf(false);

    // If the current leaf already shows a star map, reuse it
    if (leaf.view instanceof StarMapView) {
      if (file) {
        await leaf.view.loadFromFile(file);
      }
      return;
    }

    // Create new leaf in a split pane if needed
    leaf = this.app.workspace.getLeaf('split');
    await leaf.setViewState({ type: STAR_MAP_VIEW_TYPE, active: true });

    // Access the view after it's rendered
    this.app.workspace.revealLeaf(leaf);

    // Delay a tick to let the view initialise
    setTimeout(async () => {
      if (leaf.view instanceof StarMapView) {
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
