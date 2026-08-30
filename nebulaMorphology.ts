/**
 * nebulaMorphology - the star-forming region's own internal structure: the
 * dense, sculpted, (often) ionised gas a star-forming complex's young stars
 * form inside. P17, 30 Aug 2026; constants firmed up 30 Aug 2026 (science
 * re-audit).
 *
 * -- ARCHITECTURAL RULING: STRUCTURE IS NOT PHASE --------------------------
 * Two clocks, two jobs, no pipeline reorder:
 *
 *   STRUCTURE  - WHERE stars sit inside a complex. Needs the fractal ISM
 *                field (dimension D), NOT an age. `nebulaFieldFor` builds an
 *                isotropic Efremov-scale envelope, fractal-sculpted; both the
 *                group-around-complex and offspring-around-group scatters are
 *                drawn from it. Applied at placement time
 *                (`starFormingComplexes.placeYoungClustered`).
 *
 *   PHASE      - what the ionised nebula LOOKS like (compact HII -> classical
 *                HII -> wind shell -> superbubble -> dispersing). A pure
 *                downstream read of the co-natal group age
 *                (`nebulaPhaseFor` / `nebulaIsLit`), computed AFTER placement
 *                where the co-natal age is known. NOT a second RNG draw - the
 *                co-natal age already IS the physical clock. The earlier
 *                truncated-exponential `nebulaPhaseAgeMyr` draw is RETRACTED.
 *
 *   EXISTENCE  - a complex hosts a visible ionised nebula only while its
 *                least-massive ionising star survives: `nebulaIsLit` gates on
 *                co-natal age < `ceilingMyr` (~40 Myr ~ 8 Msol MS lifetime).
 *                For `spiralYoungThin` (co-natal age uniform on [0, 1] Gyr)
 *                this lights ~4% of complexes; phases then populate in
 *                proportion to their DURATION, the correct snapshot statistic
 *                for a complete (every-system) census.
 *
 * The phase/existence functions and the Stromgren/Weaver scale functions are
 * exported and GATED here, ready for the render workstream (the ~kpc-zoom
 * glowing-nebula patch, P17 SS16 - explicitly out of scope this pass). They
 * are NOT yet attached to placed systems; only STRUCTURE is wired into
 * generation so far. `params.placementShapeVersion` bumps because the member
 * scatter changed shape (fractal, not isotropic Gaussian).
 *
 * SEAM WITH `ism.ts` (keep it): `ism` is the diffuse reservoir/backdrop,
 * forming nothing; this module is the EVENT. The nebula READS ambient ISM
 * density (`ism.absoluteMidplaneDensityCm3`, via `nebulaNatalDensityCm3`) -
 * how dense the surroundings are sets how far the ionisation front / wind
 * shell reaches - and does not live inside the ISM module.
 *
 * -- PRNG --------------------------------------------------------------------
 * `CHANNELS.nebula`, scoped `channelRng(worldSeed, 'nebula', complexId, ...)`
 * - used ONLY for the fractal-ISM realisation seed. Member POSITION draws
 * ride the CALLER's existing `complexField` `fill:{ci}` stream (where
 * expansion invariance is built); `sampleGroupPos` / `sampleOffspringPos`
 * each consume a FIXED `SAMPLE_DRAWS` `rng()` calls per call regardless of
 * how accept/reject lands.
 *
 * -- PROVENANCE LEDGER ----------------------------------------------------
 * sourced:
 *   ALPHA_B_CM3_S            2.59e-13 cm^3 s^-1, Case B, 1e4 K - Osterbrock &
 *                            Ferland 2006, AGN^3 2nd ed.
 *   PROTON_MASS_G            1.67262e-24 g - CODATA.
 *   N_MIDPLANE_R0_CM3        1.0 cm^-3 total-H midplane density at R0 - McKee,
 *                            Parravano & Hollenbach 2015, ApJ 814, 13
 *                            (Sigma_gas 13.7, Sigma_HI 7.8, Sigma_H2 0.7
 *                            Msol/pc^2). FLAG: the exact midplane decimal must
 *                            be read off Table 2 of the PDF before it enters
 *                            a header claim - 1.0 stands, decimal pending.
 *   Stromgren R_S = (3 Q / (4 pi n^2 alpha_B))^(1/3)  - Stromgren 1939, ApJ 89, 526.
 *   Weaver  R_w = (250/(308 pi))^(1/5) (L_w/rho_0)^(1/5) t^(3/5)
 *                            - Weaver et al. 1977, ApJ 218, 377; Mac Low &
 *                            McCray 1988, ApJ 324, 776 (collective case).
 * derived (computed by us from sourced inputs - see per-constant notes):
 *   K_Q_PER_MEMBER_S         4.2e46 s^-1 per member (log10 46.62). Kroupa 2001
 *                            IMF (MNRAS 322, 231) x Martins, Schaerer &
 *                            Hillier 2005 Q0 (A&A 436, 1049, Table 1, class V)
 *                            integrated above m_ion = 15 Msol, x 1.5 mean
 *                            stars/system (Duchene & Kraus 2013). Per-STAR
 *                            value 2.8e46 if `multiplicity` ever expands
 *                            members into stars itself (avoid double-count).
 *   L_WIND_PER_MEMBER_ERG_S  1.03e34 erg s^-1 per member (log10 34.01). Vink,
 *                            de Koter & Lamers 2001 (A&A 369, 574) hot-side
 *                            mass-loss recipe, v_inf = 2.6 v_esc, L_w = 0.5
 *                            Mdot v_inf^2 IMF-weighted. Per-star 6.85e33.
 * calibrated:
 *   SUPERBUBBLE_LW_BOOST     2 (band 2-4). Time-averaged (wind+SN)/wind
 *                            mechanical power over the ~36 Myr SN window
 *                            (10^51 erg/event, SN fraction 0.0063/star over
 *                            the Kroupa IMF); Mac Low & McCray's constant-L
 *                            assumption. R_w ~ L^(1/5), so 2 vs the old 8
 *                            changes the superbubble radius by only 1.3x -
 *                            duration (t^3/5) and the density drop to the
 *                            dispersed medium do the real work.
 *   NEBULA_NATAL_DENSITY_CONTRAST  1000. The region-expansion laws run
 *                            against the NATAL molecular clump density
 *                            (10^2-10^4 cm^-3, Lada & Lada 2003), NOT the
 *                            diffuse midplane (~1). Implemented as a contrast
 *                            over the local absolute ISM density so it tracks
 *                            the galactic gradient; = 1e3 cm^-3 at R0. No
 *                            single sourced value (natal densities span 2 dex).
 *   DEFAULT_PHASE_BOUNDARIES_MYR  [0.5, 3, 8, 20]. Anchored to expansion
 *                            timescales and to Churchwell et al. 2006/2007
 *                            active-bubble radii (bulk 1-4 pc): Spitzer
 *                            classical-HII expansion (Q 1e49, n 1e3) reaches
 *                            2-3 pc in 0.2-0.5 Myr, so the median active
 *                            bubble sits early in the classical phase. 3 Myr
 *                            = first-SN time; 8/20 Myr bracket superbubble
 *                            growth/blowout; 40 = the ~8 Msol MS lifetime.
 * tunable + RE-AUDIT (mandatory re-audit on every science pass):
 *   DEFAULT_FRACTAL_DIMENSION_D  2.6, band [2.3, 2.7]. Stutzki et al. 1998 /
 *                            Sanchez et al. 2006 direct Delta-variance
 *                            (3D iso-density-surface dimension), preferred
 *                            over Elmegreen & Falgarone 1996's indirect 2.3.
 *                            CONTESTED literature - hidden knob (no UI, not in
 *                            the user glossary), but a config-hash input
 *                            (forks on change). fBm gain = lacunarity^(-H),
 *                            H = 3 - D (the level set of a 3D fBm field has
 *                            Hausdorff dimension 3 - H; the competing 4 - D
 *                            is the GRAPH dimension, a different object and it
 *                            gives an invalid H > 1 for D = 2.3).
 *   FILAMENT_SHARPEN_GAMMA   2 (band 1.5-2.5). Ridge-member weight rho^gamma
 *                            over the rho^1 the Thomas process already
 *                            carries; tuned toward the Deharveng et al. 2010
 *                            (A&A 523, A6) 14-30% triggered-SF fraction, but
 *                            that Galactic number is NOT the same quantity as
 *                            this model's ridge-member fraction - re-audit
 *                            against the synthesised field's own density PDF.
 * tunable:
 *   octave count / lacunarity / BASE_FRACTAL_WAVELENGTH_PC, SAMPLE_ATTEMPTS.
 *
 * genVersion: any constant or formula change here moves complex-organised
 * young systems for every spiral/barredSpiral/milkyWayAnalogue galaxy - it is
 * genVersion-bumping and Amendment-P-forking.
 */

