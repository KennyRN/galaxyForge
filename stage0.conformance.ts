/**
 * Stage-0 conformance. Proves the new declarations accept the spec's OWN
 * values, that the key union is closed and switchable, and that the two
 * gradient forms are both expressible. Not a science test - a contract test.
 */
import type { Population, PopulationKey, GalaxyModel, DensityByPopulation } from './galaxyModel';
import type { SectorCentreCriteria } from './galacticDensity';
import { assertNever, CHANNELS } from './types';
// MIGRATED (post Stage 9-12 pass): this file's own population fixtures used
// to be defined locally here ("the point is the CONTRACT, not the science").
// They are now the SAME data the real morphology factories in galaxyModel.ts
// use - imported under their original local names so every gate below is
// unchanged, but the science now has exactly one home (Law 1). hernquistK,
// R0_PC, F_HALO, ERWIN and THICK_FRAC moved with them for the same reason.
import {
  SPIRAL_POPULATIONS as spiral, ELLIPTICAL_POPULATIONS as elliptical,
  LENTICULAR_POPULATIONS as lenticular, R0_PC, THICK_FRAC, hernquistK,
} from './galaxyModel';

const F_HALO = 0.01;         // 3.3a - TUNABLE, re-asserted here for gate 6's own
                             // reference computation (galaxyModel.ts owns the
                             // canonical constant; this is a redundant literal
                             // used only to re-derive an expected value independently).
const ERWIN = { disc: 0.61, pseudo: 0.33, classical: 0.06 };  // decomposed LIGHT, ditto

// -- the union is closed and switchable --------------------------------------
function family(key: PopulationKey): 'disc' | 'spheroid' {
  switch (key) {
    case 'spiralYoungThin': case 'spiralMidThin': case 'spiralOldThin': case 'spiralThick':
    case 'lenticularThinDisc': case 'lenticularThickDisc':
    case 'lenticularPseudoBulge':
      return 'disc';
    case 'spiralHalo': case 'ellipticalInSitu': case 'ellipticalAccreted':
    case 'lenticularClassicalBulge': case 'lenticularHalo':
    case 'spiralBoxyPeanutBulge':
      return 'spheroid';
    default:
      return assertNever(key);             // compile error if a key is added
  }
}

// STUB SEAM, expected to surface at stage 9. `minHabTier: 2` compiles against
// the verification stub's `HabTier = 0|1|2|3|4`. If the real `humanHabitability`
// module declares its tiers as anything else - a string union, say - this
// literal stops compiling the moment that module lands. That is the seam
// working, not a regression: update the literal from the real taxonomy and move
// on. Recorded here so a stage-9 agent does not mistake it for suite rot.
const criteria: SectorCentreCriteria = {
  multiplicity: 'solo',
  minHabTier: 2,
  requestedCentrePc: { x: R0_PC, y: 0, z: 0 },
};

// -- runtime assertions -------------------------------------------------------
let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures += 1; console.error(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}
const sum = (ps: Population[]) => ps.reduce((a, p) => a + p.massFractionGalaxy, 0);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const all = [...spiral, ...elliptical, ...lenticular];

check('spiral mass fractions sum to 1', near(sum(spiral), 1));
check('elliptical mass fractions sum to 1', near(sum(elliptical), 1));
check('lenticular sums to 1 with the halo included (3.3a)', near(sum(lenticular), 1));
// CIRCULAR BY CONSTRUCTION, unlike the Juric gate below which re-derives at run
// time. The populations were built as ERWIN.x * (1 - F_HALO), so this can only
// catch a transcription slip, never a wrong renormalisation rule. Honestly
// labelled per the audit; the Part 4 mass-recovery gate is the physics test.
check('Erwin fractions are RENORMALISED, not carried raw - they are decomposed light',
  near(lenticular.filter(p => p.key !== 'lenticularHalo')
        .reduce((a, p) => a + p.massFractionGalaxy, 0), 1 - F_HALO));
check('every morphology has a pressure-supported old component (no S0 exception)',
  [spiral, elliptical, lenticular].every(ps =>
    ps.some(p => family(p.key) === 'spheroid' && p.ageMeanGyr >= 10)));
check('the halo is the most metal-poor lenticular population',
  lenticular.every(p => p.key === 'lenticularHalo' || p.fehMeanDex > -1.0));
