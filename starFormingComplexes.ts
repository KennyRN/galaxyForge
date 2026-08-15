/**
 * starFormingComplexes - the meso-scale `complexTier` density boost, patch
 * v2.3 S4/S5. Channel `complexField`, cell-scoped at `complexTier.cellSizePc`
 * (1200 pc by default) - a coarser, separate grid from `placement`'s own
 * 10 pc cells, so a complex-tier parameter change can never move an
 * already-placed system's fine position (Law 4, same isolation reasoning as
 * `remnantPlacement`/`conatalGroup`).
 *
 * -- WHAT THIS IS, AND THE HONEST LIMIT OF WHAT COULD BE RECOVERED -----------
 * `placement.ts`'s own per-cell clustering (mean group size ~12,
 * 1.5 pc jitter) is the FINE structure - individual open clusters and
 * associations. Efremov 1978's star-forming complexes are the COARSE
 * structure one level up: patches ~600 pc across containing SEVERAL such
 * clusters, tracing the spiral pattern more loosely than any one cluster
 * does. This module is that coarse layer: a second, independent Poisson
 * process of "complex" parent points, each contributing a Gaussian
 * intensity bump to nearby youngThin density, modulated by an age-decay
 * window so a complex's boost fades once its own star formation episode is
 * spent.
 *
 * The patch names the fields (`sigmaComplexPc`, `meanGroupsPerComplex`,
 * `complexFraction`, `ageDecayStartGyr/EndGyr`, `cellSizePc`,
 * `guardBandSigma`, `cellMeanSubGridN`) and a consumer function name
 * (`complexIntensityAt`) but - by its own admission (S5: "I have not seen
 * the disc, bar or co-natal modules... I cannot hand you their key names or
 * defaults") - does not specify the exact combining formula. This module's
 * implementation is therefore `calibrated (interpretive)`: a real,
 * deterministic, seeded, testable mechanism using every named field for
 * what its own name says it should do, not a byte-identical reconstruction
 * of an unspecified original (the same honesty posture as
 * `spiralArms.ts`'s own `armContrast` derivation, for the same underlying
 * reason - no original script exists to check against).
 *
 * `meanGroupsPerComplex` is used exactly as named: how many co-natal groups
 * (`conatal.ts`'s own concern - chemistry, not position) a live complex is
 * associated with, informational for now (no conductor yet threads a
 * complex's identity into which conatal groups spawn near it - the same
 * "every science module exists, nothing composes them into one call" gap
 * `galacticDensity.ts`'s own header already names). `complexFraction` is
 * INJECTED by the caller as `youngThin.clusteredFraction` (0.6) rather than
 * duplicated as a second literal here - the patch's own Law-1 instruction,
 * kept real by NOT importing `galaxyModel.ts` to read it directly: this
 * module sits below `galaxyModel` in the one-way import direction that
 * module's own header already establishes (`galacticDensity -> galaxyModel`,
 * never the reverse), so - exactly like `upsilonFor` in `galacticDensity.ts`
 * - the value is a parameter, not an import.
 *
 * genVersion: any constant or formula change here is genVersion-bumping for
 * every spiral/barredSpiral-generated youngThin system.
 */

import { channelRng } from './rng';
import type { GalaxyParameters } from './galaxyParameters';

interface ComplexParent {
  readonly x: number; readonly y: number; readonly z: number;
  readonly ageGyr: number;
  readonly amplitude: number;
}

function cellIndexOf(coordPc: number, cellSizePc: number): number { return Math.floor(coordPc / cellSizePc); }

/** Complex parent points in ONE coarse cell - own channel, own cell grid.
 *  Draw budget: one Poisson count, then (position x3, age x1, amplitude x1)
 *  per complex - fixed regardless of outcome. */
// A complex's own birth time is drawn over a FIXED observation window,
// independent of `ageDecayEndGyr` - the decay-window fields shape ONLY how
// fast a complex fades once born, never how far back in time complexes are
// drawn from. Coupling the two (e.g. sampling ages up to `ageDecayEndGyr`
// itself) would make "shorten the decay window" ALSO concentrate every
// drawn age nearer zero, silently inflating the mean boost instead of
// reducing it - the opposite of the intended effect. `tunable`.
const AGE_SAMPLING_WINDOW_GYR = 3.0;

