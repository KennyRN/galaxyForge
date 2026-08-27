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
import { smootherstep } from './mathStats';

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

/** Exported (Prompt P1, 27 Aug 2026) so the isophote legend's solar-anchor
 *  column integral (`galaxyCreationModals.ts`) can reuse the same Simpson
 *  quadrature technique this module already uses for its own z-integral,
 *  rather than a second hand-rolled copy - Law 1, applied to a numeric
 *  TECHNIQUE (not a science quantity; `model.densityAt` stays the sole
 *  source of the actual density). */
export function simpsonWeights(n: number): Float64Array {
  if (n < 3 || n % 2 === 0) throw new Error(`Z_SAMPLES must be odd and >= 3, got ${n}`);
  const w = new Float64Array(n);
  w[0] = 1; w[n - 1] = 1;
  for (let i = 1; i < n - 1; i++) w[i] = i % 2 ? 4 : 2;
  return w;
}

/* ------------------------------- the samplers ----------------------------- */

export function cellCentres(lo: number, hi: number, n: number): Float64Array {
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
        // wantPops (25 Aug 2026, perf fix): every shipped model defines
        // `densityAt` as the sum of its own `densityByPopulation` (Law 1 -
        // see galaxyModel.ts's three model constructors, all identical in
        // this respect). Calling both here recomputed the full per-
        // population field TWICE per point for no different answer - once
        // for `values[i]`, once more (thrown away except for the split) for
        // `pops`. Deriving the total from the split instead is the exact
        // same number, for half the work, whenever a caller wants both.
        if (wantPops) {
          const split = field.byPopulation!(p);
          let total = 0;
          for (const key of Object.keys(split)) {
            const v = split[key as PopulationKey] ?? 0;
            (pops[key] ??= new Float64Array(nx * ny * nz))[i] = v;
            total += v;
          }
          values[i] = total;
        } else {
          values[i] = field.at(p);
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
        // wantPops (25 Aug 2026, perf fix) - see the matching comment in
        // `sampleVolume` above: derive the total from the split rather than
        // computing both, they are defined to be the same number.
        if (wantPops) {
          const split = field.byPopulation!(p);
          let total = 0;
          for (const key of Object.keys(split)) {
            const v = split[key as PopulationKey] ?? 0;
            const arr = (pops[key] ??= new Float64Array(nx * ny));
            arr[i] += w[k]! * v * scale;
            total += v;
          }
          acc += w[k]! * total;
        } else {
          acc += w[k]! * field.at(p);
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

/** Bilinear sample of a coarse grid at a fractional (0..1, 0..1) position -
 *  clamped-edge convention (out-of-range fractions clamp to the nearest
 *  valid cell rather than wrapping or extrapolating). Moved here (Prompt
 *  P1, 27 Aug 2026) from `galaxyCreationModals.ts`, which needs it for two
 *  independent reasons (isophote grid upsampling, the ISM side-on view)
 *  and where it was module-poisoned for gate-testing purposes by that
 *  file's own `obsidian` import - this is a pure numeric utility with no
 *  science content, so `densityMap.ts` (itself DOM/Obsidian-free) is its
 *  natural, gate-testable home; Law 1, one utility, not two divergent
 *  copies once a second caller needs it. */
export function sampleBilinear(grid: Float64Array, nR: number, nz: number, fracR: number, fracZ: number): number {
  const bR = Math.min(nR - 1, Math.max(0, fracR * nR - 0.5));
  const bR0 = Math.floor(bR), bR1 = Math.min(nR - 1, bR0 + 1), fR = bR - bR0;
  const bZ = Math.min(nz - 1, Math.max(0, fracZ * nz - 0.5));
  const bZ0 = Math.floor(bZ), bZ1 = Math.min(nz - 1, bZ0 + 1), fZ = bZ - bZ0;
  const v00 = grid[bR0 + nR * bZ0]!, v10 = grid[bR1 + nR * bZ0]!;
  const v01 = grid[bR0 + nR * bZ1]!, v11 = grid[bR1 + nR * bZ1]!;
  const v0 = v00 * (1 - fR) + v10 * fR, v1 = v01 * (1 - fR) + v11 * fR;
  return v0 * (1 - fZ) + v1 * fZ;
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
const ARM_MODULATION_CONTRAST_GAMMA = 0.6;

/**
 * Minimum MODULATION for any lit cell, applied AFTER the percentile stretch
 * (17 Aug 2026, ported over from the retired `INTERARM_FLOOR` - same value,
 * same reasoning: an interarm trough legitimately sits below the local ring
 * mean, `armFactor`'s ridge is mean-subtracting, so it dips as well as
 * rises - see `spiralArms.ts`'s own header). This now floors a MULTIPLIER
 * on the real shape brightness (see `modulateArmsForDisplay` below), not
 * display brightness itself - a cell can still read as dim because the
 * underlying field genuinely IS dim there (far out, or deep interarm), it
 * just never reads as dimmer than `MODULATION_FLOOR` times what its own
 * radial/vertical position alone would already show.
 */
const ARM_MODULATION_FLOOR = 0.4;

/**
 * Minimum meaningful `rel`-percentile SPAN before `modulateArmsForDisplay`
 * treats it as real azimuthal structure worth stretching to [0,1] - below
 * this, the span is ring-binning discretisation noise, not signal, and
 * stretching it would MANUFACTURE fake contrast (17 Aug 2026, found while
 * writing gate D1, not assumed: a purely radially-symmetric synthetic field
 * - genuinely ZERO azimuthal structure - was found to still swing several
 * tenths of a unit non-monotonically through this function, traced to the
 * ring-mean lookup's own small but real convexity bias, ~3-5% raw ratio,
 * for ANY exponentially-varying field binned into discrete rings - Jensen's
 * inequality guarantees a ring's arithmetic MEAN density sits slightly above
 * `exp(-meanR/L)`. That few-percent bias, gamma-boosted (`dev^0.6`
 * disproportionately inflates SMALL deviations), produced a `rel` span of
 * only ~0.027 for the pure-noise fixture - and the percentile stretch,
 * calibrated for a REAL arm field's much wider range, stretched that entire
 * noise band to nearly fill [0,1], reading as fabricated arm-like ripple.
 * Measured directly (disposable diagnostic script, this session) against
 * every REAL shipped case for comparison: `flocculent` spans ~1.50,
 * `multipleArm` ~1.62, `grandDesign` ~1.89, the barred Milky Way Analogue
 * (weakest real case, `DRIMMEL_SPERGEL_K`, not `ARM_CLASS_CONTRAST_TARGET_K`)
 * ~0.65 - all at least 24x the noise-only span. `0.15` sits with wide margin
 * on both sides of that gap: `calibrated` to this measured separation, not a
 * guess. Same "detect the degenerate case, hold modulation at exactly 1
 * rather than stretch it" pattern `edgeOnDisplayField`'s own `hasStructure`
 * already established correctly (see that function's header) - promoted
 * here for the same reason A7's rewrite promoted the top-down view's shape
 * -preservation from the side-on view in the first place.
 */
const ARM_MODULATION_MIN_SPAN = 0.15;

/**
 * Outer contrast taper (25 Aug 2026, a found framing gap, not assumed):
 * `kappaOf` (`spiralArms.ts`) does not decay with R - checked directly,
 * this session - it climbs and then PLATEAUS (~22 at 5000pc, ~33 at
 * 150000pc), so an arm ridge's RELATIVE contrast against its own ring
 * never fades with radius in this model, even far beyond where the disc
 * carries any real mass. The auto-zoom frame (`R90_MARGIN * R90`, the
 * caller's own derived-framing constant) sizes the window by MASS
 * containment, a different question - nothing ties the two together, so
 * the visible ridge does not naturally taper off before the frame edge;
 * it reads as "the spiral runs off the map" regardless of how generous
 * the margin is.
 *
 * Fixed at the DISPLAY layer, not the model: `modulateArmsForDisplay`'s
 * own `taperOuterFraction` (below) fades the CONTRAST term - never the
 * real, already-correctly-fading `shape` brightness - toward the floor
 * beyond that fraction of the frame's half-width, so the visible arm/
 * interarm distinction is contained well inside the frame even though
 * the underlying field's relative contrast is not. The model
 * (`spiralArms.ts`, `kappaOf`) is untouched - this is a rendering choice
 * about what the picture emphasises, not a claim about the galaxy.
 */
const ARM_TAPER_OUTER_EDGE_FRACTION = 1.0;   // fraction of Rmax (the frame's
                                              // own diagonal reach) at which
                                              // the taper reaches zero

/**
 * Display transform FOR SPIRAL/BARRED MORPHOLOGIES ONLY (rewritten 17 Aug
 * 2026, morphology patch v3.0, superseding the retired `emphasiseArmsFor
 * Display` in full - Amendment A7 pulled forward from this patch's own
 * later render step, found necessary NOW rather than deferred: a user
 * reported the newly-added boxy/peanut bulge (Amendment A4, step 1) as
 * "too small/faint" and, for the barred case, "wrong shape" - confirmed
 * directly (disposable diagnostic script, this session) that the OLD
 * function's ratio-to-ring-mean transform did not merely dim the bulge, it
 * actively mis-shaped it: the galactic CENTRE displayed at 0.58, while a
 * point ~1750pc off-centre displayed at 0.94 - BRIGHTER than the centre,
 * because dividing every cell by its OWN ring's mean discards a population's
 * absolute radial concentration entirely, keeping only its azimuthal
 * ripple. That is precisely what Amendment A7 already diagnosed in the
 * patch document ("the display layer may not detrend radially... any
 * future display transform that removes the radial profile is a defect")
 * - the same defect, now confirmed to ALSO block honest assessment of the
 * upcoming armClass modulation (step 3) if left in place, not merely the
 * bulge.
 *
 * `normaliseForDisplay`'s own real bug the OLD function was built to fix
 * still holds too (RADIAL falloff, many orders of magnitude, swamps
 * AZIMUTHAL arm contrast under a single global log-compression) - so the
 * fix here is not simply "delete and fall back to plain log", which would
 * regress arm visibility. Instead: compute the real shape (log-normalised,
 * exactly `normaliseForDisplay`'s own path, so it preserves EVERY absolute
 * radial/vertical structure - the bulge, the disc falloff, all of it) and
 * MODULATE it by a boosted ring-mean-deviation ratio, rather than replacing
 * brightness with the ratio outright - the same "shape times a bounded
 * modulation factor" pattern `edgeOnDisplayField` (below) already
 * established correctly for the side-on view; this promotes that pattern
 * to the top-down view instead of leaving two different, inconsistent
 * philosophies in the same file.
 *
 * A consequence worth stating plainly: `ARM_DISPLAY_FADE_SCALE_LENGTHS` (a
 * hand-tuned radial fade heuristic, retired outright with this rewrite) is
 * no longer needed - `shape` already fades correctly with radius because it
 * is the REAL log-normalised density, not a heuristic standing in for one.
 * This is a genuine simplification the shape-preserving redesign enables,
 * not merely a deleted line: the previous function needed that heuristic
 * BECAUSE it had thrown the real radial information away.
 *
 * This is an INTERIM design, not the patch's own final endpoint for arm
 * contrast (Section 5.4: "colour is where most of the perceptual arm
 * contrast comes from... should not be pushed to try [via luminance
 * alone]") - per-population colour is still future work (a later step),
 * expected to further simplify or partly replace the modulation term below
 * once it lands. This rewrite exists to stop the display from actively
 * erasing real model structure in the meantime, not to be the last word on
 * arm rendering.
 *
 * `taperOuterFraction` (25 Aug 2026) - OPTIONAL, defaults to 1 (no taper,
 * bit-for-bit the pre-taper behaviour, so every existing caller/gate is
 * unaffected). A caller who knows their frame is wider than "the
 * interesting part" - the derived-framing case, `halfPc = R90_MARGIN *
 * R90Pc` - passes `1 / R90_MARGIN` so the ridge/interarm CONTRAST (never
 * the real, already-fading `shape` brightness) fades to the floor beyond
 * that fraction of the frame, rather than riding out at full relative
 * strength to the edge - see `ARM_TAPER_OUTER_EDGE_FRACTION`'s own header.
 *
 * Returns values already in [0, 1].
 */
export function modulateArmsForDisplay(
  values: Float64Array, nx: number, ny: number, halfPc: number,
  taperOuterFraction = 1,
): Float64Array {
  const shape = normaliseForDisplay(values, { log: true });

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

  const rel = new Float64Array(values.length);
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
      // itself - see ARM_MODULATION_CONTRAST_GAMMA's own doc comment. A
      // cell exactly at its ring mean (dev = 0) is unaffected regardless of
      // gamma, which is what keeps gate 11 (no manufactured structure on a
      // radially symmetric field) true unconditionally.
      const dev = ratio - 1;
      const boosted = dev === 0 ? 0 : Math.sign(dev) * Math.pow(Math.abs(dev), ARM_MODULATION_CONTRAST_GAMMA);
      rel[i] = 1 + boosted;
    }
  }

  // Percentile stretch over the WHOLE grid (unlike the old function, there
  // is no separate "lit" subset to restrict to - `shape` itself already
  // carries the fade/cutoff behaviour honestly, so every cell's modulation
  // is equally meaningful to stretch against).
  const sorted = Array.from(rel).sort((a, b) => a - b);
  const q = (p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
  const LO = q(0.02);
  const HI = q(0.995);
  const span = HI - LO;
  // hasStructure - see ARM_MODULATION_MIN_SPAN's own header. Below this
  // span, the field's azimuthal deviation is ring-binning noise, not real
  // arm/bulge contrast - stretching it would manufacture fake structure, so
  // modulation stays at exactly 1 (full shape brightness, undimmed, the
  // same "does not invent structure that is not there" invariant gate 11
  // already pins for the ordinary case).
  const hasStructure = span > ARM_MODULATION_MIN_SPAN;

  // Outer taper (see ARM_TAPER_OUTER_EDGE_FRACTION's own header) - 1 inside
  // taperOuterFraction*halfPc, smoothly down to 0 by ARM_TAPER_OUTER_EDGE
  // _FRACTION*Rmax. EXPLICITLY guarded at taperOuterFraction>=1 (the
  // default), not merely arranged to be a no-op numerically - the taper
  // window at the default would otherwise still clip the frame's own
  // corner cells (Rmax = sqrt2*halfPc > halfPc), silently changing every
  // OTHER existing caller/gate's output. The guard makes "defaults to 1,
  // bit-for-bit the pre-taper behaviour" true by construction.
  const taperStartPc = taperOuterFraction * halfPc;
  const taperEndPc = ARM_TAPER_OUTER_EDGE_FRACTION * Rmax;

  // FULL-brightness fade (25 Aug 2026, item 3's own follow-up: spirals were
  // still reported "going off the map... even if it was just the shadow of
  // the spiral fading away" AFTER `taper` above already landed. Root cause:
  // `taper` only ever pulls CONTRAST down to `ARM_MODULATION_FLOOR` (0.4) -
  // by design, so interarm gaps inside the disc stay dimly lit rather than
  // pure black - but that same floor left a real, nonzero glow riding all
  // the way to the frame's own corners, because `shape` (the real log
  // -normalised density) also never reaches exactly 0 short of the frame's
  // GLOBAL minimum-density cell. `fade` multiplies the FINAL brightness
  // (shape*modulation), genuinely reaching 0 - not merely 0.4x-dimmed - by
  // `halfPc` itself (the square canvas's own edge along each axis, tighter
  // than `taper`'s own Rmax=sqrt2*halfPc corner-inclusive window, since
  // nothing touching the visible edge is the actual ask). Same no-op guard
  // at taperOuterFraction>=1 as `taper`, so every existing caller/gate
  // (which never passes a margin) is bit-for-bit unaffected.
  const out = new Float64Array(values.length);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = ix + nx * iy;
      const R = Rof(ix, iy);
      const taper = taperOuterFraction >= 1 ? 1 : 1 - smootherstep(taperStartPc, taperEndPc, R);
      const fade = taperOuterFraction >= 1 ? 1 : 1 - smootherstep(taperStartPc, halfPc, R);
      const stretched = (hasStructure ? Math.min(1, Math.max(0, (rel[i]! - LO) / span)) : 1) * taper;
      const modulation = ARM_MODULATION_FLOOR + (1 - ARM_MODULATION_FLOOR) * stretched;
      out[i] = shape[i]! * modulation * fade;
    }
  }
  return out;
}

/**
 * Contrast-boost exponent for `edgeOnDisplayField`'s own deviation from its
 * azimuthal baseline - same role as `ARM_DISPLAY_CONTRAST_GAMMA`, kept as a
 * separate constant since the two views' own amplitude statistics differ
 * (this one is a genuine per-cell azimuthal ratio computed from live
 * `densityAt` samples, not a ring-binned deviation over a pre-sampled
 * Cartesian grid) - tuned independently rather than assumed identical.
 */
const EDGE_ON_CONTRAST_GAMMA = 0.6;

/**
 * Minimum retained MODULATION for `edgeOnDisplayField` - same "never fully
 * flatten a real contrast to nothing" spirit as `INTERARM_FLOOR`, but
 * applied multiplicatively to the real (R,z) SHAPE brightness rather than
 * as a floor on an already-detrended field (see that function's own header
 * for why the two views combine their contrast signal differently).
 */
const EDGE_ON_MODULATION_FLOOR = 0.35;

/**
 * The side-on (R,z) field, radially swept along ONE fixed angle - the same
 * "detrend the smooth falloff, gamma-boost the deviation, percentile
 * -stretch" treatment `emphasiseArmsForDisplay` already gives the top-down
 * view, adapted to a genuinely different sampling geometry (16 Aug 2026, a
 * direct user follow-up: "I can't see where the extra density of stars
 * where the arms are... side-on").
 *
 * ROOT CAUSE this closes: a fixed-angle radial slice's own density range
 * from bulge-centre to outer edge spans roughly NINE ORDERS OF MAGNITUDE
 * (measured directly off `model.densityAt` while diagnosing this report);
 * an arm's local contrast is a few-tens-of-percent ripple riding on top of
 * that. A single global `normaliseForDisplay(raw, {log:true})` compresses
 * both into the same [0,1] range and the radial/vertical falloff wins
 * completely - the same failure mode `emphasiseArmsForDisplay`'s own
 * header already names for the top-down case, just with no equivalent fix
 * applied here yet before now.
 *
 * UNLIKE `emphasiseArmsForDisplay`, this does NOT throw the R/z shape away
 * - the previous turn's redesign made the side-on view finally show a real
 * bulge/disc/halo silhouette (bright centre, thin-disc band, fading halo),
 * and detrending that away entirely would trade "no arm contrast" for "no
 * shape at all", re-breaking what was just fixed. Instead the real (log
 * -normalised) baseline shape is the PRIMARY brightness, and the boosted,
 * percentile-stretched azimuthal deviation is a MULTIPLICATIVE modulation
 * on top of it (floored at `EDGE_ON_MODULATION_FLOOR`, not down to zero) -
 * an arm crossing reads as brighter-than-baseline-shape, an interarm gap as
 * dimmer, without erasing the overall falloff shape underneath.
 *
 * BASELINE, and why it needs its own sampling (Law 1 still honoured): there
 * is no pre-existing multi-angle sample to bin into rings here - a
 * fixed-angle slice only ever visits ONE theta - so the azimuthally
 * -averaged "expected" density at each (R,z) is computed by calling
 * `model.densityAt` at several OTHER theta values directly, the same
 * public seam onto the model this whole file already treats as the only
 * one it is allowed to touch (never reaching into `discTerm`/`armFactor`).
 * Computed on a COARSER (R,z) sub-grid than the display grid and bilinear
 * -interpolated up - `PREVIEW_COMPLEX_SUBGRID_N`'s own "coarsen the smooth
 * part, keep the local part sharp" precedent (`galaxyCreationModals.ts`),
 * justified here because the baseline is a deliberately smoothed quantity
 * by construction, not something that needs display-resolution accuracy.
 *
 * On a model with NO theta-dependence at all (elliptical/lenticular, or any
 * angle where every populated term ignores theta), `actual === baseline`
 * identically at every cell, so the deviation span collapses to ~0 - rather
 * than let that divide-by-near-zero stretch manufacture fake contrast, this
 * is detected (`hasStructure`) and the modulation is left at exactly 1
 * (full shape brightness, undimmed) everywhere, the same "does not invent
 * structure that is not there" invariant `emphasiseArmsForDisplay`'s own
 * gate 11 already pins for the top-down case.
 *
 * RESOLUTION, timed directly (this session's own diagnostic script,
 * bundled, deleted after use): the real `model.densityAt` this calls is
 * markedly more expensive than a plain exponential (arm/bar factors, not
 * just disc/halo terms), and the baseline needs SEVERAL such calls per
 * cell on top of the display grid's own. An initial 50x36x10-angle
 * baseline cost ~50-90ms on its own, dominating the whole redraw; 24x16x6
 * cuts that to ~13ms while remaining a smooth-enough proxy for a
 * deliberately-smoothed quantity - `galaxyCreationModals.ts`'s own display
 * grid (`renderEdgeOnCanvas`'s `res`) was trimmed alongside this for the
 * same reason, both landing on a live-slider-drag-comfortable total.
 */
const EDGE_ON_BASELINE_RES = { nR: 24, nz: 16 } as const;
const EDGE_ON_BASELINE_ANGLES = 6;

/**
 * The azimuthal baseline + its log-normalised shape (17 Aug 2026, factored
 * out of `edgeOnDisplayField` for Step 6's `diametralEdgeOnDisplayField` -
 * both the baseline sampling AND the shape it produces are genuinely
 * azimuth-INDEPENDENT by construction (`EDGE_ON_BASELINE_ANGLES` averages
 * over several thetas), so a diametral caller needing BOTH the near (theta)
 * and far (theta+pi) sides shares this computation once rather than paying
 * for - and duplicating the code for - the identical baseline twice, Law 1's
 * "one seam onto the model" applied to this file's own internal structure,
 * not just to the model boundary). Bit-identical to what `edgeOnDisplayField`
 * computed inline before this refactor - no behaviour change for existing
 * callers.
 */
function edgeOnBaselineAndShape(
  model: GalaxyModel, maxRadiusPc: number, halfHeightPc: number,
  res: { readonly nR: number; readonly nz: number },
): { readonly baseline: Float64Array; readonly shape: Float64Array } {
  const { nR, nz } = res;
  const Rat = (iR: number, n: number): number => ((iR + 0.5) / n) * maxRadiusPc;
  const Zat = (iz: number, n: number): number => -halfHeightPc + ((iz + 0.5) / n) * 2 * halfHeightPc;

  const { nR: bnR, nz: bnz } = EDGE_ON_BASELINE_RES;
  const baseCoarse = new Float64Array(bnR * bnz);
  for (let biz = 0; biz < bnz; biz++) {
    const z = Zat(biz, bnz);
    for (let biR = 0; biR < bnR; biR++) {
      const R = Rat(biR, bnR);
      let sum = 0;
      for (let k = 0; k < EDGE_ON_BASELINE_ANGLES; k++) sum += model.densityAt(R, (k / EDGE_ON_BASELINE_ANGLES) * 2 * Math.PI, z);
      baseCoarse[biR + bnR * biz] = sum / EDGE_ON_BASELINE_ANGLES;
    }
  }
  const baseline = new Float64Array(nR * nz);
  for (let iz = 0; iz < nz; iz++) {
    const bz = Math.min(bnz - 1, Math.max(0, ((iz + 0.5) / nz) * bnz - 0.5));
    const bz0 = Math.floor(bz), bz1 = Math.min(bnz - 1, bz0 + 1), fz = bz - bz0;
    for (let iR = 0; iR < nR; iR++) {
      const bR = Math.min(bnR - 1, Math.max(0, ((iR + 0.5) / nR) * bnR - 0.5));
      const bR0 = Math.floor(bR), bR1 = Math.min(bnR - 1, bR0 + 1), fR = bR - bR0;
      const v00 = baseCoarse[bR0 + bnR * bz0]!, v10 = baseCoarse[bR1 + bnR * bz0]!;
      const v01 = baseCoarse[bR0 + bnR * bz1]!, v11 = baseCoarse[bR1 + bnR * bz1]!;
      const v0 = v00 * (1 - fR) + v10 * fR, v1 = v01 * (1 - fR) + v11 * fR;
      baseline[iR + nR * iz] = v0 * (1 - fz) + v1 * fz;
    }
  }
  const shape = normaliseForDisplay(baseline, { log: true });
  return { baseline, shape };
}

/** The real field at ONE angle, on the display grid - factored out
 *  alongside `edgeOnBaselineAndShape` for the same reason. */
function edgeOnActualAt(
  model: GalaxyModel, angleRad: number, maxRadiusPc: number, halfHeightPc: number,
  res: { readonly nR: number; readonly nz: number },
): Float64Array {
  const { nR, nz } = res;
  const Rat = (iR: number, n: number): number => ((iR + 0.5) / n) * maxRadiusPc;
  const Zat = (iz: number, n: number): number => -halfHeightPc + ((iz + 0.5) / n) * 2 * halfHeightPc;
  const actual = new Float64Array(nR * nz);
  for (let iz = 0; iz < nz; iz++) {
    const z = Zat(iz, nz);
    for (let iR = 0; iR < nR; iR++) actual[iR + nR * iz] = model.densityAt(Rat(iR, nR), angleRad, z);
  }
  return actual;
}

/** Deviation-from-baseline, gamma-boosted - the shared math both
 *  `edgeOnDisplayField` and `diametralEdgeOnDisplayField` apply to whichever
 *  `actual` grid they were given, BEFORE either one's own percentile
 *  stretch (which is where the two functions genuinely differ - see
 *  `diametralEdgeOnDisplayField`'s own header for why). */
function edgeOnBoost(baseline: Float64Array, actual: Float64Array): Float64Array {
  const boosted = new Float64Array(baseline.length);
  for (let i = 0; i < boosted.length; i++) {
    const ratio = baseline[i]! > 0 ? actual[i]! / baseline[i]! : 1;
    const dev = ratio - 1;
    boosted[i] = dev === 0 ? 0 : Math.sign(dev) * Math.pow(Math.abs(dev), EDGE_ON_CONTRAST_GAMMA);
  }
  return boosted;
}

export function edgeOnDisplayField(
  model: GalaxyModel, angleRad: number, maxRadiusPc: number, halfHeightPc: number,
  res: { readonly nR: number; readonly nz: number },
): Float64Array {
  const { baseline, shape } = edgeOnBaselineAndShape(model, maxRadiusPc, halfHeightPc, res);
  const actual = edgeOnActualAt(model, angleRad, maxRadiusPc, halfHeightPc, res);
  const boosted = edgeOnBoost(baseline, actual);

  const lit: number[] = [];
  for (let i = 0; i < boosted.length; i++) if (shape[i]! > 0.05) lit.push(boosted[i]!);
  lit.sort((a, b) => a - b);
  const q = (p: number): number => (lit.length ? lit[Math.min(lit.length - 1, Math.floor(p * lit.length))]! : 0);
  const LO = lit.length ? q(0.02) : 0;
  const HI = lit.length ? q(0.98) : 0;
  const span = HI - LO;
  const hasStructure = span > 1e-9;

  const out = new Float64Array(boosted.length);
  for (let i = 0; i < out.length; i++) {
    const modulation = hasStructure ? Math.min(1, Math.max(0, (boosted[i]! - LO) / span)) : 1;
    out[i] = shape[i]! * (EDGE_ON_MODULATION_FLOOR + (1 - EDGE_ON_MODULATION_FLOOR) * modulation);
  }
  return out;
}

/**
 * The DIAMETRAL side-on field (Amendment R4, morphology patch v3.0, Step
 * 6): the galactic centre sampled outward along BOTH `angleRad` (`near`,
 * the same side `edgeOnDisplayField` alone would show) and `angleRad + PI`
 * (`far`, the mirrored opposite side) - one continuous slice through the
 * disc, centre at centre, rather than the half-plane a single-angle call
 * shows.
 *
 * Shares ONE `edgeOnBaselineAndShape` call (genuinely azimuth-independent,
 * computed once - Law 1) and, critically, ONE percentile-stretch pool
 * across BOTH sides' `boosted` values. Stretching each side independently
 * would let two genuinely different real contrast levels - an arm crossing
 * one side, none on the other - each re-normalise to its OWN [2nd,98th]
 * percentile range and so both read as "full contrast" regardless of which
 * side is actually busier. That would erase exactly the asymmetry this view
 * exists to show and make gate D4 ("the two halves differ for an armed
 * model") pass for the wrong reason even when it held. Sharing the pool
 * means a side with genuinely less structure reads as genuinely dimmer/
 * flatter than the other, honestly.
 *
 * On an AXISYMMETRIC model `actual` at `angleRad` and `angleRad + PI` are
 * identical (`model.densityAt` ignores theta), so `near` and `far` come out
 * bit-identical too - not merely visually similar, `===` - which is exactly
 * gate D4's other half ("...and are identical for an axisymmetric one").
 */
export function diametralEdgeOnDisplayField(
  model: GalaxyModel, angleRad: number, maxRadiusPc: number, halfHeightPc: number,
  res: { readonly nR: number; readonly nz: number },
): { readonly near: Float64Array; readonly far: Float64Array } {
  const { baseline, shape } = edgeOnBaselineAndShape(model, maxRadiusPc, halfHeightPc, res);
  const actualNear = edgeOnActualAt(model, angleRad, maxRadiusPc, halfHeightPc, res);
  const actualFar = edgeOnActualAt(model, angleRad + Math.PI, maxRadiusPc, halfHeightPc, res);
  const boostedNear = edgeOnBoost(baseline, actualNear);
  const boostedFar = edgeOnBoost(baseline, actualFar);

  const lit: number[] = [];
  for (let i = 0; i < boostedNear.length; i++) {
    if (shape[i]! > 0.05) { lit.push(boostedNear[i]!); lit.push(boostedFar[i]!); }
  }
  lit.sort((a, b) => a - b);
  const q = (p: number): number => (lit.length ? lit[Math.min(lit.length - 1, Math.floor(p * lit.length))]! : 0);
  const LO = lit.length ? q(0.02) : 0;
  const HI = lit.length ? q(0.98) : 0;
  const span = HI - LO;
  const hasStructure = span > 1e-9;

  const finish = (boosted: Float64Array): Float64Array => {
    const out = new Float64Array(boosted.length);
    for (let i = 0; i < out.length; i++) {
      const modulation = hasStructure ? Math.min(1, Math.max(0, (boosted[i]! - LO) / span)) : 1;
      out[i] = shape[i]! * (EDGE_ON_MODULATION_FLOOR + (1 - EDGE_ON_MODULATION_FLOOR) * modulation);
    }
    return out;
  };
  return { near: finish(boostedNear), far: finish(boostedFar) };
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
 *  8. modulateArmsForDisplay (rewritten 17 Aug 2026, superseding the retired
 *     `emphasiseArmsForDisplay`) reveals real azimuthal contrast - a field
 *     with a real azimuthal bump but a strong radial falloff shows a LARGER
 *     value spread across azimuth at fixed radius than `normaliseForDisplay`
 *     alone would leave visible relative to the radial spread - the
 *     property that fixes the "arms invisible" bug this exists to close.
 *  9. modulateArmsForDisplay always returns values in [0, 1].
 *  10. modulateArmsForDisplay does NOT erase a field's own radial
 *      concentration - on a field with a strong central peak, the CENTRE
 *      displays brighter than a point far off-centre at the same or lower
 *      density, never dimmer (the exact regression the retired function's
 *      ratio-to-ring-mean transform caused for the boxy/peanut bulge,
 *      confirmed directly before this rewrite: centre displayed at 0.58,
 *      a point ~1750pc off-centre at 0.94 - BRIGHTER than the centre).
 *  11. On a field with NO azimuthal structure at all (radially symmetric),
 *      modulateArmsForDisplay's output is uniform at every fixed radius (up
 *      to floating-point tolerance) - it does not manufacture structure
 *      that is not there.
 *  12. modulateArmsForDisplay never renders a LIT interarm/background cell
 *      as literal black - `ARM_MODULATION_FLOOR` guarantees a minimum
 *      modulation multiplier for any cell the underlying shape has not
 *      itself already faded near zero.
 *  13. The floor does not erase the on-arm/off-arm contrast gate 8 proved -
 *      an arm still reads meaningfully brighter than its own interarm gap.
 *  14. edgeOnDisplayField (16 Aug 2026) always returns values in [0, 1].
 *  15. edgeOnDisplayField is deterministic - same model/angle/extent/
 *      resolution gives a BIT-identical grid, `===` on every element.
 *  16. On a model with NO theta-dependence at all (every `densityAt(R,t,z)`
 *      identical across `t`), edgeOnDisplayField's output is IDENTICAL to
 *      calling it at a different `angleRad` - it does not manufacture
 *      azimuthal structure that is not there.
 *  17. On a model WITH real theta-dependence (a spiral with live arm
 *      contrast), edgeOnDisplayField's output DOES vary with `angleRad` -
 *      the property that fixes "no idea what this side-on view is
 *      showing, no difference left to right" this function exists to close.
 */
export const DENSITY_MAP_GATES = 17 as const;
