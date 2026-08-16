/**
 * densityMap - the galaxy density field, sampled for display and region choice.
 *
 * -- PROVENANCE --------------------------------------------------------------
 * Sources: NONE. This module owns no science and introduces no constant that is
 * not geometry or a ruled UI value. Every number it emits traces to
 * `GalaxyModel.densityAt` / `densityByPopulation`; nothing is re-derived here.
 * If a figure on the map looks wrong, the bug is in the model, not in the map -
 * and that is a deliberate structural property, not a hope.
 *
 * The one thing that would break it is a proxy re-derivation: computing "roughly
 * the disc density" locally because calling the model felt expensive. Don't. The
 * expense is handled by resolution and by the z-quadrature below, never by
 * approximating someone else's owned quantity.
 *
 * genVersion: this module does NOT participate. It reads the field and returns a
 * reduction of it; it stores nothing and draws nothing. A change here alters what
 * you see, never what exists.
 *
 * -- WHY THIS MODULE EXISTS ---------------------------------------------------
 * A Milky Way analogue holds order 1e11 systems. It is not enumerable, and the
 * project's own law - one human-readable note per system - makes enumeration a
 * category error rather than a performance problem.
 *
 * It does not need to be. `densityAt` is a closed-form continuous field: not a
 * list of stars but the measure stars are DRAWN from. So the galaxy-scale map is
 * rendered from the field directly, in milliseconds, at any zoom, with zero
 * systems in existence. Systems are materialised only inside a sector the user
 * has actually asked for.
 *
 * The conceptual point underneath, and the reason this is honest rather than a
 * trick: because generation is pure from (worldSeed, sysid, genVersion), an
 * ungenerated region is not undecided. It is already fully determinate. You have
 * simply not computed it yet. "Pick a patch and map it" reveals; it does not roll.
 *
 * -- PURITY --------------------------------------------------------------------
 * NO PRNG CHANNEL. Alone among the modules, this one consumes no randomness, so
 * it is allocated no channel in CHANNELS and must never acquire one. If a future
 * feature here seems to want a random number, that feature belongs in `placement`.
 * Same field, same region, same resolution => bit-identical grid, always. Gated.
 */

import type { GalaxyModel, PopulationKey } from './galaxyModel';

/* ----------------------------- coordinates ------------------------------ */

/**
 * A point in GALACTOCENTRIC CARTESIAN pc. Canonical unit, per S1: pc, stored
 * raw, converted only in `units` and only at display.
 *
 * The map works in Cartesian because that is what a screen is; the model speaks
 * cylindrical (R, theta, z). The transform between them is NOT owned here - see
 * `DensityField` below. That is the single-source-of-truth seam: `galacticDensity`
 * evaluates the field per cell and already owes this transform, and two modules
 * converting coordinates independently is precisely the drift the law forbids.
 */