import { channelRng } from './rng';
import { truncGaussQuantile } from './mathStats';
import { cmToPc, yrToSeconds, myrToYr } from './units';
import { absoluteMidplaneDensityCm3 } from './ism';
import type { GlossaryEntry } from './types';

/* --------------------------------- constants ------------------------------- */

/** cm^3 s^-1, Case B, 1e4 K. `sourced` - Osterbrock & Ferland 2006. */
export const ALPHA_B_CM3_S = 2.59e-13;
/** g. `sourced` - CODATA proton mass (rho_0 = mu n m_H, mu ~ 1 assumed). */
const PROTON_MASS_G = 1.67262e-24;
/** (250/(308 pi))^(1/5). `sourced (form)` - Weaver et al. 1977 shell coefficient. */
const WEAVER_PREFACTOR = Math.pow(250 / (308 * Math.PI), 1 / 5);
/** Mac Low & McCray: collective winds + first SNe. `calibrated`, band 2-4. */
export const SUPERBUBBLE_LW_BOOST = 2;

/** s^-1 per member system. `derived` - Kroupa 2001 x Martins 2005, x 1.5
 *  stars/system. Per-STAR value 2.8e46 (see header). */
export const K_Q_PER_MEMBER_S = 4.2e46;
/** erg s^-1 per member system. `derived` - Vink et al. 2001. Per-star 6.85e33. */
export const L_WIND_PER_MEMBER_ERG_S = 1.03e34;

