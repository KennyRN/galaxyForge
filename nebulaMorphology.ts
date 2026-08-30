/**
 * nebulaMorphology - the star-forming region's own internal structure: the
 * dense, sculpted, (often) ionised gas a star-forming complex's young stars
 * actually form inside. P17, 30 Aug 2026.
 *
 * -- WHAT THIS IS, AND WHAT IT IS NOT ----------------------------------------
 * This module produces a COUNT-CONSERVING DENSITY FIELD per complex, sampled
 * by `starFormingComplexes.placeYoungClustered` for member positions. It does
 * NOT change how many young systems exist (the two-level Poisson counts are
 * drawn on `complexField` exactly as before); it changes only WHERE, within a
 * complex, the complex-organised young stars land - in the filaments, in the
 * swept shells, at the pillar tips.
 *
 * It is NOT a render-geometry object. The kpc-zoom glowing-nebula render is a
 * later, separate task that reads this SAME field (Law 1 - one field, not a
 * second sampler that could diverge from placement).
 *
 * SEAM WITH `ism.ts` (keep it): `ism` is the diffuse reservoir/backdrop,
 * forming nothing on its own; this module is the EVENT. The nebula READS
 * ambient ISM density (`absoluteMidplaneDensityCm3`) as an input - how dense
 * the surroundings are sets how far the ionisation front / wind shell
 * expands - and does not live inside the ISM module. If the two ever feel
 * like one module, re-check the seam, do not merge.
 *
 * -- PRNG --------------------------------------------------------------------
 * `CHANNELS.nebula`, scoped `channelRng(worldSeed, 'nebula', complexId, ...)`
 * - used ONLY for the field's own construction (the complex's dynamical
 * PHASE age, and the fractal-ISM realisation seed). Member POSITION draws
 * ride the CALLER's existing `complexField` `fill:{ci}` stream (that is where
 * expansion-invariance is built); `sampleGroupPos` / `sampleOffspringPos`
 * each consume a FIXED, documented number of `rng()` calls per call
 * (`SAMPLE_DRAWS`) regardless of how the accept/reject lands - rejections are
 * drawn on the same stream, and draws after acceptance are still consumed -
 * so the parent/offspring stream stays deterministic and expansion-invariant.
 *
 * -- PROVENANCE LEDGER ------------------------------------------------------
 * sourced:
 *   ALPHA_B_CM3_S            Case B recombination coefficient at 1e4 K, 2.59e-13
 *                            cm^3 s^-1 - Osterbrock & Ferland 2006, AGN^3 2nd ed.
 *   PROTON_MASS_G            1.67262e-24 g - CODATA (a physical constant).
 *   Stromgren R_S = (3 Q / (4 pi n^2 alpha_B))^(1/3)   - Stromgren 1939, ApJ 89, 526.
 *   Weaver  R_w = (250/(308 pi))^(1/5) (L_w/rho_0)^(1/5) t^(3/5)
 *                            - Weaver et al. 1977, ApJ 218, 377 (energy-driven
 *                            wind bubble). Mac Low & McCray 1988, ApJ 324, 776
 *                            for the collective (superbubble) case - same
 *                            energy-driven form, boosted L_w.
 *   classical HII  R ~ t^(4/7)   - Spitzer 1978 (canonical).
 *   Kroupa 2001 IMF (alpha 0.3/1.3/2.3 across 0.08, 0.5 Msol) - MNRAS 322, 231.
 *   Martins, Schaerer & Hillier 2005, A&A 436, 1049, Table 1 - Q0(SpT, LC).
 *   triggered-SF fraction 14-30% - Deharveng et al. 2010, A&A 523, A6
 *                            (the coupling-amount anchor; see FILAMENT_SHARPEN_GAMMA).
 * calibrated + RE-AUDIT:
 *   DEFAULT_PHASE_BOUNDARIES_MYR   phase-age table, tuned (pending) to the
 *                            Churchwell et al. 2006/2007 bubble-size distribution.
 *   PHASE_AGE_*_MYR          the per-complex dynamical-age draw. NOTE: the P17
 *                            handoff's SS7 sets the phase from "co-natal ageGyr,
 *                            read in Myr". That quantity is (a) not available at
 *                            field-construction time without a disruptive
 *                            pipeline reorder, and (b) the wrong timescale -
 *                            co-natal coherence is ~100s of Myr, an HII
 *                            region / wind bubble is ~Myr. So the nebular
 *                            DYNAMICAL age is drawn here on `CHANNELS.nebula`
 *                            instead. Flagged to owner; a one-line change if
 *                            the co-natal age is wanted after all.
 * calibrated + RE-AUDIT (placeholder constant - NOT transcribed clean-room):
 *   K_Q_PER_MEMBER_S         IMF-weighted mean ionising output per member
 *                            (Kroupa 2001 x Martins 2005 integral above the
 *                            ionising-mass threshold) - value here is a
 *                            physically-plausible placeholder, ~1e46 s^-1.
 *   L_WIND_PER_MEMBER_ERG_S  IMF-weighted mean wind mechanical luminosity per
 *                            member - placeholder ~1e34 erg s^-1.
 * tunable + RE-AUDIT:
 *   DEFAULT_FRACTAL_DIMENSION_D   ISM fractal dimension, 2.3, band [2.3, 2.7]
 *                            - Elmegreen & Falgarone 1996, ApJ 471, 816;
 *                            CONTESTED (Sanchez et al. 2005/06, Stutzki et al.
 *                            1998, Federrath et al. 2007). HIDDEN: no UI
 *                            control, omitted from the user glossary - but it
 *                            shapes the field, so it is in this header and is
 *                            a `galaxyConfigHash` input (forks on change).
 * tunable:
 *   octave count/lacunarity, FILAMENT_SHARPEN_GAMMA, BASE_FRACTAL_WAVELENGTH_PC,
 *   shell-width fractions, SAMPLE_ATTEMPTS - this module's own field-shaping knobs.
 *
 * genVersion: any constant or formula change here moves complex-organised
 * young systems for every spiral/barredSpiral/milkyWayAnalogue galaxy - it is
 * genVersion-bumping and Amendment-P-forking.
 */

