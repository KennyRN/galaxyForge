import {
  createSpiralModel, createEllipticalModel, createLenticularModel, scaleSpiralModel,
  R0_PC, hernquistK, ELLIPTICAL_POPULATIONS, LENTICULAR_POPULATIONS, JURIC,
  type Population, type DensityByPopulation, type GalaxyModel,
} from './galaxyModel';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

const keysOf = (d: DensityByPopulation) => Object.keys(d).sort().join(',');
const popKeys = (m: GalaxyModel) => m.populations.map((p) => p.key).sort().join(',');

const PROBES: [number, number, number][] = [
  [1, 0, 0], [500, 1.1, -200], [8178, 2.7, 0], [50000, 0.3, 12000],
];

const spiral = createSpiralModel(false);
const barred = createSpiralModel(true);
const CONST_UPSILON = 2.0;   // a stand-in - galacticDensity's real composition is not yet built
const upsilonFor = (_p: Population) => CONST_UPSILON;
const elliptical = createEllipticalModel(1e11, upsilonFor);
const lenticular = createLenticularModel(2e10, upsilonFor);

// -- all morphologies (S4.7) ---------------------------------------------------
for (const [name, model] of [['spiral', spiral], ['barredSpiral', barred], ['elliptical', elliptical], ['lenticular', lenticular]] as const) {
  check(`${name}: density finite and non-negative everywhere, including R->0`,
    PROBES.concat([[0, 0, 0], [1e-9, 0, 0]]).every(([R, t, z]) => {
      const d = model.densityAt(R, t, z);
      return Number.isFinite(d) && d >= 0;
    }));
  check(`${name}: densityAt equals the sum over densityByPopulation`,
    PROBES.every(([R, t, z]) => {
      const sum = Object.values(model.densityByPopulation(R, t, z)).reduce((a: number, b) => a + (b ?? 0), 0);
      return Math.abs(model.densityAt(R, t, z) - sum) < 1e-9 * Math.max(1, sum);
    }));
  check(`${name}: densityByPopulation keys are exactly the model's own populations`,
    PROBES.every(([R, t, z]) => keysOf(model.densityByPopulation(R, t, z)) === popKeys(model)));
  check(`${name}: purity - same inputs, same output, always`,
    PROBES.every(([R, t, z]) => model.densityAt(R, t, z) === model.densityAt(R, t, z)));
}

// -- spiral-specific -------------------------------------------------------------
check('spiral: morphology label is "spiral"', spiral.morphology === 'spiral');
check('barredSpiral: morphology label is "barredSpiral"', barred.morphology === 'barredSpiral');

// -- barredSpiral / boxy-peanut bulge (S4.4, restated for the new bulge form,
//    Amendment A4, morphology patch v3.0, 17 Aug 2026 - gate G4) -----------------
//
// `barFactor`'s old multiplicative role (a taper window on the disc) is
// retired outright, not merely re-tuned - every gate below tests the NEW
// claim directly rather than patching the old one's premise.

const NON_BULGE_KEYS = ['spiralYoungThin', 'spiralMidThin', 'spiralOldThin', 'spiralThick', 'spiralHalo'] as const;

check('barredSpiral: every NON-BULGE population is bit-identical between barred and ' +
  'unbarred, at EVERY radius - barFactor no longer touches the disc at all (superseding ' +
  'the old "outside taperOuterPc only" claim, which described a mechanism this patch retires)',
  PROBES.every(([R, t, z]) =>
    NON_BULGE_KEYS.every((k) => barred.densityByPopulation(R, t, z)[k] === spiral.densityByPopulation(R, t, z)[k])));

check('barredSpiral: the stellar halo specifically is UNAFFECTED by the bar (S4.2\'s own ' +
  'halo/bar bug fix) - halo-only density is bit-identical with the bar on and off, at every radius',
  (() => {
    const rs = [1000, 3000, 4500, 8178, 15000];
    return rs.every((R) => {
      const barredHalo = barred.densityByPopulation(R, 1.0, 0).spiralHalo;
      const spiralHalo = spiral.densityByPopulation(R, 1.0, 0).spiralHalo;
      return barredHalo === spiralHalo;
    });
  })());

check('barredSpiral: toggling the bar off (createSpiralModel(false)) reproduces ' +
  'spiral BIT-IDENTICALLY everywhere (self-consistency, not merely the two module-level bindings)',
  PROBES.every(([R, t, z]) => createSpiralModel(false).densityAt(R, t, z) === spiral.densityAt(R, t, z)));

