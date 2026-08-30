/**
 * nebulaMorphology.conformance - G-P17-a..g (P17, 30 Aug 2026). Every gate
 * falsifiable; most fail on pre-P17 code (there was no field to sample).
 */

import {
  nebulaFieldFor, nebulaPhaseAgeMyr, nebulaPhaseFor, stromgrenRadiusPc,
  DEFAULT_NEBULA_PARAMS, FRACTAL_DIMENSION_BAND, SAMPLE_DRAWS, ALPHA_B_CM3_S,
  NEBULA_MORPHOLOGY_GATES, type Vec3,
} from './nebulaMorphology';
import { mulberry32 } from './rng';
import { cmToPc } from './units';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

const CENTRE: Vec3 = { x: 8200, y: 0, z: 0 };
const P = DEFAULT_NEBULA_PARAMS;
const N_AMBIENT = 1.0;         // cm^-3
const N_MEMBERS = 72;          // 6 groups x 12
const radial = (p: Vec3) => Math.hypot(p.x - CENTRE.x, p.y - CENTRE.y, p.z - CENTRE.z);

/* G-P17-a - count-conserving by construction ------------------------------- */

check('G-P17-a: the field draws no counts - N calls to sampleGroupPos yield exactly N ' +
  'positions, all finite (count conservation lives in placeYoungClustered / gate 8 there; ' +
  'this module only maps uniforms to positions)', (() => {
  const f = nebulaFieldFor('a', 'c0', CENTRE, N_MEMBERS, 5, N_AMBIENT, P);
  const rng = mulberry32(12345);
  const pts: Vec3[] = [];
  for (let i = 0; i < 200; i++) pts.push(f.sampleGroupPos(rng));
  return pts.length === 200 && pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
})());

/* G-P17-b - determinism --------------------------------------------------- */

check('G-P17-b: same (worldSeed, complexId, params) + same rng -> bit-identical sample sequence', (() => {
  const seq = (): string => {
    const f = nebulaFieldFor('seed-b', '3.4.1', CENTRE, N_MEMBERS, 6, N_AMBIENT, P);
    const rng = mulberry32(999);
    let s = '';
    for (let i = 0; i < 50; i++) {
      const g = f.sampleGroupPos(rng);
      const o = f.sampleOffspringPos(rng, g);
      s += `${g.x},${g.y},${g.z}|${o.x},${o.y},${o.z};`;
    }
    return s;
  };
  return seq() === seq();
})());

check('G-P17-b2: nebulaPhaseAgeMyr is a pure function of (worldSeed, complexId, params), ' +
  'in [0, phaseAgeMaxMyr], and genuinely varies across complexes', (() => {
  if (nebulaPhaseAgeMyr('x', 'c1', P) !== nebulaPhaseAgeMyr('x', 'c1', P)) return false;
  const ages = Array.from({ length: 60 }, (_, i) => nebulaPhaseAgeMyr('x', `c${i}`, P));
  if (!ages.every((a) => a >= 0 && a <= P.phaseAgeMaxMyr)) return false;
  return new Set(ages.map((a) => Math.round(a))).size >= 5;
})());

/* G-P17-c - phase geometry is real, not just a label --------------------- */

check('G-P17-c: a shell-phase (age 5 Myr) field places far more group centres in the ' +
  'annulus around R_shell than a same-N compact-phase (age 0.2 Myr) field does', (() => {
  const shell = nebulaFieldFor('c', 'shell', CENTRE, N_MEMBERS, 5.0, N_AMBIENT, P);
  const compact = nebulaFieldFor('c', 'compact', CENTRE, N_MEMBERS, 0.2, N_AMBIENT, P);
  if (shell.phase !== 3 || compact.phase !== 1) return false;
  if (!(shell.rShellPc && shell.rShellPc > 0)) return false;
  const lo = 0.6 * shell.rShellPc, hi = 1.5 * shell.rShellPc;
  const fracInAnnulus = (f: typeof shell): number => {
    const rng = mulberry32(2024);
    let inA = 0;
    for (let i = 0; i < 400; i++) { const r = radial(f.sampleGroupPos(rng)); if (r >= lo && r <= hi) inA += 1; }
    return inA / 400;
  };
  const shellFrac = fracInAnnulus(shell), compactFrac = fracInAnnulus(compact);
  return shellFrac > 0.3 && shellFrac > compactFrac + 0.2;
})());

/* G-P17-d - full-depth: the field reaches the OFFSPRING ------------------ */

