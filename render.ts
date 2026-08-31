/**
 * render - the only module that emits markdown. Amendment A3 exempts it
 * (and `vault`) from provenance headers and ledgers - there is no science
 * here, only presentation - but NOT from thin interfaces or single-source
 * (Law 1 still applies: `units` is the only place a conversion happens, and
 * `render` calls it rather than formatting a raw pc/Msun value itself).
 *
 * -- THE FENCE MECHANISM, Stage 11's own "gate that protects users" --------------
 * A generated note is TWO LAYERS (S5.6's owner ruling): a canonical block
 * this module owns and regenerates wholesale, and everything OUTSIDE that
 * block, which belongs to the user and must never be touched. The canonical
 * block is wrapped in fixed markers (`GENERATED_START`/`GENERATED_END`);
 * everything before the start marker and after the end marker is preserved
 * VERBATIM across regeneration, byte for byte.
 *
 * `types.ts`'s own `FenceState` (`sha`, `edited`) is the mechanism this
 * module implements: the hash of the generated block as it was LAST
 * written is stored; on regeneration, `mergeWithExisting` recomputes the
 * hash of what is CURRENTLY between the markers and compares. If they
 * match, nothing was hand-edited - safe to overwrite with fresh content. If
 * they differ, the user edited INSIDE the fence (which the two-layer
 * ruling says should never happen, but users do it anyway) - the merge
 * REFUSES to overwrite and reports `edited: true` instead, exactly the
 * "hash mismatch -> NEVER overwrite" rule `FenceState`'s own doc comment
 * states.
 *
 * This logic is deliberately PURE STRING MANIPULATION, with no Obsidian
 * dependency - `vault.ts` is a thin wrapper calling into it with real file
 * contents, so the actual merge/fence logic (the part the Stage 11 gate
 * cares about) is fully testable without a live Obsidian instance.
 *
 * genVersion: not applicable (Amendment A3) - this module's OUTPUT changes
 * whenever any upstream module's output does, but it owns no science of
 * its own to bump a version over.
 */

import { xmur3 } from './rng';
import { pcToLy } from './units';
import type { SystemCore } from './types';
import { HAB_TIER_LABELS, type HabTier } from './humanHabitability';

export const GENERATED_START = '%% GALAXYFORGE:GENERATED:START - do not edit below this line, your changes will be overwritten %%';
export const GENERATED_END = '%% GALAXYFORGE:GENERATED:END - your own notes go BELOW this line and are never touched %%';

/** True 3D distance from stored coordinates - NEVER map distance (S4.8's
 *  own repeated warning: two systems can sit adjacent on a flattened map
 *  and be a slab-thickness apart in reality). */
