/**
 * vault - the only module that writes to the Obsidian vault. A thin
 * adapter: every actual decision (what to write, whether an edit survives)
 * is `render.ts`'s pure logic; this module's whole job is turning that into
 * real file reads/writes against the Obsidian API. Amendment A3 exempts it
 * from provenance headers and ledgers, same as `render`.
 *
 * -- THE TWO-LAYER RULING (S5.6), NOW GENUINELY TWO FILES (16 Aug 2026) -------
 * TWO layers, not one: a CANONICAL note (`StarForge/Systems/`) this plugin
 * owns and regenerates wholesale, fence-protected (`render.ts`'s own
 * mechanism - a hand-edit INSIDE the fence still survives, belt-and-braces),
 * and a separate AUTHORED note (`StarForge/Notes/`) created ONCE, on first
 * generation, and NEVER TOUCHED AGAIN by this module afterward - not
 * regenerated, not merged, not fence-checked. "The user can't access it"
 * means NOT SURFACED AND NOT EDIT-SAFE, NEVER OPAQUE (S5.6's own owner
 * ruling): the canonical store is plain markdown in a plugin-managed
 * folder, findable by anyone who goes looking, just not presented as
 * something to hand-edit - and the authored note is where hand-editing is
 * the ENTIRE point, structurally guaranteed safe by this module simply
 * never writing to it a second time, not merely by a fence inside a file
 * this module keeps touching.
 *
 * Before this: ONE file, fence-protected. The fence made "the user's own
 * words survive regeneration" true, but a user who wanted a clean space for
 * their own worldbuilding had to write it inside (or after) a file this
 * module still owns and still calls `vault.modify` on for every commit -
 * structurally correct in the narrow sense (the fence held) but not the
 * genuinely separate space S5.6 asks for.
 *
 * genVersion: not applicable (Amendment A3).
 */

import type { Vault, TFile, TFolder } from 'obsidian';
import { mergeWithExisting, buildAuthoredStub, type RenderSystemInput, type MergeResult } from './render';

export const CANONICAL_FOLDER = 'StarForge/Systems';
export const AUTHORED_FOLDER = 'StarForge/Notes';

function systemNotePath(sysid: string): string {
  return `${CANONICAL_FOLDER}/${sysid}.md`;
}
function authoredNotePath(sysid: string): string {
  return `${AUTHORED_FOLDER}/${sysid}.md`;
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