export interface PointPc {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * The field this module reduces, injected rather than imported.
 *
 * Dependency injection here is a structural choice, not a style preference. It
 * means `densityMap` cannot reach into the model, cannot cache a constant from
 * it, and cannot acquire a coordinate transform of its own. The whole surface
 * this module has on the science is two function calls.
 */
export interface DensityField {
  /** Total system density at a Cartesian point, systems pc^-3. */
  at(p: PointPc): number;
  /** The same, split by population. Optional: only needed for a coloured map. */
  byPopulation?(p: PointPc): Readonly<Partial<Record<PopulationKey, number>>>;
}

/**
 * Adapt a `GalaxyModel` to a `DensityField`.
 *
 * PLACEHOLDER TRANSFORM. `toCylindrical` below is written out so this file
 * compiles and so the convention is unambiguous, but at the stage where
 * `galacticDensity` exposes its own Cartesian entry point THIS ADAPTER MUST BE
 * DELETED and replaced by a call into it. Two implementations of the same
 * transform is a single-source-of-truth violation with a long fuse: they agree
 * until one of them is fixed.
 *
 * theta = atan2(y, x), radians, measured the same way S4.2 measures it. R is
 * CYLINDRICAL, not spherical - the distinction S8.7 flags as a trap for the
 * metallicity gradient applies here too, and cylindrical is what `densityAt`
 * documents.
 */
export function fieldFromModel(model: GalaxyModel): DensityField {
  const toCylindrical = (p: PointPc): [number, number, number] =>
    [Math.hypot(p.x, p.y), Math.atan2(p.y, p.x), p.z];
  return {
    at: (p) => { const [R, t, z] = toCylindrical(p); return model.densityAt(R, t, z); },
    byPopulation: (p) => {
      const [R, t, z] = toCylindrical(p);
      return model.densityByPopulation(R, t, z);
    },
  };
}

/* ---------------------------- the ruled slab set ------------------------- */

/**
 * The three slab thicknesses, FULL thickness in pc - the name carries the
 * convention, as `SectorRecipe.thicknessPc` does (S8.2).
 *
 * FROZEN, and typed as a union rather than a number, because `thicknessPc` is
 * one of the seven components of the cell key. An off-menu value - a typo of 12
 * - would not error. It would silently produce a vault whose cells are
 * incompatible with every other vault and with itself after any correction. The
 * type is the guard.
 *
 * The user chooses once, at galaxy creation, and never again. That is not a UI
 * simplification: the slab filter is part of what a cell's CONTENTS mean, so two
 * sectors of one galaxy at different thicknesses would genuinely disagree where
 * they overlap. One value per galaxy, for the galaxy's life.
 *
 * -- WHY THESE THREE, verified against the field at Sol --------------------
 * At the anchor density 8.02e-2 systems pc^-3 (S4.1), looking down through the
 * slab gives a surface density of n*t systems pc^-2:
 *
 *     t =  5 pc   0.401 pc^-2   on-map spacing 0.79 pc   ~40 systems / 100 hexes
 *     t = 10 pc   0.802 pc^-2   on-map spacing 0.56 pc   ~80 systems / 100 hexes
 *     t = 15 pc   1.203 pc^-2   on-map spacing 0.46 pc  ~120 systems / 100 hexes
 *
 * (Hexes at the 1 pc convention. The unprojected 3D nearest-neighbour spacing is
 * 1.28 pc, so every one of these maps is substantially a projection; thickness
 * sets how much depth is collapsed, and 5 pc is already collapsing four.)
 *
 * THE THINNEST IS STILL INTERESTING: 40 systems per 100 hexes is close to the
 * classic sparse-star-chart look, legible with room between the labels.
 *
 * THE THICKEST IS STILL A SLICE, and by a wide margin. At 15 pc against a
 * thin-disc scale height of ~300 pc the slab spans 5% of one scale height, with
 * the density at its faces 97.5% of the density at its midplane. Against the
 * footprint that holds 10 000 systems at that thickness (r = 51.5 pc) the aspect
 * ratio t/2r is 0.146 - a coin, not a cylinder. Nothing here approaches the
 * regime where the map would be sampling vertical structure rather than slicing
 * through a locally uniform medium.
 *
 * THE STEPS ARE HONEST BUT UNEVEN: the set is linear, so 5->10 doubles the
 * on-map density while 10->15 adds only half again. The second step is real and
 * visible - on-map spacing drops another 18% - but weaker than the first. A
 * geometric set (5/10/20) would even them out; it is rejected because 20 pc
 * crosses 1.6 systems pc^-2, past one per hex, where the map stops reading as a
 * star chart and starts reading as a smear. Legibility at the top end is worth
 * more than evenness of the steps.
 */
export const SLAB_THICKNESSES_PC = [5, 10, 15] as const;
export type SlabThicknessPc = (typeof SLAB_THICKNESSES_PC)[number];

export function isSlabThickness(t: number): t is SlabThicknessPc {
  return (SLAB_THICKNESSES_PC as readonly number[]).includes(t);
}

/* ----------------------------- sampling regions -------------------------- */

/** Half-open axis-aligned box in pc. `min` inclusive, `max` exclusive. */
export interface VolumeRegionPc {
  readonly min: PointPc;
  readonly max: PointPc;
}

/** A slab: a footprint in x-y, centred at `centre`, `thicknessPc` deep in z. */
export interface SlabRegionPc {
  readonly centre: PointPc;
  readonly halfWidthPc: number;   // half-extent in x
  readonly halfDepthPc: number;   // half-extent in y
  readonly thicknessPc: number;   // FULL thickness. Not restricted to the ruled
                                  // set: previews and galaxy-scale views legitimately
                                  // integrate through far more than a sector does.
}

/** Grid resolution in samples per axis. */
export interface ResolutionXY { readonly nx: number; readonly ny: number; }
export interface ResolutionXYZ extends ResolutionXY { readonly nz: number; }

/* ------------------------------- the outputs ------------------------------ */

/**
 * A 3D sample of the field. THIS IS THE PRIMITIVE, and it is the v2 map.
 *
 * The slab map below is defined AS a reduction of this - it calls `sampleVolume`
 * and integrates. So the 3D path is not speculative future work sitting untested
 * until someone needs it: it is exercised on every single 2D render, which is the
 * strongest form of future-proofing available. Replacing the slab view with a
 * volumetric one in v2 is deleting the reduction step, not writing a new module.
 */
export interface DensityVolume {
  readonly resolution: ResolutionXYZ;
  readonly region: VolumeRegionPc;
  /** systems pc^-3, indexed [ix + nx*(iy + ny*iz)]. RAW - never normalised. */
  readonly values: Float64Array;
  /** Present only if `byPopulation` was requested and the field supplies it. */
  readonly byPopulation?: Readonly<Partial<Record<PopulationKey, Float64Array>>>;
}

/**
 * A 2D projection: COLUMN density, systems pc^-2, integrated through the slab.
 *
 * A new canonical quantity, and canonical by construction - the integral of a
 * canonical density over a canonical length. It belongs in the S1 units table as
 * `systems pc^-2`, converted (to systems ly^-2, or per hex) only in `units`.
 *
 * Values are RAW. No log, no clamp, no normalisation: the field spans several
 * orders of magnitude between the bulge and the outskirts and any display scaling
 * is a display concern. `normaliseForDisplay` below is offered separately and
 * returns a NEW array, so the lossless one always survives.
 */
export interface DensitySurface {
  readonly resolution: ResolutionXY;
  readonly region: SlabRegionPc;
  /** systems pc^-2, indexed [ix + nx*iy]. RAW. */
  readonly values: Float64Array;
  readonly byPopulation?: Readonly<Partial<Record<PopulationKey, Float64Array>>>;
  /** Quadrature actually used, so a render is reproducible from its output. */
  readonly zSamples: number;
}

/* ----------------------------- z-quadrature ------------------------------ */

/**
 * Samples through the slab. Simpson over `Z_SAMPLES - 1` panels.
 *
 * MEASURED, not guessed. The tempting shortcut is one midplane sample times the
 * thickness, and for a sech^2 disc it is nearly exact (5e-5 % at 15 pc). For an
 * exp(-|z|/h) disc it is NOT: the profile has a cusp at z = 0, the midpoint rule
 * sits exactly on the maximum, and it under-counts by 1.26 % at 15 pc -
 * systematically, always in the same direction, and invisibly.
 *
 * That bias would land in `expectedSystemCount`, which is the number a user reads
 * before committing to generating a sector. A silent 1 % low bias in "how many
 * notes will this make" is the kind of small wrong number that survives for years.
 *
 * Five samples (four panels) puts a node ON the cusp and is exact to machine
 * precision for BOTH candidate profiles at every ruled thickness. The cost is
 * four extra field evaluations per pixel. Take it, and stop depending on which
 * vertical form the model happens to use.
 */
export const Z_SAMPLES = 5;

function simpsonWeights(n: number): Float64Array {
  if (n < 3 || n % 2 === 0) throw new Error(`Z_SAMPLES must be odd and >= 3, got ${n}`);
  const w = new Float64Array(n);
  w[0] = 1; w[n - 1] = 1;
  for (let i = 1; i < n - 1; i++) w[i] = i % 2 ? 4 : 2;
  return w;
}

/* ------------------------------- the samplers ----------------------------- */

function cellCentres(lo: number, hi: number, n: number): Float64Array {
  // Cell CENTRES, not edges. A pixel shows the field over the area it covers, so
  // sampling its corner biases the whole grid half a pixel toward the origin -
  // which is invisible on a galaxy view and obvious on a 50 pc sector view.
  const out = new Float64Array(n);
  const step = (hi - lo) / n;
  for (let i = 0; i < n; i++) out[i] = lo + step * (i + 0.5);
  return out;
}

/**
 * Sample the field on a 3D grid. Pure: no rng, no state, no I/O.
 */
export function sampleVolume(
  field: DensityField,
  region: VolumeRegionPc,
  res: ResolutionXYZ,
  opts: { readonly byPopulation?: boolean } = {},
): DensityVolume {
  const { nx, ny, nz } = res;
  if (nx < 1 || ny < 1 || nz < 1) throw new Error('resolution must be >= 1 on every axis');

  const xs = cellCentres(region.min.x, region.max.x, nx);
  const ys = cellCentres(region.min.y, region.max.y, ny);
  const zs = cellCentres(region.min.z, region.max.z, nz);

  const values = new Float64Array(nx * ny * nz);
  const wantPops = opts.byPopulation === true && typeof field.byPopulation === 'function';
  const pops: Record<string, Float64Array> = {};

  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const p: PointPc = { x: xs[ix]!, y: ys[iy]!, z: zs[iz]! };
        const i = ix + nx * (iy + ny * iz);
        values[i] = field.at(p);
        if (wantPops) {
          const split = field.byPopulation!(p);
          for (const key of Object.keys(split)) {
            (pops[key] ??= new Float64Array(nx * ny * nz))[i] = split[key as PopulationKey] ?? 0;
          }
        }
      }
    }
  }
  return {
    resolution: res, region, values,
    ...(wantPops ? { byPopulation: pops as Readonly<Partial<Record<PopulationKey, Float64Array>>> } : {}),
  };
}

