/**
 * vault - the only module that writes to the Obsidian vault. A thin
 * adapter: every actual decision (what to write, whether an edit survives)
 * is `render.ts`'s pure logic; this module's whole job is turning that into
 * real file reads/writes against the Obsidian API. Amendment A3 exempts it
 * from provenance headers and ledgers, same as `render`.
 *
 * -- THE TWO-LAYER RULING (S5.6), NOW GENUINELY TWO FILES (16 Aug 2026) -------
 * TWO layers, not one: a CANONICAL note (`_backstage/galaxyforge/Systems/`)
 * this plugin owns and regenerates wholesale, fence-protected (`render.ts`'s
 * own mechanism - a hand-edit INSIDE the fence still survives,
 * belt-and-braces), and a separate AUTHORED note
 * (`_backstage/galaxyforge/Notes/`) created ONCE, on first generation, and
 * NEVER TOUCHED AGAIN by this module afterward - not regenerated, not
 * merged, not fence-checked. "The user can't access it" means NOT SURFACED
 * AND NOT EDIT-SAFE, NEVER OPAQUE (S5.6's own owner ruling): the canonical
 * store is plain markdown in a plugin-managed folder, findable by anyone
 * who goes looking, just not presented as something to hand-edit - and the
 * authored note is where hand-editing is the ENTIRE point, structurally
 * guaranteed safe by this module simply never writing to it a second time,
 * not merely by a fence inside a file this module keeps touching.
 *
 * Before this: ONE file, fence-protected. The fence made "the user's own
 * words survive regeneration" true, but a user who wanted a clean space for
 * their own worldbuilding had to write it inside (or after) a file this
 * module still owns and still calls `vault.modify` on for every commit -
 * structurally correct in the narrow sense (the fence held) but not the
 * genuinely separate space S5.6 asks for.
 *
 * -- BACKSTAGE LOCATION, RENAMED (17 Aug 2026) --------------------------------
 * `<PluginName>/` -> `_backstage/galaxyforge/` for every folder this module
 * owns - a leading underscore is Obsidian's own convention for a folder a
 * vault's file explorer sorts to the top/bottom and a user recognises as
 * plugin-managed machinery, not their own worldbuilding space (S5.6's own
 * "findable... just not presented as something to hand-edit" reasoning,
 * now reflected in the path itself, not just in this module's behaviour).
 * No migration: no galaxy exists on disk yet at the time of this rename
 * (same empty-disk window Amendment A9 already used, this session).
 *
 * -- SECTOR LIST, NEW (17 Aug 2026) -------------------------------------------
 * A THIRD thing this module writes, alongside the two per-system layers
 * above: ONE markdown document per generated sector
 * (`_backstage/galaxyforge/Sectors/`), listing every system in that sector
 * - `render.ts`'s own `buildSectorListContent`. Sector creation
 * (`galaxyCreationModals.ts`'s `commitInner`) now writes ONLY this - the
 * per-system canonical/authored writes above are no longer called from
 * that flow. They are NOT deleted: `writeSystemNote` stays real, gated
 * (via `render.ts`'s own fence logic) infrastructure for a FUTURE lazy,
 * on-click detail note (the intent `types.ts`'s own `SystemSummary` doc
 * comment already named - "detail notes are written lazily, on click" -
 * before anything built toward it). The dev test-harness command in
 * `main.ts` still exercises this path directly.
 *
 * genVersion: not applicable (Amendment A3).
 */

import type { Vault, TFile, TFolder } from 'obsidian';
import { mergeWithExisting, buildAuthoredStub, type RenderSystemInput, type MergeResult } from './render';

const BACKSTAGE_ROOT = '_backstage/galaxyforge';
export const CANONICAL_FOLDER = `${BACKSTAGE_ROOT}/Systems`;
export const AUTHORED_FOLDER = `${BACKSTAGE_ROOT}/Notes`;
export const SECTOR_FOLDER = `${BACKSTAGE_ROOT}/Sectors`;

function systemNotePath(sysid: string): string {
  return `${CANONICAL_FOLDER}/${sysid}.md`;
}
function authoredNotePath(sysid: string): string {
  return `${AUTHORED_FOLDER}/${sysid}.md`;
}
function sectorListPath(filename: string): string {
  return `${SECTOR_FOLDER}/${filename}.md`;
}

