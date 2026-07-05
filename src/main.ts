import { Plugin, TFile } from 'obsidian';
import { StarMapView, STAR_MAP_VIEW_TYPE } from './starMapView';
import { StarForgeSettings, StarForgeSettingTab, DEFAULT_SETTINGS } from './settings';

export const STARFORGE_SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
<path d="M17.734 17.734c4.524-4.524 5.624-10.759 2.458-13.926C17.627 1.244 13.05 1.478 9 4.062m-5.192 16.13c2.478 2.478 6.835 2.343 10.78 0M6.266 6.266C2.98 9.552 1.5 13.74 2.15 17"/>
<path d="M16.915 7.085c-1.9-1.9-5.641-1.24-8.355 1.475s-3.375 6.455-1.475 8.355s5.641 1.24 8.356-1.474C17.09 13.79 17.98 11.764 18 10"/>
<path d="M13.638 10.362c.634.633.414 1.88-.491 2.785s-2.152 1.125-2.785.491c-.634-.633-.414-1.88.491-2.785s2.152-1.125 2.785-.491Z"/>
</svg>`;

export default class StarForgePlugin extends Plugin {
  settings!: StarForgeSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      STAR_MAP_VIEW_TYPE,
      (leaf) => new StarMapView(leaf)
    );

    this.addRibbonIcon('globe', 'Open Star Map', async () => {
      await this.activateView();
    });

    this.app.workspace.onLayoutReady(() => {
      this.replaceRibbonIcon();
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

    this.addSettingTab(new StarForgeSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(STAR_MAP_VIEW_TYPE);
  }

  private replaceRibbonIcon(): void {
    const ribbonItems = document.querySelectorAll('.clickable-icon');
    for (const item of ribbonItems) {
      const titleAttr = item.getAttribute('aria-label');
      if (titleAttr === 'Open Star Map') {
        const svgEl = item.querySelector('svg');
        if (svgEl) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(STARFORGE_SVG_ICON, 'image/svg+xml');
          const newSvg = doc.documentElement;
          newSvg.setAttribute('width', '24');
          newSvg.setAttribute('height', '24');
          newSvg.setAttribute('viewBox', '0 0 24 24');
          svgEl.parentNode?.replaceChild(newSvg, svgEl);
        }
        break;
      }
    }
  }

  async activateView(file?: TFile): Promise<void> {
    let leaf = this.app.workspace.getLeaf(false);

    if (leaf.view instanceof StarMapView) {
      if (file) {
        await leaf.view.loadFromFile(file);
      }
      return;
    }

    leaf = this.app.workspace.getLeaf('split');
    await leaf.setViewState({ type: STAR_MAP_VIEW_TYPE, active: true });

    this.app.workspace.revealLeaf(leaf);

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