import { channelRng } from './rng';
import { truncGaussQuantile } from './mathStats';
import { cmToPc, yrToSeconds, myrToYr } from './units';
import type { GlossaryEntry } from './types';

/* --------------------------------- constants ------------------------------- */

/** cm^3 s^-1, Case B, 1e4 K. `sourced` - Osterbrock & Ferland 2006. */
export const ALPHA_B_CM3_S = 2.59e-13;
/** g. `sourced` - CODATA proton mass (rho_0 = n * m_H, mean molecular weight
 *  ~1 assumed - a `calibrated` simplification stated plainly). */
const PROTON_MASS_G = 1.67262e-24;
/** (250/(308 pi))^(1/5). `sourced (form)` - Weaver et al. 1977 shell coefficient. */
const WEAVER_PREFACTOR = Math.pow(250 / (308 * Math.PI), 1 / 5);
/** Spitzer 1978 classical-HII expansion exponent. `sourced (form)`. */
const SPITZER_EXPANSION_EXP = 4 / 7;
/** Myr, the e-folding time of the classical-HII expansion factor - the
 *  ionisation front reaches ~2 R_S by ~1 Myr. `calibrated`. */
const CLASSICAL_EXPANSION_SCALE_MYR = 0.6;
/** Mac Low & McCray superbubble: collective winds + first SNe raise the
 *  effective mechanical luminosity. `calibrated` (order-of-magnitude). */
const SUPERBUBBLE_LW_BOOST = 8;

/** s^-1 per member. `calibrated + RE-AUDIT` - PLACEHOLDER for the Kroupa x
 *  Martins IMF integral (see header). */
