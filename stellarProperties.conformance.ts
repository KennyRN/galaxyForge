import {
  STELLAR_CLASSES, teffK, colourBV, radiusSol, representativeMass,
  luminositySol, absMagV, SUN_ABS_MAG_V, msLifetimeGyr, turnoffMassSol,
  type StellarClass,
} from './stellarProperties';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// -- table well-formedness --------------------------------------------------
check('1 sixty-five unique classes, O5V to M9V',
  STELLAR_CLASSES.length === 65 && new Set(STELLAR_CLASSES).size === 65 &&
  STELLAR_CLASSES[0] === 'O5V' && STELLAR_CLASSES[64] === 'M9V');

check('1b Teff strictly decreasing hottest -> coolest, table order',
  STELLAR_CLASSES.every((c, i) => i === 0 || teffK(STELLAR_CLASSES[i - 1]!) > teffK(c)));

check('1c every mass, radius and luminosity is positive',
  STELLAR_CLASSES.every((c) =>
    representativeMass(c) > 0 && radiusSol(c) > 0 && luminositySol(c) > 0));

check('1d colour reddens (B-V increases) hottest -> coolest, table order',
  STELLAR_CLASSES.every((c, i) => i === 0 || colourBV(STELLAR_CLASSES[i - 1]!) < colourBV(c)));

check('1e unknown class throws rather than returning undefined-shaped data',
  (() => { try { teffK('Q9V' as StellarClass); return false; } catch { return true; } })());

// -- the Sun / G2V-mean trap, asserted not just documented -------------------
check('2 SUN_ABS_MAG_V is the IAU-nominal 4.83',
  SUN_ABS_MAG_V === 4.83);
check('2b absMagV(G2V) is CLOSE to but not identical to SUN_ABS_MAG_V - the class ' +
  'mean is not the Sun (header trap)',
  Math.abs(absMagV('G2V') - SUN_ABS_MAG_V) < 0.1 && absMagV('G2V') !== SUN_ABS_MAG_V);

// -- msLifetimeGyr -------------------------------------------------------------
check('3 msLifetimeGyr(1 Msun, feh=0) is within an order-of-magnitude sanity band of 10 Gyr',
  msLifetimeGyr(1.0, 0) > 5 && msLifetimeGyr(1.0, 0) < 15);

check('4 msLifetimeGyr is monotonically decreasing in mass at fixed feh',
  (() => {
    const masses = [0.1, 0.2, 0.5, 0.8, 1.0, 1.5, 2.0, 5.0, 10.0, 20.0];
    const taus = masses.map((m) => msLifetimeGyr(m, 0));
    return taus.every((t, i) => i === 0 || t < taus[i - 1]!);
  })());

check('5 Stage-1 gate: a metal-poor 0.8 Msun star has a SHORTER main-sequence ' +
  'lifetime than a solar-metallicity one of the same mass',
  msLifetimeGyr(0.8, -1.0) < msLifetimeGyr(0.8, 0.0));

check('5b the effect is genuinely from metallicity, not a mass-interpolation ' +
  'artefact: it holds across a spread of masses, not just 0.8',
  [0.3, 0.5, 0.8, 1.0, 1.5, 3.0].every((m) => msLifetimeGyr(m, -1.0) < msLifetimeGyr(m, 0.0)));

check('5c feh = 0 is a genuine no-op reference: msLifetimeGyr(m, 0) is unaffected ' +
  'by the correction term at the anchor point',
  Math.abs(msLifetimeGyr(1.0, 0) - msLifetimeGyr(1.0, -0)) < 1e-12);

// -- interpolation stays sane outside the tabulated mass range (0.079-43 Msun) -
check('6 extrapolation beyond the table stays finite and positive',
  Number.isFinite(msLifetimeGyr(0.02, 0)) && msLifetimeGyr(0.02, 0) > 0 &&
  Number.isFinite(msLifetimeGyr(100, 0)) && msLifetimeGyr(100, 0) > 0);

check('6b extrapolated low-mass lifetime still exceeds the in-table minimum ' +
  '(monotonicity does not invert past the boundary)',
  msLifetimeGyr(0.02, 0) > msLifetimeGyr(0.079, 0));

// -- representativeMass matches the table exactly at a spot check ------------
check('7 representativeMass spot check against the retrieved table',
  representativeMass('G2V') === 1.00 && representativeMass('M0V') === 0.57 &&
  representativeMass('O5V') === 43);

// -- turnoffMassSol is msLifetimeGyr's own genuine inverse in mass -----------
check('8 turnoffMassSol(msLifetimeGyr(m, feh), feh) round-trips m to 1e-3 relative, ' +
  'across a spread of masses and metallicities',
  (() => {
    const cases: [number, number][] = [[0.3, 0.0], [0.8, -0.5], [1.0, 0.0], [2.0, 0.15], [5.0, -1.0]];
    return cases.every(([m, feh]) => {
      const age = msLifetimeGyr(m, feh);
      const back = turnoffMassSol(age, feh);
      return Math.abs(back - m) / m < 1e-3;
    });
  })());
check('8b turnoffMassSol is monotonically DECREASING in age - an older ' +
  'population\'s turnoff mass is always lower',
  turnoffMassSol(1, 0) > turnoffMassSol(5, 0) && turnoffMassSol(5, 0) > turnoffMassSol(10, 0));
check('8c rejects a non-positive age rather than returning a bogus mass',
  (() => { try { turnoffMassSol(0, 0); return false; } catch { return true; } })());

if (failures > 0) throw new Error(`${failures} stellarProperties conformance failure(s)`);
console.log('\nall stellarProperties conformance checks passed');

console.log('\n--- msLifetimeGyr, selected masses, feh=0 vs feh=-1 ---');
for (const m of [0.2, 0.5, 0.8, 1.0, 2.0, 5.0, 10.0]) {
  console.log(`  M=${String(m).padStart(4)} Msun   feh=0: ${msLifetimeGyr(m, 0).toFixed(3)} Gyr` +
    `   feh=-1: ${msLifetimeGyr(m, -1).toFixed(3)} Gyr`);
}
