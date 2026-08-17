import { rollAge, AMR_RHO } from './age';
import { mulberry32, type Rng } from './rng';
import type { Population } from './galaxyModel';

let failures = 0;
function check(label: string, cond: boolean): void {
  if (!cond) { failures++; console.log(`FAIL  ${label}`); }
  else console.log(`ok    ${label}`);
}

// A representative disc population - shape only, per S4.2's field list.
const MID_THIN: Population = {
  key: 'spiralMidThin', label: 'Mid thin disc', nLocal: 0.030,
  ageGyr: [3, 6], ageMeanGyr: 4.5, ageSigmaGyr: 1.0,
  massFractionGalaxy: 0.30, fehMeanDex: -0.05, fehSigmaDex: 0.18,
};

// 1. determinism
check('1 same rng sequence, population and formationRank give a bit-identical age',
  (() => {
    const a = rollAge(mulberry32(42), MID_THIN, 0.5);
    const b = rollAge(mulberry32(42), MID_THIN, 0.5);
    return a === b;
  })());

// 2. truncation
check('2 the returned age never leaves population.ageGyr, over many seeds/ranks',
  (() => {
    const rng = mulberry32(1);
    for (let i = 0; i < 5000; i++) {
      const rank = (i % 101) / 100;
      const a = rollAge(rng, MID_THIN, rank);
      if (a < MID_THIN.ageGyr[0] || a > MID_THIN.ageGyr[1]) return false;
    }
    return true;
  })());

// 3. exactly one draw consumed
check('3 rollAge consumes EXACTLY ONE call to rng(), regardless of formationRank',
  (() => {
    let calls = 0;
    const counting: Rng = () => { calls++; return 0.37; };
    rollAge(counting, MID_THIN, 0.1);
    const afterLow = calls;
    rollAge(counting, MID_THIN, 0.9);
    const afterHigh = calls;
    return afterLow === 1 && afterHigh === 2;
  })());

// 4. not a uniform draw - Gaussian-shaped, denser near the mean
function histogram(sampler: (u: number) => number, nBins: number, lo: number, hi: number, n: number): number[] {
  const bins = new Array(nBins).fill(0);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const v = sampler(u);
    const bin = Math.min(nBins - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * nBins)));
    bins[bin]++;
  }
  return bins;
}
check('4 age distribution is Gaussian-shaped, not flat: the centre bin holds ' +
  'markedly more mass than the edge bins',
  (() => {
    // Deterministic sweep over formationRank AND the independent draw, so the
    // resulting histogram reflects the full copula rather than one rng path.
    const nBins = 12, n = 6000;
    const bins = new Array(nBins).fill(0);
    for (let i = 0; i < n; i++) {
      const rank = (i % 77) / 76;
      const u = ((i * 37) % 6151) / 6151;
      const fixedRng: Rng = () => u;
      const v = rollAge(fixedRng, MID_THIN, rank);
      const bin = Math.min(nBins - 1, Math.floor(((v - MID_THIN.ageGyr[0]) /
        (MID_THIN.ageGyr[1] - MID_THIN.ageGyr[0])) * nBins));
      bins[bin]++;
    }
    const centre = bins[Math.floor(nBins / 2) - 1] + bins[Math.floor(nBins / 2)];
    const edges = bins[0] + bins[nBins - 1];
    return centre > edges * 1.5;
  })());

// 5. the Stage-2 gate itself: no spike, and it genuinely fails on a
//    deliberately reintroduced legacy-style cap
function hasAnomalousSpike(values: number[], nBins: number, lo: number, hi: number): boolean {
  const bins = new Array(nBins).fill(0);
  for (const v of values) {
    const bin = Math.min(nBins - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * nBins)));
    bins[bin]++;
  }
  const mean = values.length / nBins;
  return bins.some((c) => c > mean * 3);
}

function sampleReal(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const rank = (i % 101) / 100;
    const u = ((i * 53) % 4999) / 4999;
    out.push(rollAge((() => u) as Rng, MID_THIN, rank));
  }
  return out;
}
function sampleCapped(n: number): number[] {
  // A deliberately broken variant: reintroduces a hard msLifetimeGyr-style
  // cap at 5.19 Gyr, exactly the kind of artefact Stage 2's own gate exists
  // to catch. Every draw above the cap piles onto one value.
  return sampleReal(n).map((v) => Math.min(v, 5.19));
}
check('5 no anomalous histogram spike in the real implementation',
  !hasAnomalousSpike(sampleReal(6000), 30, MID_THIN.ageGyr[0], MID_THIN.ageGyr[1]));
check('5b the SAME spike detector genuinely fires against a reintroduced ' +
  'legacy-style cap at 5.19 Gyr - the gate has teeth, not just a pass',
  hasAnomalousSpike(sampleCapped(6000), 30, MID_THIN.ageGyr[0], MID_THIN.ageGyr[1]));

// 6. formationRank coupling, direction as declared (AMR_RHO > 0 => higher
//    rank biases older), averaged over many independent-draw values so a
//    single unlucky draw cannot flip the comparison
check('6 higher formationRank measurably shifts the age distribution older, ' +
  'holding the independent draw distribution fixed (AMR_RHO = ' + AMR_RHO + ' > 0)',
  (() => {
    const n = 2000;
    let sumLow = 0, sumHigh = 0;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const fixedRng: Rng = () => u;
      sumLow += rollAge(fixedRng, MID_THIN, 0.05);
      sumHigh += rollAge(fixedRng, MID_THIN, 0.95);
    }
    return sumHigh / n > sumLow / n;
  })());

check('7 formationRank out of [0,1] is rejected',
  (() => { try { rollAge(mulberry32(1), MID_THIN, 1.5); return false; } catch { return true; } })());

if (failures > 0) throw new Error(`${failures} age conformance failure(s)`);
console.log('\nall age conformance checks passed');