/**
 * The slab map. DEFINED as the z-integral of `sampleVolume` - see the note on
 * `DensityVolume` for why that definition, rather than a bespoke 2D loop, is the
 * whole point of this module's shape.
 */
export function projectSlab(
  field: DensityField,
  region: SlabRegionPc,
  res: ResolutionXY,
  opts: { readonly byPopulation?: boolean; readonly zSamples?: number } = {},
): DensitySurface {
  const n = opts.zSamples ?? Z_SAMPLES;
  const w = simpsonWeights(n);
  const t = region.thicknessPc;
  const halfT = t / 2;
  const h = t / (n - 1);                       // panel width
  const scale = h / 3;                          // Simpson's h/3

  const { nx, ny } = res;
  const xs = cellCentres(region.centre.x - region.halfWidthPc, region.centre.x + region.halfWidthPc, nx);
  const ys = cellCentres(region.centre.y - region.halfDepthPc, region.centre.y + region.halfDepthPc, ny);

  const values = new Float64Array(nx * ny);
  const wantPops = opts.byPopulation === true && typeof field.byPopulation === 'function';
  const pops: Record<string, Float64Array> = {};

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = ix + nx * iy;
      let acc = 0;
      for (let k = 0; k < n; k++) {
        // NODES, not cell centres, in z: Simpson is defined on endpoints, and one
        // node must land on z = centre.z to catch an exp(-|z|/h) cusp.
        const p: PointPc = { x: xs[ix]!, y: ys[iy]!, z: region.centre.z - halfT + h * k };
        acc += w[k]! * field.at(p);
        if (wantPops) {
          const split = field.byPopulation!(p);
          for (const key of Object.keys(split)) {
            const arr = (pops[key] ??= new Float64Array(nx * ny));
            arr[i] += w[k]! * (split[key as PopulationKey] ?? 0) * scale;
          }
        }
      }
      values[i] = acc * scale;
    }
  }
  return {
    resolution: res, region, values, zSamples: n,
    ...(wantPops ? { byPopulation: pops as Readonly<Partial<Record<PopulationKey, Float64Array>>> } : {}),
  };
}

