import { Modal, App, Setting, Notice } from 'obsidian';
import { System, generateSysId, to2dp } from './types';

interface FilterResult {
  originSysid: string;
  mode: 'count' | 'distance';
  value: number;
  autoExpand: boolean;
  autoBalance: boolean;
}

/**
 * Modal for configuring a filtered view of the star map.
 * Lets the user pick a system and either show N nearest systems
 * or all systems within a distance.
 */
export class ViewFilterModal extends Modal {
  private systems: System[];
  private onApply: (result: FilterResult) => void;

  private selectedSysid: string;
  private mode: 'count' | 'distance' = 'count';
  private value = 5;
  private autoExpand = true;
  private autoBalance = true;

  constructor(
    app: App,
    systems: System[],
    onApply: (result: FilterResult) => void
  ) {
    super(app);
    this.systems = systems;
    this.onApply = onApply;
    this.selectedSysid = systems.length > 0 ? systems[0].sysid : '';
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starforge-modal');

    contentEl.createEl('h2', { text: 'Filter Star Map View' });
    contentEl.createEl('p', { text: 'Show a subset of systems centred on a chosen system.' });

    // System picker
    const sysOptions: Record<string, string> = {};
    for (const sys of this.systems) {
      const label = sys.name || sys.sysid;
      sysOptions[sys.sysid] = `${label} (${sys.sysid})`;
    }

    new Setting(contentEl)
      .setName('Centre system')
      .setDesc('The system to centre the view on.')
      .addDropdown((dd) =>
        dd
          .addOptions(sysOptions)
          .setValue(this.selectedSysid)
          .onChange((v) => { this.selectedSysid = v; })
      );

    // Mode
    new Setting(contentEl)
      .setName('Filter mode')
      .setDesc('Show by count of nearest systems, or by distance radius.')
      .addDropdown((dd) =>
        dd
          .addOption('count', 'Nearest N systems')
          .addOption('distance', 'Within distance')
          .setValue(this.mode)
          .onChange((v) => {
            this.mode = v as 'count' | 'distance';
            this.updateSlider();
          })
      );

    // Value slider
    const sliderSetting = new Setting(contentEl)
      .setName('Value')
      .setDesc(this.mode === 'count' ? 'Number of nearest systems to show.' : 'Distance radius from centre system.');

    const sliderEl = sliderSetting.addSlider((slider) => {
      slider
        .setLimits(this.mode === 'count' ? 1 : 10, this.mode === 'count' ? 50 : 200, this.mode === 'count' ? 1 : 5)
        .setValue(this.value)
        .onChange((v) => { this.value = v; });
      return slider;
    });

    // Store reference for dynamic update
    (this as any).sliderSetting = sliderSetting;
    (this as any).sliderEl = sliderEl;

    // Auto-expand toggle
    new Setting(contentEl)
      .setName('Auto-expand unexplored space')
      .setDesc('If the requested view extends beyond the explored region, generate new systems to fill it.')
      .addToggle((t) =>
        t.setValue(this.autoExpand).onChange((v) => { this.autoExpand = v; })
      );

    // Auto-balance toggle
    new Setting(contentEl)
      .setName('Auto-balance lopsided region')
      .setDesc('If the centre system is not in the middle of the explored region, generate filler systems to make it a true circle.')
      .addToggle((t) =>
        t.setValue(this.autoBalance).onChange((v) => { this.autoBalance = v; })
      );

    // Buttons
    new Setting(contentEl)
      .setName('')
      .addButton((btn) =>
        btn.setButtonText('Apply Filter').setCta().onClick(() => this.apply())
      )
      .addButton((btn) =>
        btn.setButtonText('Cancel').onClick(() => this.close())
      );
  }

