import { StarMapData, Star, TradeLine } from './types';

/**
 * Parse a YAML-like starmap code block from a note.
 *
 * Expected format:
 * ```starmap
 * stars:
 *   - name: "Alpha"
 *     x: 12.5
 *     y: -3.2
 *     note: "Lore/Alpha"
 *     color: "#ffcc00"
 *     size: 3
 *   - name: "Beta"
 *     x: -8.1
 *     y: 15.7
 *     note: "Lore/Beta"
 * tradeLines:
 *   - from: "Alpha"
 *     to: "Beta"
 *     volume: "high"
 * ```
 */
export function parseStarMapData(content: string): StarMapData | null {
  const starmapRegex = /```starmap\n([\s\S]*?)```/;
  const match = content.match(starmapRegex);
  if (!match) return null;

  const block = match[1];
  return parseBlock(block);
}

function parseBlock(block: string): StarMapData {
  const stars: Star[] = [];
  const tradeLines: TradeLine[] = [];

  const lines = block.split('\n').map(l => l.trimEnd());

  let mode: 'stars' | 'tradeLines' | null = null;
  let currentStar: Partial<Star> | null = null;
  let currentTrade: Partial<TradeLine> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'stars:') {
      mode = 'stars';
      continue;
    }
    if (trimmed === 'tradeLines:') {
      mode = 'tradeLines';
      continue;
    }

    if (mode === 'stars') {
      if (trimmed.startsWith('- name:')) {
        if (currentStar && currentStar.name) {
          stars.push(finalizeStar(currentStar));
        }
        currentStar = { name: extractValue(trimmed) };
      } else if (currentStar) {
        if (trimmed.startsWith('x:')) {
          currentStar.x = parseFloat(extractValue(trimmed));
        } else if (trimmed.startsWith('y:')) {
          currentStar.y = parseFloat(extractValue(trimmed));
        } else if (trimmed.startsWith('note:')) {
          currentStar.note = extractValue(trimmed);
        } else if (trimmed.startsWith('color:')) {
          currentStar.color = extractValue(trimmed);
        } else if (trimmed.startsWith('size:')) {
          currentStar.size = parseInt(extractValue(trimmed), 10);
        } else if (trimmed.startsWith('faction:')) {
          currentStar.faction = extractValue(trimmed);
        } else if (trimmed.startsWith('type:')) {
          currentStar.type = extractValue(trimmed);
        }
      }
    }

    if (mode === 'tradeLines') {
      if (trimmed.startsWith('- from:')) {
        if (currentTrade && currentTrade.from && currentTrade.to) {
          tradeLines.push(finalizeTrade(currentTrade));
        }
        currentTrade = { from: extractValue(trimmed) };
      } else if (currentTrade) {
        if (trimmed.startsWith('to:')) {
          currentTrade.to = extractValue(trimmed);
        } else if (trimmed.startsWith('color:')) {
          currentTrade.color = extractValue(trimmed);
        } else if (trimmed.startsWith('width:')) {
          currentTrade.width = parseInt(extractValue(trimmed), 10);
        } else if (trimmed.startsWith('dashed:')) {
          currentTrade.dashed = extractValue(trimmed) === 'true';
        } else if (trimmed.startsWith('label:')) {
          currentTrade.label = extractValue(trimmed);
        } else if (trimmed.startsWith('volume:')) {
          const v = extractValue(trimmed);
          if (v === 'low' || v === 'medium' || v === 'high') {
            currentTrade.volume = v;
          }
        }
      }
    }
  }

  // Push last items
  if (currentStar && currentStar.name) {
    stars.push(finalizeStar(currentStar));
  }
  if (currentTrade && currentTrade.from && currentTrade.to) {
    tradeLines.push(finalizeTrade(currentTrade));
  }

  return { stars, tradeLines };
}

function extractValue(line: string): string {
  const idx = line.indexOf(':');
  if (idx === -1) return '';
  let val = line.slice(idx + 1).trim();
  // Remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
}

function finalizeStar(s: Partial<Star>): Star {
  return {
    id: s.name?.toLowerCase().replace(/\s+/g, '-') || `star-${Date.now()}`,
    name: s.name || 'Unknown',
    x: s.x ?? 0,
    y: s.y ?? 0,
    color: s.color || '#ffffff',
    size: s.size || 3,
    note: s.note,
    faction: s.faction,
    type: s.type,
  };
}

function finalizeTrade(t: Partial<TradeLine>): TradeLine {
  return {
    id: `${t.from}-${t.to}`,
    from: t.from || '',
    to: t.to || '',
    color: t.color || '#44aa88',
    width: t.width || 1.5,
    dashed: t.dashed || false,
    label: t.label,
    volume: t.volume,
  };
}