export const K_Q_PER_MEMBER_S = 1e46;
/** erg s^-1 per member. `calibrated + RE-AUDIT` - PLACEHOLDER (see header). */
export const L_WIND_PER_MEMBER_ERG_S = 1e34;

/** Dimensionless. `tunable + RE-AUDIT` - hidden (see header). */
export const DEFAULT_FRACTAL_DIMENSION_D = 2.3;
export const FRACTAL_DIMENSION_BAND: readonly [number, number] = [2.3, 2.7];

/** Myr. `calibrated + RE-AUDIT` - phase boundaries: [1|2, 2|3, 3|4, 4|5]. */
export const DEFAULT_PHASE_BOUNDARIES_MYR: readonly number[] = [0.5, 3, 8, 20];
/** Myr. `calibrated + RE-AUDIT` - the per-complex dynamical-age draw is
 *  exponential (mean `PHASE_AGE_MEAN_MYR`) truncated to [0, PHASE_AGE_MAX_MYR];
 *  most complexes are young and structured, a tail is old and diffuse. */
export const PHASE_AGE_MEAN_MYR = 9;
export const PHASE_AGE_MAX_MYR = 40;

/** pc, the largest fractal octave's wavelength; smaller octaves reach
 *  sub-pc (pillar-tip / filament texture). `tunable`. */
const BASE_FRACTAL_WAVELENGTH_PC = 48;
const DEFAULT_OCTAVES = 5;
const DEFAULT_LACUNARITY = 2;
/** Accept ~ T^gamma sharpens diffuse fractal noise into filaments/pillars.
 *  `tunable`, anchored so the accepted-fraction contrast lands in the
 *  Deharveng 2010 14-30% triggered-SF ballpark (see the `-d` gate). */
const FILAMENT_SHARPEN_GAMMA = 2.4;

/** Fixed accept/reject attempts per sample. */
const SAMPLE_ATTEMPTS = 8;
/** rng() calls consumed per attempt: 3 for the envelope proposal + 1 accept. */
const DRAWS_PER_ATTEMPT = 4;
/** The fixed per-sample draw budget - `sampleGroupPos` and
 *  `sampleOffspringPos` each consume EXACTLY this many `rng()` calls. */
export const SAMPLE_DRAWS = SAMPLE_ATTEMPTS * DRAWS_PER_ATTEMPT;

/* --------------------------------- types ----------------------------------- */

export type NebulaPhase = 1 | 2 | 3 | 4 | 5;

export interface NebulaParams {
  /** ISM fractal dimension. Hidden (no UI, no glossary), but a config-hash
   *  input - it shapes the field, so it forks. Clamped to
   *  `FRACTAL_DIMENSION_BAND`. */
  readonly fractalDimensionD: number;
  readonly octaves: number;
  readonly lacunarity: number;
  readonly baseFractalWavelengthPc: number;
  readonly filamentSharpenGamma: number;
  /** [1|2, 2|3, 3|4, 4|5] phase boundaries, Myr, strictly increasing. */
  readonly phaseBoundariesMyr: readonly number[];
  readonly phaseAgeMeanMyr: number;
  readonly phaseAgeMaxMyr: number;
  /** pc, the sub-pc scatter of an offspring around its group centre - the
   *  "pillar-tip / filament texture" scale. Kept equal to the placement
   *  layer's own `jitterSigmaPc` by default so the offspring cloud is the
   *  same size as before P17; only its SHAPE (fractal-weighted, not
   *  isotropic) changes. `calibrated`. */
  readonly offspringJitterSigmaPc: number;
}

export const DEFAULT_NEBULA_PARAMS: NebulaParams = {
  fractalDimensionD: DEFAULT_FRACTAL_DIMENSION_D,
  octaves: DEFAULT_OCTAVES,
  lacunarity: DEFAULT_LACUNARITY,
  baseFractalWavelengthPc: BASE_FRACTAL_WAVELENGTH_PC,
  filamentSharpenGamma: FILAMENT_SHARPEN_GAMMA,
  phaseBoundariesMyr: DEFAULT_PHASE_BOUNDARIES_MYR,
  phaseAgeMeanMyr: PHASE_AGE_MEAN_MYR,
  phaseAgeMaxMyr: PHASE_AGE_MAX_MYR,
  offspringJitterSigmaPc: 1.5,
};

