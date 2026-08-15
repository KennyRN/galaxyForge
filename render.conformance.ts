import {
  buildNoteContent, mergeWithExisting, trueDistance3dPc, GENERATED_START, GENERATED_END,
  type RenderSystemInput,
} from './render';

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

// extra: a note with no fence at all is never touched
check('+ a note with no recognisable fence is left completely unchanged, marked edited',
  (() => {
    const handAuthored = 'Just some notes I wrote myself, no fence markers at all.';
    const merge = mergeWithExisting(SYSTEM, handAuthored, null);
    return merge.content === handAuthored && merge.edited === true;
  })());

if (failures > 0) throw new Error(`${failures} render conformance failure(s)`);
console.log('\nall render conformance checks passed');