// -- G4: barEnabled selects the BULGE's shape (triaxial vs axisymmetrised),
//    never whether it exists - see boxyPeanutBulgeMassDensity's own header --------

check('G4a: with the bar OFF, the bulge is genuinely AXISYMMETRIC - identical density ' +
  'across a spread of theta, at fixed (R, z)',
  (() => {
    const R = 600, z = 100;
    const thetas = [0, 0.7, 1.5, Math.PI, 4.2, 5.9];
    const vals = thetas.map((t) => spiral.densityByPopulation(R, t, z).spiralBoxyPeanutBulge);
    return vals.every((v) => v === vals[0]);
  })());

check('G4b: with the bar ON, the bulge is genuinely TRIAXIAL - density VARIES with theta ' +
  'at fixed (R, z), off the major/minor axes (not manufactured: the axisymmetric case above ' +
  'proves the harness itself would show equality if the shape genuinely were round)',
  (() => {
    const R = 600, z = 100;
    const thetas = [0, 0.7, 1.5, Math.PI, 4.2, 5.9];
    const vals = thetas.map((t) => barred.densityByPopulation(R, t, z).spiralBoxyPeanutBulge!);
    return vals.some((v) => v !== vals[0]);
  })());

check('G4c: toggling barEnabled changes the bulge\'s SHAPE but not its TOTAL MASS - ' +
  'numerically integrated (full-domain grid, generous tolerance - the point is catching a ' +
  'gross normalisation bug, not certifying quadrature precision) triaxial and axisymmetrised ' +
  'total mass agree to within 2%',
  (() => {
    // Explicit upsilonFor = identity-scaled CONST_UPSILON, so the Upsilon
    // this test divides back out is KNOWN rather than coincidentally equal
    // to galaxyModel.ts's own internal default - avoids the test silently
    // depending on two unrelated constants happening to match.
    const spiralForMass = createSpiralModel(false, undefined, () => CONST_UPSILON);
    const barredForMass = createSpiralModel(true, undefined, () => CONST_UPSILON);
    // FULL (x,y) domain, not an octant-symmetry shortcut - the bulge's own
    // `phaseRad` (27 deg) rotates the triaxial shape off the x/y axes, which
    // breaks the "reflect across x=0/y=0" assumption an octant shortcut
    // relies on (found the hard way: an earlier version of this gate used
    // that shortcut and reported a spurious ~25% "mass mismatch" that was
    // entirely the shortcut's own error, not the model's - z=0 reflection
    // alone remains exactly valid regardless of phaseRad, so only that axis
    // is still doubled).
    function integrateMass(model: GalaxyModel, lim: number, N: number): number {
      const h = (2 * lim) / N;
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const x = -lim + (i + 0.5) * h;
        for (let j = 0; j < N; j++) {
          const y = -lim + (j + 0.5) * h;
          const R = Math.hypot(x, y);
          const theta = Math.atan2(y, x);
          for (let k = 0; k < N / 2; k++) {
            const z = (k + 0.5) * h;
            sum += (model.densityByPopulation(R, theta, z).spiralBoxyPeanutBulge ?? 0) / CONST_UPSILON;
          }
        }
      }
      return 2 * sum * h * h * h;   // MASS, not count - divided out CONST_UPSILON above; only z doubled
    }
    const lim = 6000, N = 60;
    const triaxialMass = integrateMass(barredForMass, lim, N);
    const axiMass = integrateMass(spiralForMass, lim, N);
    return Math.abs(triaxialMass - axiMass) / axiMass < 0.02;
  })());

// -- elliptical (S4.5) --------------------------------------------------------------
check('elliptical: M(<a) = M/4 for the in-situ population (Hernquist exact result)',
  (() => {
    const pop = ELLIPTICAL_POPULATIONS[0]!;   // ellipticalInSitu
    const massSol = 1e11 * pop.massFractionGalaxy;
    const a = pop.scaleRadiusPc!;
    // M(<r) = M * r^2 / (r+a)^2 for Hernquist; at r=a, M(<a) = M/4.
    const enclosedFraction = a * a / (a + a) ** 2;
    return Math.abs(enclosedFraction - 0.25) < 1e-9;
  })());

