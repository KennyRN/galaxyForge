import { ItemView, WorkspaceLeaf, TFile, TFolder, Notice } from 'obsidian';
import { StarMapData, Star, ViewportState } from './types';
import { parseStarMapData } from './parser';

export const STAR_MAP_VIEW_TYPE = 'starforge-view';

export class StarMapView extends ItemView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private data: StarMapData = { stars: [], tradeLines: [] };
  private viewport: ViewportState = { offsetX: 0, offsetY: 0, zoom: 1 };
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private tooltipEl: HTMLElement;
  private controlsEl: HTMLElement;
  private sourceFile: TFile | null = null;
  private hoveredStar: Star | null = null;
  private animationFrameId: number | null = null;

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

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('starforge-view');

    // Create canvas
    this.canvas = container.createEl('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    // Create tooltip
    this.tooltipEl = container.createDiv({ cls: 'starforge-tooltip' });
    this.tooltipEl.style.display = 'none';

    // Create controls
    this.controlsEl = container.createDiv({ cls: 'starforge-controls' });
    this.controlsEl.createEl('button', { text: '\u27F2' }).onclick = () => this.resetView();
    this.controlsEl.createEl('button', { text: '+' }).onclick = () => this.zoomIn();
    this.controlsEl.createEl('button', { text: '\u2212' }).onclick = () => this.zoomOut();

    // Resize observer
    const observer = new ResizeObserver(() => this.resizeCanvas());
    observer.observe(container);

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    // Initial render
    this.resizeCanvas();
    this.render();
  }

  onClose(): Promise<void> {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    return Promise.resolve();
  }

  /** Load star map data from a file */
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

  /** Load star map data directly */
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

  // ---- Mouse Handlers ----

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
      this.hoveredStar = null;
    } else {
      // Hover detection
      const star = this.getStarAt(e.offsetX, e.offsetY);
      if (star) {
        this.hoveredStar = star;
        this.showTooltip(e, star);
        this.canvas.style.cursor = star.note ? 'pointer' : 'default';
      } else {
        this.hoveredStar = null;
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
    this.hoveredStar = null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = this.viewport.zoom * zoomFactor;
    if (newZoom < 0.1 || newZoom > 10) return;

    // Zoom towards mouse position
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
    const star = this.getStarAt(e.offsetX, e.offsetY);
    if (star && star.note) {
      this.openNote(star.note);
    }
  }

  // ---- Hit Testing ----

  private getStarAt(screenX: number, screenY: number): Star | null {
    const worldX = (screenX - this.viewport.offsetX) / this.viewport.zoom;
    const worldY = (screenY - this.viewport.offsetY) / this.viewport.zoom;

    // Search in reverse order so topmost (last drawn) stars are hit first
    for (let i = this.data.stars.length - 1; i >= 0; i--) {
      const star = this.data.stars[i];
      const dx = worldX - star.x;
      const dy = worldY - star.y;
      const hitRadius = (star.size || 3) + 4; // extra padding for easier clicking
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return star;
      }
    }
    return null;
  }

  // ---- Tooltip ----

  private showTooltip(e: MouseEvent, star: Star): void {
    this.tooltipEl.innerHTML = `
      <div class="starforge-tooltip-name">${star.name}</div>
      ${star.type ? `<div>Type: ${star.type}</div>` : ''}
      ${star.faction ? `<div>Faction: ${star.faction}</div>` : ''}
      ${star.note ? `<div class="starforge-tooltip-note">\uD83D\uDCC4 ${star.note}</div>` : ''}
    `;
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.left = (e.offsetX + 12) + 'px';
    this.tooltipEl.style.top = (e.offsetY - 10) + 'px';
  }

  // ---- Open Note ----

  private async openNote(notePath: string): Promise<void> {
    // Try to find existing file
    let file = this.app.vault.getAbstractFileByPath(notePath + '.md');
    if (!file) {
      file = this.app.vault.getAbstractFileByPath(notePath);
    }

    if (file instanceof TFile) {
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);
    } else {
      // File doesn't exist — offer to create it
      new Notice(`Note not found: ${notePath}. Creating it.`);
      const dir = this.app.vault.getAbstractFileByPath(
        notePath.substring(0, notePath.lastIndexOf('/'))
      );
      if (!(dir instanceof TFolder)) {
        await this.app.vault.createFolder(
          notePath.substring(0, notePath.lastIndexOf('/'))
        ).catch(() => {});
      }
      const newFile = await this.app.vault.create(notePath + '.md', `# ${notePath.split('/').pop()}\n`);
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(newFile);
    }
  }

  // ---- Rendering ----

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

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Draw background stars (tiny dots for depth)
    this.drawBackgroundStars(ctx, w, h);

    // Apply viewport transform
    ctx.save();
    ctx.translate(this.viewport.offsetX, this.viewport.offsetY);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    // Draw trade lines
    this.drawTradeLines(ctx);

    // Draw stars
    this.drawStars(ctx);

    ctx.restore();
  }

  private drawBackgroundStars(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Simple seeded background stars
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

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.data.stars) {
      const radius = star.size || 3;
      const color = star.color || '#ffffff';

      // Glow effect
      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, radius * 3);
      glow.addColorStop(0, color + '60');
      glow.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Star dot
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // White core
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Label
      ctx.fillStyle = '#ccddff';
      ctx.font = `${Math.max(10, 12 * (1 / this.viewport.zoom))}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(star.name, star.x + radius + 3, star.y - radius);
    }
  }

  private drawTradeLines(ctx: CanvasRenderingContext2D): void {
    const starMap = new Map<string, Star>();
    for (const star of this.data.stars) {
      starMap.set(star.name, star);
    }

    for (const line of this.data.tradeLines) {
      const fromStar = starMap.get(line.from);
      const toStar = starMap.get(line.to);
      if (!fromStar || !toStar) continue;

      ctx.beginPath();
      ctx.moveTo(fromStar.x, fromStar.y);
      ctx.lineTo(toStar.x, toStar.y);

      ctx.strokeStyle = line.color || '#44aa88';
      ctx.lineWidth = line.width || 1.5;

      if (line.dashed) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw label at midpoint
      if (line.label) {
        const mx = (fromStar.x + toStar.x) / 2;
        const my = (fromStar.y + toStar.y) / 2;
        ctx.fillStyle = line.color || '#44aa88';
        ctx.font = `${Math.max(9, 11 * (1 / this.viewport.zoom))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(line.label, mx, my - 4);
      }
    }
  }
}
