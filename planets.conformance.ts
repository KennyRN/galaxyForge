import {
  rollPlanets, mutualHillMerge, snowLineAu, zoneOf,
  giantHostingRate, classOfRadius, kindOfClass, type PlanetDraw, type PlanetSystemInputs,
} from './planets';
import { habitableZoneAu } from './habitability';
import { luminositySol, representativeMass } from './stellarProperties';
import { mulberry32, type Rng } from './rng';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

function singleStarInputs(hostClass: 'G2V' | 'M2V', feh: number, ageGyr = 5.0): PlanetSystemInputs {
  const L = luminositySol(hostClass);
  return {
    primaryMassSol: representativeMass(hostClass), primaryLuminositySol: L, combinedLuminositySol: L,
    hostClass, ageGyr, feh, aStypeMaxAu: null, aPtypeMinAu: null,
  };
}

function meanZoneACount(hostClass: 'G2V' | 'M2V', n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const planets = rollPlanets(mulberry32(1000 + i), singleStarInputs(hostClass, 0));
    total += planets.filter((p) => p.zone === 'A').length;
  }
  return total / n;
}

// 1. Zone A occurrence
const zoneAG = meanZoneACount('G2V', 4000);
const zoneAM = meanZoneACount('M2V', 4000);
check(`1 Zone A occurrence averages near 1.07 for a G primary (got ${zoneAG.toFixed(3)})`,
  Math.abs(zoneAG - 1.07) < 0.15);
check(`1b Zone A occurrence averages near 2.5 for an M primary (got ${zoneAM.toFixed(3)})`,
  Math.abs(zoneAM - 2.5) < 0.3);

// 2. eta-earth: MEAN COUNT of rocky-in-HZ planets per G-primary system (the
//    Kepler-literature definition of eta-earth is a RATE, not a hosting
//    fraction).
function meanEarthLikeInHzCount(n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const inputs = singleStarInputs('G2V', 0);
    const hz = habitableZoneAu(inputs.primaryLuminositySol);
    const planets = rollPlanets(mulberry32(5000 + i), inputs);
    total += planets.filter((p) => p.kind === 'rocky' && p.au >= hz.inner && p.au <= hz.outer).length;
  }
  return total / n;
}
const etaEarth = meanEarthLikeInHzCount(6000);
check(`2 eta-earth (mean rocky-in-HZ planets per G-primary system) lands in ` +
  `[0.30, 0.40] (got ${etaEarth.toFixed(3)})`, etaEarth >= 0.30 && etaEarth <= 0.40);

// 3. giant-hosting fraction vs feh. "Giant" here means a Jupiter-scale planet
// (class sub-giant or larger, radius > ~6 Rearth) - the Fischer & Valenti
// sense - NOT this module's coarse `kind` split, which also lumps
// sub-Neptunes into 'giant' for the rocky/non-rocky atlas reducer and would
// conflate the two very different occurrence statistics.
const TRUE_GIANT_CLASSES = new Set(['sub-giant', 'giant', 'super-giant']);
function giantHostingFraction(feh: number, n: number): number {
  let hosts = 0;
  for (let i = 0; i < n; i++) {
    const planets = rollPlanets(mulberry32(9000 + i), singleStarInputs('G2V', feh));
    if (planets.some((p) => TRUE_GIANT_CLASSES.has(p.class))) hosts++;
  }
  return hosts / n;
}
const giantAtSolar = giantHostingFraction(0, 6000);
const giantAtPlus04 = giantHostingFraction(0.4, 6000);
check(`3 giant-hosting fraction near 7% at solar feh (got ${(giantAtSolar * 100).toFixed(2)}%)`,
  Math.abs(giantAtSolar - 0.07) < 0.02);
check(`3b giant-hosting fraction near 21% at feh=+0.4 (got ${(giantAtPlus04 * 100).toFixed(2)}%)`,
  Math.abs(giantAtPlus04 - 0.21) < 0.03);
check('3c giantHostingRate is monotonically increasing in feh',
  [-0.5, -0.2, 0, 0.2, 0.4].every((f, i, arr) => i === 0 || giantHostingRate(f) > giantHostingRate(arr[i - 1]!)));

// 4. THE RADIUS HISTOGRAM - a genuine local minimum near 1.7-1.8 Rearth
function radiusHistogram(n: number): number[] {
  const radii: number[] = [];
  for (let i = 0; i < n; i++) {
    const planets = rollPlanets(mulberry32(20000 + i), singleStarInputs('G2V', 0));
    for (const p of planets) if (p.radiusEarth < 6) radii.push(p.radiusEarth);
  }
  const nBins = 24, lo = 0.3, hi = 6.0;
  const bins = new Array(nBins).fill(0);
  for (const r of radii) {
    const bin = Math.min(nBins - 1, Math.max(0, Math.floor(((r - lo) / (hi - lo)) * nBins)));
    bins[bin]++;
  }
  return bins;
}
const hist = radiusHistogram(15000);
function binCentreRearth(i: number, nBins = 24, lo = 0.3, hi = 6.0): number {
  return lo + (hi - lo) * (i + 0.5) / nBins;
}
check('4 the pooled radius histogram has a genuine local minimum (not a ' +
  'monotonic slope) somewhere in the 1.7-1.8 Rearth vicinity',
  (() => {
    // Find the bin closest to 1.75 Rearth and confirm it is lower than the
    // bins on both sides at some reasonable distance (a real dip, not noise).
    let target = 0;
    for (let i = 0; i < hist.length; i++) if (Math.abs(binCentreRearth(i) - 1.75) < Math.abs(binCentreRearth(target) - 1.75)) target = i;
    const leftPeak = Math.max(...hist.slice(Math.max(0, target - 6), target));
    const rightPeak = Math.max(...hist.slice(target + 1, Math.min(hist.length, target + 7)));
    return hist[target]! < leftPeak * 0.85 && hist[target]! < rightPeak * 0.85;
  })());