export interface Vec3 { readonly x: number; readonly y: number; readonly z: number; }

export interface NebulaField {
  readonly phase: NebulaPhase;
  /** pc, derived - Stromgren radius from (Q_complex, n_ambient, alpha_B). */
  readonly rStromgrenPc: number;
  /** pc, phases 3-4 only - Weaver / Mac Low-McCray swept-shell radius. */
  readonly rShellPc?: number;
  /** Local fractal density in [0, 1] at an ABSOLUTE galactocentric point -
   *  exposed for gates and for the future render layer. */
  fractalDensityAt(p: Vec3): number;
  /** One group-centre position, absolute galactocentric pc. Consumes exactly
   *  `SAMPLE_DRAWS` `rng()` calls. */
  sampleGroupPos(rng: () => number): Vec3;
  /** One offspring position near `groupPos`, absolute galactocentric pc.
   *  Consumes exactly `SAMPLE_DRAWS` `rng()` calls. */
  sampleOffspringPos(rng: () => number, groupPos: Vec3): Vec3;
}

/* ------------------------------ derived scales ---------------------------- */

/** pc. Stromgren radius R_S = (3 Q / (4 pi n^2 alpha_B))^(1/3). */
export function stromgrenRadiusPc(qPerSec: number, nCm3: number): number {
  const n = Math.max(nCm3, 1e-6);
  const q = Math.max(qPerSec, 0);
  const rCm = Math.cbrt((3 * q) / (4 * Math.PI * n * n * ALPHA_B_CM3_S));
  return cmToPc(rCm);
}

/** pc. Weaver energy-driven wind-bubble radius at age `tMyr`. */
export function weaverShellRadiusPc(lwErgPerSec: number, nCm3: number, tMyr: number): number {
  const rho0 = Math.max(nCm3, 1e-6) * PROTON_MASS_G;         // g cm^-3
  const tSec = Math.max(yrToSeconds(myrToYr(tMyr)), 1);
  const rCm = WEAVER_PREFACTOR * Math.pow(Math.max(lwErgPerSec, 0) / rho0, 1 / 5) * Math.pow(tSec, 3 / 5);
  return cmToPc(rCm);
}

/** Classical-HII expansion factor R(t)/R_S ~ (1 + t/t_scale)^(4/7). */
function classicalExpansionFactor(tMyr: number): number {
  return Math.pow(1 + Math.max(tMyr, 0) / CLASSICAL_EXPANSION_SCALE_MYR, SPITZER_EXPANSION_EXP);
}

/** 1..5 from `ageMyr` and the (strictly increasing) boundary table. */
export function nebulaPhaseFor(ageMyr: number, boundariesMyr: readonly number[]): NebulaPhase {
  let phase = 1;
  for (const b of boundariesMyr) { if (ageMyr >= b) phase += 1; }
  return Math.min(5, Math.max(1, phase)) as NebulaPhase;
}

/** Per-complex nebular DYNAMICAL age, Myr. Own draw on `CHANNELS.nebula`
 *  (see header on why this is not the co-natal age). Exponential with mean
 *  `phaseAgeMeanMyr`, truncated to [0, phaseAgeMaxMyr]. */
export function nebulaPhaseAgeMyr(worldSeed: string, complexId: string, p: NebulaParams): number {
  const u = channelRng(worldSeed, 'nebula', complexId, 'age')();
  const raw = -p.phaseAgeMeanMyr * Math.log(1 - u * (1 - Math.exp(-p.phaseAgeMaxMyr / p.phaseAgeMeanMyr)));
  return Math.min(p.phaseAgeMaxMyr, Math.max(0, raw));
}