/* --------------------------- derived quantities --------------------------- */

/**
 * Expected number of systems in a slab region - the number to show the user
 * BEFORE anything is generated.
 *
 * This is the guard that stops a cheerfully-clicked bulge sector producing ten
 * million notes. Cost is one integral over the requested volume, which is to say
 * nothing, and it is the honest counterpart to `LAMBDA_MAX = 500` per cell: that
 * constant guards the sampler's arithmetic, this one guards the user's vault.
 *
 * Poisson, so the realised count scatters about this by ~sqrt(N). Present it as
 * approximate. Do NOT present it as a promise and then generate a different
 * number - that reads as a bug even though it is correct physics.
 */
export function expectedSystemCount(
  field: DensityField,
  region: SlabRegionPc,
  res: ResolutionXY = { nx: 64, ny: 64 },
  opts: { readonly zSamples?: number } = {},
): number {
  const surface = projectSlab(field, region, res, { zSamples: opts.zSamples });
  const cellArea = (2 * region.halfWidthPc / res.nx) * (2 * region.halfDepthPc / res.ny);
  let acc = 0;
  for (let i = 0; i < surface.values.length; i++) acc += surface.values[i]!;
  return acc * cellArea;
}

/**
 * Display scaling, deliberately kept OUT of the data path.
 *
 * Returns a NEW array in [0, 1]; the raw surface is untouched and remains the
 * single source of truth. Log by default because the field spans orders of
 * magnitude between bulge and outskirts and a linear ramp renders the disc as a
 * uniform black field with one white dot at the centre.
 */
