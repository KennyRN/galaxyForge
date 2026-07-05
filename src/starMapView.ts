import { ItemView, WorkspaceLeaf, TFile, TFolder, Notice } from 'obsidian';
import { StarMapData, System, ViewportState } from './types';
import { parseStarMapData } from './parser';
import { ExtensionModal } from './extensionModal';
import { BoundaryShape } from './settings';

export const STAR_MAP_VIEW_TYPE = 'starforge-view';

export class StarMapView extends ItemView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private data: StarMapData = { systems: [], tradeLines: [] };
  private viewport: ViewportState = { offsetX: 0, offsetY: 0, zoom: 1 };
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private tooltipEl: HTMLElement;
  private controlsEl: HTMLElement;
  private sourceFile: TFile | null = null;
  private hoveredSystem: System | null = null;
  private animationFrameId: number | null = null;
  private boundaryShape: BoundaryShape = 'rectangle';

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return STAR_MAP_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Star Map';
  }

  getIcon(): string {
    return 'starforge-logo';
  }

  /** Allow the plugin to push settings updates into the view. */
  setBoundaryShape(shape: BoundaryShape): void {
    this.boundaryShape = shape;
    this.render();
  }

  /** Get current data (for extension). */
  getData(): StarMapData {
    return this.data;
  }

  /** Add new systems to the map and re-render. */
  addSystems(newSystems: System[]): void {
    this.data.systems.push(...newSystems);
    this.render();
  }

  /** Get the source file (for saving). */
  getSourceFile(): TFile | null {
    return this.sourceFile;
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('starforge-view');

    this.canvas = container.createEl('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    this.tooltipEl = container.createDiv({ cls: 'starforge-tooltip' });
    this.tooltipEl.style.display = 'none';

    this.controlsEl = container.createDiv({ cls: 'starforge-controls' });
    this.controlsEl.createEl('button', { text: '\u27F2' }).onclick = () => this.resetView();
    this.controlsEl.createEl('button', { text: '+' }).onclick = () => this.zoomIn();
    this.controlsEl.createEl('button', { text: '\u2212' }).onclick = () => this.zoomOut();

    const observer = new ResizeObserver(() => this.resizeCanvas());
    observer.observe(container);

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));

    this.resizeCanvas();
    this.render();
  }

  onClose(): Promise<void> {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    return Promise.resolve();
  }

  async loadFromFile(file: TFile): Promise<void> {
    this.sourceFile = file;
    const content = await this.app.vault.read(file);
    const parsed = parseStarMapData(content);
    if (parsed) {
      this.data = parsed;
      this.resetView();
    } else {
      new Notice('No starmap data found in this note.');
    }
  }

  loadData(data: StarMapData): void {
    this.data = data;
    this.sourceFile = null;
    this.resetView();
  }

  private resizeCanvas(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.render();
  }

  private resetView(): void {
    this.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
    this.render();
  }

  private zoomIn(): void {
    this.viewport.zoom = Math.min(this.viewport.zoom * 1.3, 10);
    this.render();
  }

  private zoomOut(): void {
    this.viewport.zoom = Math.max(this.viewport.zoom / 1.3, 0.1);
    this.render();
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStart = { x: e.offsetX - this.viewport.offsetX, y: e.offsetY - this.viewport.offsetY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.viewport.offsetX = e.offsetX - this.dragStart.x;
      this.viewport.offsetY = e.offsetY - this.dragStart.y;
      this.render();
      this.tooltipEl.style.display = 'none';
      this.hoveredSystem = null;
    } else {
      const sys = this.getSystemAt(e.offsetX, e.offsetY);
      if (sys) {
        this.hoveredSystem = sys;
        this.showTooltip(e, sys);
        this.canvas.style.cursor = 'pointer';
      } else {
        this.hoveredSystem = null;
        this.tooltipEl.style.display = 'none';
        this.canvas.style.cursor = 'grab';
      }
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.tooltipEl.style.display = 'none';
    this.hoveredSystem = null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = this.viewport.zoom * zoomFactor;
    if (newZoom < 0.1 || newZoom > 10) return;

    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    const worldX = (mouseX - this.viewport.offsetX) / this.viewport.zoom;
    const worldY = (mouseY - this.viewport.offsetY) / this.viewport.zoom;

    this.viewport.zoom = newZoom;
    this.viewport.offsetX = mouseX - worldX * this.viewport.zoom;
    this.viewport.offsetY = mouseY - worldY * this.viewport.zoom;

    this.render();
  }

  private onDoubleClick(e: MouseEvent): void {
    const sys = this.getSystemAt(e.offsetX, e.offsetY);
    if (sys) {
      this.openNoteFor(sys);
    }
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const sys = this.getSystemAt(e.offsetX, e.offsetY);
    if (sys) {
      new ExtensionModal(
        this.app,
        sys,
        this.data.systems,
        (newSystems) => {
          this.addSystems(newSystems);
        }
      ).open();
    }
  }

  private getSystemAt(screenX: number, screenY: number): System | null {
    const worldX = (screenX - this.viewport.offsetX) / this.viewport.zoom;
    const worldY = (screenY - this.viewport.offsetY) / this.viewport.zoom;

    for (let i = this.data.systems.length - 1; i >= 0; i--) {
      const sys = this.data.systems[i];
      const dx = worldX - sys.x;
      const dy = worldY - sys.y;
      const hitRadius = (sys.size || 3) + 4;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return sys;
      }
    }
    return null;
  }

  private showTooltip(e: MouseEvent, sys: System): void {
    const label = sys.name || sys.sysid;
    this.tooltipEl.innerHTML = `
      <div class="starforge-tooltip-name">${label}</div>
      <div>ID: ${sys.sysid}</div>
      ${sys.type ? `<div>Type: ${sys.type}</div>` : ''}
      ${sys.faction ? `<div>Faction: ${sys.faction}</div>` : ''}
      <div class="starforge-tooltip-note">Right-click to extend from here</div>
    `;
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.left = (e.offsetX + 12) + 'px';
    this.tooltipEl.style.top = (e.offsetY - 10) + 'px';
  }

  private async openNoteFor(sys: System): Promise<void> {
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.sysid === sys.sysid) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
        return;
      }
    }

    const folderPath = 'Systems';
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      await this.app.vault.createFolder(folderPath).catch(() => {});
    }

    const fileName = `${sys.sysid}.md`;
    const filePath = `${folderPath}/${fileName}`;
    const displayName = sys.name || sys.sysid;

    const frontmatter = `---\nsysid: "${sys.sysid}"\n---\n\n# ${displayName}\n\nCoordinates: (${sys.x.toFixed(2)}, ${sys.y.toFixed(2)}, ${sys.z.toFixed(2)})\n`;
    const newFile = await this.app.vault.create(filePath, frontmatter);

    new Notice(`Created note for ${displayName}`);
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(newFile);
  }

  private render(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(() => this.draw());
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    this.drawBackgroundStars(ctx, w, h);

    ctx.save();
    ctx.translate(this.viewport.offsetX, this.viewport.offsetY);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    this.drawExploredRegion(ctx);
    this.drawTradeLines(ctx);
    this.drawSystems(ctx);

    ctx.restore();
  }

  private drawBackgroundStars(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const seed = 42;
    for (let i = 0; i < 200; i++) {
      const x = ((i * 137.5 + seed) % w);
      const y = ((i * 97.3 + seed * 3) % h);
      const brightness = 0.2 + ((i * 7) % 5) * 0.15;
      const radius = 0.3 + ((i * 3) % 3) * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${brightness})`;
      ctx.fill();
    }
  }

  /**
   * Draw the explored region boundary (rectangle or circle)
   * around all known systems.
   */
  private drawExploredRegion(ctx: CanvasRenderingContext2D): void {
    if (this.data.systems.length === 0) return;

    const padding = 15;
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const sys of this.data.systems) {
      if (sys.x < minX) minX = sys.x;
      if (sys.y < minY) minY = sys.y;
      if (sys.x > maxX) maxX = sys.x;
      if (sys.y > maxY) maxY = sys.y;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const halfW = (maxX - minX) / 2 + padding;
    const halfH = (maxY - minY) / 2 + padding;
    const radius = Math.sqrt(halfW * halfW + halfH * halfH);

    if (this.boundaryShape === 'circle') {
      // Faint fill
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(68, 102, 170, 0.05)';
      ctx.fill();

      // Inner dashed line
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(68, 102, 170, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      // Outer glow
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(68, 102, 170, 0.12)';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.stroke();

      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = 'rgba(68, 102, 170, 0.5)';
      ctx.font = `${Math.max(9, 11 * (1 / this.viewport.zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Explored Region', cx, cy - radius - 3);
    } else {
      // Rectangle (default)
      const rect = {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      };

      ctx.fillStyle = 'rgba(68, 102, 170, 0.05)';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      ctx.strokeStyle = 'rgba(68, 102, 170, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

      ctx.strokeStyle = 'rgba(68, 102, 170, 0.12)';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(68, 102, 170, 0.5)';
      ctx.font = `${Math.max(9, 11 * (1 / this.viewport.zoom))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Explored Region', rect.x + rect.width / 2, rect.y - 3);
    }
  }

  private drawSystems(ctx: CanvasRenderingContext2D): void {
    for (const sys of this.data.systems) {
      const radius = sys.size || 3;
      const color = sys.color || '#ffffff';

      const glow = ctx.createRadialGradient(sys.x, sys.y, 0, sys.x, sys.y, radius * 3);
      glow.addColorStop(0, color + '60');
      glow.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.arc(sys.x, sys.y, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sys.x, sys.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sys.x, sys.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      const label = sys.name || sys.sysid;
      ctx.fillStyle = '#ccddff';
      ctx.font = `${Math.max(10, 12 * (1 / this.viewport.zoom))}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, sys.x + radius + 3, sys.y - radius);
    }
  }

  private drawTradeLines(ctx: CanvasRenderingContext2D): void {
    const sysMap = new Map<string, System>();
    for (const sys of this.data.systems) {
      sysMap.set(sys.sysid, sys);
    }

    for (const line of this.data.tradeLines) {
      const fromSys = sysMap.get(line.from);
      const toSys = sysMap.get(line.to);
      if (!fromSys || !toSys) continue;

      ctx.beginPath();
      ctx.moveTo(fromSys.x, fromSys.y);
      ctx.lineTo(toSys.x, toSys.y);

      ctx.strokeStyle = line.color || '#44aa88';
      ctx.lineWidth = line.width || 1.5;

      if (line.dashed) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      if (line.label) {
        const mx = (fromSys.x + toSys.x) / 2;
        const my = (fromSys.y + toSys.y) / 2;
        ctx.fillStyle = line.color || '#44aa88';
        ctx.font = `${Math.max(9, 11 * (1 / this.viewport.zoom))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(line.label, mx, my - 4);
      }
    }
  }
}