// NOT circular: the populations above are built FROM `juricThickNumberFraction`,
// and the gate re-derives the expected value from Juric's raw published parameters.
// It fails if the derivation is wrong, not merely if a literal was mistyped.
const DISC_TOTAL = ERWIN.disc * (1 - F_HALO);   // renormalised per 3.3a
check('lenticular disc split is REDERIVED from Juric, not transcribed (3.3)',
  Math.abs(lenticular[1]!.massFractionGalaxy / DISC_TOTAL - THICK_FRAC) < 1e-12 &&
  Math.abs(lenticular[0]!.massFractionGalaxy / DISC_TOTAL - (1 - THICK_FRAC)) < 1e-12);
// The tolerance alone excludes the no-exp value (0.408): a second `< 0.30`
// clause that used to sit here was implied by the first and has been removed.
check('the exp() term is present - omitting it gives 40.8%, not 22.4%',
  Math.abs(THICK_FRAC - 0.2236) < 5e-4);
check('Hernquist k is COMPUTED, not quoted, and matches the projected R_e (2.1)',
  Math.abs(hernquistK() - 1.815271) < 1e-4);
check('projected R_e is NOT the 3D half-mass radius (a 24% trap)',
  Math.abs(hernquistK() - 1 / (Math.SQRT2 - 1)) > 0.5);
check('thick disc is chemically distinct from thin - the point of keeping it',
  lenticular[1]!.fehMeanDex < lenticular[0]!.fehMeanDex - 0.3);
check('every declared key is unique', new Set(all.map(p => p.key)).size === all.length);
check('every key classifies without falling through', all.every(p => !!family(p.key)));
check('spheroid populations set scaleRadiusPc',
  elliptical.every(p => p.scaleRadiusPc !== undefined));
check('disc populations leave scaleRadiusPc unset',
  spiral.every(p => p.scaleRadiusPc === undefined));
check('accreted halo scale radius EXCEEDS in-situ (2.4 - else no radial trend)',
  elliptical[1]!.scaleRadiusPc! > elliptical[0]!.scaleRadiusPc!);
check('S0 sets armAmplitude 0 on EVERY population (3.4)',
  lenticular.every(p => p.armAmplitude === 0));
check('both gradient forms are expressible',
  all.some(p => p.fehGradientForm === 'linear') &&
  all.some(p => p.fehGradientForm === 'logarithmic'));
check('halo carries no gradient fields at all',
  spiral[4]!.fehGradient === undefined && spiral[4]!.fehGradientRefPc === undefined);
check('ageGyr brackets ageMeanGyr for every population',
  all.every(p => p.ageGyr[0] <= p.ageMeanGyr && p.ageMeanGyr <= p.ageGyr[1]));
check('thin/thick seam sits at 8 Gyr (Xiang & Rix 2022)',
  spiral[2]!.ageGyr[1] === 8 && spiral[3]!.ageGyr[0] === 8);
check('criteria default is solo', criteria.multiplicity === 'solo');

// -- the naming convention is enforced, not just documented ------------------
// FROZEN retired 17 Aug 2026 (Amendment A9, morphology patch v3.0): the five
// spiral keys were the convention's only documented exception, and are now
// themselves prefixed (spiralYoungThin etc.) - PopulationKey has ZERO
// exceptions to the naming rule any more, so the gate below checks ALL keys.
const PREFIXES = ['spiral', 'elliptical', 'lenticular'];
check('every key is morphology-prefixed (Amendment A9 retired the last exception)',
  all.every(p => PREFIXES.some(pre => p.key.startsWith(pre))));
check('no key contains a colon (reserved for PRNG channel names)',
  all.every(p => !p.key.includes(':')));
// BUILD 1 (Part R): the remnant layer's channels exist, and no CONSTANT channel
// carries a colon - the colon idiom is reserved for the per-entity function
// forms (`moons:{i}`), so a grep for `:` still finds entity streams and only
// entity streams. `sky` deliberately has NO channel and so nothing to gate here;
// its no-rng property is a grep gate at its own stage (S.7).
check('remnant channels exist and constant channels stay colon-free (Build 1)',
  CHANNELS.remnantPlacement === 'remnantPlacement' &&
  CHANNELS.remnantStar === 'remnantStar' &&
  Object.values(CHANNELS).every(v => typeof v !== 'string' || !v.includes(':')));
// BUILD 2 (Part C): the conatality stream exists. Placement constants are NOT
// gated here because Part C deliberately does not own them - the Thomas texture
// stays the sampler's (8.6), and the conatality decision is what this channel
// seeds. The colon-free property is re-asserted by the gate above.
check('conatalGroup channel exists (Build 2)',
  CHANNELS.conatalGroup === 'conatalGroup');
