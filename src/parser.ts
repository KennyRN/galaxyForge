import { StarMapData, System, TradeLine, generateSysId, to2dp } from './types';

/**
 * Parse a YAML-like starmap code block from a note.
 *
 * Expected format:
 * ```starmap
 * generatorSeed: "MYSEED"
 *
 * systems:
 *   - sysid: "QXMVPA"
 *     name: "Alpha"
 *     x: 0.00
 *     y: 0.00
 *     z: 0.00
 *
 * tradeLines:
 *   - from: "QXMVPA"
 *     to: "BGHJKL"
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
  const systems: System[] = [];
  const tradeLines: TradeLine[] = [];
  let generatorSeed: string | undefined;

  const lines = block.split('\n').map(l => l.trimEnd());

  let mode: 'systems' | 'tradeLines' | 'header' | null = 'header';
  let currentSys: Partial<System> | null = null;
  let currentTrade: Partial<TradeLine> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue; // skip blank lines

    // Detect mode transitions
    if (trimmed === 'systems:') {
      mode = 'systems';
      continue;
    }
    if (trimmed === 'tradeLines:') {
      mode = 'tradeLines';
      continue;
    }

    // ---- Header fields (before systems:) ----
    if (mode === 'header') {
      if (trimmed.startsWith('generatorSeed:')) {
        generatorSeed = extractValue(trimmed);
      }
      continue;
    }

    // ---- Systems ----
    if (mode === 'systems') {
      if (trimmed.startsWith('- sysid:')) {
        if (currentSys && currentSys.sysid) {
          systems.push(finalizeSystem(currentSys));
        }
        currentSys = { sysid: extractValue(trimmed) };
      } else if (trimmed.startsWith('- name:')) {
        // Allow omitting sysid — auto-generate one
        if (currentSys && currentSys.name) {
          systems.push(finalizeSystem(currentSys));
        }
        currentSys = { name: extractValue(trimmed), sysid: generateSysId() };
      } else if (currentSys) {
        if (trimmed.startsWith('name:')) {
          currentSys.name = extractValue(trimmed);
        } else if (trimmed.startsWith('sysid:')) {
          currentSys.sysid = extractValue(trimmed);
        } else if (trimmed.startsWith('x:')) {
          currentSys.x = to2dp(parseFloat(extractValue(trimmed)));
        } else if (trimmed.startsWith('y:')) {
          currentSys.y = to2dp(parseFloat(extractValue(trimmed)));
        } else if (trimmed.startsWith('z:')) {
          currentSys.z = to2dp(parseFloat(extractValue(trimmed)));
        } else if (trimmed.startsWith('color:')) {
          currentSys.color = extractValue(trimmed);
        } else if (trimmed.startsWith('size:')) {
          currentSys.size = parseInt(extractValue(trimmed), 10);
        } else if (trimmed.startsWith('faction:')) {
          currentSys.faction = extractValue(trimmed);
        } else if (trimmed.startsWith('type:')) {
          currentSys.type = extractValue(trimmed);
        }
      }
    }

    // ---- Trade Lines ----
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
  if (currentSys && currentSys.sysid) {
    systems.push(finalizeSystem(currentSys));
  }
  if (currentTrade && currentTrade.from && currentTrade.to) {
    tradeLines.push(finalizeTrade(currentTrade));
  }

  return { generatorSeed, systems, tradeLines };
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

function finalizeSystem(s: Partial<System>): System {
  return {
    sysid: s.sysid || generateSysId(),
    name: s.name,
    x: s.x ?? 0,
    y: s.y ?? 0,
    z: s.z ?? 0,
    color: s.color || '#ffffff',
    size: s.size || 3,
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
