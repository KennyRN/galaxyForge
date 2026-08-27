import {
  pcToLy, lyToPc, pcToKm, auToKm, kmToAu, auToPc, pcToAu, kToC, kToF,
  radiusSolToKm, radiusSolToRearth, radiusEarthToKm, kmToRadiusEarth,
  radiusEarthToRjup, massEarthToMjup, gyrToMyr, myrToGyr, dexToLinearRatio,
  linearRatioToDex, MEARTH_PER_MSUN, surfaceGravityG,
  degToRad, radToDeg, surfaceDensityPc2ToLy2, surfaceDensityLy2ToPc2,
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

// 6. STRUCTURAL (Prompt P2) - no other source file hand-rolls a
// degree/radian conversion instead of calling degToRad/radToDeg. Strips
// whitespace AND parens before matching, not just whitespace - a literal
// transcription of `spiralArms.ts`'s own former local degToRad, `(d *
// Math.PI) / 180`, slipped past a whitespace-only regex here once
// (found and fixed the same day this gate was added: the parenthesised
// `Math.PI)` broke a `Math\.PI\s*\/\s*180` pattern). Stripping parens too
// leaves `Math.PI/180` or `180/Math.PI` as a contiguous substring
// regardless of surrounding multiplication factors or grouping.
function stripWhitespaceAndParens(src: string): string { return src.replace(/[\s()]/g, ''); }
check('6 no source file OTHER than units.ts hand-rolls a Math.PI-based ' +
  'degree/radian conversion (must call degToRad/radToDeg instead)',
  allTsFiles().filter((f) => f !== 'units.ts').every((f) => {
    const stripped = stripWhitespaceAndParens(readSource(f));
    return !stripped.includes('Math.PI/180') && !stripped.includes('180/Math.PI');
  }));

// extra: angle and density round-trips
check('+ degToRad/radToDeg round-trip', Math.abs(radToDeg(degToRad(123.4)) - 123.4) < 1e-9);
check('+ degToRad(180) === Math.PI exactly', degToRad(180) === Math.PI);
check('+ surfaceDensityPc2ToLy2/Ly2ToPc2 round-trip',
  Math.abs(surfaceDensityLy2ToPc2(surfaceDensityPc2ToLy2(1.6)) - 1.6) < 1e-9);
check('+ surfaceDensityPc2ToLy2(1) is smaller than 1 (ly is a smaller unit than pc, ' +
  'so a per-ly^2 density is a smaller number)',
  surfaceDensityPc2ToLy2(1) < 1);

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
check('+ surfaceGravityG(1, 1) === 1 exactly (Earth is its own reference)', surfaceGravityG(1, 1) === 1);
check('+ surfaceGravityG doubles with mass at fixed radius', surfaceGravityG(2, 1) === 2 * surfaceGravityG(1, 1));
check('+ surfaceGravityG quarters when radius doubles at fixed mass (inverse-square)', Math.abs(surfaceGravityG(1, 2) - surfaceGravityG(1, 1) / 4) < 1e-12);

if (failures > 0) throw new Error(`${failures} units conformance failure(s)`);
console.log('\nall units conformance checks passed');
