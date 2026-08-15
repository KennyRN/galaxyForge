/**
 * Stage-0 conformance. Proves the new declarations accept the spec's OWN
 * values, that the key union is closed and switchable, and that the two
 * gradient forms are both expressible. Not a science test - a contract test.
 */
import type { Population, PopulationKey, GalaxyModel, DensityByPopulation } from './galaxyModel';
import type { SectorCentreCriteria } from './galacticDensity';
import { assertNever, CHANNELS } from './types';

const R0_PC = 8178;          // GRAVITY 2019 (1.1)
const F_HALO = 0.01;         // 3.3a - TUNABLE. The MW is a LOW outlier; external
                             // stellar-halo fractions scatter by a factor of 7-16.
const ERWIN = { disc: 0.61, pseudo: 0.33, classical: 0.06 };  // decomposed LIGHT

/**
 * k = R_e / a for a Hernquist sphere, by numerical integration of the PROJECTED
 * profile. 2.1 requires this be COMPUTED, not quoted, so this is the reference
 * implementation rather than a constant.
 *
 * With a = M = 1, rho(r) = 1 / (2*pi*r*(r+1)^3). Projecting,
 *   Sigma(R) = 2 * INT_R^inf rho(r) r dr / sqrt(r^2 - R^2)
 * and the substitution r = sqrt(R^2 + t^2) gives dr/sqrt(r^2-R^2) = dt/r, which
 * removes the integrable singularity at r = R:
 *   Sigma(R) = (1/pi) * INT_0^inf dt / [ r (r+1)^3 ]
 * Then M_proj(R) = 2*pi * INT_0^R Sigma(R') R' dR', and k solves M_proj(k) = 1/2.
 *
 * TRAP: the 3D half-mass radius is a DIFFERENT quantity - r_half/a = 1/(sqrt2 - 1)
 * = 2.4142, against 1.8153 for the projected R_e. Using it would shrink every
 * spheroid scale radius by a quarter. Gated below.
 */