/** Multiplier on the local absolute ISM density giving the natal molecular
 *  clump density the region-expansion laws run against. `calibrated` -
 *  = 1e3 cm^-3 at R0 (McKee et al. 2015 midplane ~ 1 cm^-3). */
export const NEBULA_NATAL_DENSITY_CONTRAST = 1000;

/** Dimensionless. `tunable + RE-AUDIT` - hidden (see header). */
export const DEFAULT_FRACTAL_DIMENSION_D = 2.6;
export const FRACTAL_DIMENSION_BAND: readonly [number, number] = [2.3, 2.7];

/** Myr. `calibrated` - [1|2, 2|3, 3|4, 4|5] phase boundaries. */
export const DEFAULT_PHASE_BOUNDARIES_MYR: readonly number[] = [0.5, 3, 8, 20];
/** Myr. `calibrated` - existence ceiling: a complex is "lit" only while its
 *  least-massive ionising star (~8 Msol) survives. Could tighten to ~12 Myr
 *  (~15 Msol) for BRIGHT rather than ANY ionised nebula - owner ruling. */
export const DEFAULT_NEBULA_CEILING_MYR = 40;

/** pc, the largest fractal octave's wavelength; smaller octaves reach
 *  sub-pc (pillar-tip / filament texture). `tunable`. */
const BASE_FRACTAL_WAVELENGTH_PC = 48;
const DEFAULT_OCTAVES = 5;
const DEFAULT_LACUNARITY = 2;
/** Accept ~ T^gamma sharpens diffuse fractal noise into filaments/pillars.
 *  `tunable + RE-AUDIT` (Deharveng 2010 mapping - see header), band 1.5-2.5. */
const FILAMENT_SHARPEN_GAMMA = 2;

/** Fixed accept/reject attempts per sample. */
const SAMPLE_ATTEMPTS = 8;
/** rng() calls consumed per attempt: 3 for the envelope proposal + 1 accept. */
const DRAWS_PER_ATTEMPT = 4;
/** The fixed per-sample draw budget - `sampleGroupPos` and
 *  `sampleOffspringPos` each consume EXACTLY this many `rng()` calls. */
export const SAMPLE_DRAWS = SAMPLE_ATTEMPTS * DRAWS_PER_ATTEMPT;

/** Guard-band width (in envelope sigmas) the group proposal is truncated to -
 *  mirrors the caller's own `guardBandSigma`; the caller re-clamps too. */
