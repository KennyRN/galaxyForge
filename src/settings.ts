import { PluginSettingTab, Setting, App, Plugin } from 'obsidian';

export type BoundaryShape = 'rectangle' | 'circle' | 'composite';

export interface StarForgeSettings {
  defaultZoom: number;
  showLabels: boolean;
  labelFontSize: number;
  tradeLineOpacity: number;
  backgroundColor: string;
  boundaryShape: BoundaryShape;
  starmapFolder: string;
  systemsFolder: string;
  setupComplete: boolean;
}

export const DEFAULT_SETTINGS: StarForgeSettings = {
  defaultZoom: 1,
  showLabels: true,
  labelFontSize: 12,
  tradeLineOpacity: 0.7,
  backgroundColor: '#0a0a1a',
  boundaryShape: 'rectangle',
  starmapFolder: '',
  systemsFolder: 'Systems',
  setupComplete: false,
};

export class StarForgeSettingTab extends PluginSettingTab {
  private plugin: Plugin;

  constructor(app: App, plugin: Plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'StarForge Settings' });

    containerEl.createEl('h3', { text: 'Folders' });

    new Setting(containerEl)
      .setName('Star map database folder')
      .setDesc('Folder where starmap notes (containing ```starmap blocks) are stored. Leave empty to allow any folder.')
      .addText((text) =>
        text
          .setPlaceholder('e.g. StarMap')
          .setValue((this.plugin as any).settings?.starmapFolder ?? '')
          .onChange(async (value) => {
            (this.plugin as any).settings.starmapFolder = value.trim();
            await (this.plugin as any).saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('System notes folder')
      .setDesc('Folder where individual system markdown files are created.')
      .addText((text) =>
        text
          .setPlaceholder('Systems')
          .setValue((this.plugin as any).settings?.systemsFolder ?? 'Systems')
          .onChange(async (value) => {
            (this.plugin as any).settings.systemsFolder = value.trim() || 'Systems';
            await (this.plugin as any).saveSettings();
          })
      );

    containerEl.createEl('h3', { text: 'Display' });

    new Setting(containerEl)
      .setName('Default zoom level')
      .setDesc('The default zoom level when opening a star map.')
      .addSlider((slider) =>
        slider
          .setLimits(0.2, 5, 0.1)
          .setValue((this.plugin as any).settings?.defaultZoom ?? DEFAULT_SETTINGS.defaultZoom)
          .onChange(async (value) => {
            (this.plugin as any).settings.defaultZoom = value;
            await (this.plugin as any).saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show star labels')
      .setDesc('Display star names on the map.')
      .addToggle((toggle) =>
        toggle
          .setValue((this.plugin as any).settings?.showLabels ?? DEFAULT_SETTINGS.showLabels)
          .onChange(async (value) => {
            (this.plugin as any).settings.showLabels = value;
            await (this.plugin as any).saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Trade line opacity')
      .setDesc('Opacity of trade connection lines (0.0 – 1.0).')
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.05)
          .setValue((this.plugin as any).settings?.tradeLineOpacity ?? DEFAULT_SETTINGS.tradeLineOpacity)
          .onChange(async (value) => {
            (this.plugin as any).settings.tradeLineOpacity = value;
            await (this.plugin as any).saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Boundary shape')
      .setDesc('Shape of the explored region boundary on the map. Auto-switches to Composite when the map is extended.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('rectangle', 'Rectangle')
          .addOption('circle', 'Circle')
          .addOption('composite', 'Composite')
          .setValue((this.plugin as any).settings?.boundaryShape ?? DEFAULT_SETTINGS.boundaryShape)
          .onChange(async (value) => {
            (this.plugin as any).settings.boundaryShape = value as BoundaryShape;
            await (this.plugin as any).saveSettings();
          })
      );
  }
}