export function normaliseForDisplay(
  values: Float64Array,
  opts: { readonly log?: boolean; readonly floor?: number } = {},
): Float64Array {
  const useLog = opts.log ?? true;
  const floor = opts.floor ?? 1e-12;
  const out = new Float64Array(values.length);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = useLog ? Math.log10(Math.max(values[i]!, floor)) : values[i]!;
    out[i] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  if (!(span > 0)) { out.fill(0); return out; }   // flat field, or all floored
  for (let i = 0; i < out.length; i++) out[i] = (out[i]! - lo) / span;
  return out;
}

/**
 * Radial fade reach, in disc scale lengths (16 Aug 2026, ported from a
 * sibling build). `tunable` - purely a display choice, not a model
 * constant.
 */
export const ARM_DISPLAY_FADE_SCALE_LENGTHS = 5;

/**
 * Contrast-boost exponent applied to a cell's deviation from its own ring
 * mean, BEFORE the percentile stretch (16 Aug 2026, a user-found gap: "never
 * more than 2 spirals" on a table that names 5). `tunable`, display-only -
 * `spiralArms.ts`'s own weight table (major arms 1.00, minor 0.55, spur
 * 0.35, each ALSO diluted by which disc populations even see them -
 * `oldThin` sees major only, `midThin` adds minor, `youngThin` alone adds
 * the spur) makes the SUMMED field's major-arm signal roughly 7-8x the
 * spur's and roughly 2-3x a minor arm's at the reference radius (checked
 * numerically against `spiralArms.ARMS`/`DEFAULT_ARM_RESPONSE` while
 * diagnosing this report). A single global percentile stretch, run on the
 * raw ratio-to-ring-mean, necessarily calibrates its [0,1] range to that
 * dominant major-arm swing, which crushes the minor/spur signal to a band
 * too narrow for the stipple renderer's dot-count mapping to resolve as a
 * SEPARATE visible track - not a rendering-resolution bug (verified
 * separately, see the grid-resolution bump alongside this fix), an
 * amplitude one.
 *
 * The fix is a standard tone-mapping move, not a new invention: boost a
 * SMALL deviation from the ring mean proportionally MORE than a large one,
 * via `sign(dev) * |dev|^GAMMA` with `GAMMA < 1`, before the existing
 * percentile stretch runs. This still derives every visible pixel from the
 * real field - nothing is invented that is not there (gate 11 still holds:
 * on a radially symmetric field every deviation is exactly 0, and 0 raised
 * to any power is still 0, so a field with no azimuthal structure still
 * shows none) - it only compresses the RATIO between a strong feature and a
 * weak one, the same honest trade a photograph's tone curve makes between
 * a bright sky and a dim foreground. 0.6 was chosen empirically (see the
 * session's own diagnostic script): it roughly halves the major:spur
 * amplitude ratio (about 7:1 down to about 3:1) without inflating a spur
 * into looking as strong as a major arm, which would misrepresent the
 * calibrated arm-weight table this module owns no science over.
 */
