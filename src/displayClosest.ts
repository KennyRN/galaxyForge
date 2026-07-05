import { MarkdownPostProcessor, MarkdownRenderer, Component, TFile } from 'obsidian';
import { System, StarMapData } from './types';

/**
 * Regex for the inline marker:
 * `displayclosestsystems-<style>-<count>-<fields>`
 *
 * Example: `displayclosestsystems-table-5-name,type,faction`
 *   style: table | list | orderedlist
 *   count: number of systems to show
 *   fields: comma-separated field names in display order
 */
const DISPLAY_CLOSEST_RE = /`displayclosestsystems-(table|list|orderedlist)-(\d+)-([a-z,]+)`/g;

const VALID_FIELDS = ['name', 'sysid', 'type', 'faction', 'distance', 'x', 'y', 'z', 'color', 'size'];

/**
 * Create a MarkdownPostProcessor that replaces inline markers
 * with rendered tables/lists of the closest systems.
 *
 * @param getStarMapData  Callback that returns the current starmap data
 * @param getSystemsFolderPath  Callback that returns the configured systems folder
 */
export function createDisplayClosestProcessor(
  getStarMapData: () => StarMapData | null,
  getStarmapFile: () => TFile | null
): MarkdownPostProcessor {
  return (el, ctx) => {
    // Walk all text nodes looking for the marker
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodesToReplace: { node: Text; match: RegExpExecArray }[] = [];

    // We need to collect first, then replace, to avoid invalidating the walker
    let match: RegExpExecArray | null;
    while ((match = DISPLAY_CLOSEST_RE.exec(el.innerHTML))) {
      const fullMatch = match[0];
      const style = match[1] as 'table' | 'list' | 'orderedlist';
      const count = parseInt(match[2], 10);
      const fields = match[3].split(',').map((f) => f.trim()).filter((f) => VALID_FIELDS.includes(f));

      if (fields.length === 0) continue;

      // Build the rendered HTML
      const rendered = renderClosestSystems(
        getStarMapData(),
        ctx.sourcePath,
        style,
        count,
        fields
      );

      // Replace the marker in innerHTML
      el.innerHTML = el.innerHTML.replace(fullMatch, rendered);
    }
  };
}

/**
 * Render the closest systems HTML.
 */
function renderClosestSystems(
  starmapData: StarMapData | null,
  sourcePath: string,
  style: 'table' | 'list' | 'orderedlist',
  count: number,
  fields: string[]
): string {
  if (!starmapData || starmapData.systems.length === 0) {
    return `<span style="color:#667799; font-style:italic;">(StarMap data not available)</span>`;
  }

  // Determine origin system from the note's path
  // The note is expected to be in the systems folder, named {SYSID}.md
  // or have frontmatter with sysid — but we're in post-processor context
  // so we use the filename (minus extension) as a fallback sysid
  const fileName = sourcePath.split('/').pop()?.replace('.md', '') || '';
  const originSys = starmapData.systems.find(
    (s) => s.sysid === fileName
  );

  if (!originSys) {
    return `<span style="color:#667799; font-style:italic;">(Cannot determine origin system from note path: ${fileName})</span>`;
  }

  // Calculate distances from origin to all other systems
  const withDist = starmapData.systems
    .filter((s) => s.sysid !== originSys.sysid)
    .map((s) => ({
      sys: s,
      distance: Math.sqrt(
        (s.x - originSys.x) ** 2 +
        (s.y - originSys.y) ** 2 +
        (s.z - originSys.z) ** 2
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);

  if (withDist.length === 0) {
    return `<span style="color:#667799; font-style:italic;">(No other systems found)</span>`;
  }

  if (style === 'table') {
    return renderTable(withDist, fields);
  } else {
    return renderList(withDist, fields, style === 'orderedlist');
  }
}

/**
 * Render a table of closest systems.
 */
function renderTable(
  data: { sys: System; distance: number }[],
  fields: string[]
): string {
  // Build header
  const headers = fields.map((f) => fieldLabel(f));

  // Build rows
  const rows = data.map((item) => {
    const cells = fields.map((f) => fieldValue(item.sys, item.distance, f));
    return `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
  });

  return `
<div class="starforge-closest-table" style="margin:8px 0;">
  <table style="width:100%; border-collapse:collapse; font-size:13px;">
    <thead>
      <tr style="border-bottom:1px solid rgba(68,102,170,0.3);">
        ${headers.map((h) => `<th style="text-align:left; padding:4px 8px; color:#88aadd;">${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.join('\n')}
    </tbody>
  </table>
</div>`;
}

/**
 * Render a list (bulleted or ordered) of closest systems.
 */
function renderList(
  data: { sys: System; distance: number }[],
  fields: string[],
  ordered: boolean
): string {
  const tag = ordered ? 'ol' : 'ul';
  const items = data.map((item) => {
    const parts = fields.map((f) => fieldValue(item.sys, item.distance, f));
    return `<li>${parts.join(' \u2014 ')}</li>`;
  });

  return `
<div class="starforge-closest-list" style="margin:8px 0;">
  <${tag} style="margin:0; padding-left:20px; font-size:13px;">
    ${items.join('\n')}
  </${tag}>
</div>`;
}

/** Human-readable label for each field. */
function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: 'Name',
    sysid: 'ID',
    type: 'Type',
    faction: 'Faction',
    distance: 'Distance',
    x: 'X',
    y: 'Y',
    z: 'Z',
    color: 'Colour',
    size: 'Size',
  };
  return labels[field] || field;
}

/** Get the display value for a field. */
function fieldValue(sys: System, distance: number, field: string): string {
  switch (field) {
    case 'name':
      return sys.name || `<span style="color:#667799;">${sys.sysid}</span>`;
    case 'sysid':
      return sys.sysid;
    case 'type':
      return sys.type || '-';
    case 'faction':
      return sys.faction || '-';
    case 'distance':
      return distance.toFixed(2);
    case 'x':
      return sys.x.toFixed(2);
    case 'y':
      return sys.y.toFixed(2);
    case 'z':
      return sys.z.toFixed(2);
    case 'color':
      return sys.color || '-';
    case 'size':
      return (sys.size || 3).toString();
    default:
      return '-';
  }
}