check('G-P17-d: offspring positions correlate with local fractal density (mean T at ' +
  'offspring > mean T at random nearby points), AND the fractal dimension D reaches them ' +
  '(top-of-band vs bottom-of-band D gives a different offspring clustering statistic)', (() => {
  const offspringStats = (D: number) => {
    const f = nebulaFieldFor('d', 'cx', CENTRE, N_MEMBERS, 6, N_AMBIENT, { ...P, fractalDimensionD: D });
    const rng = mulberry32(77);
    const group = f.sampleGroupPos(rng);
    const off: Vec3[] = [];
    for (let i = 0; i < 300; i++) off.push(f.sampleOffspringPos(rng, group));
    const meanT = off.reduce((s, p) => s + f.fractalDensityAt(p), 0) / off.length;
    // random nearby points at the same jitter scale
    const rr = mulberry32(88);
    let meanTrand = 0;
    for (let i = 0; i < 300; i++) {
      const p = { x: group.x + (rr() * 2 - 1) * 4, y: group.y + (rr() * 2 - 1) * 4, z: group.z + (rr() * 2 - 1) * 4 };
      meanTrand += f.fractalDensityAt(p);
    }
    meanTrand /= 300;
    // clustering statistic: mean pairwise distance among the first 40 offspring
    let sum = 0, n = 0;
    for (let i = 0; i < 40; i++) for (let j = i + 1; j < 40; j++) { sum += Math.hypot(off[i]!.x - off[j]!.x, off[i]!.y - off[j]!.y, off[i]!.z - off[j]!.z); n++; }
    return { meanT, meanTrand, meanPair: sum / n };
  };
  const lo = offspringStats(FRACTAL_DIMENSION_BAND[0]);
  const hi = offspringStats(FRACTAL_DIMENSION_BAND[1]);
  const correlated = lo.meanT > lo.meanTrand && hi.meanT > hi.meanTrand;
  const dReachesOffspring = lo.meanPair !== hi.meanPair;
  return correlated && dReachesOffspring;
})());

/* G-P17-e - D is hidden, but it is a real field input ------------------- */

const PROJECT_ROOT = path.join(__dirname, '..', '..');

check('G-P17-e: fractalDimensionD is HIDDEN - the string does not appear in the GUI ' +
  'modules (galaxyCreationModals.ts / galaxyCreationState.ts); but it IS a real field ' +
  'input - changing it changes fractalDensityAt (so it forks / feeds the config hash)', (() => {
  const guiFiles = ['galaxyCreationModals.ts', 'galaxyCreationState.ts'];
  const hiddenFromGui = guiFiles.every((f) => {
    const full = path.join(PROJECT_ROOT, f);
    return !fs.existsSync(full) || !fs.readFileSync(full, 'utf8').includes('fractalDimensionD');
  });
  const f1 = nebulaFieldFor('e', 'cx', CENTRE, N_MEMBERS, 6, N_AMBIENT, { ...P, fractalDimensionD: 2.3 });
  const f2 = nebulaFieldFor('e', 'cx', CENTRE, N_MEMBERS, 6, N_AMBIENT, { ...P, fractalDimensionD: 2.7 });
  const probe: Vec3 = { x: CENTRE.x + 11, y: CENTRE.y - 7, z: CENTRE.z + 3 };
  const changesField = f1.fractalDensityAt(probe) !== f2.fractalDensityAt(probe);
  return hiddenFromGui && changesField;
})());

/* G-P17-f - fixed draw budget (expansion invariance depends on this) ---- */

check(`G-P17-f: sampleGroupPos and sampleOffspringPos each consume EXACTLY ${SAMPLE_DRAWS} ` +
  'rng() calls, regardless of how the accept/reject lands', (() => {
  const f = nebulaFieldFor('f', 'cx', CENTRE, N_MEMBERS, 6, N_AMBIENT, P);
  const counting = (seed: number) => { let c = 0; const m = mulberry32(seed); return { rng: () => { c++; return m(); }, count: () => c }; };
  for (const seed of [1, 2, 3, 7, 101, 5000]) {
    const a = counting(seed); f.sampleGroupPos(a.rng); if (a.count() !== SAMPLE_DRAWS) return false;
    const b = counting(seed); const g = f.sampleGroupPos(b.rng); const before = b.count();
    f.sampleOffspringPos(b.rng, g); if (b.count() - before !== SAMPLE_DRAWS) return false;
  }
  return true;
})());

/* G-P17-g - Stromgren scale sanity (guards a cm/pc or n^2 slip) --------- */

check('G-P17-g: stromgrenRadiusPc matches the closed form (3Q / 4 pi n^2 alpha_B)^(1/3) ' +
  'for a fixed (Q, n) triple, to 1e-9 relative', (() => {
  const Q = 1e49, n = 5;
  const rCmClosed = Math.cbrt((3 * Q) / (4 * Math.PI * n * n * ALPHA_B_CM3_S));
  const expectedPc = cmToPc(rCmClosed);
  const got = stromgrenRadiusPc(Q, n);
  return Math.abs(got - expectedPc) / expectedPc < 1e-9 && got > 0;
})());

check('G-P17: nebulaPhaseFor maps the boundary table correctly (monotone 1..5)', (() => {
  const b = P.phaseBoundariesMyr;
  return nebulaPhaseFor(0, b) === 1 && nebulaPhaseFor(b[0]! + 1e-6, b) === 2
    && nebulaPhaseFor(b[3]! + 100, b) === 5 && nebulaPhaseFor(1e9, b) === 5;
})());

check('gate count matches NEBULA_MORPHOLOGY_GATES', NEBULA_MORPHOLOGY_GATES === 7);

if (failures > 0) {
  console.error(`\nnebulaMorphology.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nnebulaMorphology.conformance: all checks passed.');
}