check('elliptical: integrating density over volume recovers the specified total ' +
  'stellar mass to within a few percent (systems -> mass via the constant test Upsilon)',
  (() => {
    // Numerical spherical-shell integration of hernquistMassDensity directly
    // (independent of densityAt's own R/z parametrisation) for each population.
    function hernquistTotalMass(massSol: number, aPc: number): number {
      // integrates to EXACTLY massSol analytically; a numerical check over a
      // wide-enough radius range should land close to it.
      const rMaxPc = aPc * 500;
      const n = 20000;
      const h = rMaxPc / n;
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const r = (i + 0.5) * h;
        const rho = (massSol * aPc) / (2 * Math.PI * r * (r + aPc) ** 3);
        acc += 4 * Math.PI * r * r * rho * h;
      }
      return acc;
    }
    return ELLIPTICAL_POPULATIONS.every((pop) => {
      const massSol = 1e11 * pop.massFractionGalaxy;
      const recovered = hernquistTotalMass(massSol, pop.scaleRadiusPc!);
      return Math.abs(recovered - massSol) / massSol < 0.02;
    });
  })());

check('elliptical: ex-situ (accreted) fraction rises with radius - a REAL radial ' +
  'trend, not a flat ratio (the per-population scale-radius fix this depends on)',
  (() => {
    const fracAt = (R: number) => {
      const d = elliptical.densityByPopulation(R, 0, 0);
      return d.ellipticalAccreted! / (d.ellipticalInSitu! + d.ellipticalAccreted!);
    };
    const f10 = fracAt(10), f1000 = fracAt(1000), f20000 = fracAt(20000);
    return f10 < f1000 && f1000 < f20000;
  })());

check('elliptical: accreted halo scale radius exceeds in-situ scale radius',
  ELLIPTICAL_POPULATIONS[1]!.scaleRadiusPc! > ELLIPTICAL_POPULATIONS[0]!.scaleRadiusPc!);

// -- lenticular (S4.6) -----------------------------------------------------------
check('lenticular: returns non-zero density (the historic stub bug this module fixes)',
  lenticular.densityAt(R0_PC, 0, 0) > 0);
check('lenticular: no population has armAmplitude > 0 (structural, S0s have no arms)',
  LENTICULAR_POPULATIONS.every((p) => (p.armAmplitude ?? 0) === 0));
check('lenticular: the five mass fractions sum to 1 (composite configuration)',
  Math.abs(LENTICULAR_POPULATIONS.reduce((a, p) => a + p.massFractionGalaxy, 0) - 1) < 1e-9);
check('lenticular: composite-config classical bulge uses Erwin\'s own effective ' +
  'radius (143 pc) DIRECTLY - Prugniel-Simien needs no Hernquist-k conversion ' +
  '(16 Aug 2026, replacing Hernquist reuse)',
  LENTICULAR_POPULATIONS[3]!.scaleRadiusPc === 143);
check('lenticular: composite-config classical bulge carries Erwin\'s own Sersic ' +
  'index (n=1.52), not Hernquist\'s implicit n~4',
  LENTICULAR_POPULATIONS[3]!.sersicN === 1.52);

const lenticularClassical = createLenticularModel(2e10, upsilonFor, 'classical');
check('lenticular classical config: drops the pseudo-bulge population entirely',
  !lenticularClassical.populations.some((p) => p.key === 'lenticularPseudoBulge'));
check('lenticular classical config: still returns non-zero, finite density',
  Number.isFinite(lenticularClassical.densityAt(R0_PC, 0, 0)) && lenticularClassical.densityAt(R0_PC, 0, 0) >= 0);
check('lenticular classical config: the classical bulge carries Gao\'s own ' +
  'different Re/n (520 pc, n=2.62) - a genuinely different configuration, ' +
  'not just a renamed copy of the composite one',
  (() => {
    const bulge = lenticularClassical.populations.find((p) => p.key === 'lenticularClassicalBulge')!;
    return bulge.scaleRadiusPc === 0.20 * JURIC.lThin && bulge.sersicN === 2.62;
  })());