function simpson(f: (x: number) => number, lo: number, hi: number, n: number): number {
  const h = (hi - lo) / n;
  let acc = f(lo) + f(hi);
  for (let i = 1; i < n; i++) acc += f(lo + i * h) * (i % 2 ? 4 : 2);
  return (acc * h) / 3;
}
function hernquistSigma(R: number, n = 800): number {
  // t = tan(theta) maps [0, inf) onto [0, pi/2)
  const g = (th: number) => {
    const t = Math.tan(th), r = Math.hypot(R, t);
    return (1 / (r * (r + 1) ** 3)) * (1 / Math.cos(th)) ** 2;
  };
  return simpson(g, 0, Math.PI / 2 - 1e-9, n) / Math.PI;
}
function hernquistProjectedMass(R: number, n = 120): number {
  // TWO traps here, both found the hard way:
  //  1. Sigma(R) DIVERGES logarithmically as R -> 0, so Sigma(0) is Infinity and
  //     Simpson - which evaluates its endpoints - returns NaN. Adaptive quadrature
  //     hides this by never touching the endpoint. Guard it: Sigma*R -> 0.
  //  2. The integrand ~ x*ln(1/x) has infinite derivative at 0, so uniform Simpson
  //     converges slowly. The substitution x = u^2 clusters points where they are
  //     needed and reaches 3e-8 with 120 panels.
  const f = (u: number) => {
    const x = u * u;
    return x === 0 ? 0 : hernquistSigma(x) * x * 2 * u;
  };
  return 2 * Math.PI * simpson(f, 0, Math.sqrt(R), n);
}
function hernquistK(): number {
  let lo = 1.0, hi = 3.0;                       // bisection; M_proj is monotonic
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (hernquistProjectedMass(mid) < 0.5) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Juric et al. 2008, bias-corrected. A NUMBER-density fit traced by M dwarfs. */
const JURIC = { f: 0.12, lThin: 2600, hThin: 300, lThick: 3600, hThick: 900 };

/**
 * Thick-disc share of disc STAR COUNTS - not mass. See the boxed warning in 3.3:
 * three conversions (stars->systems->mass->remnants) separate this from
 * `massFractionGalaxy`, and transcribing it into the mass field applies Upsilon twice.
 * R0 and L must come from the SAME frame; only the ratio R0/L is physical.
 */
function juricThickNumberFraction(r0: number): number {
  const { f, lThin, hThin, lThick, hThick } = JURIC;
  const ratio = f * Math.exp(r0 / lThick - r0 / lThin)
                  * (lThick / lThin) ** 2 * (hThick / hThin);
  return ratio / (1 + ratio);
}
const THICK_FRAC = juricThickNumberFraction(R0_PC);

// -- spiral: disc cohorts. No scaleRadiusPc; linear gradient. ---------------
const spiral: Population[] = [
  { key: 'youngThin', label: 'Young thin disc', nLocal: 0.018, ageGyr: [0, 3],
    ageMeanGyr: 1.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.10,
    fehMeanDex: 0.0, fehSigmaDex: 0.15,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    // REALISM RULING (Build 2): the 8.6 clustering constants live HERE now,
    // and only here among the shipped placeholders - youngThin is the sole
    // population whose age interval reaches below the ~1 Gyr coherence window.
    // Values are the precursor's, migrated with their `tunable` grade intact.
    clusteredFraction: 0.6, meanGroupSize: 12,
    armAmplitude: 0.35 },
  { key: 'midThin', label: 'Mid thin disc', nLocal: 0.030, ageGyr: [3, 6],
    ageMeanGyr: 4.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.30,
    fehMeanDex: -0.05, fehSigmaDex: 0.18,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    armAmplitude: 0.25 },
  { key: 'oldThin', label: 'Old thin disc', nLocal: 0.024, ageGyr: [6, 8],
    ageMeanGyr: 7.0, ageSigmaGyr: 0.8, massFractionGalaxy: 0.30,
    fehMeanDex: -0.15, fehSigmaDex: 0.20,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    armAmplitude: 0.15 },
  // thin/thick seam at 8 Gyr - Xiang & Rix 2022
  { key: 'thick', label: 'Thick disc', nLocal: 0.006, ageGyr: [8, 12],
    ageMeanGyr: 10.0, ageSigmaGyr: 1.2, massFractionGalaxy: 0.25,
    fehMeanDex: -0.55, fehSigmaDex: 0.25,
    fehGradientForm: 'linear', fehGradient: -0.000015, fehGradientRefPc: R0_PC,
    armAmplitude: 0.0 },
  { key: 'halo', label: 'Stellar halo', nLocal: 0.0002, ageGyr: [11, 13.5],
    ageMeanGyr: 12.0, ageSigmaGyr: 0.9, massFractionGalaxy: 0.05,
    fehMeanDex: -1.6, fehSigmaDex: 0.4,
    armAmplitude: 0.0 },                    // no gradient fields: halo is flat
];

// -- elliptical: two spheroid components, DIFFERENT scale radii (2.4). ------
const A_IN_SITU_PC = 2400;                  // a = R_e / k, Shen (2.1)
const elliptical: Population[] = [
  { key: 'ellipticalInSitu', label: 'In-situ spheroid', nLocal: 0, ageGyr: [9, 13.5],
    ageMeanGyr: 11.5, ageSigmaGyr: 1.0, massFractionGalaxy: 0.60,
    fehMeanDex: 0.15, fehSigmaDex: 0.20,
    fehGradientForm: 'logarithmic', fehGradient: -0.2, fehGradientRefPc: A_IN_SITU_PC,
    scaleRadiusPc: A_IN_SITU_PC },
  { key: 'ellipticalAccreted', label: 'Accreted metal-poor halo', nLocal: 0,
    ageGyr: [10, 13.5], ageMeanGyr: 12.2, ageSigmaGyr: 1.0, massFractionGalaxy: 0.40,
    fehMeanDex: -0.60, fehSigmaDex: 0.30,
    fehGradientForm: 'logarithmic', fehGradient: -0.05, fehGradientRefPc: A_IN_SITU_PC,
    scaleRadiusPc: A_IN_SITU_PC * 8 },      // calibrated to the R&F crossover
];

// -- lenticular, composite: 0.61 / 0.33 / 0.06 (3.2). armAmplitude 0 on ALL. -
const lenticular: Population[] = [
  // Disc split DERIVED from Juric at run time (3.3), never transcribed.
  // NUMBER shares - convert via upsilonFor(pop) before treating as mass.
  { key: 'lenticularThinDisc', label: 'Quenched thin disc', nLocal: 0, ageGyr: [7, 13],
    ageMeanGyr: 9.5, ageSigmaGyr: 1.5, massFractionGalaxy: ERWIN.disc * (1 - F_HALO) * (1 - THICK_FRAC),
    fehMeanDex: -0.10, fehSigmaDex: 0.20,
    fehGradientForm: 'linear', fehGradient: -0.000059, fehGradientRefPc: R0_PC,
    armAmplitude: 0 },
  { key: 'lenticularThickDisc', label: 'Quenched thick disc', nLocal: 0, ageGyr: [8, 13.5],
    ageMeanGyr: 11.0, ageSigmaGyr: 1.2, massFractionGalaxy: ERWIN.disc * (1 - F_HALO) * THICK_FRAC,
    fehMeanDex: -0.55, fehSigmaDex: 0.25,
    fehGradientForm: 'linear', fehGradient: -0.000015, fehGradientRefPc: R0_PC,
    armAmplitude: 0 },
  { key: 'lenticularPseudoBulge', label: 'Discy pseudo-bulge', nLocal: 0, ageGyr: [8, 13],
    ageMeanGyr: 10.0, ageSigmaGyr: 1.2, massFractionGalaxy: ERWIN.pseudo * (1 - F_HALO),
    fehMeanDex: 0.05, fehSigmaDex: 0.18,
    // NO gradient fields. The package specifies no pseudo-bulge metallicity
    // gradient, and the fields are optional, so the honest representation is to
    // omit them rather than invent a reference radius. An earlier draft put 440 pc
    // here with a comment implying a source - 440 pc is the BAR's y scale length
    // (Wegg & Gerhard), a different component of a different morphology.
    armAmplitude: 0 },
  { key: 'lenticularClassicalBulge', label: 'Classical bulge', nLocal: 0, ageGyr: [9, 13.5],
    ageMeanGyr: 11.0, ageSigmaGyr: 1.0, massFractionGalaxy: ERWIN.classical * (1 - F_HALO),
    fehMeanDex: 0.10, fehSigmaDex: 0.20,
    fehGradientForm: 'logarithmic', fehGradient: -0.2, fehGradientRefPc: 143,
    // R_e = 143 pc IS sourced (Erwin et al. 2015, via 3.2). The Hernquist k that
    // converts it to a scale radius is NOT - 2.1: "Do not take k from me. Compute it
    // in code by numerically integrating the projected Hernquist profile." So it is
    // computed below, never written down.
    scaleRadiusPc: 143 / hernquistK(),
    armAmplitude: 0 },
  // 3.3a. Profile is Juric's oblate power law, as the spiral uses - index 2.8,
  // c/a = 0.64, no new source. NOT Hernquist, so no scaleRadiusPc. Needs an outer
  // truncation (~20 kpc, Juric's calibration edge): M(<R) ~ R^0.2 diverges.
  { key: 'lenticularHalo', label: 'Stellar halo', nLocal: 0, ageGyr: [11, 13.5],
    ageMeanGyr: 12.0, ageSigmaGyr: 0.9, massFractionGalaxy: F_HALO,
    fehMeanDex: -1.6, fehSigmaDex: 0.4,
    armAmplitude: 0 },
];

// -- the union is closed and switchable --------------------------------------
function family(key: PopulationKey): 'disc' | 'spheroid' {
  switch (key) {
    case 'youngThin': case 'midThin': case 'oldThin': case 'thick':
    case 'lenticularThinDisc': case 'lenticularThickDisc':
    case 'lenticularPseudoBulge':
      return 'disc';
    case 'halo': case 'ellipticalInSitu': case 'ellipticalAccreted':
    case 'lenticularClassicalBulge': case 'lenticularHalo':
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
const FROZEN: PopulationKey[] = ['youngThin', 'midThin', 'oldThin', 'thick', 'halo'];
const PREFIXES = ['elliptical', 'lenticular'];
const newKeys = all.map(p => p.key).filter(k => !FROZEN.includes(k));
check('every non-frozen key is morphology-prefixed',
  newKeys.every(k => PREFIXES.some(pre => k.startsWith(pre))));
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