const ENVELOPE_TRUNCATION_SIGMA = 4;

/* --------------------------------- types ----------------------------------- */

export type NebulaPhase = 1 | 2 | 3 | 4 | 5;

export interface NebulaParams {
  /** ISM fractal dimension (3D iso-surface). Hidden (no UI, no glossary), a
   *  config-hash input. Clamped to `FRACTAL_DIMENSION_BAND`. */
  readonly fractalDimensionD: number;
  readonly octaves: number;
  readonly lacunarity: number;
  readonly baseFractalWavelengthPc: number;
  readonly filamentSharpenGamma: number;
  /** [1|2, 2|3, 3|4, 4|5] phase boundaries, Myr, strictly increasing. */
  readonly phaseBoundariesMyr: readonly number[];
  /** Myr - `nebulaIsLit` ceiling. */
  readonly ceilingMyr: number;
  /** pc, the sub-pc scatter of an offspring around its group centre - kept
   *  equal to the placement layer's `jitterSigmaPc` by default so the cloud
   *  is the same SIZE as pre-P17; only its SHAPE (fractal-weighted) changes. */
  readonly offspringJitterSigmaPc: number;
}

export const DEFAULT_NEBULA_PARAMS: NebulaParams = {
  fractalDimensionD: DEFAULT_FRACTAL_DIMENSION_D,
  octaves: DEFAULT_OCTAVES,
  lacunarity: DEFAULT_LACUNARITY,
  baseFractalWavelengthPc: BASE_FRACTAL_WAVELENGTH_PC,
  filamentSharpenGamma: FILAMENT_SHARPEN_GAMMA,
  phaseBoundariesMyr: DEFAULT_PHASE_BOUNDARIES_MYR,
  ceilingMyr: DEFAULT_NEBULA_CEILING_MYR,
  offspringJitterSigmaPc: 1.5,
};

export interface Vec3 { readonly x: number; readonly y: number; readonly z: number; }

export interface NebulaField {
  /** Local fractal density in [0, 1] at an ABSOLUTE galactocentric point. */
  fractalDensityAt(p: Vec3): number;
  /** One group-centre position, absolute galactocentric pc. Consumes exactly
   *  `SAMPLE_DRAWS` `rng()` calls. */
  sampleGroupPos(rng: () => number): Vec3;
  /** One offspring position near `groupPos`, absolute galactocentric pc.
   *  Consumes exactly `SAMPLE_DRAWS` `rng()` calls. */
  sampleOffspringPos(rng: () => number, groupPos: Vec3): Vec3;
}

/* --------------------- phase & existence (downstream read) --------------- */

/** 1..5 from `ageMyr` and the (strictly increasing) boundary table. */
export function nebulaPhaseFor(ageMyr: number, boundariesMyr: readonly number[]): NebulaPhase {
  let phase = 1;
  for (const b of boundariesMyr) { if (ageMyr >= b) phase += 1; }
  return Math.min(5, Math.max(1, phase)) as NebulaPhase;
}

/** Does this complex host a visible ionised nebula? True while its
 *  least-massive ionising star survives (co-natal age < ceiling). */
export function nebulaIsLit(coNatalAgeMyr: number, ceilingMyr: number): boolean {
  return coNatalAgeMyr >= 0 && coNatalAgeMyr < ceilingMyr;
}

/* ------------------------------ derived scales ---------------------------- */

/** cm^-3, the natal molecular clump density at galactocentric radius R -
 *  a contrast over the local absolute ISM density (imports `ism`, the sole
 *  generation-path consumer of `absoluteMidplaneDensityCm3`). */
export function nebulaNatalDensityCm3(rGalactocentricPc: number): number {
  return NEBULA_NATAL_DENSITY_CONTRAST * absoluteMidplaneDensityCm3(Math.max(0, rGalactocentricPc), 0);
}

/** pc. Stromgren radius R_S = (3 Q / (4 pi n^2 alpha_B))^(1/3). */
export function stromgrenRadiusPc(qPerSec: number, nCm3: number): number {
  const n = Math.max(nCm3, 1e-6);
  const q = Math.max(qPerSec, 0);
  const rCm = Math.cbrt((3 * q) / (4 * Math.PI * n * n * ALPHA_B_CM3_S));
  return cmToPc(rCm);
}