export function trueDistance3dPc(
  a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export interface RenderSystemInput {
  readonly sysid: string;
  readonly name: string | null;
  readonly population: string;
  readonly positionPc: { readonly x: number; readonly y: number; readonly z: number };
  readonly distanceFromSectorOriginPc: number;
  /**
   * The FULL generated system (16 Aug 2026) - optional so every existing
   * caller (remnants, which have no SystemCore yet - a separately-scoped
   * remaining gap, see galaxyCreationModals.ts's own comment) keeps
   * compiling unchanged. When present, `renderSystemBody` renders the
   * real detail (stars, planets, moons, atmospheres, habitability) instead
   * of the position-only summary. Closes a real gap an audit found:
   * `generateSystemCore` was being called on every commit and its result
   * thrown away (`void core;`) before this module ever saw it - the
   * science ran for real, only the note stayed thin.
   */
  readonly core?: SystemCore;
}

/** The thin, position-only summary - used when no `SystemCore` is
 *  available (currently: every remnant note; previously: every note). */
function renderThinSystemBody(system: RenderSystemInput): string {
  const lines: string[] = [];
  lines.push(`# ${system.name ?? system.sysid}`);
  lines.push('');
  lines.push(`- **System ID**: \`${system.sysid}\``);
  lines.push(`- **Population**: ${system.population}`);
  lines.push(`- **Position**: ${system.positionPc.x.toFixed(3)}, ${system.positionPc.y.toFixed(3)}, ${system.positionPc.z.toFixed(3)} pc`);
  lines.push(`- **Distance from sector origin**: ${system.distanceFromSectorOriginPc.toFixed(3)} pc ` +
    `(${pcToLy(system.distanceFromSectorOriginPc).toFixed(3)} ly)`);
  return lines.join('\n');
}

/**
 * The FULL detail body - every star, every planet (with its moon count,
 * atmosphere/surface/biosphere/terraforming/human-habitability verdict
 * when present, `null` when the planet is a giant with no solid surface -
 * `SystemCore`'s own "does not apply" convention, not an omission), the
 * system's geometric habitable zone and galactic habitability score. Pure
 * facts, no authored fiction - the canonical layer's own job (this
 * module's header, "a canonical block this module owns and regenerates
 * wholesale"). Ported 16 Aug 2026 from a sibling build's own
 * `renderCanonicalDetail`, adapted to this project's own field names.
 */
function renderFullSystemBody(system: RenderSystemInput, core: SystemCore): string {
  const lines: string[] = [];
  lines.push(`# ${system.name ?? core.sysid}`);
  lines.push('');
  lines.push(`- **System ID**: \`${core.sysid}\``);
  lines.push(`- **Population**: ${core.ctx.population}`);
  lines.push(`- **Age**: ${core.ctx.age.toFixed(3)} Gyr`);
  lines.push(`- **[Fe/H]**: ${core.ctx.feh.toFixed(3)} dex`);
  if (core.ctx.conatalGroupId) lines.push(`- **Co-natal group**: \`${core.ctx.conatalGroupId}\``);
  lines.push(`- **Position**: ${core.ctx.positionPc.x.toFixed(3)}, ${core.ctx.positionPc.y.toFixed(3)}, ${core.ctx.positionPc.z.toFixed(3)} pc`);
  lines.push(`- **Distance from sector origin**: ${system.distanceFromSectorOriginPc.toFixed(3)} pc ` +
    `(${pcToLy(system.distanceFromSectorOriginPc).toFixed(3)} ly)`);
  lines.push('');

  lines.push('## Stars');
  for (const s of core.stars) {
    lines.push(`- **${s.class}** - T=${s.tempK.toFixed(0)} K, L=${s.luminositySol.toFixed(4)} L☉, ` +
      `M=${s.massSol.toFixed(3)} M☉, R=${s.radiusSol.toFixed(3)} R☉`);
  }
  const primaryActivity = core.ctx.history[0]?.activityClass;
  if (primaryActivity === 'flare-active') {
    lines.push('');
    lines.push('_Primary activity: flare-active - frequent flares scour the inner system._');
  }
  lines.push('');

  lines.push('## Planets');
  if (core.planets.length === 0) lines.push('_None._');
  for (const p of core.planets) {
    const i = p.formationIndex;
    const moonCount = core.moons[i]?.length ?? 0;
    const hab = core.humanHabitability[i];
    lines.push(`- **#${i} ${p.class}** (${p.kind}/${p.subclass}, zone ${p.zone}) - ` +
      `${p.au.toFixed(3)} AU, ${p.massEarth.toFixed(3)} M⊕, ${p.radiusEarth.toFixed(3)} R⊕, moons=${moonCount}`);
    const atm = core.atmospheres[i];
    if (atm) lines.push(`  - Atmosphere: ${atm.kind}, ${atm.pressureClass}, ${atm.equilibriumTempK.toFixed(0)} K`);
    const bio = core.biospheres[i];
    if (bio) lines.push(`  - Biosphere: ${bio.level}`);
    const terra = core.terraforming[i];
    // completeness dropped 16 Aug 2026 - terraforming.ts's own header: a
    // terraformed world is simply, completely terraformed now, no partial
    // -progress state left to print.
    if (terra?.terraformed) lines.push(`  - Terraforming: ${terra.terraformed.types.join(', ')}`);
    if (hab) lines.push(`  - Habitability: tier ${hab.tier} (${hab.support}), gravity ${hab.gravityG.toFixed(2)}g`);
  }
  lines.push('');

  lines.push('## Habitable zone (geometric)');
  lines.push(`inner ${core.habitableZoneAu.inner.toFixed(3)} AU, outer ${core.habitableZoneAu.outer.toFixed(3)} AU`);
  lines.push(`galacticHabitabilityScore: ${core.galacticHabitabilityScore.toFixed(3)}`);

  if (core.belts.length > 0) {
    lines.push('');
    lines.push('## Belts');
    for (const b of core.belts) {
      lines.push(`- ${b.kind} (${b.composition}), ${b.innerAu.toFixed(3)}-${b.outerAu.toFixed(3)} AU, ` +
        `~${b.countAbove1km.toLocaleString()} bodies >1km`);
    }
  }

  return lines.join('\n');
}

/** The CANONICAL generated block's own content (no frontmatter, no fence
 *  markers - `buildNoteContent` wraps this). Dispatches to the full detail
 *  renderer when `system.core` is present, the thin summary otherwise. */
export function renderSystemBody(system: RenderSystemInput): string {
  return system.core ? renderFullSystemBody(system, system.core) : renderThinSystemBody(system);
}

/**
 * The AUTHORED note's own starting content (16 Aug 2026, the two-layer
 * vault split - see `vault.ts`'s own header) - a linking stub, not a copy
 * of the canonical detail (that would just be a second thing to keep in
 * sync). `[[sysid]]` is a real Obsidian wikilink back to the canonical
 * note, so the two are one click apart either direction. `vault.ts` calls
 * this ONCE, the first time a system is generated, and never again -
 * everything after that first write is the user's own words.
 */
export function buildAuthoredStub(sysid: string, name: string | null): string {
  const title = name ?? sysid;
  return [
    `# ${title}`,
    '',
    `Canonical data: [[${sysid}]]`,
    '',
    '_Your own notes about this system go here. This file is created once and',
    'never touched again by galaxyForge - regenerating the sector will never',
    'overwrite anything you write below this line._',
    '',
  ].join('\n');
}

/** A full new note, with the canonical block fenced. Used only for a note
 *  that does not exist yet - an EXISTING note goes through
 *  `mergeWithExisting` instead, which preserves everything outside the
 *  fence. */
export function buildNoteContent(system: RenderSystemInput): string {
  const body = renderSystemBody(system);
  return [GENERATED_START, body, GENERATED_END, '', '<!-- your own notes below - never overwritten -->', ''].join('\n');
}

function shaOf(content: string): string {
  return xmur3(content)().toString(16);
}

export interface MergeResult {
  readonly content: string;
  readonly edited: boolean;
  readonly sha: string;
}

/**
 * Regenerates a note that MAY already exist. `existingRawContent` is
 * `null` for a brand-new note. `previousSha` is the fence hash recorded
 * the last time this note was written (from `FenceState.sha`); `null` if
 * this is the first write.
 */
export function mergeWithExisting(
  system: RenderSystemInput, existingRawContent: string | null, previousSha: string | null,
): MergeResult {
  const freshBody = renderSystemBody(system);
  const freshSha = shaOf(freshBody);

  if (existingRawContent === null) {
    return { content: buildNoteContent(system), edited: false, sha: freshSha };
  }

  const startIdx = existingRawContent.indexOf(GENERATED_START);
  const endIdx = existingRawContent.indexOf(GENERATED_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    // No recognisable fence at all (a note authored entirely by hand, or a
    // corrupted one) - never destroy it. Treat as edited, refuse to touch.
    return { content: existingRawContent, edited: true, sha: previousSha ?? freshSha };
  }

  const before = existingRawContent.slice(0, startIdx);
  const currentBody = existingRawContent.slice(startIdx + GENERATED_START.length, endIdx).trim();
  const after = existingRawContent.slice(endIdx + GENERATED_END.length);
  const currentSha = shaOf(currentBody);

  const handEdited = previousSha !== null && currentSha !== previousSha;
  if (handEdited) {
    // NEVER overwrite - the "hash mismatch -> NEVER overwrite" rule,
    // FenceState's own doc comment. Return the note UNCHANGED, marked.
    return { content: existingRawContent, edited: true, sha: currentSha };
  }

  const rebuilt = `${before}${GENERATED_START}\n${freshBody}\n${GENERATED_END}${after}`;
  return { content: rebuilt, edited: false, sha: freshSha };
}

/* ----------------------------- sector list (17 Aug 2026) --------------------- */

/**
 * One row's worth of pre-reduced data for the sector-list document -
 * assembled by the caller (`galaxyCreationModals.ts`'s `commitInner`, which
 * already has both `SystemCore` for every stellar system and the thinner
 * remnant records) rather than derived here, so this module still never
 * reaches into `SystemCore` internals beyond what a single row needs to
 * show (Law 1 - `render.ts` presents, it does not re-derive).
 *
 * `distancePc` is the TRUE 3D distance from the SECTOR's own origin (its
 * `centrePc`) - the same quantity `RenderSystemInput.distanceFromSector
 * OriginPc` already names, NOT the galactic origin (0,0,0), which is a
 * different point almost always far outside the sector entirely (17 Aug
 * 2026, corrected - an earlier draft of this row measured from the
 * galactic origin instead, a real misreading of the owner's own spec).
 */
export interface SectorListRow {
  readonly sysid: string;
  readonly distancePc: number;
  readonly multiplicity: number;
  readonly primaryType: string;
  /** Best `HabTier` across the system's own planets; `null` when there are
   *  no planets to judge (a remnant, or a stellar system with none) - same
   *  "best tier, null if nothing to grade" convention `types.ts`'s own
   *  `SystemSummary.bestHabTier` already establishes. */
  readonly bestHabTier: HabTier | null;
  readonly planetTypes: string;
  readonly belts: string;
}

/** Short form of a `HAB_TIER_LABELS` entry - the full label ("Hostile (full
 *  life support required)") is right for a detail note's own prose, too
 *  wide for a table cell; this keeps just the headline word. `—` when
 *  there is nothing to grade (see `SectorListRow.bestHabTier`'s own doc). */
export function formatHabitabilityCell(tier: HabTier | null): string {
  if (tier === null) return '—';
  return `T${tier} ${HAB_TIER_LABELS[tier].split(' (')[0]}`;
}

/** Groups a system's own planets by (class, subclass) - both, per the
 *  owner's own choice, since neither alone is what "planet types" meant
 *  ("ice giant" is a subclass; "gas giant" isn't any single label at all,
 *  see `planets.ts`'s own `PlanetSubclass` union - `sub-giant`/`giant`
 *  both resolve to `jovian` or `hot-jupiter` depending on migration, never
 *  a bare "gas giant"). Counted and ORDER-OF-FIRST-APPEARANCE, not
 *  alphabetised - matches formation order, the same convention
 *  `renderFullSystemBody`'s own planet list already uses. `—` for an
 *  empty system, never a blank cell a reader could mistake for missing
 *  data. */
export function formatPlanetTypesCell(planets: readonly { class: string; subclass: string }[]): string {
  if (planets.length === 0) return '—';
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const p of planets) {
    const key = `${p.class} (${p.subclass})`;
    if (!counts.has(key)) order.push(key);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return order.map((key) => `${counts.get(key)} ${key}`).join(', ');
}

/** Same grouped-count convention as `formatPlanetTypesCell`, over
 *  `Belt.kind` (`main`/`kuiper` - `belts.ts`'s own `BeltKind`). `—` when
 *  the system has none. */
export function formatBeltsCell(belts: readonly { kind: string }[]): string {
  if (belts.length === 0) return '—';
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const b of belts) {
    if (!counts.has(b.kind)) order.push(b.kind);
    counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
  }
  return order.map((kind) => `${counts.get(kind)} ${kind}`).join(', ');
}

