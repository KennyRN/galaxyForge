/**
 * spiralArms.conformance - verifies the arm geometry against the patch's own
 * reference table (patches/galaxyForge-SPIRAL-PATCH-v2.3-parameter-schema.md
 * S8/S9), and the honestly-scoped limits of what this module can reproduce
 * (see spiralArms.ts's own header on `armContrast`).
 */

import { ARMS, DEFAULT_ARM_WIDTH, armWidthPc, thetaArmRad, kappaOf, armFactor, armContrastRatio, deriveArmContrasts, anchorArmCorrection, DRIMMEL_SPERGEL_K } from './spiralArms';

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
check('armFactor is always >= 1 (arms only ADD density, never remove it)', (() => {
  for (let i = 0; i < 200; i++) {
    const theta = (2 * Math.PI * i) / 200;
    if (armFactor('all', 0.6, 8200, theta) < 1 - 1e-9) return false;
  }
  return true;
})());
check('armContrastRatio is monotonically increasing in contrast, at fixed R', (() => {
  const r1 = armContrastRatio('major', 0.1, 8200);
  const r2 = armContrastRatio('major', 0.3, 8200);
  const r3 = armContrastRatio('major', 0.5, 8200);
  return r1 < r2 && r2 < r3;
})());

/* 5. deriveArmContrasts - reproduces the TARGET exactly (this module's own
 *    solve, not the patch's unreproducible figures - see spiralArms.ts
 *    header), and honours the patch's own stated 1.4x/2.0x multipliers ----- */

{
  const c = deriveArmContrasts(8200);
  check('the "major" set at oldThin\'s own derived contrast hits the Drimmel & Spergel K target to 1e-3',
    close(armContrastRatio('major', c.oldThin, 8200), DRIMMEL_SPERGEL_K, 1e-3));
  check('midThin === 1.4 * oldThin exactly, per the patch\'s own stated multiplier', close(c.midThin, Math.round(c.oldThin * 1.4 * 1e4) / 1e4, 1e-12));
  check('youngThin === 2.0 * oldThin exactly, per the patch\'s own stated multiplier', close(c.youngThin, Math.round(c.oldThin * 2.0 * 1e4) / 1e4, 1e-12));
  check('deriveArmContrasts is memoised - repeat calls return the identical object', deriveArmContrasts(8200) === c);
}

/* 6. HONESTY GATE - this module's own derived contrast values do NOT match
 *    the patch's stated reference figures exactly, and this test asserts
 *    that mismatch explicitly, so a future "fix" that silently overwrites
 *    deriveArmContrasts with the patch's hardcoded numbers (without ever
 *    having recovered derive_arm_constants_v3.py) gets caught here, not
 *    presented as if verified. Delete this check ONLY alongside dropping
 *    the "cannot reproduce bit-identically" claim from the header - i.e.
 *    only if the original script is actually recovered and reproduced. --- */

{
  const c = deriveArmContrasts(8200);
  const patchStated = { oldThin: 0.3096, midThin: 0.4335, youngThin: 0.6193 };
  const matchesPatchExactly = close(c.oldThin, patchStated.oldThin, 1e-4)
    && close(c.midThin, patchStated.midThin, 1e-4)
    && close(c.youngThin, patchStated.youngThin, 1e-4);
  check('this module\'s derived contrasts are honestly DIFFERENT from the patch\'s unreproducible stated figures (see header)', !matchesPatchExactly);
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

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nspiralArms.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nspiralArms.conformance: all checks passed.');
}
