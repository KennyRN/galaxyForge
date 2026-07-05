import { Modal, App, Setting, Notice } from 'obsidian';
import { System, generateSysId, to2dp } from './types';

/**
 * Modal for extending the star map from a chosen system.
 * Generates new systems radiating outward from the selected origin.
 */
export class ExtensionModal extends Modal {
  private originSys: System;
  private existingSystems: System[];
  private onConfirm: (newSystems: System[]) => void;

  private count = 3;
  private radius = 20;
  private spread = 60; // degrees of arc to spread new systems across

  constructor(
    app: App,
    originSys: System,
    existingSystems: System[],
    onConfirm: (newSystems: System[]) => void
  ) {
    super(app);
    this.originSys = originSys;
    this.existingSystems = existingSystems;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starforge-modal');

    contentEl.createEl('h2', { text: 'Extend Star Map' });
    contentEl.createEl('p', {
      text: `Generating new systems outward from ${this.originSys.name || this.originSys.sysid}.`,
    });

    new Setting(contentEl)
      .setName('Number of new systems')
      .setDesc('How many systems to generate.')
      .addSlider((slider) =>
        slider
          .setLimits(1, 10, 1)
          .setValue(this.count)
          .onChange((v) => { this.count = v; })
      );

    new Setting(contentEl)
      .setName('Distance from origin')
      .setDesc('How far (in coordinate units) new systems appear from the origin.')
      .addSlider((slider) =>
        slider
          .setLimits(5, 50, 1)
          .setValue(this.radius)
          .onChange((v) => { this.radius = v; })
      );

    new Setting(contentEl)
      .setName('Spread angle')
      .setDesc('Arc of directions to spread new systems (degrees).')
      .addSlider((slider) =>
        slider
          .setLimits(15, 360, 15)
          .setValue(this.spread)
          .onChange((v) => { this.spread = v; })
      );

    new Setting(contentEl)
      .setName('')
      .addButton((btn) =>
        btn
          .setButtonText('Generate')
          .setCta()
          .onClick(() => this.generate())
      )
      .addButton((btn) =>
        btn
          .setButtonText('Cancel')
          .onClick(() => this.close())
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private generate(): void {
    const newSystems: System[] = [];
    const usedIds = new Set(this.existingSystems.map((s) => s.sysid));

    const startAngle = -this.spread / 2;
    const step = this.spread / (this.count > 1 ? this.count - 1 : 1);

    for (let i = 0; i < this.count; i++) {
      let sysid: string;
      do {
        sysid = generateSysId();
      } while (usedIds.has(sysid));
      usedIds.add(sysid);

      const angleDeg = startAngle + i * step;
      const angleRad = (angleDeg * Math.PI) / 180;

      // Add some randomness to distance and angle for a natural look
      const jitterDist = (Math.random() - 0.5) * this.radius * 0.3;
      const jitterAngle = (Math.random() - 0.5) * (step * 0.4);
      const finalAngle = angleRad + (jitterAngle * Math.PI) / 180;
      const finalDist = this.radius + jitterDist;

      const x = to2dp(this.originSys.x + finalDist * Math.cos(finalAngle));
      const y = to2dp(this.originSys.y + finalDist * Math.sin(finalAngle));
      const z = to2dp(this.originSys.z + (Math.random() - 0.5) * 5);

      newSystems.push({
        sysid,
        x,
        y,
        z,
        color: '#ffffff',
        size: 3,
      });
    }

    new Notice(`Generated ${newSystems.length} new system(s).`);
    this.onConfirm(newSystems);
    this.close();
  }
}