export interface SectorListMeta {
  readonly worldSeed: string;
  readonly centrePc: { readonly x: number; readonly y: number; readonly z: number };
  readonly radiusPc: number;
  readonly thicknessPc: number;
  readonly footprintShape: string;
  readonly stellarCount: number;
  readonly remnantCount: number;
  readonly generatedIso: string;
}

/**
 * The whole sector-list document - ONE markdown table, sorted by
 * `distancePc` ASCENDING (closest to the SECTOR's own origin, `meta
 * .centrePc`, first - the owner's own explicit spec) - sorting happens
 * HERE, not left to the caller, so "sorted" is this function's own
 * testable contract rather than an assumption about call-site discipline.
 *
 * `sysid` renders as a plain code span, NOT a `[[wikilink]]` - unlike a
 * canonical system note (which this document replaces at sector-creation
 * time, see `vault.ts`'s own header), no per-system note exists to link
 * to, and a wikilink to a note that does not exist is exactly the
 * "graph view fills with stubs" problem `SystemSummary.hasNote`'s own doc
 * comment already names for this exact situation.
 */
export function buildSectorListContent(meta: SectorListMeta, rows: readonly SectorListRow[]): string {
  const sorted = [...rows].sort((a, b) => a.distancePc - b.distancePc);
  const lines: string[] = [];
  lines.push(`# Sector — ${meta.worldSeed}`);
  lines.push('');
  lines.push(`- **Centre**: ${meta.centrePc.x.toFixed(3)}, ${meta.centrePc.y.toFixed(3)}, ${meta.centrePc.z.toFixed(3)} pc`);
  lines.push(`- **Radius**: ${meta.radiusPc.toFixed(3)} pc`);
  lines.push(`- **Thickness**: ${meta.thicknessPc.toFixed(3)} pc`);
  lines.push(`- **Footprint**: ${meta.footprintShape}`);
  lines.push(`- **Systems**: ${meta.stellarCount + meta.remnantCount} (${meta.remnantCount} remnant${meta.remnantCount === 1 ? '' : 's'})`);
  lines.push(`- **Generated**: ${meta.generatedIso}`);
  lines.push('');
  lines.push('Sorted by distance from the sector origin (the Centre above), closest first.');
  lines.push('');
  lines.push('| sysid | multiplicity | primary star type | habitability | planet types | belts |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of sorted) {
    lines.push(`| \`${r.sysid}\` | ${r.multiplicity} | ${r.primaryType} | ${formatHabitabilityCell(r.bestHabTier)} | ${r.planetTypes} | ${r.belts} |`);
  }
  lines.push('');
  return lines.join('\n');
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. THE STAGE-11 GATE - write a note, hand-edit content INSIDE the fence,
 *     regenerate: the hand-edit SURVIVES (the merge result's content is
 *     unchanged) and `edited` is `true`.
 *  2. Editing OUTSIDE the fence (the user's own notes) always survives
 *     regeneration, REGARDLESS of whether the inside was also edited -
 *     `before`/`after` are never touched by `mergeWithExisting`.
 *  3. An UN-edited note (fresh regeneration, no hand changes) updates its
 *     generated block silently, `edited: false`, and the sha changes to
 *     match the newly-rendered content.
 *  4. `trueDistance3dPc` never uses only x/y (a "map distance" bug would
 *     ignore z) - verified directly with two points differing only in z.
 *  5. A brand-new note (no existing content) always produces a syntactically
 *     well-formed fence (exactly one START, one END, START before END).
 *  6. Determinism - `shaOf` is a pure function of its content.
 *  7. FULL SYSTEMCORE DETAIL (16 Aug 2026) - when `RenderSystemInput.core`
 *     is present, the rendered body contains real per-star/per-planet
 *     detail (not just position/population), and the SAME fence mechanism
 *     (gates 1-3) works identically on it. When `core` is absent, the
 *     thin summary renders exactly as before - this is additive, not a
 *     replacement.
 *  8. buildAuthoredStub (16 Aug 2026) always contains a wikilink back to
 *     its own sysid, and its content is a pure function of (sysid, name) -
 *     the same input always produces the same stub, so `vault.ts`'s own
 *     "create once, never touch again" promise is checking a stable
 *     target, not a moving one.
 *  9. SECTOR LIST (17 Aug 2026) - `buildSectorListContent` SORTS its own
 *     output by `distancePc` ascending regardless of input order;
 *     `formatHabitabilityCell`/`formatPlanetTypesCell`/`formatBeltsCell`
 *     each render "—" for "nothing to show" rather than a blank cell, and
 *     the planet/belt formatters group-and-count by first-appearance
 *     order, not alphabetically; `sysid` renders as a plain code span,
 *     never a `[[wikilink]]` (no per-system note exists for this document
 *     to link to); the whole function is deterministic and produces
 *     exactly one table row per input system.
 */
export const RENDER_GATES = 9 as const;
