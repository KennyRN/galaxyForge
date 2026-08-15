/**
 * vault - the only module that writes to the Obsidian vault. A thin
 * adapter: every actual decision (what to write, whether an edit survives)
 * is `render.ts`'s pure logic; this module's whole job is turning that into
 * real file reads/writes against the Obsidian API. Amendment A3 exempts it
 * from provenance headers and ledgers, same as `render`.
 *
 * -- THE TWO-LAYER RULING (S5.6), IMPLEMENTED --------------------------------
 * A canonical folder this plugin owns and regenerates wholesale, and an
 * authored folder it never writes to. "The user can't access it" means NOT
 * SURFACED AND NOT EDIT-SAFE, NEVER OPAQUE (S5.6's own owner ruling) - the
 * canonical store is plain markdown in a plugin-managed folder, findable by
 * anyone who goes looking, just not presented as something to hand-edit.
 * The fence mechanism (`render.ts`) is what makes "not edit-safe" honest
 * rather than a lie: if a user DOES edit inside it anyway, the edit is
 * preserved, never silently destroyed.
 *
 * genVersion: not applicable (Amendment A3).
 */

import type { Vault, TFile, TFolder } from 'obsidian';
import { mergeWithExisting, type RenderSystemInput, type MergeResult } from './render';

export const CANONICAL_FOLDER = 'StarForge/Systems';

function systemNotePath(sysid: string): string {
  return `${CANONICAL_FOLDER}/${sysid}.md`;
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
 * Writes (or regenerates) one system's canonical note. Reads any existing
 * content first, merges via `render.ts`'s fence-preserving logic, and only
 * calls `vault.modify`/`vault.create` with the RESULT - the vault API
 * itself never sees or makes the overwrite-vs-preserve decision.
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
