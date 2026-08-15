/**
 * biosphere - natural abiogenesis and biosignatures. Channel
 * `biosphere:{formationIndex}`.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * This module is deliberately the most speculative kind of science in the
 * project: nobody has observed abiogenesis happen, on Earth or anywhere
 * else, so there is no occurrence rate to cite. Everything here is a
 * physically-motivated GATING model (what conditions abiogenesis plausibly
 * needs) rather than a rate drawn from data - graded `tunable` throughout
 * unless stated otherwise, and the header says so up front rather than
 * dressing a guess as a citation.
 *
 * "REPLACE THE PRIVATE M-DWARF FLARE PENALTY WITH `activityClass`."
 * `stellarHistory.activityClass` is read as a single input HERE; this module
 * never imports Rossby numbers, `RO_SAT`, or anything else from
 * `stellarHistory`'s internals, and never recomputes a Rossby number itself
 * - Law 1 (`stellarHistory` is the SOLE owner of that computation), enforced
 * by a structural grep gate in the conformance suite, not merely a
 * docstring promise. `'flare-active'` hosts get a survival PENALTY (harsher
 * UV/particle sterilisation risk); `'quiet'` hosts do not.
 *
 * LIQUID WATER AND THE ABIOGENESIS WINDOW. Liquid water requires the
 * planet's OWN surface temperature (equilibrium temperature plus a
 * simplified pressure-dependent greenhouse bump, not a full radiative
 * -transfer model - `calibrated`) to sit in [273, 373] K, `sourced (form)`,
 * water's own phase boundaries at ~1 atm. Abiogenesis is gated on the
 * system having had at least `MIN_ABIOGENESIS_GYR` to work with - Earth's
 * own first biosignatures are dated to within ~0.5-1 Gyr of formation,
 * `sourced (order of magnitude)`, not a precise citation.
 *
 * `realisedComposition` IS NOT FINAL - `terraforming` (this same stage)
 * reads and further modifies it. This module never assumes it is the last
 * word on a planet's atmospheric composition.
 *
 * genVersion: any constant here changing is genVersion-bumping.
 */

import type { Rng } from './rng';
import type { ActivityClass } from './stellarHistory';
// `SpeciesFraction` is declared in types.ts (a system-level composite, not a
// taxonomy this module owns) - imported, not redeclared, per Law 1.
import type { SpeciesFraction } from './types';

export type BiosphereLevel = 'none' | 'microbial' | 'complex' | 'photosynthetic' | 'technological';
export type SignatureVerdict = 'none' | 'ambiguous' | 'detected';
export type SignatureOrigin = 'biotic' | 'abiotic' | 'engineered';

export interface Biosignature {
  readonly species: string;
  readonly verdict: SignatureVerdict;
  readonly origin: SignatureOrigin;
}

export interface BiosphereDraw {
  readonly level: BiosphereLevel;
  readonly originProbability: number;
  readonly originEpochGyr: number | null;
  readonly oxygenated: boolean;
  readonly realisedComposition: SpeciesFraction[];
  readonly signatures: Biosignature[];
}

const MIN_ABIOGENESIS_GYR = 0.5;          // sourced (order of magnitude)
const FLARE_ACTIVE_PENALTY = 0.3;         // tunable
const QUIET_BONUS = 1.2;                  // tunable

function liquidWaterStable(surfaceTempK: number): boolean {
  return surfaceTempK >= 273 && surfaceTempK <= 373;
}

/** Base probability of an origin event, before the activity-class
 *  modifier - `tunable`, deliberately modest (abiogenesis is not assumed
 *  likely by default). */
const BASE_ORIGIN_PROBABILITY = 0.4;

function originProbabilityOf(activityClass: ActivityClass, waterStable: boolean, ageGyr: number): number {
  if (!waterStable || ageGyr < MIN_ABIOGENESIS_GYR) return 0;
  const activityFactor = activityClass === 'flare-active' ? FLARE_ACTIVE_PENALTY
    : activityClass === 'quiet' ? QUIET_BONUS : 1.0;
  return Math.min(1, BASE_ORIGIN_PROBABILITY * activityFactor);
}

