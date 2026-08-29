/**
 * spiralArms.conformance - verifies the arm geometry against the patch's own
 * reference table (patches/galaxyForge-SPIRAL-PATCH-v2.3-parameter-schema.md
 * S8/S9), and - since the besselI0e mean-subtraction fix, 16 Aug 2026 - that
 * the derived contrast constants now reproduce the patch's own stated
 * figures exactly (see spiralArms.ts's own header on `armContrast`).
 */

import {
  ARMS, DEFAULT_ARM_WIDTH, armWidthPc, thetaArmRad, kappaOf, armFactor, armContrastRatio,
  deriveArmContrasts, anchorArmCorrection, generateSeededArms, DRIMMEL_SPERGEL_K,
  rollArmClass, ARM_CLASS_PRIOR, assertArmFrameSanity,
  resonanceRatio, SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC, SPIRAL_PATTERN_SPEED_OUTER_KM_S_KPC,
  ARM_INNER_ATTACH_RADIUS_PC, ARM_TERMINUS_SHARED_PC, ARM_COHORT_TERMINUS_FACTOR,
  SOLAR_CIRCULAR_VELOCITY_KM_S, R_CR_MAIN_PC, type ArmDefinition,
  cohortTerminusFactorFor, tipStartRatioFor, terminusEnvelope, widthNarrowingScale,
  ARM_TIP_ARC_DEG, ARM_TIP_WIDTH_FLOOR, ARM_TIP_PROBABILITY,
  MULTIPLE_ARM_TERMINUS_LO_PC, MULTIPLE_ARM_TERMINUS_HI_PC,
  FLOCCULENT_TERMINUS_LO_PC, FLOCCULENT_TERMINUS_HI_PC, ARM_TERMINUS_SMOOTH_PC,
} from './spiralArms';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}
function close(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

/* 1. arm width relation - patch S8's own two reference values ---------------- */

check('armWidthPc(3900) === 183 pc exactly (patch S8)', armWidthPc(3900) === 183);
check('armWidthPc(8178) lands near the patch\'s stated ~337-338 pc', close(armWidthPc(8178), 337, 1));
check('armWidthPc is linear in R (constant slope, pc per kpc of R)', close(
  armWidthPc(9150) - armWidthPc(8150), DEFAULT_ARM_WIDTH.slopePcPerKpc, 1e-9,
));

/* 2. kappa range - patch S9's own reference, 630-point independent sweep -----
 * SUPERSEDED for the min 24-25 Aug 2026 (kink upgrade path): patch S9's
 * 18.7511 predates any kink data and was computed under the pure
 * single-pitch model for every arm. Scutum-Centaurus now carries a real,
 * Table-2-sourced RkinkPc/pitchOuterDeg (see spiralArms.ts's own header),
 * which nudges its own inner-disc pitch from 12.04 to 12.1 deg below
 * R=4910pc - enough to cede the sweep's global minimum to Sagittarius
 * -Carina's own (still un-kinked) 12.07 deg at R=3500pc instead, landing
 * at 18.8433, not 18.7511. Verified directly (not assumed): recomputed via
 * the same 630-point sweep this gate runs, matching to 4dp. The max
 * (30.9951, Local's own value, untouched by any kink) is unaffected. */

{
  let min = Infinity, max = -Infinity;
  for (const a of ARMS) {
    for (let R = 3500; R <= 16000; R += 25) {
      const k = kappaOf(a, R);
      if (k < min) min = k;
      if (k > max) max = k;
    }
  }
  check('kappa range matches the kink-aware reference (18.8433 to 30.9951) to 4dp', close(min, 18.8433, 5e-4) && close(max, 30.9951, 5e-4));
}

/* 3. thetaArmRad - the Local arm (Rref=8719, near the Sun) sits close to the
 *    reference azimuth, and each arm crosses theta=0 exactly at its own Rref
 *    (the defining property of thetaRefDeg=0, sanity-checked directly) ----- */

for (const a of ARMS) {
  check(`thetaArmRad(${a.name}, RrefPc) === thetaRefDeg exactly`, close(thetaArmRad(a, a.RrefPc), (a.thetaRefDeg * Math.PI) / 180, 1e-9));
}
{
  const local = ARMS.find((a) => a.name === 'Local')!;
  const degAtSol = Math.abs((thetaArmRad(local, 8200) * 180) / Math.PI);
  check('the Local arm sits within ~30 deg of the Sun\'s own azimuth at R=8200 (it is the Sun\'s own spur, by definition)', degAtSol < 30);
}

/* 4. armFactor / armContrastRatio - structural invariants -------------------- */

check('armFactor("none", c, R, theta) === 1 always (no arms in the set)', armFactor('none', 0.5, 8200, 1.23) === 1);
check('armFactor === 1 + contrast * (sum of positive terms), so contrast=0 gives exactly 1', armFactor('all', 0, 8200, 0) === 1);
check('armFactor is mean-preserving - its azimuthal average is 1 at every radius, ' +
  'to 1e-12 (a spiral density wave redistributes systems around an annulus, it ' +
  'does not manufacture them)', (() => {
  let worst = 0;
  for (let R = 3500; R <= 16000; R += 500) {
    for (const set of ['all', 'majorMinor', 'major'] as const) {
      const n = 4096;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += armFactor(set, 0.6193, R, (2 * Math.PI * i) / n);
      worst = Math.max(worst, Math.abs(sum / n - 1));
    }
  }
  return worst < 1e-12;
})());
check('armFactor stays strictly positive across this project\'s own parameter range - ' +
  'no clamp is needed or wanted, matching the sibling build\'s own gate', (() => {
  let min = Infinity;
  for (let R = 3500; R <= 16000; R += 100) {
    for (let i = 0; i < 720; i++) {
      min = Math.min(min, armFactor('all', deriveArmContrasts(8200).youngThin, R, (2 * Math.PI * i) / 720));
    }
  }
  return min > 0;
})());
check('armContrastRatio is monotonically increasing in contrast, at fixed R', (() => {
  const r1 = armContrastRatio('major', 0.1, 8200);
  const r2 = armContrastRatio('major', 0.3, 8200);
  const r3 = armContrastRatio('major', 0.5, 8200);
  return r1 < r2 && r2 < r3;
})());

/* 5. deriveArmContrasts - reproduces the TARGET exactly, and honours the
 *    patch's own stated 1.4x/2.0x multipliers applied to the FULL-PRECISION
 *    solve (not to the already-rounded oldThin - rounding-order bug fixed
 *    16 Aug 2026, see spiralArms.ts header) ---------------------------------- */

{
  const c = deriveArmContrasts(8200);
  check('the "major" set at oldThin\'s own derived contrast hits the Drimmel & Spergel K target to 1e-3',
    close(armContrastRatio('major', c.oldThin, 8200), DRIMMEL_SPERGEL_K, 1e-3));
  // Loose sanity checks only - midThin/youngThin are each independently rounded
  // from the full-precision solve times their own multiplier, NOT from the
  // already-rounded oldThin (see spiralArms.ts header on the rounding-order
  // bug), so they land within a rounding-quantum of oldThin*1.4/oldThin*2.0,
  // not exactly on it. Gate 6 below is the precise regression check.
  check('midThin is roughly 1.4 * oldThin (loose sanity check, not exact - see gate 6)', close(c.midThin, c.oldThin * 1.4, 2e-4));
  check('youngThin is roughly 2.0 * oldThin (loose sanity check, not exact - see gate 6)', close(c.youngThin, c.oldThin * 2.0, 2e-4));
  check('deriveArmContrasts is memoised - repeat calls return the identical object', deriveArmContrasts(8200) === c);
}

/* 6. GAP-CLOSED GATE - this module's own derived contrast values now DO match
 *    the patch's stated reference figures exactly, because armRidge's
 *    besselI0e mean-subtraction (ported 16 Aug 2026 from a sibling build
 *    that still has the original derivation script) makes the solve
 *    reproduce them. This gate is the mirror image of the one it replaces:
 *    if a future edit to armRidge/armFactor silently drops the subtraction
 *    again, THIS fails loudly instead of the mismatch being rediscovered
 *    the hard way. */

{
  const c = deriveArmContrasts(8200);
  const patchStated = { oldThin: 0.3096, midThin: 0.4335, youngThin: 0.6193 };
  check('deriveArmContrasts reproduces the patch\'s stated oldThin/midThin/youngThin exactly',
    c.oldThin === patchStated.oldThin && c.midThin === patchStated.midThin && c.youngThin === patchStated.youngThin);
}

/* 7. anchorArmCorrection - self-consistency: recomputes from STORED (4dp)
 *    contrasts, and thick/halo get no correction (they see no arms) ------- */

{
  const c = deriveArmContrasts(8200);
  const corrOld = anchorArmCorrection('major', c, 8200, 0);
  const corrRecomputed = armFactor('major', c.oldThin, 8200, 0);
  check('anchorArmCorrection reproduces from the STORED contrast to 1e-12 (patch S7 self-consistency rule)', close(corrOld, corrRecomputed, 1e-12));
  check('anchorArmCorrection("none", ...) === 1 (thick/halo see no arms, no correction needed)', anchorArmCorrection('none', c, 8200, 0) === 1);
}

/* 8. generateSeededArms (16 Aug 2026) - the seeded-arm-table feature itself -- */

check('8a generateSeededArms is deterministic - the same worldSeed always gives the same table',
  JSON.stringify(generateSeededArms('gate-seed-alpha')) === JSON.stringify(generateSeededArms('gate-seed-alpha')));

check('8b a different worldSeed gives a genuinely different table (checked over many seeds, not just one)', (() => {
  const seeds = Array.from({ length: 50 }, (_, i) => `seed-${i}`);
  const tables = seeds.map((s) => generateSeededArms(s));
  const serialised = tables.map((t) => JSON.stringify(t));
  return new Set(serialised).size === seeds.length;   // every seed's table is unique
})());

check('8c generateSeededArms(worldSeed) is NEVER === ARMS (the real Milky Way table) - ' +
  'a seeded table replaces it entirely, it does not fall back to it',
  (() => {
    for (let i = 0; i < 100; i++) {
      const t = generateSeededArms(`fallback-check-${i}`);
      if (JSON.stringify(t) === JSON.stringify(ARMS)) return false;
    }
    return true;
  })());

check('8d every seeded table has 2, 3, 4 or (with a spur) 5 arms, over many seeds - never fewer than 2, never more than 5',
  (() => {
    for (let i = 0; i < 300; i++) {
      const n = generateSeededArms(`count-check-${i}`).length;
      if (n < 2 || n > 5) return false;
    }
    return true;
  })());

check('8e every seeded table has AT LEAST two "major" arms (the grand-design backbone is never optional)',
  (() => {
    for (let i = 0; i < 300; i++) {
      const majors = generateSeededArms(`major-check-${i}`).filter((a) => a.tier === 'major').length;
      if (majors < 2) return false;
    }
    return true;
  })());

check('8f every seeded table has at most ONE "spur" arm, and it is always a strict WEAKER partial ' +
  'feature (weight 0.35, below every major and every minor weight in this project\'s own convention)',
  (() => {
    for (let i = 0; i < 300; i++) {
      const arms = generateSeededArms(`spur-check-${i}`);
      const spurs = arms.filter((a) => a.tier === 'spur');
      if (spurs.length > 1) return false;
      if (spurs.some((s) => s.weight !== 0.35)) return false;
    }
    return true;
  })());

check('8g a seeded table\'s own arms all share ONE pitch angle (the "grand-design, one pattern speed" design choice)',
  (() => {
    for (let i = 0; i < 100; i++) {
      const arms = generateSeededArms(`pitch-check-${i}`);
      const pitches = new Set(arms.map((a) => a.pitchDeg));
      if (pitches.size !== 1) return false;
    }
    return true;
  })());

check('8h a seeded table is a valid drop-in ArmDefinition table - armFactor/deriveArmContrasts ' +
  'run against it without throwing and stay mean-preserving, exactly as they do for the real ARMS table',
  (() => {
    const arms = generateSeededArms('drop-in-check');
    const c = deriveArmContrasts(8200, DEFAULT_ARM_WIDTH, arms);
    const n = 2048;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += armFactor('all', c.youngThin, 8200, (2 * Math.PI * i) / n, DEFAULT_ARM_WIDTH, arms);
    return close(sum / n, 1, 1e-9);
  })());

check('8i deriveArmContrasts keeps SEPARATE, non-colliding memoised results for two different arm ' +
  'tables at the SAME (referenceRPc, w) - the multi-table cache fix: a single shared slot would have ' +
  'served one seed\'s contrast constants to a different seed\'s table', (() => {
  const armsA = generateSeededArms('cache-check-A');
  const armsB = generateSeededArms('cache-check-B');
  const cA = deriveArmContrasts(8200, DEFAULT_ARM_WIDTH, armsA);
  const cB = deriveArmContrasts(8200, DEFAULT_ARM_WIDTH, armsB);
  const cArmsDefault = deriveArmContrasts(8200);   // the real ARMS table, unaffected by either
  return cArmsDefault.oldThin === 0.3096 &&
    // re-fetching either seeded table's contrasts still returns ITS OWN values, not the other's
    deriveArmContrasts(8200, DEFAULT_ARM_WIDTH, armsA).oldThin === cA.oldThin &&
    deriveArmContrasts(8200, DEFAULT_ARM_WIDTH, armsB).oldThin === cB.oldThin;
})());

/* -- armClass (Amendment A6, morphology patch v3.0, 17 Aug 2026) --------------- */

check('9 rollArmClass is deterministic - the same worldSeed always gives the same class',
  ['ac-a', 'ac-b', 'ac-c'].every((s) => rollArmClass(s) === rollArmClass(s)));

check('9b rollArmClass only ever returns one of the three declared classes',
  Array.from({ length: 200 }, (_, i) => rollArmClass(`ac-range-${i}`))
    .every((c) => c === 'flocculent' || c === 'multipleArm' || c === 'grandDesign'));

check('9c rollArmClass\'s empirical frequency over a large sample roughly matches ARM_CLASS_PRIOR ' +
  '(within 10 percentage points - a coarse sanity check on the roll, not a statistical test)', (() => {
  const n = 3000;
  const counts: Record<string, number> = { flocculent: 0, multipleArm: 0, grandDesign: 0 };
  for (let i = 0; i < n; i++) counts[rollArmClass(`ac-freq-${i}`)] += 1;
  return Object.entries(ARM_CLASS_PRIOR).every(([cls, p]) => Math.abs(counts[cls]! / n - p) < 0.10);
})());

check('9d generateSeededArms scales spur count/probability by armClass - flocculent (maxSpurs:3, ' +
  'chancePerSpur:0.7) produces MORE than one spur at least sometimes; grandDesign (chancePerSpur:0.08) ' +
  'produces a spur only rarely', (() => {
  let flocculentMultiSpur = false;
  let grandDesignSpurCount = 0;
  const n = 300;
  for (let i = 0; i < n; i++) {
    const floc = generateSeededArms(`ac-spur-floc-${i}`, 'flocculent');
    if (floc.filter((a) => a.tier === 'spur').length > 1) flocculentMultiSpur = true;
    const grand = generateSeededArms(`ac-spur-grand-${i}`, 'grandDesign');
    grandDesignSpurCount += grand.filter((a) => a.tier === 'spur').length;
  }
  // Expected grandDesign spur rate ~8%, so ~24 spurs over 300 draws - assert
  // well below flocculent's own ~2.1 average (maxSpurs 3 * chancePerSpur 0.7),
  // not an exact frequency match.
  return flocculentMultiSpur && grandDesignSpurCount < n * 0.25;
})());

check('9e generateSeededArms(worldSeed) with no armClass argument reproduces the pre-Amendment-A6 ' +
  'single-spur behaviour EXACTLY (default armClass is \'multipleArm\', same {maxSpurs:1, ' +
  'chancePerSpur:0.45} as the historical constant, same draw order)',
  JSON.stringify(generateSeededArms('ac-backcompat')) === JSON.stringify(generateSeededArms('ac-backcompat', 'multipleArm')));

check('9f armFactor with no modulation argument reproduces pre-Amendment-A6 behaviour exactly ' +
  '(env=1 unconditionally)', (() => {
  const c = deriveArmContrasts(8200);
  return armFactor('major', c.oldThin, 8178, 0.7) === armFactor('major', c.oldThin, 8178, 0.7, DEFAULT_ARM_WIDTH, ARMS, undefined);
})());

check('9g along-arm modulation preserves the mean-zero invariant at fixed R - armFactor\'s own ' +
  'azimuthal mean stays 1 (arms redistribute, never add) EVEN WITH a modulation envelope applied, ' +
  'since the envelope depends on R only, never theta', (() => {
  const c = deriveArmContrasts(8200);
  const modulation = { wavelengthPc: 3000, depth: 0.8 };
  const n = 2048;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += armFactor('major', c.oldThin, 8178, (2 * Math.PI * i) / n, DEFAULT_ARM_WIDTH, ARMS, modulation);
  return close(sum / n, 1, 1e-9);
})());

/* -- kink upgrade path (RkinkPc/pitchOuterDeg, wired 24-25 Aug 2026) ----------- */

check('10 Scutum-Centaurus carries its Table-2-sourced kink exactly (RkinkPc=4910, ' +
  'pitchOuterDeg=12.1); the other five ARMS entries stay unset - sourced-but-deferred ' +
  '(Sgr-Car/Perseus/Norma/Outer) or genuinely kink-free (Local), per the module header', (() => {
  const sc = ARMS.find((a) => a.name === 'Scutum-Centaurus')!;
  const others = ARMS.filter((a) => a.name !== 'Scutum-Centaurus');
  return sc.RkinkPc === 4910 && sc.pitchOuterDeg === 12.1 &&
    others.every((a) => a.RkinkPc === undefined && a.pitchOuterDeg === undefined);
})());

/* -- seeded-arm kink roll (item 3's own fix, genVersion BUMP 11, 25 Aug 2026) - */

{
  // Sweep enough seeds that both "kinked" and "not kinked" are certain to
  // occur at KINK_CHANCE=0.6 (P(all 60 seeds land the same way) < 1e-12).
  const seeds = Array.from({ length: 60 }, (_, i) => `kink-sweep-${i}`);
  const tables = seeds.map((s) => generateSeededArms(s, 'multipleArm'));
  const majors = tables.flatMap((t) => t.filter((a) => a.tier === 'major'));
  const nonMajors = tables.flatMap((t) => t.filter((a) => a.tier !== 'major'));
  const kinkedMajors = majors.filter((a) => a.RkinkPc !== undefined);

  check('10b seeded MAJOR arms genuinely roll a kink SOMETIMES and NOT-always across a seed sweep ' +
    '(both a kinked and an unkinked major arm occur - a real roll, not stuck at either extreme)',
    kinkedMajors.length > 0 && kinkedMajors.length < majors.length);

  check('10c minor/spur seeded arms NEVER carry a kink (major tier only, per KINK_CHANCE\'s own header)',
    nonMajors.every((a) => a.RkinkPc === undefined && a.pitchOuterDeg === undefined));

  check('10d every rolled pitchOuterDeg stays at/above the 6deg floor (never approaches the ' +
    'near-tangential kappaOf-collapse regime the deferred Sagittarius-Carina case demonstrated)',
    kinkedMajors.every((a) => a.pitchOuterDeg! >= 6));

  check('10e every rolled RkinkPc avoids the R=8200pc calibration-anchor band (falls in ' +
    '[5500,6700) or [9700,15500), never [6700,9700])',
    kinkedMajors.every((a) => (a.RkinkPc! >= 5500 && a.RkinkPc! < 6700) || (a.RkinkPc! >= 9700 && a.RkinkPc! < 15500)));

  check('10f a kinked seeded arm is geometrically continuous (not merely small-gapped) at its own ' +
    'kink seam - the two-sided finite-difference gap shrinks LINEARLY with eps (a genuine pitch-only ' +
    'kink, not differentiable but continuous), rather than settling on a fixed nonzero jump the way ' +
    'a real discontinuity would', kinkedMajors.every((a) => {
    const gapAt = (eps: number) => Math.abs(thetaArmRad(a, a.RkinkPc! - eps) - thetaArmRad(a, a.RkinkPc! + eps));
    const gap1 = gapAt(1), gapTiny = gapAt(0.001);
    // A jump discontinuity would keep gapTiny ~ gap1 regardless of eps; a
    // continuous kink shrinks gap proportionally (eps 1000x smaller here).
    return gap1 > 0 && gapTiny < gap1 / 100;
  }));

  check('10g the same seed + a DIFFERENT armClass (which reads a fresh, uncached table - ' +
    'generateSeededArms\'s own cache key is worldSeed+armClass) still rolls a kink deterministically ' +
    'from the same worldSeed - two calls for the same (seed, class) agree exactly', (() => {
    const a = generateSeededArms('kink-determinism-check', 'grandDesign');
    const b = generateSeededArms('kink-determinism-check', 'grandDesign');
    return JSON.stringify(a) === JSON.stringify(b);
  })());
}

{
  const kinked = { name: 'Test-kink', tier: 'major' as const, pitchDeg: 12, RrefPc: 6000, thetaRefDeg: 0, weight: 1, RkinkPc: 9000, pitchOuterDeg: 20 };
  const unkinked = { ...kinked, RkinkPc: undefined, pitchOuterDeg: undefined };

  check('10a a kinked arm matches the single-pitch formula strictly inside the kink radius',
    close(thetaArmRad(kinked, 7000), thetaArmRad(unkinked, 7000), 1e-12));

  check('10b a kinked arm DIVERGES from the single-pitch formula beyond the kink radius ' +
    '(pitchOuterDeg=20 is not pitchDeg=12, so the ridge genuinely bends there)',
    Math.abs(thetaArmRad(kinked, 12000) - thetaArmRad(unkinked, 12000)) > 1e-6);

  check('10c theta is continuous AT the kink radius - both segments agree there, no seam',
    close(thetaArmRad(kinked, 9000 - 1e-6), thetaArmRad(kinked, 9000 + 1e-6), 1e-6));

  check('10d kappaOf also switches pitch at the kink (consistent with thetaArmRad\'s own ridge)',
    kappaOf(kinked, 12000) !== kappaOf(unkinked, 12000) && kappaOf(kinked, 7000) === kappaOf(unkinked, 7000));
}

/* 11. STRUCTURAL SIGN-CONVENTION GATE (Prompt P3, arms bundle R2, 27 Aug
 * 2026) - a sign-convention error transcribing Reid's beta-to-R equation
 * has occurred three times in this project's history, most recently
 * inside the documents warning about it. Reid's own convention (beta zero
 * toward the Sun, increasing with Galactic rotation) makes theta strictly
 * DECREASE as R increases; a literal transcription into a counter-
 * clockwise theta frame inverts this and mirrors the galaxy. Swept across
 * the same 3500-16000pc range as gate 2's kappa sweep, for every arm in
 * ARMS, so a future sign flip (even a partial one, e.g. only past a kink)
 * fails immediately rather than waiting to be noticed visually. -------- */
{
  let ok = true;
  const offenders: string[] = [];
  for (const a of ARMS) {
    let prevTheta = thetaArmRad(a, 3500);
    for (let R = 3525; R <= 16000; R += 25) {
      const theta = thetaArmRad(a, R);
      if (theta > prevTheta + 1e-9) { ok = false; offenders.push(a.name); break; }
      prevTheta = theta;
    }
  }
  check(`11 theta strictly decreases as R increases, for every arm in ARMS, swept 3500-16000pc ` +
    `at 25pc steps (Reid's own beta convention - a mirrored counter-clockwise frame would have ` +
    `theta INCREASE with R instead)${offenders.length ? ` - offenders: ${offenders.join(', ')}` : ''}`,
    ok);
}

/* 12. FRAME-SANITY ASSERTION (Prompt P3) - assertArmFrameSanity() is the
 * named, exported helper that would have caught this project's sign
 * error before it shipped; run it here so the gate suite exercises the
 * same check any future beta<->R work is expected to call directly. It
 * throws on failure rather than returning a bool, so wrap it. --------- */
{
  let threw = false, message = '';
  try { assertArmFrameSanity(); } catch (e) { threw = true; message = e instanceof Error ? e.message : String(e); }
  check(`12 assertArmFrameSanity() passes - Perseus at theta=0 lands within 0.5 kpc of the real ` +
    `~10.07 kpc, not the mirrored-frame ~7.81 kpc${threw ? ` (threw: ${message})` : ''}`,
    !threw);
}

/* 13. Package 02/03 build plan, Stage A (27 Aug 2026) - resonanceRatio
 * against this project's own already-audited flat-curve reference values,
 * and the pattern-speed/attachment constants. ------------------------- */
{
  const close4 = (a: number, b: number) => Math.abs(a - b) < 5e-5;
  check('13 resonanceRatio(2, 0, "inner") === 0.2929 (ILR, flat curve)', close4(resonanceRatio(2, 0, 'inner'), 0.2929));
  check('13b resonanceRatio(4, 0, "inner") === 0.6464 (4:1 ultraharmonic, flat curve)', close4(resonanceRatio(4, 0, 'inner'), 0.6464));
  check('13c resonanceRatio(4, 0, "outer") === 1.3536 (OLR m=4, flat curve)', close4(resonanceRatio(4, 0, 'outer'), 1.3536));
  check('13d resonanceRatio(2, 0, "outer") === 1.7071 (OLR m=2, flat curve)', close4(resonanceRatio(2, 0, 'outer'), 1.7071));
  check('13e resonanceRatio(2, 0, "inner") + resonanceRatio(2, 0, "outer") straddle 1 symmetrically at beta=0 ' +
    '(1-x and 1+x for the same x, the flat-curve special case)',
    close4(1 - resonanceRatio(2, 0, 'inner'), resonanceRatio(2, 0, 'outer') - 1));
  check('13f SPIRAL_PATTERN_SPEED_OUTER_KM_S_KPC is DERIVED, not independently stored - reproduces ' +
    'resonanceRatio(4,0,"inner") * SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC exactly, live, not a copied-in literal',
    SPIRAL_PATTERN_SPEED_OUTER_KM_S_KPC === resonanceRatio(4, 0, 'inner') * SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC);
  check('13g SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC matches Dias et al. 2019\'s own sourced figure (28.2)',
    SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC === 28.2);
  check('13h the outer pattern speed is SLOWER than the main one (0.6464x), matching the physical picture ' +
    '(an outer companion pattern rotates slower than the main inner one)',
    SPIRAL_PATTERN_SPEED_OUTER_KM_S_KPC < SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC);
  check('13i ARM_INNER_ATTACH_RADIUS_PC matches Wegg/Gerhard/Portail 2015\'s own long-bar half-length (5000pc)',
    ARM_INNER_ATTACH_RADIUS_PC === 5000);
}

/* 14. Package 02/03 build plan, Stage B (27 Aug 2026) - the Norma-Outer
 * split. Outer keeps the OLD merged entry's own numbers unchanged; Norma is
 * a new entry, its pitch reused from Outer/Local's own already-verified
 * 12.43deg (owner ruling, see spiralArms.ts's own header for the
 * near-degenerate branch this avoided) and its RrefPc newly derived from
 * Table 2's own real R_kink=4460pc, projected to this table's beta=0
 * anchor. Because Norma reuses an EXISTING pitch value rather than
 * introducing a new one, the split must leave the table's global kappa
 * range completely unchanged - verified directly below, not assumed. ---- */
{
  const norma = ARMS.find((a) => a.name === 'Norma');
  const outer = ARMS.find((a) => a.name === 'Outer');
  const mergedNameGone = ARMS.find((a) => a.name === 'Norma-Outer');

  check('14a ARMS now carries six arms (Norma-Outer split into two)', ARMS.length === 6);
  check('14b the old merged "Norma-Outer" name is gone; "Norma" and "Outer" both exist', (
    mergedNameGone === undefined && norma !== undefined && outer !== undefined
  ));
  check('14c Outer keeps the OLD merged entry\'s own numbers exactly (pitchDeg=12.43, RrefPc=12289, ' +
    'weight=0.55, tier=minor) - unchanged, only renamed', !!outer &&
    outer.pitchDeg === 12.43 && outer.RrefPc === 12289 && outer.weight === 0.55 && outer.tier === 'minor' &&
    outer.RkinkPc === undefined && outer.pitchOuterDeg === undefined);
  check('14d Norma is a new entry: pitchDeg=12.43 (REUSED from Outer/Local, owner ruling), ' +
    'RrefPc=4780 (Table 2\'s own R_kink=4460pc projected to beta=0 with that pitch), weight=0.55, ' +
    'tier=minor, no kink fields', !!norma &&
    norma.pitchDeg === 12.43 && norma.RrefPc === 4780 && norma.weight === 0.55 && norma.tier === 'minor' &&
    norma.RkinkPc === undefined && norma.pitchOuterDeg === undefined);
  check('14e Norma\'s own RrefPc reproduces the documented projection formula exactly - ' +
    'R_kink * exp(-(0 - beta_kink_rad) * tan(pitch)), beta_kink=18deg, R_kink=4460pc, pitch=12.43deg', (() => {
    const betaKinkRad = (18 * Math.PI) / 180;
    const expected = 4460 * Math.exp(-(0 - betaKinkRad) * Math.tan((12.43 * Math.PI) / 180));
    return close(norma!.RrefPc, expected, 1);
  })());
  check('14f the split leaves the table\'s global kappa range EXACTLY unchanged (18.8433 to 30.9951, ' +
    'same as before Stage B) - Norma reuses an existing pitch value rather than introducing a new one, ' +
    'so it contributes no new kappa(R) curve to the sweep', (() => {
    let min = Infinity, max = -Infinity;
    for (const a of ARMS) {
      for (let R = 3500; R <= 16000; R += 25) {
        const k = kappaOf(a, R);
        if (k < min) min = k;
        if (k > max) max = k;
      }
    }
    return close(min, 18.8433, 5e-4) && close(max, 30.9951, 5e-4);
  })());
  check('14g Norma\'s own kappa at its RrefPc sits safely inside the table\'s existing range - NOT the ' +
    'near-degenerate ~0.15 a literal use of its own psi< branch would have produced (this is the ' +
    'regression check for the owner ruling documented in spiralArms.ts\'s own header)',
    !!norma && kappaOf(norma, norma.RrefPc) > 15 && kappaOf(norma, norma.RrefPc) < 35);
}

/* 15. Package 02/03 build plan, Stage C (27 Aug 2026) - the actual
 * termination mechanism: the shared resonance terminus, per-cohort
 * scaling, the Honig & Reid tip narrowing, and per-armClass rolling. ---- */
{
  const close4 = (a: number, b: number) => Math.abs(a - b) < 5e-5;

  check('15a R_CR_MAIN_PC === SOLAR_CIRCULAR_VELOCITY_KM_S / SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC * 1000, live',
    close4(R_CR_MAIN_PC, (SOLAR_CIRCULAR_VELOCITY_KM_S / SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC) * 1000));
  check('15b ARM_TERMINUS_SHARED_PC === resonanceRatio(2,0,"outer") * R_CR_MAIN_PC, live, not a copied-in literal',
    close4(ARM_TERMINUS_SHARED_PC, resonanceRatio(2, 0, 'outer') * R_CR_MAIN_PC));
  check('15c ARM_TERMINUS_SHARED_PC lands in a physically sane band (10-16kpc) - not degenerate',
    ARM_TERMINUS_SHARED_PC > 10000 && ARM_TERMINUS_SHARED_PC < 16000);
  check('15d every ARMS entry carries terminusPc === ARM_TERMINUS_SHARED_PC exactly (one shared table-wide value)',
    ARMS.every((a) => a.terminusPc === ARM_TERMINUS_SHARED_PC));

  check('15e cohortTerminusFactorFor: strictly youngThin < midThin < oldThin (the star-formation-threshold ' +
    'ordering, gated directly rather than merely reasoned about)',
    ARM_COHORT_TERMINUS_FACTOR.youngThin < ARM_COHORT_TERMINUS_FACTOR.midThin &&
    ARM_COHORT_TERMINUS_FACTOR.midThin < ARM_COHORT_TERMINUS_FACTOR.oldThin &&
    ARM_COHORT_TERMINUS_FACTOR.oldThin === 1.00);
  check('15f cohortTerminusFactorFor maps armFactor\'s own set values to the exact same tiers discTerm\'s ' +
    '"cFull" selection already uses - one mapping, not two', (
    cohortTerminusFactorFor('all') === ARM_COHORT_TERMINUS_FACTOR.youngThin &&
    cohortTerminusFactorFor('majorMinor') === ARM_COHORT_TERMINUS_FACTOR.midThin &&
    cohortTerminusFactorFor('major') === ARM_COHORT_TERMINUS_FACTOR.oldThin &&
    cohortTerminusFactorFor('none') === 1
  ));

  // A synthetic termination-bearing arm, isolated from ARMS/seeded tables -
  // exercises terminusEnvelope/widthNarrowingScale directly through the
  // public armFactor surface, the same pattern gate 10a-10d already uses
  // for the kink mechanism.
  const termArm: ArmDefinition = { name: 'Test-term', tier: 'major', pitchDeg: 12, RrefPc: 6000, thetaRefDeg: 0, weight: 1, terminusPc: 10000 };
  const tippedArm: ArmDefinition = { ...termArm, tipStartRatio: tipStartRatioFor(termArm.pitchDeg) };

  check('15g terminusEnvelope: full strength (envelope=1) well inside the terminus',
    close4(terminusEnvelope(termArm, 5000, 1), 1));
  check('15h terminusEnvelope: EXACTLY 0 at and beyond the terminus',
    terminusEnvelope(termArm, 10000, 1) === 0 && terminusEnvelope(termArm, 15000, 1) === 0);
  check('15i terminusEnvelope: smooth (C1, no jump) approaching the terminus - a fine sweep never steps ' +
    'by more than a proportional amount', (() => {
    let worst = 0;
    for (let R = 9000; R < 10000; R += 5) {
      const d = Math.abs(terminusEnvelope(termArm, R, 1) - terminusEnvelope(termArm, R + 5, 1));
      worst = Math.max(worst, d);
    }
    return worst < 0.02;   // 1000pc window, 5pc steps - no single 5pc step should move the envelope by 2%+
  })());
  check('15j armFactor with a terminus-bearing arm reproduces EXACTLY 1 at/beyond the terminus ' +
    '(no residual arm signal past the true end)',
    armFactor('major', 0.5, 10000, 0, DEFAULT_ARM_WIDTH, [termArm]) === 1 &&
    armFactor('major', 0.5, 12000, 1.1, DEFAULT_ARM_WIDTH, [termArm]) === 1);
  check('15k armFactor with a terminus-bearing arm DIFFERS from 1 well inside the terminus ' +
    '(the arm still has a real effect short of its own end)',
    armFactor('major', 0.5, 6000, 0, DEFAULT_ARM_WIDTH, [termArm]) !== 1);

  check('15l per-cohort ordering through armFactor: at a radius between the young- and old-cohort-scaled ' +
    'termini, the young cohort has already faded to 1 while the old cohort has not', (() => {
    // termArm's own terminus is 10000; young factor 0.82 -> effective term 8200,
    // old factor 1.00 -> effective term 10000. R=9000 sits strictly between.
    const young = armFactor('all', 0.5, 9000, 0, DEFAULT_ARM_WIDTH, [termArm]);
    const old = armFactor('major', 0.5, 9000, 0, DEFAULT_ARM_WIDTH, [termArm]);
    return young === 1 && old !== 1;
  })());

  check('15m width narrowing ONLY applies for the young cohort (set==="all") - the SAME tipped arm ' +
    'evaluated as "major" ignores tipStartRatio entirely, matching an untipped arm exactly', (() => {
    const R = 9500;   // inside the tip window (tipStart < 9500 < 10000) for a 12deg-pitch, 31deg-arc tip
    const asOld = armFactor('major', 0.5, R, 0.001, DEFAULT_ARM_WIDTH, [tippedArm]);
    const asOldUntipped = armFactor('major', 0.5, R, 0.001, DEFAULT_ARM_WIDTH, [termArm]);
    return asOld === asOldUntipped;
  })());
  check('15n the tip mechanism DOES apply for the young cohort, and measurably changes armFactor ' +
    'relative to the same arm without a rolled tip - evaluated INSIDE the young cohort\'s own scaled ' +
    'tip window (terminusPc x 0.82 x tipStartRatio to terminusPc x 0.82), not the "major" window ' +
    '15m already checked', (() => {
    const youngTerm = tippedArm.terminusPc! * ARM_COHORT_TERMINUS_FACTOR.youngThin;
    const R = youngTerm * ((1 + tippedArm.tipStartRatio!) / 2);   // midpoint of the young cohort's own tip window
    const asYoungTipped = armFactor('all', 0.5, R, 0.001, DEFAULT_ARM_WIDTH, [tippedArm]);
    const asYoungUntipped = armFactor('all', 0.5, R, 0.001, DEFAULT_ARM_WIDTH, [termArm]);
    return asYoungTipped !== asYoungUntipped;
  })());

  check('15o tipStartRatioFor is a pure ratio in (0,1), independent of the terminus radius itself ' +
    '(exp(-arcRad*tan(pitch)), the same value for any terminusPc)',
    tipStartRatioFor(12.43) > 0 && tipStartRatioFor(12.43) < 1 &&
    close4(tipStartRatioFor(12.43), Math.exp(-((ARM_TIP_ARC_DEG * Math.PI) / 180) * Math.tan((12.43 * Math.PI) / 180))));
  check('15p widthNarrowingScale: 1 (no narrowing) well before the tip start, ARM_TIP_WIDTH_FLOOR exactly ' +
    'at/beyond the terminus, and its own midpoint lands inside the sourced 95% CI (0.44-0.80) - a sanity ' +
    'anchor, not a claim of measured precision', (() => {
    const term = tippedArm.terminusPc!, ratio = tippedArm.tipStartRatio!;
    const tipStart = term * ratio;
    const mid = (tipStart + term) / 2;
    const atMid = widthNarrowingScale(tippedArm, mid, 1);
    return widthNarrowingScale(tippedArm, tipStart - 1000, 1) === 1 &&
      widthNarrowingScale(tippedArm, term, 1) === ARM_TIP_WIDTH_FLOOR &&
      atMid > 0.44 && atMid < 0.80;
  })());

  check('15q numerical safety: BOTH multipleArm/flocculent terminus floors clear referenceRPc (8200pc) ' +
    'even after the youngest cohort\'s own 0.82x scaling - load-bearing for anchorArmCorrection\'s own ' +
    'self-consistency divide (patch S7), not merely a nice property', (
    MULTIPLE_ARM_TERMINUS_LO_PC * ARM_COHORT_TERMINUS_FACTOR.youngThin > 8500 &&
    FLOCCULENT_TERMINUS_LO_PC * ARM_COHORT_TERMINUS_FACTOR.youngThin > 8500 &&
    ARM_TERMINUS_SHARED_PC * ARM_COHORT_TERMINUS_FACTOR.youngThin > 8500
  ));

  // -- per-armClass table rolling (withTermination, via generateSeededArms) --

  check('15r generateSeededArms("grandDesign"): every arm in the table shares ONE terminus, exactly ' +
    'ARM_TERMINUS_SHARED_PC, and never carries a tip', (() => {
    const arms = generateSeededArms('gate-stagec-grand-1', 'grandDesign');
    return arms.every((a) => a.terminusPc === ARM_TERMINUS_SHARED_PC && a.tipStartRatio === undefined);
  })());

  check('15s generateSeededArms("multipleArm"): per-arm termini are genuinely INDEPENDENT (vary within ' +
    'one table, not one shared cut), each within the declared band', (() => {
    for (let i = 0; i < 30; i++) {
      const arms = generateSeededArms(`gate-stagec-multi-${i}`, 'multipleArm');
      if (arms.some((a) => a.terminusPc === undefined ||
        a.terminusPc < MULTIPLE_ARM_TERMINUS_LO_PC || a.terminusPc > MULTIPLE_ARM_TERMINUS_HI_PC)) return false;
      const distinct = new Set(arms.map((a) => a.terminusPc)).size;
      if (arms.length > 1 && distinct < 2) return false;   // vanishingly unlikely if genuinely independent draws
    }
    return true;
  })());

  check('15t generateSeededArms("multipleArm") tip incidence over a large sample lands near the sourced ' +
    'ARM_TIP_PROBABILITY (0.40), within a coarse 15-point tolerance (small-n sanity check, not a ' +
    'statistical test - matches gate 9c\'s own precedent)', (() => {
    let tipped = 0, total = 0;
    for (let i = 0; i < 400; i++) {
      const arms = generateSeededArms(`gate-stagec-tip-freq-${i}`, 'multipleArm');
      for (const a of arms) { total++; if (a.tipStartRatio !== undefined) tipped++; }
    }
    return Math.abs(tipped / total - ARM_TIP_PROBABILITY) < 0.15;
  })());

  check('15u generateSeededArms("flocculent"): per-arm termini vary, within its OWN (lower-ceiling) band, ' +
    'and NEVER carries a tip (no borrowed Honig & Reid math)', (() => {
    for (let i = 0; i < 30; i++) {
      const arms = generateSeededArms(`gate-stagec-floc-${i}`, 'flocculent');
      if (arms.some((a) => a.terminusPc === undefined ||
        a.terminusPc < FLOCCULENT_TERMINUS_LO_PC || a.terminusPc > FLOCCULENT_TERMINUS_HI_PC)) return false;
      if (arms.some((a) => a.tipStartRatio !== undefined)) return false;
    }
    return true;
  })());

  check('15v termination rolling is deterministic - the same (worldSeed, armClass) reproduces identical ' +
    'terminusPc/tipStartRatio fields on repeat calls',
    JSON.stringify(generateSeededArms('gate-stagec-det', 'multipleArm')) ===
    JSON.stringify(generateSeededArms('gate-stagec-det', 'multipleArm')));

  check('15w termination rolling does not perturb geometry - a "grandDesign" and "multipleArm" table for ' +
    'the SAME worldSeed still share identical pitchDeg/RrefPc/weight/kink fields on their two shared major ' +
    '(indices 0-1, present in every class) arms (CHANNELS.armTermination is isolated from CHANNELS.' +
    'seededArms, so the geometry-building draws are unaffected by whichever termination policy runs ' +
    'afterward). REVISED (P14, 28 Aug 2026, arm count is now class-dependent - ARM_CLASS_ARM_COUNT\'s own ' +
    'header): a whole-array comparison no longer applies (grandDesign is always 2 arms, multipleArm 3-4 - ' +
    'different lengths BY DESIGN, not a channel leak), and thetaRefDeg is compared ONLY at index 0, not 1 - ' +
    'index 1\'s own evenSpacingDeg = (360/armCount)*1 is itself armCount-dependent, a real and intentional ' +
    'divergence from ruling 4, not something this gate should expect to survive. Index 0\'s evenSpacingDeg ' +
    'is 0 regardless of armCount, so its thetaRefDeg still isolates the SAME channel-independence property ' +
    'this gate has always tested (rechecked analytically: every draw consumed up to and including arm ' +
    'index 1\'s own kink roll is IDENTICAL in count and outcome across classes, since armCount is not yet ' +
    'consumed by anything upstream of index 1 - only evenSpacingDeg\'s OWN formula reads it).', (() => {
    const grandBase = generateSeededArms('gate-stagec-geom-iso', 'grandDesign').filter((a) => a.tier !== 'spur');
    const multiBase = generateSeededArms('gate-stagec-geom-iso', 'multipleArm').filter((a) => a.tier !== 'spur');
    if (grandBase.length < 2 || multiBase.length < 2) return false;
    for (const i of [0, 1]) {
      const g = grandBase[i]!, m = multiBase[i]!;
      if (g.tier !== m.tier || g.pitchDeg !== m.pitchDeg || g.RrefPc !== m.RrefPc || g.weight !== m.weight ||
        g.RkinkPc !== m.RkinkPc || g.pitchOuterDeg !== m.pitchOuterDeg) return false;
    }
    return grandBase[0]!.thetaRefDeg === multiBase[0]!.thetaRefDeg;
  })());

  check('15x armFactor stays mean-preserving (azimuthal average 1) even with termination genuinely active - ' +
    'a synthetic table with a MID-RANGE terminus, swept across radii both inside and beyond it', (() => {
    let worst = 0;
    for (const R of [4000, 6000, 8000, 9800, 10000, 10500, 12000]) {
      const n = 2048;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += armFactor('all', 0.5, R, (2 * Math.PI * i) / n, DEFAULT_ARM_WIDTH, [tippedArm]);
      worst = Math.max(worst, Math.abs(sum / n - 1));
    }
    return worst < 1e-9;
  })());
  check('15y armFactor stays strictly positive with termination active, across the same sweep',
    (() => {
      let min = Infinity;
      for (const R of [4000, 6000, 8000, 9800, 10000, 10500, 12000]) {
        for (let i = 0; i < 360; i++) {
          min = Math.min(min, armFactor('all', 0.5, R, (2 * Math.PI * i) / 360, DEFAULT_ARM_WIDTH, [tippedArm]));
        }
      }
      return min > 0;
    })());
}

/* 16. Package 02/03 build plan, Stage D (27 Aug 2026, Ruling 10 closed) -
 * `tracedCoverageRatio`, reference data only, deliberately unwired.
 * Verifies the sourced table is present and correct, AND - the load
 * -bearing structural check - that no generation-path function reads the
 * field at all (a grep of spiralArms.ts's own source for the property
 * -access pattern `.tracedCoverageRatio`, which would only ever appear if
 * some function actually consumed it - the interface declaration and the
 * ARMS literal both use `tracedCoverageRatio:`, never `.tracedCoverage
 * Ratio`, so a zero-match result is decisive, not a heuristic). ---------- */
{
  const expected: Readonly<Record<string, number>> = {
    Perseus: 1.00, 'Scutum-Centaurus': 0.75, 'Sagittarius-Carina': 0.69,
    Outer: 0.63, Norma: 0.36, Local: 0.30,
  };
  check('16a every ARMS entry carries the sourced tracedCoverageRatio exactly, Perseus normalised to 1.00',
    ARMS.every((a) => a.tracedCoverageRatio === expected[a.name]));
  check('16b Perseus is the longest-traced arm (ratio 1.00) - every other ratio is strictly less',
    ARMS.filter((a) => a.name !== 'Perseus').every((a) => a.tracedCoverageRatio! < 1.00));
  check('16c every ratio is strictly positive (a real, if partial, azimuth span was traced for all six)',
    ARMS.every((a) => a.tracedCoverageRatio! > 0));

  check('16d STRUCTURAL: tracedCoverageRatio is never property-accessed anywhere in spiralArms.ts - ' +
    'genuinely reference data, not silently wired into armFactor/kappaOf/thetaArmRad/withTermination', (() => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'spiralArms.ts'), 'utf8');
    // Strip the interface declaration and the ARMS literal's own field-name
    // occurrences (both use "tracedCoverageRatio:", a definition, never a
    // property READ) before searching for an access pattern.
    const accessPattern = /\.tracedCoverageRatio\b/g;
    const matches = source.match(accessPattern) ?? [];
    return matches.length === 0;
  })());

  check('16e generateSeededArms tables (multipleArm/flocculent/grandDesign) never carry ' +
    'tracedCoverageRatio - this is real-Reid-arm reference data only, no procedural equivalent exists',
    (() => {
      for (const cls of ['grandDesign', 'multipleArm', 'flocculent'] as const) {
        const arms = generateSeededArms(`gate-staged-seeded-${cls}`, cls);
        if (arms.some((a) => a.tracedCoverageRatio !== undefined)) return false;
      }
      return true;
    })());
}

