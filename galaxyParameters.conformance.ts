/**
 * galaxyParameters.conformance - patch v2.3's gates 19, 26 and 27, plus this
 * module's own load-bearing checks. See `galaxyParameters.ts`'s own header
 * for the honestly-stated scope: arm/complex fields are LIVE (wired into
 * `createSpiralModel`); `elliptical`/`lenticular` fields are ALSO LIVE
 * (16 Aug 2026, wired into `createEllipticalModel`/`createLenticularModel`);
 * juric/erwin/halo/placement fields are DECLARED with defaults matching
 * their still-real module-level consts, not yet wired into
 * `createSpiralModel`'s own disc/halo terms, `placement` or `remnants`.
 * Gate 19's perturbation check below tests exactly that boundary - it is
 * expected, and asserted, that the wired fields move output and the
 * not-yet-wired ones do not.
 */

import * as fs from 'fs';
import * as path from 'path';
import { makeDefaultGalaxyParameters, assertGalaxyParameters, anchorArmCorrectionFor, DEFAULT_GALAXY_PARAMETERS, type GalaxyParameters } from './galaxyParameters';
import { createSpiralModel, createEllipticalModel, createLenticularModel, measuredArmMagnitude } from './galaxyModel';
import { armFactor, ARM_INNER_ATTACH_RADIUS_PC, ARM_INNER_ATTACH_RADIUS_UNBARRED_PC } from './spiralArms';

const noopUpsilon = () => 1;

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}

/* ------------------------------ GATE 26 --------------------------------------
 * Derived-field self-consistency: every `derived` field in the block
 * reproduces from the block's OWN stored inputs to 1e-12 (patch S10). */

{
  const params = makeDefaultGalaxyParameters('gate26-seed');
  for (const set of ['major', 'majorMinor', 'all'] as const) {
    const stored = anchorArmCorrectionFor(params, set);
    const contrasts = params.armContrast();
    const c = set === 'all' ? contrasts.youngThin : set === 'majorMinor' ? contrasts.midThin : contrasts.oldThin;
    // params.armModulation (17 Aug 2026, Amendment A6) - MUST be threaded
    // through here too, matching what anchorArmCorrectionFor now passes
    // internally, or this recomputation silently diverges from the stored
    // value the moment the default armClass carries a non-zero modulation
    // depth (it does - 'multipleArm' is 0.30, not 0).
    const recomputed = armFactor(set, c, params.referenceRPc, (params.referenceThetaDeg * Math.PI) / 180, params.armWidth, params.arms, params.armModulation);
    check(`GATE 26: anchorArmCorrection("${set}") reproduces from stored contrasts to 1e-12`, Math.abs(stored - recomputed) < 1e-12);
  }
}

/* ------------------------------ GATE 27 --------------------------------------
 * Load-time assertions: armWidth.broadening <= 1.02; cellSizePc >=
 * 8*sigmaComplexPc; nLocalPerPc3 present and not TBD. Each fails LOUDLY. */

{
  const good = makeDefaultGalaxyParameters('gate27-seed');
  let threwOnGood = false;
  try { assertGalaxyParameters(good); } catch { threwOnGood = true; }
  check('GATE 27: the default parameter set passes all load-time assertions', !threwOnGood);

  const badBroadening: GalaxyParameters = { ...good, armWidth: { ...good.armWidth, broadening: 1.5 } };
  check('GATE 27: armWidth.broadening > 1.02 throws loudly', (() => {
    try { assertGalaxyParameters(badBroadening); return false; } catch { return true; }
  })());

  const badCellSize: GalaxyParameters = { ...good, complexTier: { ...good.complexTier, cellSizePc: 100 } };
  check('GATE 27: complexTier.cellSizePc below 8*sigmaComplexPc throws loudly', (() => {
    try { assertGalaxyParameters(badCellSize); return false; } catch { return true; }
  })());

  const badNLocal: GalaxyParameters = { ...good, nLocalPerPc3: 0 };
  check('GATE 27: nLocalPerPc3 <= 0 throws loudly (the TBD-equivalent failure)', (() => {
    try { assertGalaxyParameters(badNLocal); return false; } catch { return true; }
  })());

  const negativeNLocal: GalaxyParameters = { ...good, nLocalPerPc3: -1 };
  check('GATE 27: a negative nLocalPerPc3 also throws (not just zero)', (() => {
    try { assertGalaxyParameters(negativeNLocal); return false; } catch { return true; }
  })());
}