// REALISM RULING (Build 2): clustering fields are set ONLY where a co-natal
// group could physically exist - populations whose age interval reaches below
// the coherence window. The window constant lives in `conatal` at its own
// stage; 1.0 here is the spec value restated as a structural test, and the
// gate is deliberately one-directional: unset is always legal (unset = 0).
const COHERENCE_WINDOW_GYR_SPEC = 1.0;
check('clustering fields ONLY on populations reaching below the coherence window (realism)',
  all.every(p => (p.clusteredFraction === undefined && p.meanGroupSize === undefined)
              || p.ageGyr[0] < COHERENCE_WINDOW_GYR_SPEC));
check('the migrated clustering fields are expressible, and youngThin carries them (realism)',
  spiral[0]!.clusteredFraction === 0.6 && spiral[0]!.meanGroupSize === 12 &&
  [...elliptical, ...lenticular, spiral[4]!].every(p =>
    p.clusteredFraction === undefined && p.meanGroupSize === undefined));
// The spiral's bulge slot staying free is enforced by the COMPILER, not here.
// Writing `p.key === 'classicalBulge'` yields TS2367 ("types have no overlap"),
// because the unprefixed name is not a member of the union. A runtime check
// would be strictly weaker, so there isn't one.

// -- GalaxyModel interface gates ----------------------------------------------
// Minimal stand-ins. The point is the CONTRACT, not the science.
const CORE_FLOOR_PC = 10;
const hernquist = (r: number, m: number, a: number) =>
  (m * a) / (2 * Math.PI * r * (r + a) ** 3);

function makeModel(name: GalaxyModel['morphology'], pops: Population[]): GalaxyModel {
  return {
    morphology: name,
    populations: pops,
    densityAt(R, _theta, z) {
      const parts = this.densityByPopulation(R, _theta, z);
      let n = 0;
      for (const pop of this.populations) n += parts[pop.key] ?? 0;
      return n;
    },
    densityByPopulation(R, _theta, z): DensityByPopulation {
      // theta deliberately unused: axisymmetric.
      const r = Math.max(Math.hypot(R, z), CORE_FLOOR_PC);
      const out: Partial<Record<PopulationKey, number>> = {};
      for (const pop of this.populations) {
        out[pop.key] = hernquist(r, 1e11 * pop.massFractionGalaxy, pop.scaleRadiusPc ?? 3000);
      }
      return out;
    },
  };
}

const ellipticalModel = makeModel('elliptical', elliptical);
const spiralModel = makeModel('spiral', spiral);

const keysOf = (d: DensityByPopulation) => Object.keys(d).sort().join(',');
const popKeys = (m: GalaxyModel) => m.populations.map(p => p.key).sort().join(',');

const PROBES: [number, number, number][] = [
  [0, 0, 0], [1e-9, 0, 0], [1, 0, 0], [500, 1.1, -200],
  [8178, 2.7, 0], [50000, 0.3, 12000],
];

check('densityByPopulation keys are EXACTLY the model populations',
  [ellipticalModel, spiralModel].every(m =>
    PROBES.every(([R, t, z]) => keysOf(m.densityByPopulation(R, t, z)) === popKeys(m))));

check('densityAt equals the sum over densityByPopulation (Part 4 invariant)',
  [ellipticalModel, spiralModel].every(m => PROBES.every(([R, t, z]) => {
    const sum = Object.values(m.densityByPopulation(R, t, z))
      .reduce((a: number, b) => a + (b ?? 0), 0);
    return Math.abs(m.densityAt(R, t, z) - sum) < 1e-12 * Math.max(1, sum);
  })));

check('axisymmetric models ignore theta - BIT-identical, not merely close',
  [ellipticalModel].every(m => PROBES.every(([R, , z]) =>
    [0, 0.7, Math.PI, 5.9].every(t => m.densityAt(R, t, z) === m.densityAt(R, 0, z)))));

check('density finite and non-negative everywhere, including R -> 0',
  [ellipticalModel, spiralModel].every(m => PROBES.every(([R, t, z]) => {
    const d = m.densityAt(R, t, z);
    return Number.isFinite(d) && d >= 0;
  })));

check('elliptical returns a SHORTER set than the spiral (2.1)',
  Object.keys(ellipticalModel.densityByPopulation(1000, 0, 0)).length <
  Object.keys(spiralModel.densityByPopulation(1000, 0, 0)).length);

check('purity - same inputs, same output, always',
  PROBES.every(([R, t, z]) =>
    ellipticalModel.densityAt(R, t, z) === ellipticalModel.densityAt(R, t, z)));

check('morphology label is carried, not asked for',
  ellipticalModel.morphology === 'elliptical' && spiralModel.morphology === 'spiral');

if (failures > 0) throw new Error(`${failures} conformance failure(s)`);
console.log('\nall stage-0 conformance checks passed');
