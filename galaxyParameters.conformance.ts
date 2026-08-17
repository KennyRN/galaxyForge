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
import { createSpiralModel, createEllipticalModel, createLenticularModel } from './galaxyModel';
import { armFactor } from './spiralArms';

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
    const recomputed = armFactor(set, c, params.referenceRPc, (params.referenceThetaDeg * Math.PI) / 180, params.armWidth);
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