/* ------------------------- STAGE C: inner attachment ---------------------------
 * Package 02/03 build plan, Stage C (27 Aug 2026, Ruling 5) - "arms attach
 * at the bar end at FULL amplitude, not ramped" (`03-ARM-TERMINATION.md`
 * SS4/gate 6). `armStartOuterPc` must equal `ARM_INNER_ATTACH_RADIUS_PC`
 * EXACTLY (full amplitude begins there, not somewhere beyond it); the old
 * ~2kpc-wide taper (3500-5500) is gone, replaced by a narrow numerical
 * smoothing margin only. */
{
  const p = makeDefaultGalaxyParameters('gate-stagec-attach-seed');
  check('STAGE C: armStartOuterPc equals ARM_INNER_ATTACH_RADIUS_PC exactly (full amplitude AT the bar end)',
    p.armStartOuterPc === ARM_INNER_ATTACH_RADIUS_PC);
  check('STAGE C: armStartInnerPc sits within 500pc below armStartOuterPc - a narrow numerical smoothing ' +
    'margin, not the old ~2kpc physical-looking taper', (
    p.armStartOuterPc - p.armStartInnerPc > 0 && p.armStartOuterPc - p.armStartInnerPc <= 500
  ));
}

/* --------------------------- P14: unbarred inner attachment -------------------
 * 28 Aug 2026, a direct user report: a seeded unbarred Spiral galaxy (size
 * 2) rendered as a smooth circular blob. Root cause: arm-start was pinned
 * to the bar-END radius (5000pc) even with no bar. `makeDefaultGalaxyParameters`
 * gained a `barEnabled` parameter (default `true`, preserving every
 * existing caller bit-for-bit) selecting between the unchanged barred
 * constant and a new, much smaller unbarred one. G-P14-a/c/d guard the
 * barred path stays untouched; G-P14-b is the direct falsification of the
 * reported bug - it fails on the pre-fix code (contrast is 0 there) and
 * passes after it. */
{
  check('G-P14-a barred constant intact: ARM_INNER_ATTACH_RADIUS_UNBARRED_PC < ARM_INNER_ATTACH_RADIUS_PC, ' +
    'and the unbarred constant equals its declared value (1500pc)',
    ARM_INNER_ATTACH_RADIUS_UNBARRED_PC < ARM_INNER_ATTACH_RADIUS_PC && ARM_INNER_ATTACH_RADIUS_UNBARRED_PC === 1500);

  const unbarredParams = makeDefaultGalaxyParameters('gate-p14-unbarred-seed', undefined, undefined, undefined, false);
  check('G-P14: unbarred params.armStartOuterPc equals ARM_INNER_ATTACH_RADIUS_UNBARRED_PC exactly',
    unbarredParams.armStartOuterPc === ARM_INNER_ATTACH_RADIUS_UNBARRED_PC);
  const unbarredModel = createSpiralModel(false, unbarredParams);
  check('G-P14-b arms now exist in the inner disc (the actual reported bug, direct falsification): ' +
    'an unbarred seeded spiral shows nonzero arm contrast at both 2000pc and 4000pc',
    measuredArmMagnitude(unbarredModel, 2000) > 0 && measuredArmMagnitude(unbarredModel, 4000) > 0);

  const barredParams = makeDefaultGalaxyParameters('gate-p14-barred-seed');   // barEnabled omitted -> true
  const barredModel = createSpiralModel(true, barredParams);
  // measuredArmMagnitude sums EVERY population via densityAt - with
  // barEnabled=true that includes the boxy/peanut BAR itself, which is
  // its own genuinely theta-dependent (triaxial) term extending out to
  // several kpc, independent of arm contrast entirely. Isolating a single
  // arm-responsive, non-bulge population (spiralOldThin) is what actually
  // asks "is the ARM tapered to zero here", not "is anything azimuthally
  // asymmetric here" - found by this gate itself failing against the bar,
  // not assumed safe.
  const oldThinMagnitude = (model: ReturnType<typeof createSpiralModel>, R_pc: number): number => {
    let max = -Infinity, min = Infinity;
    const n = 1441;
    for (let i = 0; i < n; i++) {
      const theta = (2 * Math.PI * i) / n;
      const v = model.densityByPopulation(R_pc, theta, 0).spiralOldThin ?? 0;
      if (v > max) max = v;
      if (v < min) min = v;
    }
    return 2.5 * Math.log10(max / min);
  };
  check('G-P14-c barred path byte-identical: a barred spiral\'s ARM-responsive population (spiralOldThin, ' +
    'isolated from the bar\'s own independent azimuthal shape) still shows ZERO contrast below the bar end ' +
    '(4700pc, still inside the numerical smoothing window) - guards the blast radius',
    oldThinMagnitude(barredModel, 2000) === 0 && oldThinMagnitude(barredModel, 4700) === 0);

  check('G-P14-d default preserves old behaviour: makeDefaultGalaxyParameters(seed) with barEnabled omitted ' +
    'yields armStartOuterPc === 5000 (every existing call site reproduces bit-for-bit)',
    makeDefaultGalaxyParameters('gate-p14-default-seed').armStartOuterPc === 5000);
}