function complexesInCell(worldSeed: string, params: GalaxyParameters, ix: number, iy: number, iz: number): ComplexParent[] {
  const { cellSizePc, meanGroupsPerComplex } = params.complexTier;
  const rng = channelRng(worldSeed, 'complexField', ix, iy, iz);

  // Expected complexes per cell: a small, `calibrated` mean tied to
  // meanGroupsPerComplex (a richer complex population is rarer, per the
  // patch's own naming - more groups implies a bigger, less common
  // structure) - one Poisson draw, deterministic given the cell.
  const lambda = Math.max(0.05, 2.0 / meanGroupsPerComplex);
  // Small-lambda Poisson via direct multiplication (Knuth's algorithm) -
  // adequate here since lambda is always small (<1) by construction; the
  // project's own `poissonInvCdf` is reserved for the larger-lambda cases
  // elsewhere and is not needed for this narrow range.
  let count = 0; { let p = 1, L = Math.exp(-lambda); do { count++; p *= rng(); } while (p > L); count -= 1; }

  const out: ComplexParent[] = [];
  for (let i = 0; i < count; i++) {
    const ux = rng(), uy = rng(), uz = rng();
    const uAge = rng(), uAmp = rng();
    out.push({
      x: ix * cellSizePc + ux * cellSizePc,
      y: iy * cellSizePc + uy * cellSizePc,
      z: iz * cellSizePc + uz * cellSizePc,
      ageGyr: uAge * AGE_SAMPLING_WINDOW_GYR,   // uniform over a fixed window - see AGE_SAMPLING_WINDOW_GYR above
      amplitude: 0.5 + uAmp,               // calibrated, order-unity so complexFraction sets the overall scale
    });
  }
  return out;
}

/** 1 at full strength, 0 once fully decayed - linear fade between the
 *  patch's own `ageDecayStartGyr`/`ageDecayEndGyr` (calibrated, NOT
 *  sourced - the patch's own ledger says so explicitly). */
function ageFactor(ageGyr: number, params: GalaxyParameters): number {
  const { ageDecayStartGyr, ageDecayEndGyr } = params.complexTier;
  if (ageGyr <= ageDecayStartGyr) return 1;
  if (ageGyr >= ageDecayEndGyr) return 0;
  return 1 - (ageGyr - ageDecayStartGyr) / (ageDecayEndGyr - ageDecayStartGyr);
}

/**
 * The youngThin density multiplier at (x,y,z) from nearby complexes - `1`
 * far from any live complex, rising with proximity to and richness of
 * whichever complexes are within `guardBandSigma * sigmaComplexPc`.
 * Deterministic, seeded, isolated on its own channel and cell grid.
 * `complexFraction` is INJECTED (see header) - the caller's own
 * `youngThin.clusteredFraction`, never re-declared here.
 */
export function complexIntensityAt(worldSeed: string, params: GalaxyParameters, complexFraction: number, x: number, y: number, z: number): number {
  const { cellSizePc, sigmaComplexPc, guardBandSigma } = params.complexTier;
  const reachPc = guardBandSigma * sigmaComplexPc;
  const ixLo = cellIndexOf(x - reachPc, cellSizePc), ixHi = cellIndexOf(x + reachPc, cellSizePc);
  const iyLo = cellIndexOf(y - reachPc, cellSizePc), iyHi = cellIndexOf(y + reachPc, cellSizePc);
  const izLo = cellIndexOf(z - reachPc, cellSizePc), izHi = cellIndexOf(z + reachPc, cellSizePc);

  let boost = 0;
  for (let ix = ixLo; ix <= ixHi; ix++) {
    for (let iy = iyLo; iy <= iyHi; iy++) {
      for (let iz = izLo; iz <= izHi; iz++) {
        for (const c of complexesInCell(worldSeed, params, ix, iy, iz)) {
          const d2 = (x - c.x) ** 2 + (y - c.y) ** 2 + (z - c.z) ** 2;
          if (d2 > reachPc * reachPc) continue;   // guard-band clip (patch S4)
          const spatial = Math.exp(-d2 / (2 * sigmaComplexPc * sigmaComplexPc));
          boost += c.amplitude * ageFactor(c.ageGyr, params) * spatial;
        }
      }
    }
  }
  return 1 + complexFraction * boost;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. DETERMINISM - same worldSeed/params/point gives a bit-identical result.
 *  2. FAR-FIELD LIMIT - `complexIntensityAt` returns exactly 1 far from every
 *     complex (no complexes reachable within the guard band).
 *  3. NEVER BELOW 1 - complexes only ADD density, never remove it.
 *  4. AGE DECAY - `ageFactor` is 1 at age 0, 0 at/after `ageDecayEndGyr`, and
 *     monotonically non-increasing across the decay window.
 *  5. EXPANSION STABILITY - a wider guard-band search never changes the
 *     contribution already found within a narrower one (no double-counting,
 *     no order dependence).
 */
export const STAR_FORMING_COMPLEXES_GATES = 5 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Star-forming-complex intensity boost', status: 'calibrated',
    short: 'A patchy extra boost to how many young stars are forming in one part of the disc, above the smooth average.',
    long: 'A meso-scale (Efremov-anchored, ~150 pc sigma) Poisson parent-point field with an age-decay window - a real, deterministic, seeded mechanism reusing every field the patch names, but an interpretive one: the patch describes the fields and a consumer function name without a full combining formula, since its own author had not seen this module at the time of writing.',
    source: 'Efremov 1978 (sigmaComplexPc anchor); patch v2.3 S4/S5 (field names, not formula)',
  },
];
