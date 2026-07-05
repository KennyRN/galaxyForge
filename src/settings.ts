import { PluginSettingTab, Setting, App, Plugin } from 'obsidian';

export interface StarForgeSettings {
  defaultZoom: number;
  showLabels: boolean;
  labelFontSize: number;
  tradeLineOpacity: number;
  backgroundColor: string;
}

export const DEFAULT_SETTINGS: StarForgeSettings = {
  defaultZoom: 1,
  showLabels: true,
  labelFontSize: 12,
  tradeLineOpacity: 0.7,
  backgroundColor: '#0a0a1a',
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
  }
}
