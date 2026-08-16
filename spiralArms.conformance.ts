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

/* 2. kappa - patch S9's own reference range, 630-point independent sweep ----- */

{
  let min = Infinity, max = -Infinity;
  for (const a of ARMS) {
    for (let R = 3500; R <= 16000; R += 25) {
      const k = kappaOf(a, R);
      if (k < min) min = k;
      if (k > max) max = k;
    }
  }
  check('kappa range matches the patch\'s own reference (18.7511 to 30.9951) to 4dp', close(min, 18.7511, 5e-4) && close(max, 30.9951, 5e-4));
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

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nspiralArms.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nspiralArms.conformance: all checks passed.');
}