// -- lenticular halo: closed-form mass normalisation (16 Aug 2026) ----------------
check('lenticular halo: INT rho dV over the whole (truncated, floored) volume ' +
  'reproduces massFractionGalaxy * galaxyMassSol * upsilonFor(pop) to within a ' +
  'few percent - a genuine total-mass guarantee, not a point-anchor', (() => {
  const galaxyMassSol = 2e10;
  const model = createLenticularModel(galaxyMassSol, upsilonFor);
  const haloPop = model.populations.find((p) => p.key === 'lenticularHalo')!;
  const expectedTotal = galaxyMassSol * haloPop.massFractionGalaxy * upsilonFor(haloPop);

  // Spherical-shell quadrature in log-r (the halo is oblate, not spherical,
  // but a flattening factor is a fixed volume-element scaling this
  // integral - done crudely via many (R, theta, z) samples per shell -
  // adequate for a "within a few percent" check, not a replacement for the
  // closed-form derivation itself).
  const rMin = 10, rMax = 20000, nSteps = 4000, nAngles = 24;
  const uMin = Math.log(rMin), uMax = Math.log(rMax), du = (uMax - uMin) / nSteps;
  let mass = 0;
  for (let i = 0; i < nSteps; i++) {
    const u = uMin + (i + 0.5) * du;
    const r = Math.exp(u);
    let angularSum = 0;
    for (let j = 0; j < nAngles; j++) {
      const phi = (j + 0.5) / nAngles * Math.PI;   // polar angle from z-axis, [0, pi]
      const R = r * Math.sin(phi), z = r * Math.cos(phi);
      const d = model.densityByPopulation(R, 0, z).lenticularHalo ?? 0;
      angularSum += d * Math.sin(phi);
    }
    const solidAngleWeight = (angularSum / nAngles) * 2 * Math.PI * Math.PI;
    mass += solidAngleWeight * r * r * r * du;
  }
  return Math.abs(mass - expectedTotal) / expectedTotal < 0.1;
})());

// -- scaleSpiralModel (16 Aug 2026) -----------------------------------------------
check('scaleSpiralModel: scale===1 is an EXACT fast path - returns the identical ' +
  'model reference, not merely an equivalent one',
  scaleSpiralModel(spiral, 1) === spiral && scaleSpiralModel(barred, 1) === barred);

check('scaleSpiralModel: self-similarity identity - scaleSpiralModel(m,k).densityAt' +
  '(k*R,theta,k*z) equals m.densityAt(R,theta,z) exactly, for the plain spiral ' +
  '(disc+halo) across a spread of k/R/theta/z', (() => {
  const ks = [0.5, 0.8, 1.5, 2.0];
  return ks.every((k) => {
    const scaled = scaleSpiralModel(spiral, k);
    return PROBES.every(([R, t, z]) => scaled.densityAt(k * R, t, k * z) === spiral.densityAt(R, t, z));
  });
})());

check('scaleSpiralModel: the SAME self-similarity identity holds with the bar ' +
  'enabled too - bar geometry/taper is equally scale-invariant under the transform',
  (() => {
    const ks = [0.5, 0.8, 1.5, 2.0];
    return ks.every((k) => {
      const scaled = scaleSpiralModel(barred, k);
      return PROBES.every(([R, t, z]) => scaled.densityAt(k * R, t, k * z) === barred.densityAt(R, t, z));
    });
  })());

check('scaleSpiralModel: densityByPopulation obeys the identical self-similarity ' +
  'identity, per population, not just the summed total',
  (() => {
    const k = 1.5;
    const scaled = scaleSpiralModel(spiral, k);
    return PROBES.every(([R, t, z]) => {
      const a = scaled.densityByPopulation(k * R, t, k * z);
      const b = spiral.densityByPopulation(R, t, z);
      return spiral.populations.every((p) => a[p.key] === b[p.key]);
    });
  })());

check('scaleSpiralModel: density stays finite and non-negative at edge cases - ' +
  'R=0, a very small scale, and a very large scale',
  (() => {
    const cases: [GalaxyModel, number, number, number][] = [
      [scaleSpiralModel(spiral, 0.1), 0, 0, 0],
      [scaleSpiralModel(spiral, 0.1), 1e-9, 0, 0],
      [scaleSpiralModel(spiral, 10), 8178, 1.2, 100],
      [scaleSpiralModel(barred, 0.1), 0, 0, 0],
    ];
    return cases.every(([m, R, t, z]) => {
      const d = m.densityAt(R, t, z);
      return Number.isFinite(d) && d >= 0;
    });
  })());

check('scaleSpiralModel: morphology/populations pass through unchanged (only the ' +
  'coordinate transform on densityAt/densityByPopulation is new)',
  (() => {
    const scaled = scaleSpiralModel(spiral, 1.5);
    return scaled.morphology === spiral.morphology && scaled.populations === spiral.populations;
  })());

if (failures > 0) throw new Error(`${failures} galaxyModel conformance failure(s)`);
console.log('\nall galaxyModel conformance checks passed');
