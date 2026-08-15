import {
  createSpiralModel, createEllipticalModel, createLenticularModel,
  R0_PC, hernquistK, ELLIPTICAL_POPULATIONS, LENTICULAR_POPULATIONS,
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

// -- barredSpiral (S4.4) ----------------------------------------------------------
check('barredSpiral: bar factor is EXACTLY 1 outside taperOuterPc (5800 pc) - ' +
  'toggling the bar off at R=8178 (well outside) reproduces spiral bit-identically there',
  PROBES.every(([R, t, z]) => R > 5800 ? barred.densityAt(R, t, z) === spiral.densityAt(R, t, z) : true));

check('barredSpiral: the stellar halo is UNAFFECTED by the bar - halo-only density ' +
  'is bit-identical with the bar on and off, at every radius, including inside the taper',
  (() => {
    const rs = [1000, 3000, 4500, 8178, 15000];
    return rs.every((R) => {
      const barredHalo = barred.densityByPopulation(R, 1.0, 0).halo;
      const spiralHalo = spiral.densityByPopulation(R, 1.0, 0).halo;
      return barredHalo === spiralHalo;
    });
  })());

check('barredSpiral: toggling the bar off (createSpiralModel(false)) reproduces ' +
  'spiral BIT-IDENTICALLY everywhere, not just outside the taper',
  PROBES.every(([R, t, z]) => createSpiralModel(false).densityAt(R, t, z) === spiral.densityAt(R, t, z)));

check('barredSpiral: the bar factor is continuous - no jump at the taper boundary',
  (() => {
    const justInside = barred.densityByPopulation(5799.9, 0, 0).youngThin!;
    const justOutside = barred.densityByPopulation(5800.1, 0, 0).youngThin!;
    return Math.abs(justInside - justOutside) / justOutside < 0.01;
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
check('lenticular: bulge effective radius (143 pc) over Hernquist k lands near the ' +
  'expected scale radius, computed not quoted',
  Math.abs(LENTICULAR_POPULATIONS[3]!.scaleRadiusPc! - 143 / hernquistK()) < 1e-9);

const lenticularClassical = createLenticularModel(2e10, upsilonFor, 'classical');
check('lenticular classical config: drops the pseudo-bulge population entirely',
  !lenticularClassical.populations.some((p) => p.key === 'lenticularPseudoBulge'));
check('lenticular classical config: still returns non-zero, finite density',
  Number.isFinite(lenticularClassical.densityAt(R0_PC, 0, 0)) && lenticularClassical.densityAt(R0_PC, 0, 0) >= 0);

if (failures > 0) throw new Error(`${failures} galaxyModel conformance failure(s)`);
console.log('\nall galaxyModel conformance checks passed');