/* ------------------------------ GATE 19 ---------------------------------------
 * "Parameter sufficiency": perturb every numeric Tier G field and confirm
 * output changes (load-bearing); confirm the not-yet-wired fields are
 * HONESTLY inert (see this file's own header) rather than silently claimed
 * complete; and a structural sweep for stray Tier-G-shaped literals
 * reappearing outside this file - the mechanical substitute for the
 * patch's own AST fuzzer procedure, see `galaxyParameters.ts`'s header for
 * why a literal source-perturbation fuzzer was not built this pass. */

function densityAtOrigin8200(params: GalaxyParameters, barEnabled = false): number {
  const model = createSpiralModel(barEnabled, params);
  // theta = 0.7 rad (not exactly on an arm ridge or exactly between two -
  // an arbitrary azimuth where arm modulation has real bite either way).
  // Near R=8178 (well inside the bar's own taperOuterPc=5800, so a
  // bar-strength perturbation is expected to leave THIS point unchanged
  // when barEnabled is false, and to move it when barEnabled is true and
  // R is instead probed near the bar itself.
  return model.densityAt(8200, 0.7, 0);
}

{
  const base = makeDefaultGalaxyParameters('gate19-seed');
  const baseline = densityAtOrigin8200(base);

  const wiredPerturbations: [string, GalaxyParameters, boolean][] = [
    ['R0Pc', { ...base, R0Pc: base.R0Pc * 1.03 }, false],
    ['armWidth.refPc', { ...base, armWidth: { ...base.armWidth, refPc: base.armWidth.refPc * 1.2 } }, false],
    ['armStartOuterPc', { ...base, armStartOuterPc: base.armStartOuterPc * 0.5 }, false],
  ];
  for (const [name, perturbed, barEnabled] of wiredPerturbations) {
    const changed = densityAtOrigin8200(perturbed, barEnabled) !== baseline;
    check(`GATE 19: perturbing WIRED field "${name}" changes densityAt (load-bearing, not vestigial)`, changed);
  }

  // bulge.strength/boxiness only bite near the bulge itself (R=8200 sits
  // ~11.7 bulge scale-lengths out, negligibly lit either way) - tested
  // separately at R=4000, close enough to the ~700pc bulge scale for a
  // perturbation to have real bite. Renamed from `bar.*` 17 Aug 2026
  // (Amendment A4/BulgeParams) - the bulge is present regardless of
  // `barEnabled` now, so these two no longer need the bar switched on to
  // exercise (unlike the old multiplicative bar term, which needed
  // `barEnabled=true` before `strength` did anything at all).
  check('GATE 19: perturbing WIRED field "bulge.strength" changes densityAt near the bulge', (() => {
    const model1 = createSpiralModel(false, base);
    const strong: GalaxyParameters = { ...base, bulge: { ...base.bulge, strength: base.bulge.strength * 3 } };
    const model2 = createSpiralModel(false, strong);
    return model1.densityAt(4000, 0.7, 0) !== model2.densityAt(4000, 0.7, 0);
  })());
  check('GATE 19: perturbing WIRED field "bulge.boxiness" changes densityAt off-axis near the bulge', (() => {
    const model1 = createSpiralModel(true, base);
    const boxier: GalaxyParameters = { ...base, bulge: { ...base.bulge, boxiness: base.bulge.boxiness * 2 } };
    const model2 = createSpiralModel(true, boxier);
    // Off the major/minor axes (theta != 0, phaseRad), where a boxier vs
    // rounder isodensity surface genuinely differs at fixed R - ON either
    // axis the two exponents can coincidentally agree at some radii.
    return model1.densityAt(600, 0.9, 100) !== model2.densityAt(600, 0.9, 100);
  })());

  // armModulation.* (17 Aug 2026, Amendment A6) - the along-arm envelope,
  // wired into discTerm's raw armFactor call. depth's own perturbation
  // needs a real arm-response population (spiralYoungThin, set='all') at a
  // radius/angle combination sensitive to R (the envelope's own variable).
  check('GATE 19: perturbing WIRED field "armModulation.depth" changes densityAt', (() => {
    const model1 = createSpiralModel(false, base);
    const deeper: GalaxyParameters = { ...base, armModulation: { ...base.armModulation, depth: Math.min(0.95, base.armModulation.depth + 0.4) } };
    const model2 = createSpiralModel(false, deeper);
    return model1.densityAt(6000, 0.7, 0) !== model2.densityAt(6000, 0.7, 0);
  })());
  check('GATE 19: perturbing WIRED field "armModulation.wavelengthPc" changes densityAt', (() => {
    const model1 = createSpiralModel(false, base);
    const shorter: GalaxyParameters = { ...base, armModulation: { ...base.armModulation, wavelengthPc: base.armModulation.wavelengthPc * 0.4 } };
    const model2 = createSpiralModel(false, shorter);
    return model1.densityAt(6000, 0.7, 0) !== model2.densityAt(6000, 0.7, 0);
  })());

  // NOT-YET-WIRED fields (see this file's header) - perturbing these is
  // EXPECTED to leave createSpiralModel's output unchanged, because
  // elliptical/lenticular/placement/remnants still read their own
  // module-level consts. Asserted explicitly so a future silent rewiring
  // (or a regression the other way) is caught either direction, not left
  // to be discovered by accident.
  const notYetWiredPerturbations: [string, GalaxyParameters][] = [
    ['juric.lThin', { ...base, juric: { ...base.juric, lThin: base.juric.lThin * 1.5 } }],
    ['placement.cellSizePc', { ...base, placement: { ...base.placement, cellSizePc: base.placement.cellSizePc * 3 } }],
  ];
  for (const [name, perturbed] of notYetWiredPerturbations) {
    const unchanged = densityAtOrigin8200(perturbed) === baseline;
    check(`GATE 19: perturbing NOT-YET-WIRED field "${name}" leaves createSpiralModel's output unchanged (honestly inert, not silently claimed complete)`, unchanged);
  }

  // elliptical/lenticular: WIRED as of 16 Aug 2026 - perturbing their own
  // Tier G fields MUST move createEllipticalModel/createLenticularModel's
  // output, the same load-bearing check gate 19 already runs for the
  // spiral's arm/complex fields.
  const ellipticalBaseline = createEllipticalModel(1e11, noopUpsilon, base).densityAt(2000, 0, 0);
  const ellipticalPerturbed: [string, GalaxyParameters][] = [
    ['elliptical.aInSituPc', { ...base, elliptical: { ...base.elliptical, aInSituPc: base.elliptical.aInSituPc * 1.5 } }],
    ['elliptical.accretedScaleMultiplier', { ...base, elliptical: { ...base.elliptical, accretedScaleMultiplier: base.elliptical.accretedScaleMultiplier * 2 } }],
  ];
  for (const [name, perturbed] of ellipticalPerturbed) {
    const changed = createEllipticalModel(1e11, noopUpsilon, perturbed).densityAt(2000, 0, 0) !== ellipticalBaseline;
    check(`GATE 19: perturbing WIRED field "${name}" changes createEllipticalModel's output`, changed);
  }

  const lenticularBaseline = createLenticularModel(2e10, noopUpsilon, 'composite', base).densityAt(200, 0, 0);
  const lenticularPerturbed: [string, GalaxyParameters][] = [
    ['lenticular.erwinClassicalRePc', { ...base, lenticular: { ...base.lenticular, erwinClassicalRePc: base.lenticular.erwinClassicalRePc * 2 } }],
    ['lenticular.erwinClassicalN', { ...base, lenticular: { ...base.lenticular, erwinClassicalN: base.lenticular.erwinClassicalN * 2 } }],
  ];
  for (const [name, perturbed] of lenticularPerturbed) {
    const changed = createLenticularModel(2e10, noopUpsilon, 'composite', perturbed).densityAt(200, 0, 0) !== lenticularBaseline;
    check(`GATE 19: perturbing WIRED field "${name}" changes createLenticularModel's (composite) output`, changed);
  }

  const lenticularClassicalBaseline = createLenticularModel(2e10, noopUpsilon, 'classical', base).densityAt(600, 0, 0);
  const lenticularClassicalPerturbed: [string, GalaxyParameters][] = [
    ['lenticular.classicalBT', { ...base, lenticular: { ...base.lenticular, classicalBT: base.lenticular.classicalBT * 1.5 } }],
    ['lenticular.gaoClassicalRePcRatio', { ...base, lenticular: { ...base.lenticular, gaoClassicalRePcRatio: base.lenticular.gaoClassicalRePcRatio * 2 } }],
    ['lenticular.gaoClassicalN', { ...base, lenticular: { ...base.lenticular, gaoClassicalN: base.lenticular.gaoClassicalN * 1.5 } }],
  ];
  for (const [name, perturbed] of lenticularClassicalPerturbed) {
    const changed = createLenticularModel(2e10, noopUpsilon, 'classical', perturbed).densityAt(600, 0, 0) !== lenticularClassicalBaseline;
    check(`GATE 19: perturbing WIRED field "${name}" changes createLenticularModel's (classical) output`, changed);
  }
}