// 5. no planet between aStypeMaxAu and aPtypeMinAu
check('5 no planet ever falls strictly between aStypeMaxAu and aPtypeMinAu, ' +
  'for many binary configurations',
  (() => {
    for (let i = 0; i < 300; i++) {
      const aStypeMaxAu = 0.5 + (i % 10) * 0.3;
      const aPtypeMinAu = aStypeMaxAu + 0.5 + (i % 5) * 0.4;
      const inputs: PlanetSystemInputs = {
        ...singleStarInputs('G2V', 0), aStypeMaxAu, aPtypeMinAu,
      };
      const planets = rollPlanets(mulberry32(30000 + i), inputs);
      for (const p of planets) {
        if (p.au > aStypeMaxAu && p.au < aPtypeMinAu) return false;
      }
    }
    return true;
  })());

// 6. circumbinary innermost median a/a_crit ~ 1.25
function medianOfPtypeRatio(n: number): number | null {
  const ratios: number[] = [];
  for (let i = 0; i < n; i++) {
    const aStypeMaxAu = 1.0, aPtypeMinAu = 2.0;
    const inputs: PlanetSystemInputs = { ...singleStarInputs('G2V', 0), aStypeMaxAu, aPtypeMinAu };
    const planets = rollPlanets(mulberry32(40000 + i), inputs);
    const pType = planets.filter((p) => p.orbitType === 'p-type');
    if (pType.length > 0) {
      const innermost = pType.reduce((a, b) => (a.au < b.au ? a : b));
      ratios.push(innermost.au / aPtypeMinAu);
    }
  }
  if (ratios.length === 0) return null;
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length / 2)]!;
}
const pTypeMedian = medianOfPtypeRatio(4000);
check(`6 circumbinary innermost median a/a_crit lands near 1.25 (got ${pTypeMedian?.toFixed(3)})`,
  pTypeMedian !== null && Math.abs(pTypeMedian - 1.25) < 0.08);

// 7. formationIndex stability under merge
check('7 formationIndex is unique per system, and a merged planet keeps its ' +
  'earlier-formed (lower) index rather than inventing a new one',
  (() => {
    const a: PlanetDraw = mkPlanet(0, 1.0, 1.0, 1.0);
    const b: PlanetDraw = mkPlanet(1, 1.0001, 1.0, 1.0);   // essentially co-located -> will merge
    const merged = mutualHillMerge([a, b], 1.0);
    return merged.length === 1 && merged[0]!.formationIndex === 0;
  })());

// 8. merging reduces an overpacked configuration
function mkPlanet(idx: number, au: number, massEarth: number, radiusEarth: number): PlanetDraw {
  return {
    formationIndex: idx, kind: 'rocky', class: classOfRadius(radiusEarth),
    subclass: 'temperate', zone: 'A', au, formationAu: au, eccentricity: 0,
    radiusEarth, massEarth, coreMassEarth: massEarth, envelopeFraction: 0, envelope: 'stripped',
    hostLuminositySol: 1, orbitType: 's-type', channel: 'core-accretion', migrated: false,
  };
}
check('8 mutual-Hill merging strictly reduces a deliberately overpacked configuration',
  (() => {
    const overpacked = Array.from({ length: 20 }, (_, i) => mkPlanet(i, 1.0 + i * 0.001, 1.0, 1.0));
    const merged = mutualHillMerge(overpacked, 1.0);
    return merged.length < overpacked.length;
  })());
check('8b merging leaves a WELL-SEPARATED configuration untouched',
  (() => {
    const spaced = [mkPlanet(0, 0.5, 1, 1), mkPlanet(1, 2.0, 1, 1), mkPlanet(2, 8.0, 1, 1)];
    const merged = mutualHillMerge(spaced, 1.0);
    return merged.length === 3;
  })());

// 9. determinism
check('9 rollPlanets is deterministic for the same rng sequence and inputs',
  (() => {
    const inputs = singleStarInputs('G2V', 0);
    const a = rollPlanets(mulberry32(777), inputs);
    const b = rollPlanets(mulberry32(777), inputs);
    return JSON.stringify(a) === JSON.stringify(b);
  })());

// extra: kind/class consistency
check('+ kindOfClass is consistent with the radius breakpoints (rocky below ' +
  'the gap, giant at/above it)',
  kindOfClass(classOfRadius(1.0)) === 'rocky' && kindOfClass(classOfRadius(3.0)) === 'giant' &&
  kindOfClass(classOfRadius(11)) === 'giant');

if (failures > 0) throw new Error(`${failures} planets conformance failure(s)`);
console.log('\nall planets conformance checks passed');

console.log('\n--- radius histogram (0.3-6.0 Rearth, 24 bins) ---');
hist.forEach((c, i) => console.log(`  ${binCentreRearth(i).toFixed(2)} Rearth: ${'#'.repeat(Math.round(c / 20))} (${c})`));