/* ------------------------------ fractal noise ---------------------------- */

/** 32-bit integer lattice hash -> [0, 1). Not a stream - a pure function of
 *  (lattice cell, field seed), which is what a spatially-coherent noise
 *  needs (a `mulberry32` stream cannot be queried at an arbitrary point). */
function latticeHash(ix: number, iy: number, iz: number, seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (ix | 0), 0x27d4eb2d); h ^= h >>> 15;
  h = Math.imul(h ^ (iy | 0), 0x165667b1); h ^= h >>> 13;
  h = Math.imul(h ^ (iz | 0), 0x9e3779b1); h ^= h >>> 16;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function smoothstep01(t: number): number { return t * t * (3 - 2 * t); }

/** Trilinearly-interpolated 3D value noise in [0, 1]. */
function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = smoothstep01(x - x0), fy = smoothstep01(y - y0), fz = smoothstep01(z - z0);
  const c = (dx: number, dy: number, dz: number) => latticeHash(x0 + dx, y0 + dy, z0 + dz, seed);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), fx), x10 = lerp(c(0, 1, 0), c(1, 1, 0), fx);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), fx), x11 = lerp(c(0, 1, 1), c(1, 1, 1), fx);
  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

/** fBm sum in [0, 1]. Octave amplitude gain = lacunarity^(-H), H = 3 - D
 *  clamped to (0.05, 0.95): a higher fractal dimension D -> lower H ->
 *  flatter spectrum -> more small-scale power -> rougher, more filamentary
 *  field. `calibrated (form)` - the D -> H mapping is the standard
 *  fractal-surface relation, not a knob. */
function fbm01(x: number, y: number, z: number, seed: number, p: NebulaParams): number {
  const H = Math.min(0.95, Math.max(0.05, 3 - p.fractalDimensionD));
  const gain = Math.pow(p.lacunarity, -H);
  let sum = 0, norm = 0, amp = 1, freq = 1;
  const octaves = Math.max(1, Math.floor(p.octaves));
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq, (seed + o * 1013904223) | 0);
    norm += amp;
    amp *= gain;
    freq *= p.lacunarity;
  }
  return sum / norm;
}

/* ------------------------------ the field --------------------------------- */

function seedOf(worldSeed: string, complexId: string): number {
  // A pure integer seed for the lattice noise - one draw off the nebula
  // channel is a convenient hash of exactly the key we want.
  return (channelRng(worldSeed, 'nebula', complexId, 'fractal')() * 4294967296) | 0;
}

/** Unit direction from two uniforms (u_phi, u_costheta). */
function unitDir(uPhi: number, uCos: number): Vec3 {
  const phi = 2 * Math.PI * uPhi;
  const cosT = 2 * uCos - 1;
  const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
  return { x: sinT * Math.cos(phi), y: sinT * Math.sin(phi), z: cosT };
}