const ARM_DISPLAY_CONTRAST_GAMMA = 0.6;

/**
 * Display normalisation FOR SPIRAL/BARRED MORPHOLOGIES ONLY (16 Aug 2026,
 * ported from a sibling build's own `emphasiseArmsForDisplay`) - closes a
 * real bug a user found: `normaliseForDisplay`'s global log min-max
 * ALWAYS washes out arm contrast on a galaxy-wide view, because the
 * RADIAL falloff (dense centre to near-empty outskirts, many orders of
 * magnitude) utterly dominates the AZIMUTHAL arm-vs-interarm contrast
 * (a Drimmel & Spergel K~1.3, a few tens of percent) - both get log
 * -compressed into the same [0,1] range, and the radial gradient wins
 * completely. A user correctly saw "a uniform collection of dots from
 * denser inside to less sparse outside" with no visible arm structure at
 * all - not a rendering-resolution problem, a NORMALISATION problem.
 *
 * The fix: for each cell, divide by the MEAN density at its own radius
 * (computed over 160 concentric rings) before display-scaling - this
 * REMOVES the radial gradient entirely, leaving only the ratio to the
 * local ring mean, which is exactly what an arm's contrast IS. The
 * resulting relative field is then percentile-stretched (2nd-99.5th) to
 * use the full display range, and faded toward 0 with radius (a smooth
 * `1.15 - 0.9*(R/rFade)` ramp, not a hard cutoff) so the outskirts settle
 * to black gracefully instead of either amplifying ring-mean noise where
 * the true density is negligible, or stopping abruptly at a truncation
 * radius (the same bug report's "outer edge too sharp"/"zoom wrong,
 * stars appear to be cut off before fading" symptoms - both are
 * consequences of having no fade term at all, not a separate bug).
 *
 * Returns values already in [0, 1] with the fade baked in - do NOT
 * log-normalise the result a second time (that would re-introduce the
 * exact problem this function exists to remove).
 */
export function emphasiseArmsForDisplay(
  values: Float64Array, nx: number, ny: number, halfPc: number,
  discScaleLengthPc: number, scale: number,
): Float64Array {
  const cellX = (2 * halfPc) / nx;
  const cellY = (2 * halfPc) / ny;
  const nRing = 160;
  const Rmax = Math.SQRT2 * halfPc;
  const Rof = (ix: number, iy: number): number =>
    Math.hypot(-halfPc + (ix + 0.5) * cellX, -halfPc + (iy + 0.5) * cellY);

  const sum = new Float64Array(nRing + 1);
  const cnt = new Float64Array(nRing + 1);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const r = Math.min(nRing, Math.floor((Rof(ix, iy) / Rmax) * nRing));
      sum[r]! += values[ix + nx * iy]!;
      cnt[r]! += 1;
    }
  }
  const mean = new Float64Array(nRing + 1);
  for (let r = 0; r <= nRing; r++) mean[r] = cnt[r]! > 0 ? sum[r]! / cnt[r]! : 0;
  // A ring with zero samples (can happen at the very centre, or a coarse
  // grid's outermost corner ring) inherits its neighbour's mean rather
  // than dividing by zero.
  for (let r = 1; r <= nRing; r++) if (mean[r]! === 0) mean[r] = mean[r - 1]!;

  const rFade = ARM_DISPLAY_FADE_SCALE_LENGTHS * discScaleLengthPc * scale;
  const fadeAt = (R: number): number =>
    Math.min(1, Math.max(0, 1.15 - 0.9 * (R / Math.max(rFade, 1e-9))));

  const rel = new Float64Array(values.length);
  const lit: number[] = [];
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = ix + nx * iy;
      const R = Rof(ix, iy);
      const rf = (R / Rmax) * nRing;
      const r0 = Math.min(nRing, Math.floor(rf));
      const frac = rf - r0;
      const rm = (1 - frac) * mean[r0]! + frac * mean[Math.min(nRing, r0 + 1)]!;
      const ratio = rm > 0 ? values[i]! / rm : 1;
      // Contrast-boost the DEVIATION from the ring mean, not the ratio
      // itself - see ARM_DISPLAY_CONTRAST_GAMMA's own doc comment. A cell
      // exactly at its ring mean (dev = 0) is unaffected regardless of
      // gamma, which is what keeps gate 11 (no manufactured structure on a
      // radially symmetric field) true unconditionally.
      const dev = ratio - 1;
      const boosted = dev === 0 ? 0 : Math.sign(dev) * Math.pow(Math.abs(dev), ARM_DISPLAY_CONTRAST_GAMMA);
      rel[i] = 1 + boosted;
      if (fadeAt(R) > 0) lit.push(rel[i]!);
    }
  }

  // Percentile stretch over the LIT region only (faded-out cells would
  // otherwise pull the stretch toward their own, irrelevant, statistics).
  lit.sort((a, b) => a - b);
  const q = (p: number): number => (lit.length
    ? lit[Math.min(lit.length - 1, Math.floor(p * lit.length))]!
    : 1);
  const LO = lit.length ? q(0.02) : 0.95;
  const HI = lit.length ? q(0.995) : 1.50;
  const span = Math.max(1e-6, HI - LO);

  const out = new Float64Array(values.length);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = ix + nx * iy;
      out[i] = Math.min(1, Math.max(0, (rel[i]! - LO) / span)) * fadeAt(Rof(ix, iy));
    }
  }
  return out;
}