/* structural sweep - a lighter substitute for the patch's own AST fuzzer
 * (see galaxyParameters.ts's header on why): scan every OTHER Tier G
 * module's source for the arm table's own distinctive literals (an arm
 * name, or armWidth's exact refPc/slopePcPerKpc pair), which would indicate
 * a stray, un-externalised duplicate rather than a read of this file's own
 * exports. */
{
  // `__dirname` here is `.gate-tmp/build` (compiled output) - reach back to
  // the real project root to read the `.ts` SOURCE, exactly the same
  // two-levels-up escape `goldenMaster.conformance.ts` already uses for
  // its own fixture path, and for the identical reason.
  const ROOT = path.join(__dirname, '..', '..');
  const TIER_G_FILES = ['galaxyModel.ts', 'starFormingComplexes.ts', 'placement.ts', 'remnants.ts'];
  const TELLS = ['5493', '6878', '8719', '10470', '12289'];   // the arm RrefPc values - distinctive, unlikely to occur for any other reason
  const offenders: string[] = [];
  for (const file of TIER_G_FILES) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const tell of TELLS) {
      if (src.includes(tell)) offenders.push(`${file} contains "${tell}"`);
    }
  }
  check('GATE 19 (structural): no Tier G module OTHER than spiralArms.ts/galaxyParameters.ts duplicates an arm reference-radius literal', offenders.length === 0);
  if (offenders.length) console.error('  ' + offenders.join('\n  '));
}

check('DEFAULT_GALAXY_PARAMETERS is a valid, load-time-assertable default', (() => {
  try { assertGalaxyParameters(DEFAULT_GALAXY_PARAMETERS); return true; } catch { return false; }
})());

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\ngalaxyParameters.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\ngalaxyParameters.conformance: all checks passed.');
}