/** pc. Weaver energy-driven wind-bubble radius at age `tMyr`. `boost` = 1 for
 *  the wind phase, `SUPERBUBBLE_LW_BOOST` once SNe contribute. */
export function weaverShellRadiusPc(lwErgPerSec: number, nCm3: number, tMyr: number, boost = 1): number {
  const rho0 = Math.max(nCm3, 1e-6) * PROTON_MASS_G;         // g cm^-3
  const tSec = Math.max(yrToSeconds(myrToYr(tMyr)), 1);
  const lw = Math.max(lwErgPerSec, 0) * boost;
  const rCm = WEAVER_PREFACTOR * Math.pow(lw / rho0, 1 / 5) * Math.pow(tSec, 3 / 5);
  return cmToPc(rCm);
}

/* ------------------------------ fractal noise ---------------------------- */

/** 32-bit integer lattice hash -> [0, 1). Pure function of (lattice cell,
 *  field seed) - a spatially-coherent noise cannot come from a stream. */
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
 *  field. `H = 3 - D` is the level-set (iso-surface) relation for a 3D fBm
 *  field, confirmed in the science re-audit. */
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
  return (channelRng(worldSeed, 'nebula', complexId, 'fractal')() * 4294967296) | 0;
}

const SPREAD = 1.7320508075688772;   // sqrt(3) - unit-variance uniform half-width

export function nebulaFieldFor(
  worldSeed: string, complexId: string, centre: Vec3, envelopeSigmaPc: number, p: NebulaParams,
): NebulaField {
  const params: NebulaParams = {
    ...p,
    fractalDimensionD: Math.min(FRACTAL_DIMENSION_BAND[1], Math.max(FRACTAL_DIMENSION_BAND[0], p.fractalDimensionD)),
  };
  const seed = seedOf(worldSeed, complexId);
  const lambdaPc = Math.max(1e-3, params.baseFractalWavelengthPc);
  const sigma = Math.max(1e-3, envelopeSigmaPc);
  const hi = ENVELOPE_TRUNCATION_SIGMA * sigma;

  const fractalDensityAt = (pt: Vec3): number =>
    fbm01((pt.x - centre.x) / lambdaPc, (pt.y - centre.y) / lambdaPc, (pt.z - centre.z) / lambdaPc, seed, params);

  /** Fixed-budget accept/reject: `candidateAt` proposes, every candidate is
   *  fractal-weighted by T^gamma. ALWAYS runs `SAMPLE_ATTEMPTS` iterations of
   *  `DRAWS_PER_ATTEMPT` draws. */
  const drawFixed = (rng: () => number, candidateAt: (u1: number, u2: number, u3: number) => Vec3): Vec3 => {
    let accepted: Vec3 | null = null;
    let last: Vec3 = centre;
    for (let a = 0; a < SAMPLE_ATTEMPTS; a++) {
      const u1 = rng(), u2 = rng(), u3 = rng(), u4 = rng();
      const cand = candidateAt(u1, u2, u3);
      last = cand;
      if (accepted === null && u4 <= Math.pow(fractalDensityAt(cand), params.filamentSharpenGamma)) accepted = cand;
    }
    return accepted ?? last;
  };

  // Group: isotropic Gaussian envelope of scale `envelopeSigmaPc` (Efremov
  // 1978 complex extent, sourced), truncated at the guard band - the same
  // envelope the pre-P17 `truncGaussQuantile` group scatter used; the fractal
  // accept/reject is what is new.
  const groupCandidate = (u1: number, u2: number, u3: number): Vec3 => ({
    x: centre.x + truncGaussQuantile(u1, 0, sigma, -hi, hi),
    y: centre.y + truncGaussQuantile(u2, 0, sigma, -hi, hi),
    z: centre.z + truncGaussQuantile(u3, 0, sigma, -hi, hi),
  });

  // Offspring: sub-pc uniform jitter around the group, matched to the old
  // Gaussian jitter's variance, then fractal-weighted (pillar-tip texture).
  const offspringCandidate = (base: Vec3) => (u1: number, u2: number, u3: number): Vec3 => ({
    x: base.x + params.offspringJitterSigmaPc * (u1 * 2 - 1) * SPREAD,
    y: base.y + params.offspringJitterSigmaPc * (u2 * 2 - 1) * SPREAD,
    z: base.z + params.offspringJitterSigmaPc * (u3 * 2 - 1) * SPREAD,
  });

  return {
    fractalDensityAt,
    sampleGroupPos: (rng) => drawFixed(rng, groupCandidate),
    sampleOffspringPos: (rng, groupPos) => drawFixed(rng, offspringCandidate(groupPos)),
  };
}