export function nebulaFieldFor(
  worldSeed: string, complexId: string, centre: Vec3,
  nMembers: number, ageMyr: number, nAmbientCm3: number, p: NebulaParams,
): NebulaField {
  const params: NebulaParams = {
    ...p,
    fractalDimensionD: Math.min(FRACTAL_DIMENSION_BAND[1], Math.max(FRACTAL_DIMENSION_BAND[0], p.fractalDimensionD)),
  };
  const phase = nebulaPhaseFor(ageMyr, params.phaseBoundariesMyr);
  const qComplex = Math.max(0, nMembers) * K_Q_PER_MEMBER_S;
  const rStromgrenPc = stromgrenRadiusPc(qComplex, nAmbientCm3);
  const lWind = Math.max(0, nMembers) * L_WIND_PER_MEMBER_ERG_S
    * (phase === 4 ? SUPERBUBBLE_LW_BOOST : 1);
  const rShellPc = (phase === 3 || phase === 4)
    ? weaverShellRadiusPc(lWind, nAmbientCm3, ageMyr)
    : undefined;
  const seed = seedOf(worldSeed, complexId);
  const lambdaPc = Math.max(1e-3, params.baseFractalWavelengthPc);

  const fractalDensityAt = (pt: Vec3): number =>
    fbm01((pt.x - centre.x) / lambdaPc, (pt.y - centre.y) / lambdaPc, (pt.z - centre.z) / lambdaPc, seed, params);

  /** Envelope proposal (G_phase): an offset from `centre`, plus an extra
   *  shaping weight `envW` in (0, 1] for blister breaks / bright rims. */
  const propose = (u1: number, u2: number, u3: number): { off: Vec3; envW: number } => {
    const dir = unitDir(u2, u3);
    let r: number;
    let envW = 1;
    if (phase === 1) {
      // compact HII: a small dense core, ~R_S/4 scale
      r = 0.25 * rStromgrenPc * Math.sqrt(-2 * Math.log(1 - 0.999 * u1));
    } else if (phase === 2) {
      // classical HII: near the expanding ionisation front
      const rFront = rStromgrenPc * classicalExpansionFactor(ageMyr);
      r = truncGaussQuantile(u1, rFront, 0.18 * rFront + 1e-6, 0, 3 * rFront + 1e-3);
    } else if (phase === 3) {
      // wind-blown shell: a thin dense shell at R_shell
      const rs = rShellPc ?? rStromgrenPc;
      r = truncGaussQuantile(u1, rs, 0.10 * rs + 1e-6, 0, 3 * rs + 1e-3);
    } else if (phase === 4) {
      // superbubble: thicker, broken (blister) shell
      const rs = rShellPc ?? rStromgrenPc;
      r = truncGaussQuantile(u1, rs, 0.20 * rs + 1e-6, 0, 4 * rs + 1e-3);
      if (dir.z > 0.55) envW = 0.25;   // the blister: one cap is blown open, few stars form there
    } else {
      // dispersing diffuse: broad low-contrast residual (Rayleigh, scale = complex sigma-ish)
      r = 90 * Math.sqrt(-2 * Math.log(1 - 0.999 * u1));
    }
    return { off: { x: dir.x * r, y: dir.y * r, z: dir.z * r }, envW };
  };

  // SPREAD = sqrt(3): a uniform on [-SPREAD, SPREAD] has unit variance, so
  // the offspring cloud keeps the same size as the old truncated-Gaussian
  // jitter; only its SHAPE (fractal-weighted below) changes.
  const SPREAD = 1.7320508075688772;

  /** Fixed-budget accept/reject. `candidateAt(u1,u2,u3)` proposes from the
   *  envelope; every candidate is fractal-weighted by `T^gamma * envW`.
   *  ALWAYS runs `SAMPLE_ATTEMPTS` iterations of `DRAWS_PER_ATTEMPT` draws. */
  const drawFixed = (
    rng: () => number,
    candidateAt: (u1: number, u2: number, u3: number) => { cand: Vec3; envW: number },
  ): Vec3 => {
    let accepted: Vec3 | null = null;
    let last: Vec3 = centre;
    for (let a = 0; a < SAMPLE_ATTEMPTS; a++) {
      const u1 = rng(), u2 = rng(), u3 = rng(), u4 = rng();
      const { cand, envW } = candidateAt(u1, u2, u3);
      last = cand;
      if (accepted === null) {
        const t = fractalDensityAt(cand);
        if (u4 <= envW * Math.pow(t, params.filamentSharpenGamma)) accepted = cand;
      }
    }
    return accepted ?? last;
  };

  const groupCandidate = (u1: number, u2: number, u3: number): { cand: Vec3; envW: number } => {
    const pr = propose(u1, u2, u3);
    return { cand: { x: centre.x + pr.off.x, y: centre.y + pr.off.y, z: centre.z + pr.off.z }, envW: pr.envW };
  };

  const offspringCandidate = (base: Vec3) => (u1: number, u2: number, u3: number): { cand: Vec3; envW: number } => ({
    cand: {
      x: base.x + params.offspringJitterSigmaPc * (u1 * 2 - 1) * SPREAD,
      y: base.y + params.offspringJitterSigmaPc * (u2 * 2 - 1) * SPREAD,
      z: base.z + params.offspringJitterSigmaPc * (u3 * 2 - 1) * SPREAD,
    },
    envW: 1,
  });

  return {
    phase,
    rStromgrenPc,
    rShellPc,
    fractalDensityAt,
    sampleGroupPos: (rng) => drawFixed(rng, groupCandidate),
    sampleOffspringPos: (rng, groupPos) => drawFixed(rng, offspringCandidate(groupPos)),
  };
}

