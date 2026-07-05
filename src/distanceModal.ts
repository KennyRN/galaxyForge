import { Modal, App, Setting } from 'obsidian';
import { System } from './types';

/**
 * Modal for calculating the distance between two star systems.
 */
export class DistanceModal extends Modal {
  private systems: System[];
  private sysA: string;
  private sysB: string;

  constructor(app: App, systems: System[], presetA?: string) {
    super(app);
    this.systems = systems;
    this.sysA = presetA || (systems.length > 0 ? systems[0].sysid : '');
    this.sysB = systems.length > 1 ? systems[1].sysid : (systems.length > 0 ? systems[0].sysid : '');
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starforge-modal');

    contentEl.createEl('h2', { text: 'Distance Calculator' });

    const sysOptions: Record<string, string> = {};
    for (const sys of this.systems) {
      const label = sys.name || sys.sysid;
      sysOptions[sys.sysid] = `${label} (${sys.sysid})`;
    }

    const resultContainer = contentEl.createDiv();
    resultContainer.style.margin = '16px 0';
    resultContainer.style.padding = '12px';
    resultContainer.style.borderRadius = '6px';
    resultContainer.style.backgroundColor = 'rgba(68, 102, 170, 0.1)';

    const updateResult = () => {
      const a = this.systems.find((s) => s.sysid === this.sysA);
      const b = this.systems.find((s) => s.sysid === this.sysB);
      if (!a || !b) {
        resultContainer.innerHTML = '<em>Select two systems.</em>';
        return;
      }

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const aLabel = a.name || a.sysid;
      const bLabel = b.name || b.sysid;

      resultContainer.innerHTML = `
        <div style="font-size:1.3em; font-weight:bold; color:#88ccff; margin-bottom:8px;">
          Distance: ${dist.toFixed(2)} units
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:4px 8px; color:#8899bb;">${aLabel}</td>
            <td style="padding:4px 8px; color:#8899bb;">x: ${a.x.toFixed(2)}</td>
            <td style="padding:4px 8px; color:#8899bb;">y: ${a.y.toFixed(2)}</td>
            <td style="padding:4px 8px; color:#8899bb;">z: ${a.z.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 8px; color:#8899bb;">${bLabel}</td>
            <td style="padding:4px 8px; color:#8899bb;">x: ${b.x.toFixed(2)}</td>
            <td style="padding:4px 8px; color:#8899bb;">y: ${b.y.toFixed(2)}</td>
            <td style="padding:4px 8px; color:#8899bb;">z: ${b.z.toFixed(2)}</td>
          </tr>
          <tr style="border-top:1px solid rgba(68,102,170,0.3);">
            <td style="padding:4px 8px; color:#6688aa;">Delta</td>
            <td style="padding:4px 8px; color:#6688aa;">\u0394x: ${dx.toFixed(2)}</td>
            <td style="padding:4px 8px; color:#6688aa;">\u0394y: ${dy.toFixed(2)}</td>
            <td style="padding:4px 8px; color:#6688aa;">\u0394z: ${dz.toFixed(2)}</td>
          </tr>
        </table>
      `;
    };

    new Setting(contentEl)
      .setName('System A')
      .addDropdown((dd) =>
        dd.addOptions(sysOptions).setValue(this.sysA).onChange((v) => {
          this.sysA = v;
          updateResult();
        })
      );

    new Setting(contentEl)
      .setName('System B')
      .addDropdown((dd) =>
        dd.addOptions(sysOptions).setValue(this.sysB).onChange((v) => {
          this.sysB = v;
          updateResult();
        })
      );

    updateResult();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/**
 * Calculate the distance between two systems.
 */
export function calcDistance(a: System, b: System): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