async function ensureFolder(vault: Vault, path: string): Promise<void> {
  const existing = vault.getAbstractFileByPath(path);
  if (existing) return;
  await vault.createFolder(path).catch((err: unknown) => {
    // Obsidian throws if the folder already exists in a race; treat as
    // success rather than propagating a spurious failure.
    if (!(err instanceof Error) || !err.message.includes('already exists')) throw err;
  });
}

/**
 * Creates the authored stub IFF it does not already exist. Never called
 * again for an sysid that already has one - the whole point of this
 * function is that it is safe to call unconditionally on every commit and
 * still never clobber a word the user wrote.
 */
async function ensureAuthoredStub(vault: Vault, sysid: string, name: string | null): Promise<void> {
  await ensureFolder(vault, AUTHORED_FOLDER);
  const path = authoredNotePath(sysid);
  if (vault.getAbstractFileByPath(path)) return;
  await vault.create(path, buildAuthoredStub(sysid, name));
}

/**
 * Writes (or regenerates) one system's canonical note, THEN ensures its
 * authored stub exists (created once; a no-op on every call after the
 * first). Reads any existing canonical content first, merges via
 * `render.ts`'s fence-preserving logic, and only calls `vault.modify`/
 * `vault.create` with the RESULT - the vault API itself never sees or
 * makes the overwrite-vs-preserve decision.
 *
 * `previousSha` should come from the caller's own stored `FenceState` (not
 * this module's concern to persist - `SectorRecipe`/note frontmatter is
 * where that belongs, per `types.ts`'s own `FenceState` shape).
 */
export async function writeSystemNote(
  vault: Vault, system: RenderSystemInput, previousSha: string | null,
): Promise<MergeResult> {
  await ensureFolder(vault, CANONICAL_FOLDER);
  const path = systemNotePath(system.sysid);
  const existingFile = vault.getAbstractFileByPath(path) as TFile | null;

  const existingContent = existingFile ? await vault.read(existingFile) : null;
  const result = mergeWithExisting(system, existingContent, previousSha);

  if (existingFile) {
    if (result.content !== existingContent) await vault.modify(existingFile, result.content);
  } else {
    await vault.create(path, result.content);
  }
  await ensureAuthoredStub(vault, system.sysid, system.name);
  return result;
}

export async function readSystemNote(vault: Vault, sysid: string): Promise<string | null> {
  const file = vault.getAbstractFileByPath(systemNotePath(sysid)) as TFile | null;
  return file ? vault.read(file) : null;
}

export function listSystemNotes(vault: Vault): TFile[] {
  const folder = vault.getAbstractFileByPath(CANONICAL_FOLDER) as TFolder | null;
  if (!folder) return [];
  return folder.children.filter((f): f is TFile => 'extension' in f && (f as TFile).extension === 'md');
}

export async function readAuthoredNote(vault: Vault, sysid: string): Promise<string | null> {
  const file = vault.getAbstractFileByPath(authoredNotePath(sysid)) as TFile | null;
  return file ? vault.read(file) : null;
}

export function listAuthoredNotes(vault: Vault): TFile[] {
  const folder = vault.getAbstractFileByPath(AUTHORED_FOLDER) as TFolder | null;
  if (!folder) return [];
  return folder.children.filter((f): f is TFile => 'extension' in f && (f as TFile).extension === 'md');
}

/** True iff sysid has an authored note at all - lets a caller (the atlas,
 *  a future settings panel) distinguish "never generated" from "generated
 *  but the user never wrote anything" without reading the file. */
export function hasAuthoredNote(vault: Vault, sysid: string): boolean {
  return vault.getAbstractFileByPath(authoredNotePath(sysid)) !== null;
}

/**
 * Writes ONE new sector-list document (`render.ts`'s own
 * `buildSectorListContent`) - `filename` already includes whatever makes it
 * unique (the caller's own timestamp/worldSeed convention -
 * `galaxyCreationModals.ts`'s `commitInner`), so this always creates rather
 * than merges: a sector-list document is a one-shot artifact of ONE
 * generation event, not a regenerated-in-place canonical note, and carries
 * none of `render.ts`'s fence machinery (there is nothing to hand-edit
 * inside a table this module never touches again either).
 */
export async function writeSectorList(vault: Vault, filename: string, content: string): Promise<TFile> {
  await ensureFolder(vault, SECTOR_FOLDER);
  return vault.create(sectorListPath(filename), content);
}