/* --------------------------------- gates ---------------------------------- */

/**
 * Invariants this module owes (see nebulaMorphology.conformance.ts):
 *  1. DETERMINISM - same (worldSeed, complexId, params) -> bit-identical
 *     field and bit-identical sample sequence from a fixed rng.
 *  2. FIXED DRAW BUDGET - sampleGroupPos/sampleOffspringPos consume EXACTLY
 *     SAMPLE_DRAWS rng() calls, every call, whatever the accept/reject does.
 *  3. PHASE GEOMETRY IS REAL - a shell-phase field places measurably more
 *     members in an annulus at R_shell than a same-N compact-phase field.
 *  4. FULL-DEPTH - offspring positions correlate with local fractalDensityAt,
 *     and top-of-band vs bottom-of-band D changes the offspring clustering.
 *  5. D HIDDEN BUT HASHED - not in any UI/glossary surface; changing it
 *     changes the field (a config-hash input).
 *  6. STROMGREN SANITY - stromgrenRadiusPc live-computed matches the closed
 *     form for a fixed (Q, n) triple (guards a cm/pc or n^2 slip).
 *  7. COUNT-CONSERVING BY CONSTRUCTION - this module draws no counts at all;
 *     it only maps uniforms to positions.
 */
export const NEBULA_MORPHOLOGY_GATES = 7 as const;

/* -------------------------------- glossary ------------------------------- */

export const glossary: GlossaryEntry[] = [
  {
    term: 'Nebular phase', status: 'calibrated',
    short: 'Which stage of its short life a star-forming region is in - from a compact ionised core, through an expanding HII region and a wind-blown shell, to a large superbubble and finally a dispersing wisp.',
    long: 'Five age-phases (compact HII / classical HII / wind-blown shell / superbubble / dispersing diffuse) set by the complex\'s dynamical age against a calibrated boundary table (RE-AUDIT: to be tuned against the Churchwell et al. 2006/2007 bubble-size distribution). The phase selects the base geometry the young members are scattered through; a fractal ISM field (Elmegreen & Falgarone 1996) then sculpts filaments and pillars within it. Count-conserving - it moves young stars, never adds them.',
    source: 'Stromgren 1939, ApJ 89, 526; Weaver et al. 1977, ApJ 218, 377; Mac Low & McCray 1988, ApJ 324, 776; Spitzer 1978; Churchwell et al. 2006/2007 (phase-age calibration, pending).',
  },
  {
    term: 'Stromgren radius', status: 'sourced',
    short: 'The radius out to which the ultraviolet light of a region\'s hot young stars keeps the surrounding hydrogen ionised.',
    long: 'R_S = (3 Q / (4 pi n^2 alpha_B))^(1/3), with Q the region\'s total ionising-photon rate (estimated from its member count via an IMF-integrated per-star budget), n the ambient ISM number density (from ism.absoluteMidplaneDensityCm3), and alpha_B the Case B recombination coefficient. Sets the scale of the compact and classical HII phases.',
    source: 'Stromgren 1939, ApJ 89, 526; Osterbrock & Ferland 2006, AGN^3 2nd ed. (alpha_B); Martins, Schaerer & Hillier 2005, A&A 436, 1049 (Q0).',
  },
];