const LEVEL_THRESHOLDS: readonly [number, BiosphereLevel][] = [
  [0.997, 'technological'], [0.98, 'photosynthetic'], [0.85, 'complex'], [0, 'microbial'],
];

function levelFromDraw(u: number): BiosphereLevel {
  // u is uniform on [0, originProbability) once origin has occurred - a
  // small residual probability of each successive complexity leap,
  // `tunable`, deliberately steep (most biospheres that exist at all stay
  // microbial - real complex/technological life is the rare tail, matching
  // Earth's own ~4 Gyr of overwhelmingly microbial history).
  for (const [hi, level] of LEVEL_THRESHOLDS) if (u >= hi) return level;
  return 'microbial';
}

/**
 * Draws the full biosphere state for one planet. EXACTLY TWO draws when
 * origin is even possible (origin roll, complexity-level roll if it
 * occurred), consumed even when origin fails to keep the draw budget fixed
 * regardless of outcome.
 */
export function rollBiosphere(
  rng: Rng, activityClass: ActivityClass, surfaceTempK: number, ageGyr: number,
): BiosphereDraw {
  const waterStable = liquidWaterStable(surfaceTempK);
  const originProbability = originProbabilityOf(activityClass, waterStable, ageGyr);

  const uOrigin = rng();
  const uLevel = rng();   // consumed regardless, for a fixed draw budget

  if (uOrigin >= originProbability) {
    return {
      level: 'none', originProbability, originEpochGyr: null, oxygenated: false,
      realisedComposition: [], signatures: [],
    };
  }

  const level = levelFromDraw(uLevel);
  const originEpochGyr = MIN_ABIOGENESIS_GYR + uOrigin * Math.max(0, ageGyr - MIN_ABIOGENESIS_GYR);
  const oxygenated = level === 'photosynthetic' || level === 'technological';

  const signatures: Biosignature[] = [];
  if (oxygenated) signatures.push({ species: 'O2', verdict: 'detected', origin: 'biotic' });
  if (level !== 'none' && level !== 'microbial') signatures.push({ species: 'CH4/O2 disequilibrium', verdict: 'ambiguous', origin: 'biotic' });

  const realisedComposition: SpeciesFraction[] = oxygenated
    ? [{ species: 'N2', fraction: 0.75 }, { species: 'O2', fraction: 0.21 }, { species: 'other', fraction: 0.04 }]
    : [{ species: 'N2', fraction: 0.9 }, { species: 'CO2', fraction: 0.08 }, { species: 'other', fraction: 0.02 }];

  return { level, originProbability, originEpochGyr, oxygenated, realisedComposition, signatures };
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. `rollBiosphere` consumes EXACTLY TWO draws, always, regardless of
 *     outcome.
 *  2. Origin is impossible (`originProbability === 0`) when water is not
 *     stable or `ageGyr < MIN_ABIOGENESIS_GYR`, and possible otherwise.
 *  3. A `'flare-active'` host's origin probability is strictly lower than an
 *     otherwise-identical `'quiet'` host's, at the same water/age state.
 *  4. STRUCTURAL - this file contains no Rossby-number computation and does
 *     not import anything from `stellarHistory` beyond the `ActivityClass`
 *     TYPE - grepped directly in the conformance suite.
 *  5. `level === 'none'` implies empty `realisedComposition` and
 *     `signatures`; any other level implies non-empty `realisedComposition`.
 *  6. Determinism.
 */
export const BIOSPHERE_GATES = 6 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Abiogenesis minimum age', status: 'tunable',
    short: 'The minimum time a habitable world needs to exist before life could plausibly have arisen on it.',
    long: 'MIN_ABIOGENESIS_GYR = 0.5, loosely anchored to Earth\'s own timeline (life\'s earliest traces are within a few hundred Myr of Earth becoming habitable) but treated as a tunable narrative knob, not a settled scientific figure - abiogenesis timescales are not well constrained even for the one known example.',
  },
];
