import {
  pcToLy, lyToPc, pcToKm, auToKm, kmToAu, auToPc, pcToAu, kToC, kToF,
  radiusSolToKm, radiusSolToRearth, radiusEarthToKm, kmToRadiusEarth,
  radiusEarthToRjup, massEarthToMjup, gyrToMyr, myrToGyr, dexToLinearRatio,
  linearRatioToDex, MEARTH_PER_MSUN,
} from './units';
import * as fs from 'fs';
import * as path from 'path';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// 1. round-trips
check('1 pc -> ly -> pc round-trips to 1e-9', Math.abs(lyToPc(pcToLy(123.45)) - 123.45) < 1e-6);
check('1b AU -> km -> AU round-trips to 1e-9', Math.abs(kmToAu(auToKm(1)) - 1) < 1e-9);
check('1c AU -> pc -> AU round-trips to 1e-9', Math.abs(pcToAu(auToPc(1000)) - 1000) < 1e-6);
check('1d Rearth -> km -> Rearth round-trips to 1e-9', Math.abs(kmToRadiusEarth(radiusEarthToKm(2.5)) - 2.5) < 1e-9);
check('1e dex -> linear -> dex round-trips to 1e-9', Math.abs(linearRatioToDex(dexToLinearRatio(-0.35)) - (-0.35)) < 1e-9);

// 2. pc-in-km sanity check against an independently known figure
check(`2 pcToKm(1) matches the well-known parsec-in-km figure to 6 sig figs ` +
  `(got ${pcToKm(1).toExponential(4)})`,
  Math.abs(pcToKm(1) / 3.0857e13 - 1) < 1e-4);

// 3. temperature fixed points
check('3 kToC(273.15) === 0 exactly (water\'s freezing point)', kToC(273.15) === 0);
check('3b kToF(273.15) === 32 exactly', kToF(273.15) === 32);

// 4. STRUCTURAL - no other source file defines its own conversion constant
const HERE = __dirname;
function readSource(name: string): string {
  return fs.readFileSync(path.join(HERE, '..', name), 'utf8');
}
function allTsFiles(): string[] {
  return fs.readdirSync(path.join(HERE, '..')).filter((f) => f.endsWith('.ts') && !f.endsWith('.conformance.ts'));
}
// Characteristic literals from units.ts's own constants - a hand-rolled copy
// elsewhere would reproduce one of these numbers verbatim.
const CONVERSION_LITERALS = ['149597870', '206264.80625', '696000', '5.9722e24', '333030', '71492', '1.89813e27'];
check('4 no source file OTHER than units.ts reproduces one of units.ts\'s own ' +
  'characteristic conversion literals',
  allTsFiles().filter((f) => f !== 'units.ts').every((f) =>
    CONVERSION_LITERALS.every((lit) => !readSource(f).includes(lit))));

// 5. purity - no Rng anywhere
check('5 units.ts imports nothing from rng.ts (every function here is pure)',
  !readSource('units.ts').includes("from './rng'"));

// extra: derived constants sanity
check('+ MEARTH_PER_MSUN lands near the well-known ~333000 figure',
  Math.abs(MEARTH_PER_MSUN / 333030 - 1) < 0.001);
check('+ radiusSolToRearth(1) lands near the well-known ~109 figure',
  Math.abs(radiusSolToRearth(1) / 109.2 - 1) < 0.01);
check('+ radiusEarthToRjup(11.2) lands near 1 (Jupiter is ~11.2 Rearth)',
  Math.abs(radiusEarthToRjup(11.2) - 1) < 0.01);
check('+ massEarthToMjup(317.8) lands near 1 (Jupiter is ~317.8 Mearth)',
  Math.abs(massEarthToMjup(317.8) - 1) < 0.01);
check('+ gyrToMyr and myrToGyr round-trip', Math.abs(myrToGyr(gyrToMyr(4.6)) - 4.6) < 1e-9);

if (failures > 0) throw new Error(`${failures} units conformance failure(s)`);
console.log('\nall units conformance checks passed');
