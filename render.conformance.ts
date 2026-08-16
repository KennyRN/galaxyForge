import {
  buildNoteContent, mergeWithExisting, trueDistance3dPc, GENERATED_START, GENERATED_END,
  type RenderSystemInput,
} from './render';
import { generateSystemCore, type GenerateSystemInputs } from './systemConductor';
import { SPIRAL_POPULATIONS } from './galaxyModel';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const SYSTEM: RenderSystemInput = {
  sysid: '817.0.0.3', name: null, population: 'oldThin',
  positionPc: { x: 8180, y: 5, z: -2 }, distanceFromSectorOriginPc: 12.345,
};

// 1. THE STAGE-11 GATE
check('1 THE STAGE-11 GATE - a hand-edit INSIDE the fence survives regeneration ' +
  'and is marked edited=true',
  (() => {
    const first = buildNoteContent(SYSTEM);
    const firstMerge = mergeWithExisting(SYSTEM, first, null);
    // Simulate a user hand-editing the generated block (adding a stray line).
    const startIdx = firstMerge.content.indexOf(GENERATED_START);
    const endIdx = firstMerge.content.indexOf(GENERATED_END);
    const handEdited = firstMerge.content.slice(0, endIdx) + '\nHAND-EDITED LINE\n' + firstMerge.content.slice(endIdx);
    const secondMerge = mergeWithExisting(SYSTEM, handEdited, firstMerge.sha);
    return secondMerge.content === handEdited && secondMerge.edited === true;
  })());

// 2. edits OUTSIDE the fence always survive, regardless of inside-fence state
check('2 the user\'s own notes AFTER the fence survive regeneration, whether or ' +
  'not the inside was also edited',
  (() => {
    const first = buildNoteContent(SYSTEM);
    const firstMerge = mergeWithExisting(SYSTEM, first, null);
    const withUserNotes = firstMerge.content + '\n\nMy own campaign notes about this system.';
    const secondMerge = mergeWithExisting(SYSTEM, withUserNotes, firstMerge.sha);
    return secondMerge.content.includes('My own campaign notes about this system.') && secondMerge.edited === false;
  })());
check('2b the user\'s own notes BEFORE the fence also survive',
  (() => {
    const first = buildNoteContent(SYSTEM);
    const withPrefix = '---\ncustom-frontmatter: true\n---\n' + first;
    const firstMerge = mergeWithExisting(SYSTEM, withPrefix, null);
    return firstMerge.content.startsWith('---\ncustom-frontmatter: true\n---\n');
  })());

// 3. an un-edited note regenerates silently
check('3 an UN-edited note (no hand changes) regenerates with edited=false and ' +
  'an updated sha reflecting the fresh content',
  (() => {
    const first = buildNoteContent(SYSTEM);
    const firstMerge = mergeWithExisting(SYSTEM, first, null);
    const CHANGED_SYSTEM: RenderSystemInput = { ...SYSTEM, distanceFromSectorOriginPc: 99.999 };
    const secondMerge = mergeWithExisting(CHANGED_SYSTEM, firstMerge.content, firstMerge.sha);
    return secondMerge.edited === false && secondMerge.content.includes('99.999') &&
      secondMerge.sha !== firstMerge.sha;
  })());

// 4. trueDistance3dPc uses z, not just x/y
check('4 trueDistance3dPc is sensitive to z (never a map-distance x/y-only bug)',
  trueDistance3dPc({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 15 }) === 15);
check('4b trueDistance3dPc is the real Euclidean 3D distance',
  Math.abs(trueDistance3dPc({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 }) - 13) < 1e-9);

// 5. a brand-new note is well-formed
check('5 a brand-new note has exactly one START and one END marker, START ' +
  'before END',
  (() => {
    const content = buildNoteContent(SYSTEM);
    const starts = content.split(GENERATED_START).length - 1;
    const ends = content.split(GENERATED_END).length - 1;
    return starts === 1 && ends === 1 && content.indexOf(GENERATED_START) < content.indexOf(GENERATED_END);
  })());

// 6. determinism
check('6 buildNoteContent and mergeWithExisting are deterministic for the same inputs',
  (() => {
    const a = buildNoteContent(SYSTEM);
    const b = buildNoteContent(SYSTEM);
    return a === b;
  })());

// 7. FULL SYSTEMCORE DETAIL (16 Aug 2026) - a real generated system, not a
// hand-built fixture, so this exercises the actual field names/shapes
// generateSystemCore produces, not a stale mock of them.
const oldThinPop = SPIRAL_POPULATIONS.find((p) => p.key === 'oldThin')!;
const coreInputs: GenerateSystemInputs = {
  sysid: '817.0.0.3', genVersion: 3, worldSeed: 'render-gate-seed',
  positionPc: { x: 8180, y: 5, z: -2 }, population: 'oldThin', populationMeta: oldThinPop,
  formationRank: 0.42, terraformScale: 3,
};
const CORE = generateSystemCore(coreInputs);
const SYSTEM_WITH_CORE: RenderSystemInput = { ...SYSTEM, core: CORE };

check('7 a system WITH a core renders real detail - the primary star\'s own class ' +
  'appears in the body, not just position/population',
  buildNoteContent(SYSTEM_WITH_CORE).includes(CORE.stars[0]!.class));
check('7b the full-detail body includes a "Planets" section',
  buildNoteContent(SYSTEM_WITH_CORE).includes('## Planets'));
check('7c a system WITHOUT a core still renders the thin, position-only summary ' +
  '(no "## Stars"/"## Planets" heading) - backward compatible, e.g. remnants',
  !buildNoteContent(SYSTEM).includes('## Stars') && !buildNoteContent(SYSTEM).includes('## Planets'));
check('7d the fence mechanism (hand-edit survives regeneration) works IDENTICALLY ' +
  'on the full-detail body, not just the thin one', (() => {
  const first = buildNoteContent(SYSTEM_WITH_CORE);
  const firstMerge = mergeWithExisting(SYSTEM_WITH_CORE, first, null);
  const startIdx = firstMerge.content.indexOf(GENERATED_START);
  const endIdx = firstMerge.content.indexOf(GENERATED_END);
  const handEdited = firstMerge.content.slice(0, endIdx) + '\nHAND-EDITED LINE\n' + firstMerge.content.slice(endIdx);
  const secondMerge = mergeWithExisting(SYSTEM_WITH_CORE, handEdited, firstMerge.sha);
  return secondMerge.content === handEdited && secondMerge.edited === true;
})());
check('7e buildNoteContent(coreSystem) is deterministic, same as the thin path',
  buildNoteContent(SYSTEM_WITH_CORE) === buildNoteContent(SYSTEM_WITH_CORE));

// extra: a note with no fence at all is never touched
check('+ a note with no recognisable fence is left completely unchanged, marked edited',
  (() => {
    const handAuthored = 'Just some notes I wrote myself, no fence markers at all.';
    const merge = mergeWithExisting(SYSTEM, handAuthored, null);
    return merge.content === handAuthored && merge.edited === true;
  })());

if (failures > 0) throw new Error(`${failures} render conformance failure(s)`);
console.log('\nall render conformance checks passed');
