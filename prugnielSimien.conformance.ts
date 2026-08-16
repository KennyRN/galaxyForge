/**
 * prugnielSimien.conformance - the 6 PRUGNIEL_SIMIEN_GATES.
 */

import {
  sersicB, prugnielP, prugnielEnclosedMassFraction, prugnielRho0, prugnielSimienMassDensity,
  CORE_FLOOR_PC, PRUGNIEL_SIMIEN_GATES,
} from './prugnielSimien';

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.error(`FAIL: ${name}`); } else { console.log(`ok - ${name}`); }
}
function close(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

/* 1. sersicB anchors ------------------------------------------------------------- */

check('1 sersicB(1) lands near its well-known anchor (~1.678)', close(sersicB(1), 1.678, 0.01));
check('1b sersicB(4) lands near its well-known anchor (~7.669)', close(sersicB(4), 7.669, 0.01));

/* 2. prugnielP is positive and finite over this project's own n range ------------ */

check('2 prugnielP is positive and finite for n in [0.9, 4]',
  [0.9, 1.0, 1.52, 2.0, 2.62, 3.0, 4.0].every((n) => {
    const p = prugnielP(n);
    return Number.isFinite(p) && p > 0;
  }));

/* 3. prugnielEnclosedMassFraction shape ------------------------------------------- */

check('3 prugnielEnclosedMassFraction(0, Re, n) === 0', prugnielEnclosedMassFraction(0, 143, 1.52) === 0);
check('3b prugnielEnclosedMassFraction is monotonically non-decreasing in r', (() => {
  const rePc = 143, n = 1.52;
  const rs = [1, 10, 50, 143, 300, 1000, 5000, 20000];
  let prev = -1;
  for (const r of rs) {
    const f = prugnielEnclosedMassFraction(r, rePc, n);
    if (f < prev) return false;
    prev = f;
  }
  return true;
})());
check('3c prugnielEnclosedMassFraction approaches 1 at large r/Re',
  prugnielEnclosedMassFraction(143 * 500, 143, 1.52) > 0.999);
check('3d prugnielEnclosedMassFraction(Re, Re, n) is a substantial but not total ' +
  'fraction - a genuine "half-mass-ish" radius property, not a degenerate 0 or 1',
  (() => {
    const f = prugnielEnclosedMassFraction(143, 143, 1.52);
    return f > 0.1 && f < 0.9;
  })());

/* 4. numerical integration reproduces totalMassSol -------------------------------- */

check('4 numerically integrating prugnielSimienMassDensity over a sphere reproduces ' +
  'totalMassSol to within a few percent (independent of the closed-form gate above)', (() => {
  const totalMassSol = 1e10, rePc = 143, n = 1.52;
  // Integrate in log-r shells: dM = rho(r) * 4*pi*r^2 dr. Use a substitution
  // u = ln(r) so the grid resolves both the inner cusp and the outer tail.
  const rMin = CORE_FLOOR_PC, rMax = rePc * 2000;
  const nSteps = 20000;
  const uMin = Math.log(rMin), uMax = Math.log(rMax);
  const du = (uMax - uMin) / nSteps;
  let mass = 0;
  for (let i = 0; i < nSteps; i++) {
    const u = uMin + (i + 0.5) * du;
    const r = Math.exp(u);
    const rho = prugnielSimienMassDensity(r, totalMassSol, rePc, n);
    // dV = 4*pi*r^2 dr = 4*pi*r^3 du (since dr = r du)
    mass += rho * 4 * Math.PI * r * r * r * du;
  }
  return Math.abs(mass - totalMassSol) / totalMassSol < 0.03;
})());

/* 5. never Infinity or NaN, including at the floor -------------------------------- */

check('5 prugnielSimienMassDensity is finite and positive at r=0 (the floor guard) ' +
  'and across a spread of radii/Sersic indices', (() => {
  const cases: [number, number][] = [[143, 1.0], [143, 1.52], [200, 2.62], [50, 4.0]];
  const radii = [0, 1, CORE_FLOOR_PC, 100, 10000];
  return cases.every(([rePc, n]) =>
    radii.every((r) => {
      const rho = prugnielSimienMassDensity(r, 1e10, rePc, n);
      return Number.isFinite(rho) && rho > 0;
    }));
})());

/* 6. higher n -> a steeper inner cusp ---------------------------------------------- */

// NOT the enclosed-MASS-fraction ordering - verified numerically before
// writing this gate, a higher n gives a LARGER enclosed fraction at fixed
// r/Re here, not smaller (the exponential term's own b_n grows with n too,
// so the two effects compete; deprojected 3D enclosed mass at fixed r/Re
// is not the same comparison as "more cuspy"). The structural property
// that genuinely IS monotonic, and is the actual reason this profile
// exists (Terzic & Graham 2005 - Hernquist's fixed cusp is wrong for a
// bulge that needs a free one), is the inner power-law index itself.
check('6 prugnielP (the inner cusp steepness) is monotonically increasing in n - ' +
  'a higher Sersic index really does mean a steeper inner power-law cusp',
  (() => {
    const ns = [0.9, 1.0, 1.52, 2.0, 2.62, 3.0, 4.0];
    let prev = -Infinity;
    for (const n of ns) {
      const p = prugnielP(n);
      if (p <= prev) return false;
      prev = p;
    }
    return true;
  })());

check('gate count matches PRUGNIEL_SIMIEN_GATES', PRUGNIEL_SIMIEN_GATES === 6);

/* --------------------------------- result ------------------------------------ */

if (failures > 0) {
  console.error(`\nprugnielSimien.conformance: ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nprugnielSimien.conformance: all checks passed.');
}
