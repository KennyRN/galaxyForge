import { MarkdownPostProcessor } from 'obsidian';
import { System, StarMapData } from './types';

/**
 * Regex for the inline marker:
 * `displayclosestsystems-<style>-<count>-<fields>`
 */
const DISPLAY_CLOSEST_RE = /`displayclosestsystems-(table|list|orderedlist)-(\d+)-([a-z,]+)`/g;

/**
 * Regex for the inline distance marker:
 * `displaydistance-to-<sysid>` or just `displaydistance`
 */
const DISPLAY_DISTANCE_RE = /`displaydistance(?:-to-([A-Z]+))?`/g;

const VALID_FIELDS = ['name', 'sysid', 'type', 'faction', 'distance', 'x', 'y', 'z', 'color', 'size'];

/**
 * Create a MarkdownPostProcessor that replaces inline markers
 * with rendered tables/lists of the closest systems.
 */
export function createDisplayClosestProcessor(
  getStarMapData: () => StarMapData | null
): MarkdownPostProcessor {
  return (el, ctx) => {
    const starmapData = getStarMapData();
    if (!starmapData || starmapData.systems.length === 0) return;

    // Determine origin system from the note's file path
    const fileName = ctx.sourcePath.split('/').pop()?.replace('.md', '') || '';
    const originSys = starmapData.systems.find((s) => s.sysid === fileName);

    // Replace `displayclosestsystems-...` markers
    el.innerHTML = el.innerHTML.replace(DISPLAY_CLOSEST_RE, (match, style, countStr, fieldsStr) => {
      if (!originSys) {
        return `<span style="color:#667799; font-style:italic;">(Cannot determine origin system)</span>`;
      }

      const count = parseInt(countStr, 10);
      const fields = fieldsStr.split(',').map((f: string) => f.trim()).filter((f: string) => VALID_FIELDS.includes(f));
      if (fields.length === 0) return match;

      return renderClosestSystems(starmapData, originSys, style as 'table' | 'list' | 'orderedlist', count, fields);
    });

    // Replace `displaydistance[-to-XXX]` markers
    el.innerHTML = el.innerHTML.replace(DISPLAY_DISTANCE_RE, (match, presetSysid?: string) => {
      if (!originSys) {
        return `<span style="color:#667799; font-style:italic;">(Cannot determine origin system)</span>`;
      }
      return renderDistanceDropdown(starmapData.systems, originSys, presetSysid || '');
    });
  };
}

/**
 * Render a dropdown of target systems with live distance display.
 */
function renderDistanceDropdown(
  allSystems: System[],
  originSys: System,
  presetSysid: string
): string {
  const others = allSystems.filter((s) => s.sysid !== originSys.sysid);
  if (others.length === 0) {
    return `<span style="color:#667799; font-style:italic;">(No other systems)</span>`;
  }

  const dropdownId = `sf-dist-${originSys.sysid}-${Date.now()}`;
  const resultId = `sf-dist-result-${originSys.sysid}-${Date.now()}`;

  // Build dropdown options
  const options = others.map((s) => {
    const label = s.name || s.sysid;
    const selected = s.sysid === presetSysid ? ' selected' : '';
    return `<option value="${s.sysid}"${selected}>${label} (${s.sysid})</option>`;
  }).join('');

  // Pre-compute distance data as JSON for the JS to use
  const distData: Record<string, number> = {};
  for (const s of others) {
    const dx = s.x - originSys.x;
    const dy = s.y - originSys.y;
    const dz = s.z - originSys.z;
    distData[s.sysid] = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  const distDataJson = JSON.stringify(distData);

  const originLabel = originSys.name || originSys.sysid;
  const initialTarget = presetSysid && distData[presetSysid] !== undefined
    ? others.find((s) => s.sysid === presetSysid)
    : others[0];
  const initialDist = initialTarget
    ? distData[initialTarget.sysid].toFixed(2)
    : '—';
  const initialLabel = initialTarget
    ? (initialTarget.name || initialTarget.sysid)
    : '—';

  return `
<div class="starforge-distance-picker" style="margin:8px 0; padding:10px; border:1px solid rgba(68,102,170,0.3); border-radius:6px; background:rgba(68,102,170,0.06);">
  <div style="margin-bottom:6px; color:#88aadd; font-size:12px;">
    Distance from <strong>${originLabel}</strong>:
  </div>
  <div style="display:flex; align-items:center; gap:8px;">
    <select id="${dropdownId}" style="flex:1; padding:4px 8px; background:#1a1a2e; color:#ccddff; border:1px solid rgba(68,102,170,0.4); border-radius:4px;">
      ${options}
    </select>
    <span id="${resultId}" style="font-size:1.2em; font-weight:bold; color:#88ccff; white-space:nowrap;">${initialDist} units</span>
  </div>
  <script>
    (function() {
      const select = document.getElementById('${dropdownId}');
      const result = document.getElementById('${resultId}');
      const distData = ${distDataJson};
      if (select && result) {
        select.addEventListener('change', function() {
          const dist = distData[this.value];
          result.textContent = (dist !== undefined ? dist.toFixed(2) : '—') + ' units';
        });
      }
    })();
  </script>
</div>`;
}

/**
 * Render the closest systems HTML.
 */
function renderClosestSystems(
  starmapData: StarMapData,
  originSys: System,
  style: 'table' | 'list' | 'orderedlist',
  count: number,
  fields: string[]
): string {
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

function renderTable(
  data: { sys: System; distance: number }[],
  fields: string[]
): string {
  const headers = fields.map((f) => fieldLabel(f));
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
