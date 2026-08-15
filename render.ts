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

export const GENERATED_START = '%% STARFORGE:GENERATED:START - do not edit below this line, your changes will be overwritten %%';
export const GENERATED_END = '%% STARFORGE:GENERATED:END - your own notes go BELOW this line and are never touched %%';

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
}

/** The CANONICAL generated block's own content (no frontmatter, no fence
 *  markers - `buildNoteContent` wraps this). */
export function renderSystemBody(system: RenderSystemInput): string {
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
 */
export const RENDER_GATES = 6 as const;