  private updateSlider(): void {
    // Rebuild the slider with new limits
    const setting = (this as any).sliderSetting as Setting;
    setting.clear();
    setting.setName('Value');
    setting.setDesc(this.mode === 'count' ? 'Number of nearest systems to show.' : 'Distance radius from centre system.');
    setting.addSlider((slider) => {
      slider
        .setLimits(this.mode === 'count' ? 1 : 10, this.mode === 'count' ? 50 : 200, this.mode === 'count' ? 1 : 5)
        .setValue(this.mode === 'count' ? Math.min(this.value, 50) : Math.max(this.value, 10))
        .onChange((v) => { this.value = v; });
      return slider;
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private apply(): void {
    if (!this.selectedSysid) {
      new Notice('Please select a centre system.');
      return;
    }
    this.onApply({
      originSysid: this.selectedSysid,
      mode: this.mode,
      value: this.value,
      autoExpand: this.autoExpand,
      autoBalance: this.autoBalance,
    });
    this.close();
  }
}

// ---- Analysis & Expansion Logic ----

export interface FilterAnalysis {
  originSys: System;
  /** Systems that fall within the filter (sorted by distance). */
  visibleSystems: System[];
  /** All systems within the bounding circle radius. */
  systemsInCircle: System[];
  /** The radius of the circle (in coordinate units). */
  circleRadius: number;
  /** Whether there is unexplored space beyond the current explored region. */
  hasUnboundedSpace: boolean;
  /** Whether the origin is not at the centre of the explored region. */
  isLopsided: boolean;
  /** Number of filler systems needed to balance the circle. */
  fillerCount: number;
  /** Distance to the furthest system from origin. */
  maxDist: number;
}

/**
 * Analyse the current systems and determine what the filter would show,
 * whether there's unbounded space, and whether the region is lopsided.
 */
export function analyseFilter(
  systems: System[],
  originSysid: string,
  mode: 'count' | 'distance',
  value: number
): FilterAnalysis | null {
  const originSys = systems.find((s) => s.sysid === originSysid);
  if (!originSys) return null;

  // Calculate distances from origin
  const withDist = systems
    .filter((s) => s.sysid !== originSysid)
    .map((s) => ({
      sys: s,
      dist: Math.sqrt((s.x - originSys.x) ** 2 + (s.y - originSys.y) ** 2),
    }))
    .sort((a, b) => a.dist - b.dist);

  let visibleSystems: System[];
  let circleRadius: number;

  if (mode === 'count') {
    const count = Math.min(value, withDist.length);
    visibleSystems = withDist.slice(0, count).map((w) => w.sys);
    // The circle radius is the distance to the furthest visible system
    circleRadius = count > 0 ? withDist[count - 1].dist : 0;
  } else {
    circleRadius = value;
    visibleSystems = withDist
      .filter((w) => w.dist <= value)
      .map((w) => w.sys);
  }

  // All systems within the circle (including origin)
  const systemsInCircle = [originSys, ...visibleSystems];

  // Check for unbounded space: is the circle larger than the explored region?
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const sys of systems) {
    if (sys.x < minX) minX = sys.x;
    if (sys.y < minY) minY = sys.y;
    if (sys.x > maxX) maxX = sys.x;
    if (sys.y > maxY) maxY = sys.y;
  }
  const exploredRadius = Math.sqrt(
    ((maxX - minX) / 2) ** 2 + ((maxY - minY) / 2) ** 2
  );
  const exploredCx = (minX + maxX) / 2;
  const exploredCy = (minY + maxY) / 2;
  const distFromExploredCentre = Math.sqrt(
    (originSys.x - exploredCx) ** 2 + (originSys.y - exploredCy) ** 2
  );
  const hasUnboundedSpace = circleRadius > exploredRadius - distFromExploredCentre;

  // Check if lopsided: is the origin at the centre of the circle?
  // We check by seeing if the furthest system in any direction is much further
  // than the average distance in the opposite direction.
  const maxDist = withDist.length > 0 ? withDist[withDist.length - 1].dist : 0;
  const avgDist =
    withDist.length > 0
      ? withDist.reduce((sum, w) => sum + w.dist, 0) / withDist.length
      : 0;
  const isLopsided = maxDist > avgDist * 1.5 && systems.length > 3;

  // How many filler systems would be needed to make a balanced circle?
  // We want the circle radius to be maxDist, and we want roughly uniform
  // angular distribution. Count how many angular gaps > 45 degrees exist.
  const fillerCount = estimateFillerCount(withDist, originSys);

  return {
    originSys,
    visibleSystems,
    systemsInCircle,
    circleRadius,
    hasUnboundedSpace,
    isLopsided,
    fillerCount,
    maxDist,
  };
}

/**
 * Estimate how many filler systems are needed to make the systems
 * around the origin more evenly distributed.
 */
function estimateFillerCount(
  withDist: { sys: System; dist: number }[],
  origin: System
): number {
  if (withDist.length < 2) return 0;

  // Calculate angles of all systems relative to origin
  const angles = withDist.map((w) =>
    (Math.atan2(w.sys.y - origin.y, w.sys.x - origin.x) * 180) / Math.PI
  ).sort((a, b) => a - b);

  // Find the largest angular gap
  let maxGap = 0;
  for (let i = 0; i < angles.length; i++) {
    const next = (i + 1) % angles.length;
    let gap: number;
    if (i === angles.length - 1) {
      gap = 360 - angles[i] + angles[0];
    } else {
      gap = angles[next] - angles[i];
    }
    if (gap > maxGap) maxGap = gap;
  }

  // Each filler fills roughly 45 degrees
  return Math.max(0, Math.floor(maxGap / 45) - 1);
}

/**
 * Generate filler systems to balance the circle around the origin.
 * These are written to the starmap but may be hidden from the current view.
 */
export function generateFillerSystems(
  originSys: System,
  existingSystems: System[],
  circleRadius: number
): System[] {
  const fillers: System[] = [];
  const usedIds = new Set(existingSystems.map((s) => s.sysid));

  // Calculate existing angles
  const existingAngles = existingSystems
    .filter((s) => s.sysid !== originSys.sysid)
    .map((s) => ({
      angle: (Math.atan2(s.y - originSys.y, s.x - originSys.x) * 180) / Math.PI,
      dist: Math.sqrt((s.x - originSys.x) ** 2 + (s.y - originSys.y) ** 2),
    }))
    .sort((a, b) => a.angle - b.angle);

  if (existingAngles.length < 2) {
    // Just place a few evenly around
    for (let i = 0; i < 4; i++) {
      const angle = i * 90;
      const angleRad = (angle * Math.PI) / 180;
      let sysid: string;
      do { sysid = generateSysId(); } while (usedIds.has(sysid));
      usedIds.add(sysid);
      fillers.push({
        sysid,
        x: to2dp(originSys.x + circleRadius * Math.cos(angleRad)),
        y: to2dp(originSys.y + circleRadius * Math.sin(angleRad)),
        z: to2dp(originSys.z + (Math.random() - 0.5) * 5),
        color: '#8888aa',
        size: 2,
      });
    }
    return fillers;
  }

  // Find gaps > 60 degrees and fill them
  for (let i = 0; i < existingAngles.length; i++) {
    const current = existingAngles[i];
    const next = existingAngles[(i + 1) % existingAngles.length];
    let gap: number;
    if (i === existingAngles.length - 1) {
      gap = 360 - current.angle + next.angle;
    } else {
      gap = next.angle - current.angle;
    }

    if (gap > 60) {
      // Place 1-2 fillers in this gap
      const fillCount = Math.min(2, Math.floor(gap / 60));
      for (let f = 1; f <= fillCount; f++) {
        const fillAngle = current.angle + (gap * f) / (fillCount + 1);
        const angleRad = (fillAngle * Math.PI) / 180;
        // Vary distance slightly for natural look
        const dist = circleRadius * (0.7 + Math.random() * 0.3);
        let sysid: string;
        do { sysid = generateSysId(); } while (usedIds.has(sysid));
        usedIds.add(sysid);
        fillers.push({
          sysid,
          x: to2dp(originSys.x + dist * Math.cos(angleRad)),
          y: to2dp(originSys.y + dist * Math.sin(angleRad)),
          z: to2dp(originSys.z + (Math.random() - 0.5) * 5),
          color: '#8888aa',
          size: 2,
        });
      }
    }
  }

  return fillers;
}

/**
 * Generate expansion systems to fill unbounded space in a given direction.
 */
export function generateExpansionSystems(
  originSys: System,
  existingSystems: System[],
  circleRadius: number
): System[] {
  const expansions: System[] = [];
  const usedIds = new Set(existingSystems.map((s) => s.sysid));

  // Find the direction with the fewest systems
  const quadrants = [0, 0, 0, 0]; // NE, NW, SE, SW
  for (const sys of existingSystems) {
    if (sys.sysid === originSys.sysid) continue;
    if (sys.x >= originSys.x && sys.y >= originSys.y) quadrants[0]++;
    else if (sys.x < originSys.x && sys.y >= originSys.y) quadrants[1]++;
    else if (sys.x >= originSys.x && sys.y < originSys.y) quadrants[2]++;
    else quadrants[3]++;
  }

  const minQ = Math.min(...quadrants);
  const targetAngleOffsets = [45, 135, 315, 225]; // centre of each quadrant

  for (let q = 0; q < 4; q++) {
    if (quadrants[q] > minQ + 1) continue; // skip well-populated quadrants
    // Add 1-2 systems in this quadrant
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const angleDeg = targetAngleOffsets[q] + (Math.random() - 0.5) * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const dist = circleRadius * (0.5 + Math.random() * 0.5);
      let sysid: string;
      do { sysid = generateSysId(); } while (usedIds.has(sysid));
      usedIds.add(sysid);
      expansions.push({
        sysid,
        x: to2dp(originSys.x + dist * Math.cos(angleRad)),
        y: to2dp(originSys.y + dist * Math.sin(angleRad)),
        z: to2dp(originSys.z + (Math.random() - 0.5) * 5),
        color: '#6688cc',
        size: 2,
      });
    }
  }

  return expansions;
}
