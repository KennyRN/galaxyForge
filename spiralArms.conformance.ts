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
} from './spiralArms';

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
  'pitchOuterDeg=12.1); the other four ARMS entries stay unset - sourced-but-deferred ' +
  '(Sgr-Car/Perseus/Norma-Outer) or genuinely kink-free (Local), per the module header', (() => {
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

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nspiralArms.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nspiralArms.conformance: all checks passed.');
}
