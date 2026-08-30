/**
 * nebulaMorphology.conformance - G-P17-a..g + the fractal-form check. P17
 * (30 Aug 2026), constants firmed up by science re-audit. Every gate
 * falsifiable; most fail on pre-P17 code.
 */

import {
  nebulaFieldFor, nebulaPhaseFor, nebulaIsLit, stromgrenRadiusPc, weaverShellRadiusPc, nebulaNatalDensityCm3,
  DEFAULT_NEBULA_PARAMS, FRACTAL_DIMENSION_BAND, SAMPLE_DRAWS, ALPHA_B_CM3_S,
  K_Q_PER_MEMBER_S, L_WIND_PER_MEMBER_ERG_S, SUPERBUBBLE_LW_BOOST,
  NEBULA_NATAL_DENSITY_CONTRAST, DEFAULT_NEBULA_CEILING_MYR,
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
const SIGMA = 150;   // Efremov complex extent
const radial = (p: Vec3) => Math.hypot(p.x - CENTRE.x, p.y - CENTRE.y, p.z - CENTRE.z);

/* G-P17-a - count-conserving by construction ------------------------------- */

check('G-P17-a: the field draws no counts - N calls to sampleGroupPos yield exactly N ' +
  'finite positions (count conservation lives in placeYoungClustered / gate 8 there)', (() => {
  const f = nebulaFieldFor('a', 'c0', CENTRE, SIGMA, P);
  const rng = mulberry32(12345);
  const pts: Vec3[] = [];
  for (let i = 0; i < 200; i++) pts.push(f.sampleGroupPos(rng));
  return pts.length === 200 && pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
})());

/* G-P17-b - determinism --------------------------------------------------- */

check('G-P17-b: same (worldSeed, complexId, params) + same rng -> bit-identical sample sequence', (() => {
  const seq = (): string => {
    const f = nebulaFieldFor('seed-b', '3.4.1', CENTRE, SIGMA, P);
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

/* G-P17-c - structure and phase are DECOUPLED ---------------------------- */

check('G-P17-c: STRUCTURE != PHASE. nebulaFieldFor takes no age (its type has no age ' +
  'parameter); phase & existence are pure functions of the co-natal age - nebulaIsLit ' +
  'lights ~4% of a uniform [0,1] Gyr population, and phase populations track phase DURATION ' +
  '(the complete-census snapshot statistic, not a flux-limited one)', (() => {
  // existence gate: ~4% of a uniform [0, 1000] Myr sample is lit (< 40 Myr)
  let lit = 0;
  const NS = 200000;
  for (let i = 0; i < NS; i++) { if (nebulaIsLit((i + 0.5) / NS * 1000, DEFAULT_NEBULA_CEILING_MYR)) lit += 1; }
  const litFrac = lit / NS;
  if (Math.abs(litFrac - 0.04) > 0.005) return false;
  // phase populations of the LIT set track boundary-interval width:
  // [0-0.5,0.5-3,3-8,8-20,20-40] -> [1.25, 6.25, 12.5, 30, 50] %
  const counts = [0, 0, 0, 0, 0];
  const NL = 400000;
  for (let i = 0; i < NL; i++) {
    const age = (i + 0.5) / NL * DEFAULT_NEBULA_CEILING_MYR;   // uniform on the lit window
    counts[nebulaPhaseFor(age, P.phaseBoundariesMyr) - 1] += 1;
  }
  const want = [0.0125, 0.0625, 0.125, 0.30, 0.50];
  return counts.every((c, k) => Math.abs(c / NL - want[k]!) < 0.01);
})());

check('G-P17-c2: nebulaPhaseFor maps the boundary table monotonically (1..5)', (() => {
  const b = P.phaseBoundariesMyr;
  return nebulaPhaseFor(0, b) === 1 && nebulaPhaseFor(b[0]! + 1e-6, b) === 2
    && nebulaPhaseFor(b[2]! + 1e-6, b) === 4 && nebulaPhaseFor(b[3]! + 100, b) === 5;
})());

/* G-P17-d - full-depth: the field reaches the OFFSPRING ------------------ */

check('G-P17-d: offspring positions correlate with local fractal density (mean T at ' +
  'offspring > mean T at random nearby points), AND the fractal dimension D reaches them ' +
  '(top-of-band vs bottom-of-band D gives a different offspring clustering statistic)', (() => {
  const offspringStats = (D: number) => {
    const f = nebulaFieldFor('d', 'cx', CENTRE, SIGMA, { ...P, fractalDimensionD: D });
    const rng = mulberry32(77);
    const group = f.sampleGroupPos(rng);
    const off: Vec3[] = [];
    for (let i = 0; i < 300; i++) off.push(f.sampleOffspringPos(rng, group));
    const meanT = off.reduce((s, p) => s + f.fractalDensityAt(p), 0) / off.length;
    const rr = mulberry32(88);
    let meanTrand = 0;
    for (let i = 0; i < 300; i++) {
      const p = { x: group.x + (rr() * 2 - 1) * 4, y: group.y + (rr() * 2 - 1) * 4, z: group.z + (rr() * 2 - 1) * 4 };
      meanTrand += f.fractalDensityAt(p);
    }
    meanTrand /= 300;
    let sum = 0, n = 0;
    for (let i = 0; i < 40; i++) for (let j = i + 1; j < 40; j++) { sum += Math.hypot(off[i]!.x - off[j]!.x, off[i]!.y - off[j]!.y, off[i]!.z - off[j]!.z); n++; }
    return { meanT, meanTrand, meanPair: sum / n };
  };
  const lo = offspringStats(FRACTAL_DIMENSION_BAND[0]);
  const hi = offspringStats(FRACTAL_DIMENSION_BAND[1]);
  return lo.meanT > lo.meanTrand && hi.meanT > hi.meanTrand && lo.meanPair !== hi.meanPair;
})());

/* G-P17-e - D is hidden, but it is a real field input ------------------- */

const PROJECT_ROOT = path.join(__dirname, '..', '..');

check('G-P17-e: fractalDimensionD is HIDDEN - the string does not appear in the GUI ' +
  'modules (galaxyCreationModals.ts / galaxyCreationState.ts); but changing it changes ' +
  'fractalDensityAt (so it forks / feeds the config hash)', (() => {
  const hiddenFromGui = ['galaxyCreationModals.ts', 'galaxyCreationState.ts'].every((f) => {
    const full = path.join(PROJECT_ROOT, f);
    return !fs.existsSync(full) || !fs.readFileSync(full, 'utf8').includes('fractalDimensionD');
  });
  const f1 = nebulaFieldFor('e', 'cx', CENTRE, SIGMA, { ...P, fractalDimensionD: 2.3 });
  const f2 = nebulaFieldFor('e', 'cx', CENTRE, SIGMA, { ...P, fractalDimensionD: 2.7 });
  const probe: Vec3 = { x: CENTRE.x + 11, y: CENTRE.y - 7, z: CENTRE.z + 3 };
  return hiddenFromGui && f1.fractalDensityAt(probe) !== f2.fractalDensityAt(probe);
})());

/* G-P17-f - fixed draw budget (expansion invariance depends on this) ---- */

check(`G-P17-f: sampleGroupPos and sampleOffspringPos each consume EXACTLY ${SAMPLE_DRAWS} ` +
  'rng() calls, regardless of how the accept/reject lands', (() => {
  const f = nebulaFieldFor('f', 'cx', CENTRE, SIGMA, P);
  const counting = (seed: number) => { let c = 0; const m = mulberry32(seed); return { rng: () => { c++; return m(); }, count: () => c }; };
  for (const seed of [1, 2, 3, 7, 101, 5000]) {
    const a = counting(seed); f.sampleGroupPos(a.rng); if (a.count() !== SAMPLE_DRAWS) return false;
    const b = counting(seed); const g = f.sampleGroupPos(b.rng); const before = b.count();
    f.sampleOffspringPos(b.rng, g); if (b.count() - before !== SAMPLE_DRAWS) return false;
  }
  return true;
})());

/* G-P17-g - Stromgren + natal density (exercises the ISM accessor) ------ */

check('G-P17-g: stromgrenRadiusPc matches the closed form to 1e-9 relative; ' +
  'nebulaNatalDensityCm3 = contrast x local absolute ISM density, and equals ' +
  `${NEBULA_NATAL_DENSITY_CONTRAST} cm^-3 at R0 (= contrast x 1.0)`, (() => {
  const Q = 1e49, n = 1e3;
  const expectedPc = cmToPc(Math.cbrt((3 * Q) / (4 * Math.PI * n * n * ALPHA_B_CM3_S)));
  const got = stromgrenRadiusPc(Q, n);
  if (!(Math.abs(got - expectedPc) / expectedPc < 1e-9 && got > 0)) return false;
  // n_natal at R0 (8178 pc) - absoluteMidplaneDensityCm3(R0,0) === 1.0 by anchor
  const nR0 = nebulaNatalDensityCm3(8178);
  if (Math.abs(nR0 - NEBULA_NATAL_DENSITY_CONTRAST) > 1e-9) return false;
  // it tracks the ISM gradient: denser toward the centre, thinner outward
  return nebulaNatalDensityCm3(3000) > nR0 && nebulaNatalDensityCm3(16000) < nR0;
})());

/* G-P17: fractal form - H = 3 - D ------------------------------------------ */

check('G-P17: the fBm form H = 3 - D gives valid H in (0,1) across the band, and a HIGHER ' +
  'fractal dimension yields a ROUGHER field (more small-scale variance)', (() => {
  for (const D of [2.3, 2.5, 2.7]) { const H = 3 - D; if (!(H > 0 && H < 1)) return false; }
  // roughness: variance of fractalDensityAt over a fine sub-pc grid, D=2.3 vs 2.7
  const rough = (D: number): number => {
    const f = nebulaFieldFor('rough', 'cx', CENTRE, SIGMA, { ...P, fractalDimensionD: D });
    const vals: number[] = [];
    for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) {
      vals.push(f.fractalDensityAt({ x: CENTRE.x + i * 0.7, y: CENTRE.y + j * 0.7, z: CENTRE.z }));
    }
    const m = vals.reduce((s, v) => s + v, 0) / vals.length;
    return vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
  };
  return rough(2.7) > rough(2.3);
})());

/* G-P17-h - the derived K_Q / L_wind produce sane region-expansion scales -- */

check('G-P17-h: the derived per-member ionising & wind budgets give physically sane pc-scale ' +
  'radii - a ~72-member complex has a few-pc giant HII region in its natal clump, a ' +
  'few-to-tens-pc wind shell at 5 Myr, and a larger superbubble (boosted, dispersed medium) ' +
  'at 15 Myr', (() => {
  const nMembers = 72;
  const nNatal = nebulaNatalDensityCm3(8178);          // ~1e3
  const rS = stromgrenRadiusPc(nMembers * K_Q_PER_MEMBER_S, nNatal);
  const rWind = weaverShellRadiusPc(nMembers * L_WIND_PER_MEMBER_ERG_S, nNatal, 5);
  const rSuper = weaverShellRadiusPc(nMembers * L_WIND_PER_MEMBER_ERG_S, 1.0, 15, SUPERBUBBLE_LW_BOOST);
  const sane = rS > 0.3 && rS < 20 && rWind > 1 && rWind < 60 && rSuper > rWind && rSuper < 400;
  // single O star (Q ~ 1e49) in a dense clump -> sub-pc compact HII
  const rCompact = stromgrenRadiusPc(1e49, 1e3);
  return sane && rCompact > 0.2 && rCompact < 3;
})());

check('gate count matches NEBULA_MORPHOLOGY_GATES', NEBULA_MORPHOLOGY_GATES === 9);

if (failures > 0) {
  console.error(`\nnebulaMorphology.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nnebulaMorphology.conformance: all checks passed.');
}