/* ------------------------------ GATE 17 (P14) ---------------------------------
 * Arm count by class, 28 Aug 2026 (Ruling 4) - a direct adjacent finding:
 * the reported bug's own seed rolled armClass='multipleArm' but the OLD,
 * class-independent draw (armCount = 2 + floor(rng*3), range 2-4) landed
 * on 2 - definitionally a grand design, not a multiple-arm (Elmegreen &
 * Elmegreen 1987: grand design = two dominant arms, multiple-arm = three
 * or more). G-P14-f is the direct falsification of THIS bug - it fails on
 * the pre-fix code (which could roll 2 for multipleArm) and passes after. */
{
  const SEEDS = Array.from({ length: 20 }, (_, i) => `gate-p14-armcount-seed-${i}`);

  check('G-P14-e grand design is two-armed (definitional): for every sampled seed, ' +
    "generateSeededArms(seed, 'grandDesign') yields exactly 2 major-tier arms and 0 minor-tier arms",
    SEEDS.every((seed) => {
      const arms = generateSeededArms(seed, 'grandDesign').filter((a) => a.tier !== 'spur');
      return arms.filter((a) => a.tier === 'major').length === 2 && arms.filter((a) => a.tier === 'minor').length === 0;
    }));

  check("G-P14-f multiple-arm is never two-armed (the actual reported bug, direct falsification): " +
    "for every sampled seed, generateSeededArms(seed, 'multipleArm').filter(tier !== 'spur').length >= 3",
    SEEDS.every((seed) => generateSeededArms(seed, 'multipleArm').filter((a) => a.tier !== 'spur').length >= 3));

  check("G-P14-g flocculent is the most-fragmented class: across every sampled seed, flocculent's " +
    "non-spur arm count is always >= multipleArm's own sourced minimum (3)",
    SEEDS.every((seed) => generateSeededArms(seed, 'flocculent').filter((a) => a.tier !== 'spur').length >= 3));

  check('G-P14-h one draw per class (reproducibility): for a fixed seed, the post-count draw sequence is ' +
    'class-independent - pitchDeg (the very next rng() draw after the count) is identical across all three ' +
    'classes, since every class consumes exactly ONE rng() call for the count itself (grandDesign included, ' +
    'where the range width is 1 - floor(rng()*1) is always 0, but the draw is still taken)', (() => {
    const seed = 'gate-p14-drawpos-seed';
    const pitch = (cls: 'grandDesign' | 'multipleArm' | 'flocculent') => generateSeededArms(seed, cls)[0]!.pitchDeg;
    const p1 = pitch('grandDesign'), p2 = pitch('multipleArm'), p3 = pitch('flocculent');
    return p1 === p2 && p2 === p3;
  })());
}

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nspiralArms.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nspiralArms.conformance: all checks passed.');
}