/* --------------------------------- gates ---------------------------------- */

/**
 * Invariants this module owes, all falsifiable, none circular:
 *
 *  1. PURITY - same field, region and resolution give a BIT-identical grid.
 *     `===` on every element, not a tolerance.
 *  2. PROJECTION IDENTITY - for a field constant in z, `projectSlab` returns
 *     exactly `density * thicknessPc` at every pixel, to 1e-12 relative. This is
 *     the quadrature's no-op property and it catches an h/3 or panel-count slip
 *     that a smooth-field test would absorb.
 *  3. QUADRATURE SUFFICIENCY - for BOTH exp(-|z|/h) and sech^2(z/2h) at h = 300
 *     pc, `Z_SAMPLES` agrees with a 512-panel reference to better than 1e-9
 *     relative at every thickness in `SLAB_THICKNESSES_PC`. THIS GATE IS THE
 *     ENFORCEMENT OF "IT MUST STAY A THIN SLICE": raise the slab far enough and
 *     it fails, loudly, before anyone ships a biased system count.
 *  4. COUNT CONSISTENCY - `expectedSystemCount` over a uniform field equals
 *     n * volume analytically, to 1e-12.
 *  5. POPULATION SUM - where `byPopulation` is present, the per-population
 *     surfaces sum to the total surface within floating-point tolerance. Same
 *     invariant S4.4 asserts on the field, re-asserted after projection because
 *     integration is where it would silently drift.
 *  6. NO CHANNEL - `CHANNELS` contains no key for this module, and adding one is
 *     a failure. Cheap to assert, and it is the structural statement that a map
 *     reveals rather than rolls.
 *  7. RESOLUTION INDEPENDENCE - `expectedSystemCount` at 16x16 and at 256x256
 *     agree to better than 0.5 % on a smooth field. Catches a cell-centre or
 *     cell-area error that a single fixed resolution would hide.
 *  8. emphasiseArmsForDisplay (16 Aug 2026) REMOVES the radial gradient - a
 *     field with a real azimuthal bump but a strong radial falloff shows a
 *     LARGER value spread across azimuth at fixed radius than
 *     `normaliseForDisplay` alone would leave visible relative to the
 *     radial spread - the property that fixes the "arms invisible" bug
 *     this was ported to close.
 *  9. emphasiseArmsForDisplay always returns values in [0, 1].
 *  10. emphasiseArmsForDisplay fades toward 0 as R grows past
 *      `ARM_DISPLAY_FADE_SCALE_LENGTHS * discScaleLengthPc` - no hard
 *      cutoff, a smooth ramp (the fix for "outer edge too sharp").
 *  11. On a field with NO azimuthal structure at all (radially symmetric),
 *      emphasiseArmsForDisplay's relative field is uniform at every fixed
 *      radius (up to floating-point tolerance) - it does not manufacture
 *      structure that is not there.
 */
export const DENSITY_MAP_GATES = 11 as const;
