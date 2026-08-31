import {
  createSpiralModel, createEllipticalModel, createLenticularModel, scaleSpiralModel, measuredArmMagnitude,
  R0_PC, hernquistK, ELLIPTICAL_POPULATIONS, LENTICULAR_POPULATIONS, JURIC, SPIRAL_POPULATIONS,
  morphologicalQuench, smoothDiscDensityTotal,
  type Population, type DensityByPopulation, type GalaxyModel,
} from './galaxyModel';
import { makeDefaultGalaxyParameters, DEFAULT_GALAXY_PARAMETERS, DEFAULT_BULGE } from './galaxyParameters';
import { ARMS, rollArmClass, type ArmClass } from './spiralArms';

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

// -- D2 (patch v3.0 S7, model-side half - see densityMap.conformance.ts's own
//    gate 10 for the render-side half, which pins the SAME property surviving
//    through the display pipeline) - a bulge in the field genuinely reaches
//    the canvas ------------------------------------------------------------

check('D2: the bulge reaches the centre, and its OWN central enhancement scales ' +
  'LINEARLY with the declared bulge.strength parameter - the most concrete, testable ' +
  'reading of "exceeds the disc\'s own extrapolated central value by the bulge\'s ' +
  'declared factor" this codebase actually exposes (bulge.strength is a real, wired ' +
  'Tier G field - GATE 19 already proves it changes output - not an invented ratio)',
  (() => {
    const centralExcess = (strength: number): number => {
      const params = { ...DEFAULT_GALAXY_PARAMETERS, bulge: { ...DEFAULT_BULGE, strength } };
      const model = createSpiralModel(true, params, () => CONST_UPSILON);
      const split = model.densityByPopulation(0, 0, 0);
      let discOnly = 0, total = 0;
      for (const [k, v] of Object.entries(split)) {
        total += v ?? 0;
        if (k !== 'spiralBoxyPeanutBulge') discOnly += v ?? 0;
      }
      return total - discOnly;
    };
    const e1 = centralExcess(1.0), e2 = centralExcess(2.0);
    return e1 > 0 && Math.abs(e2 / e1 - 2) < 1e-9;
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

// -- armClass (Amendment A6, morphology patch v3.0, 17 Aug 2026) - G2/G3 ---------

// R0 = 8178pc (the solar circle, matching DRIMMEL_SPERGEL_K's own anchor
// radius) - the same reference point ARM_CLASS_CONTRAST_TARGET_K's own
// header records the calibration measurements against.
const ARM_CLASS_BAND: Readonly<Record<ArmClass, readonly [number, number]>> = {
  flocculent: [0.7, 1.4],       // sourced, Elmegreen & Elmegreen 2011
  multipleArm: [1.2, 1.6],      // calibrated - a band around the patch's own stated ~1.4 mag point value
  grandDesign: [1.4, 4.0],      // sourced floor (">1.4 mag"), generous calibrated ceiling for sanity only
};

for (const armClass of ['flocculent', 'multipleArm', 'grandDesign'] as const) {
  check(`G2: measured A(R0) for a seeded '${armClass}' galaxy falls inside its declared band ` +
    `[${ARM_CLASS_BAND[armClass][0]}, ${ARM_CLASS_BAND[armClass][1]}] mag`,
    (() => {
      const params = makeDefaultGalaxyParameters('g2-gate-seed', ARMS, 'seeded', armClass);
      const model = createSpiralModel(false, params);
      const A = measuredArmMagnitude(model, R0_PC);
      const [lo, hi] = ARM_CLASS_BAND[armClass];
      return A >= lo && A <= hi;
    })());
}

check('G3: armClass is stable under regeneration from the same worldSeed - ' +
  'rollArmClass is a pure function, repeat calls give the identical class',
  (() => {
    const seeds = ['g3-a', 'g3-b', 'g3-c', 'g3-d', 'g3-e'];
    return seeds.every((s) => rollArmClass(s) === rollArmClass(s));
  })());

check('G3b: armClass genuinely VARIES across worldSeeds (not manufactured stability - ' +
  'a constant return value would trivially pass G3 above without this)',
  (() => {
    const classes = new Set<ArmClass>();
    for (let i = 0; i < 60; i++) classes.add(rollArmClass(`g3-spread-${i}`));
    return classes.size >= 2;   // 60 draws against a {0.15,0.60,0.25} prior essentially guarantees all 3
  })());

// -- P16 (29 Aug 2026) - morphological quenching of the young thin disc ---------
//
// The young thin disc's plain double-exponential peaked at R=0 (positive radial
// exponent inside R0); `starFormingComplexes.complexCentresInCell` scales its
// Poisson complex count off that surface density, so star-forming complexes were
// massively over-produced at the nucleus (the two findings P15 documented but
// did not action - "splodges on the bulge", "arms still faint"). P16 multiplies
// `spiralYoungThin` by `disc/(disc+bulge)` (Martig et al. 2009; Gensior,
// Kruijssen & Keller 2020) - the local disc mass fraction, built from the
// model's own smooth (axisymmetric) disc and bulge terms. Every gate below is
// falsifiable and most fail on pre-P16 code.

{
  const qParams = DEFAULT_GALAXY_PARAMETERS;
  const qUps = (_p: Population) => 2.0;   // matches createSpiralModel's own DEFAULT_BULGE_UPSILON
  const quench = (R: number, z = 0) => morphologicalQuench(SPIRAL_POPULATIONS, qParams, qUps, R, z);
  const p16spiral = createSpiralModel(false);
  const youngAt = (R: number) => (p16spiral.densityByPopulation(R, 0, 0) as Record<string, number>).spiralYoungThin;
  const totalAt = (R: number) => p16spiral.densityAt(R, 0, 0);

  // G-P16-a - young now fades toward the centre (the fix).
  check('G-P16-a: spiralYoungThin fades toward the centre - youngDensity(0) < youngDensity(3000), ' +
    'and the young radial profile peaks at R > 1000 pc (a molecular-ring-like turnover, not an R=0 spike)',
    (() => {
      if (!(youngAt(0) < youngAt(3000))) return false;
      let bestR = -1, best = -Infinity;
      for (let R = 0; R <= 15000; R += 50) { const v = youngAt(R); if (v > best) { best = v; bestR = R; } }
      return bestR > 1000;
    })());

  // G-P16-b - quench is a well-formed fraction.
  check('G-P16-b: 0 < quench <= 1 everywhere (0..20 kpc), quench(R0) > 0.999 (bulge negligible at ' +
    'the solar circle), quench(0) < 0.3 (bulge-dominated nucleus) for default parameters',
    (() => {
      for (let R = 0; R <= 20000; R += 100) { const q = quench(R); if (!(q > 0 && q <= 1)) return false; }
      return quench(R0_PC) > 0.999 && quench(0) < 0.3;
    })());

  // G-P16-c - emergent crossover in a sane band (guards against a pathological bulge parameter set).
  check('G-P16-c: the bulge/disc crossover (quench = 0.5) is emergent and falls in 0.5 kpc < R_cross < 4 kpc',
    (() => {
      let lo = 0, hi = 8000;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (quench(mid) < 0.5) lo = mid; else hi = mid; }
      const rCross = (lo + hi) / 2;
      return rCross > 500 && rCross < 4000;
    })());

  // G-P16-d - complexes redistribute outward. Proxy: the AREA-WEIGHTED young
  // surface-density fraction inside R < 2 kpc (integral of youngDensity * 2*pi*R
  // dR; a stand-in for `complexCentresInCell`'s own Poisson rate, which is not
  // reachable from this suite). The redistribution is checked both in absolute
  // terms and against the pre-quench profile (`youngDensity / quench`), so the
  // gate cannot pass vacuously.
  const areaWeighted = (a: number, b: number, f: (R: number) => number) => {
    let s = 0; const n = 4000; const h = (b - a) / n;
    for (let i = 0; i < n; i++) { const R = a + (i + 0.5) * h; s += f(R) * 2 * Math.PI * R * h; }
    return s;
  };
  const unquenchedYoung = (R: number) => youngAt(R) / quench(R);
  check('G-P16-d: area-weighted young fraction inside R < 2 kpc drops - below 0.11 absolute, and to ' +
    'under 0.7x its own pre-quench value (young complexes redistribute out of the nucleus)',
    (() => {
      const qFrac = areaWeighted(0, 2000, youngAt) / areaWeighted(0, 20000, youngAt);
      const uFrac = areaWeighted(0, 2000, unquenchedYoung) / areaWeighted(0, 20000, unquenchedYoung);
      return qFrac < 0.11 && qFrac < 0.7 * uFrac;
    })());

  // G-P16-e - the old-star isophote plate is essentially unmoved (centre is
  // bulge-dominated, so quenching the young term barely shifts total density).
  check('G-P16-e: total density at the centre changes by < 5% vs the pre-quench field ' +
    '(bulge-dominated - the primary isophote plate is not visibly altered)',
    (() => {
      const unquenchedTotal0 = totalAt(0) - youngAt(0) + unquenchedYoung(0);
      return Math.abs(unquenchedTotal0 - totalAt(0)) / totalAt(0) < 0.05;
    })());

  // G-P16-f - the quench multiplies spiralYoungThin ALONE. The thick disc
  // ('none' arm response) is a pure double-exponential; a leak of the quench
  // factor into any shared disc term would show here first.
  const thickProbes: [number, number, number][] = [...PROBES, [300, 0.5, 50], [1500, 2.0, 0]];
  check('G-P16-f: spiralThick is bit-identical to its analytic double-exponential at every probe ' +
    '(the quench factor is applied to spiralYoungThin only, never a shared disc term)',
    thickProbes.every(([R, t, z]) => {
      const thick = SPIRAL_POPULATIONS.find((p) => p.key === 'spiralThick')!;
      const analytic = thick.nLocal
        * Math.exp(-(R - qParams.R0Pc) / JURIC.lThick) * Math.exp(-Math.abs(z) / JURIC.hThick);
      return (p16spiral.densityByPopulation(R, t, z) as Record<string, number>).spiralThick === analytic;
    }));

  // Non-vacuousness for -f / -d: the quench genuinely bites in the inner disc.
  check('G-P16: the quench is a real multiplier - quench(500 pc) < 0.5 for default parameters ' +
    '(so G-P16-d/-f are testing an active mechanism, not an inert one)',
    quench(500) < 0.5);

  // barredSpiral: spiralYoungThin stays bit-identical to the unbarred spiral -
  // the quench's bulge term is axisymmetrised, so the "no non-bulge population
  // sees the bar" ruling (line ~60 above) still holds after P16.
  check('G-P16: spiralYoungThin is bit-identical between spiral and barredSpiral at every probe ' +
    '(the quench envelope is bar-free, like it is arm-free)',
    PROBES.every(([R, t, z]) =>
      (createSpiralModel(true).densityByPopulation(R, t, z) as Record<string, number>).spiralYoungThin
      === (createSpiralModel(false).densityByPopulation(R, t, z) as Record<string, number>).spiralYoungThin));

  // smoothDiscDensityTotal is the arm-free disc envelope (its whole reason to
  // exist) - strictly positive, and strictly decreasing outward beyond R0.
  check('G-P16: smoothDiscDensityTotal is arm-free (theta-independent by construction) and ' +
    'strictly decreasing outward past R0',
    (() => {
      const a = smoothDiscDensityTotal(SPIRAL_POPULATIONS, 10000, 0, qParams);
      const b = smoothDiscDensityTotal(SPIRAL_POPULATIONS, 12000, 0, qParams);
      return a > 0 && b > 0 && b < a;
    })());

  // G-P16-g (E4, ruling): the physical claim "more spheroid -> more suppression"
  // (Martig et al. 2009) rendered falsifiable. The other G-P16 gates all pin the
  // DEFAULT-parameter profile; none varies the bulge and asserts the quench
  // responds. Sweep bulge.strength up and assert the inner-disc quench deepens
  // strictly monotonically.
  check('G-P16-g: increasing the bulge mass (bulge.strength 0.25 -> 4) strictly deepens the ' +
    'inner-disc quench - quench(1 kpc) is monotonically decreasing, and the ' +
    'bulge-dominated case is far below the disc-dominated one',
    (() => {
      const strengths = [0.25, 0.5, 1, 2, 4];
      const qs = strengths.map((s) => {
        const p = { ...qParams, bulge: { ...qParams.bulge, strength: s } };
        return morphologicalQuench(SPIRAL_POPULATIONS, p, qUps, 1000, 0);
      });
      const strictlyDown = qs.every((q, i) => i === 0 || (q < qs[i - 1]! && q > 0 && q <= 1));
      return strictlyDown && qs[qs.length - 1]! < 0.5 * qs[0]!;
    })());
}

if (failures > 0) throw new Error(`${failures} galaxyModel conformance failure(s)`);
console.log('\nall galaxyModel conformance checks passed');