/* --------------------------------- gates ---------------------------------- */

/**
 * Invariants this module owes (see nebulaMorphology.conformance.ts):
 *  1. DETERMINISM - same (worldSeed, complexId, params) + fixed rng ->
 *     bit-identical field and sample sequence.
 *  2. FIXED DRAW BUDGET - sampleGroupPos/sampleOffspringPos consume EXACTLY
 *     SAMPLE_DRAWS rng() calls, every call.
 *  3. STRUCTURE / PHASE DECOUPLED - `nebulaFieldFor` takes no age; phase and
 *     existence are pure functions of the co-natal age. `nebulaIsLit` lights
 *     ~4% of a uniform [0,1] Gyr population; phase populations track phase
 *     DURATION (the complete-census snapshot statistic).
 *  4. FULL-DEPTH - offspring positions correlate with local fractalDensityAt,
 *     and top-of-band vs bottom-of-band D changes the offspring clustering.
 *  5. D HIDDEN BUT HASHED - not in any UI/glossary surface; changing it
 *     changes the field.
 *  6. STROMGREN SANITY - stromgrenRadiusPc live-computed matches the closed
 *     form; `nebulaNatalDensityCm3` = contrast x local ISM (= 1e3 at R0),
 *     exercising `ism.absoluteMidplaneDensityCm3`.
 *  7. FRACTAL FORM - H = 3 - D gives valid H in (0,1) across the band, and a
 *     higher D yields a rougher field (more small-scale power).
 *  8. COUNT-CONSERVING BY CONSTRUCTION - this module draws no counts.
 *  9. SANE SCALES - the derived K_Q / L_wind budgets give pc-scale
 *     Stromgren / Weaver / superbubble radii for a nominal complex.
 */
export const NEBULA_MORPHOLOGY_GATES = 9 as const;

/* -------------------------------- glossary ------------------------------- */

export const glossary: GlossaryEntry[] = [
  {
    term: 'Nebular phase', status: 'calibrated',
    short: 'Which stage of its short life a star-forming region is in - from a compact ionised core, through an expanding HII region and a wind-blown shell, to a large superbubble and finally a dispersing wisp.',
    long: 'Five age-phases (compact HII / classical HII / wind-blown shell / superbubble / dispersing diffuse) read from the complex\'s co-natal age against a boundary table [0.5, 3, 8, 20] Myr, anchored to expansion timescales and the Churchwell et al. 2006/2007 bubble sizes. A complex is a visible nebula only while its least-massive ionising star survives (co-natal age < ~40 Myr), lighting ~4% of the young thin disc\'s complexes. Phase is a downstream read - it does not move stars; the fractal ISM field does that at placement time.',
    source: 'Stromgren 1939, ApJ 89, 526; Weaver et al. 1977, ApJ 218, 377; Mac Low & McCray 1988, ApJ 324, 776; Spitzer 1978; Churchwell et al. 2006 (ApJ 649, 759) / 2007 (ApJ 670, 428).',
  },
  {
    term: 'Stromgren radius', status: 'sourced',
    short: 'The radius out to which the ultraviolet light of a region\'s hot young stars keeps the surrounding hydrogen ionised.',
    long: 'R_S = (3 Q / (4 pi n^2 alpha_B))^(1/3), with Q the region\'s total ionising-photon rate (member count x an IMF-integrated per-star budget: Kroupa 2001 x Martins et al. 2005, ~4.2e46 s^-1 per member), n the NATAL clump density (~1e3 cm^-3, a contrast over the local ISM), and alpha_B the Case B recombination coefficient (2.59e-13 cm^3 s^-1).',
    source: 'Stromgren 1939, ApJ 89, 526; Osterbrock & Ferland 2006, AGN^3 2nd ed. (alpha_B); Kroupa 2001, MNRAS 322, 231; Martins, Schaerer & Hillier 2005, A&A 436, 1049 (Q0).',
  },
];
