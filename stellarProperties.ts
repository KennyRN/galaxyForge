/**
 * stellarProperties - class -> temperature, colour, luminosity, mass, radius.
 * First module built (Stage 1): three later stages import from it and it has
 * no dependencies of its own.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * MAIN SEQUENCE TABLE. Eric Mamajek, "A Modern Mean Dwarf Stellar Color and
 * Effective Temperature Sequence" (Pecaut & Mamajek 2013, ApJS 208, 9,
 * doi:10.1088/0067-0049/208/1/9), the LIVING online table at
 * https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt
 * RETRIEVED 2026-08-15, file version stamped **2022.04.16** by the source
 * itself. Sixty-five rows, O5V-M9V, every whole spectral subtype. Grade
 * `sourced`, and it is a LIVING table exactly like the S4.1 10 pc catalogue -
 * refresh the retrieval date and re-diff before treating a future edit as
 * final. Columns used: Teff(K), logL (log10 L/Lsun), B-V, Mv, R_Rsun, Msun.
 *
 * MAIN-SEQUENCE LIFETIME. Choi et al. 2016 (MIST v1, ApJ 823, 102,
 * doi:10.3847/0004-637X/823/2/102) is the NAMED TARGET GRID for
 * `msLifetimeGyr`, but this module does NOT embed or interpolate the literal
 * MIST isochrone tables - those are gigabytes of per-metallicity grids, not a
 * fit that belongs inert inside a plugin bundle. What ships instead is an
 * ANALYTIC tau = tau_sun * (M/Msun) / (L(M,feh)/Lsun) approximation, with
 * L(M) read by log-log interpolation off the Mamajek table above (so the
 * mass-luminosity relation IS sourced) and a small explicit metallicity
 * correction on L (NOT sourced from Choi 2016 - see the ledger). **Grade the
 * WHOLE function `calibrated`, never `sourced`, until MIST is actually
 * embedded** - that is the honest reading of Law 6, and the explicit upgrade
 * path this header commits to.
 *
 * Hansen & Kawaler's power law, named in the brief as the thing to delete, is
 * not present here - this is a from-scratch stage-1 build, not an edit of
 * prior code, so there is nothing to delete; recorded so a reviewer does not
 * go looking for a citation that was never shipped.
 *
 * -- A TRAP THIS AUDIT FOUND, recorded so it is not silently "fixed" later --
 * `absMagV('G2V')` returns **4.80** (the Mamajek table's row for the mean of
 * many G2V stars), NOT **4.83** (the IAU-nominal absolute V magnitude of the
 * Sun specifically, IAU 2015 Resolution B2, doi:10.48550/arXiv.1510.06262).
 * Same class of trap as S4.1's CNS5/Reyle near-coincidence: two numbers close
 * enough to be typo'd into each other, measuring different things. The Sun is
 * an individually-measured star that happens to sit in the G2V bin; it is not
 * defined to equal that bin's mean. `absMagV` stays a genuine class-mean
 * accessor (this module's job); `SUN_ABS_MAG_V` is exported separately as the
 * literal Sun constant, for `sky` and any other module that means the Sun and
 * not "a star shaped like the Sun".
 *
 * genVersion: this module supplies constants other modules consume; a change
 * to the table or the lifetime approximation is a genVersion-bumping event.
 */

/* ------------------------------- taxonomy --------------------------------- */

/**
 * Sixty-five main-sequence classes, O5V to M9V, every whole subtype - the
 * exact set of rows retrieved from the Mamajek table above. Declared here,
 * the owning module, and re-exported through `types.ts`.
 */
export type StellarClass =
  | 'O5V' | 'O6V' | 'O7V' | 'O8V' | 'O9V'
  | 'B0V' | 'B1V' | 'B2V' | 'B3V' | 'B4V' | 'B5V' | 'B6V' | 'B7V' | 'B8V' | 'B9V'
  | 'A0V' | 'A1V' | 'A2V' | 'A3V' | 'A4V' | 'A5V' | 'A6V' | 'A7V' | 'A8V' | 'A9V'
  | 'F0V' | 'F1V' | 'F2V' | 'F3V' | 'F4V' | 'F5V' | 'F6V' | 'F7V' | 'F8V' | 'F9V'
  | 'G0V' | 'G1V' | 'G2V' | 'G3V' | 'G4V' | 'G5V' | 'G6V' | 'G7V' | 'G8V' | 'G9V'
  | 'K0V' | 'K1V' | 'K2V' | 'K3V' | 'K4V' | 'K5V' | 'K6V' | 'K7V' | 'K8V' | 'K9V'
  | 'M0V' | 'M1V' | 'M2V' | 'M3V' | 'M4V' | 'M5V' | 'M6V' | 'M7V' | 'M8V' | 'M9V';

/**
 * Every kind a `Star` may carry. Widened at Stage 1 (Build 1) with the two
 * placed-remnant kinds `remnants` needs; `'white-dwarf'` already existed for
 * promoted binary companions (Stage 5) and now also covers placed singles.
 */
export type StarKind = StellarClass | 'white-dwarf' | 'neutron-star' | 'black-hole';

/* --------------------------------- table ----------------------------------- */

interface ClassRow {
  readonly class: StellarClass;
  readonly teffK: number;
  readonly logL: number;       // log10(L / Lsun)
  readonly colourBV: number;
  readonly absMagV: number;
  readonly radiusSol: number;
  readonly massSol: number;
}

// Sorted hottest -> coolest, exactly the table's own order. Values verbatim
// from the 2022.04.16 retrieval; do not hand-edit a single figure without a
// fresh retrieval to diff against (this is a living source, S4.1's discipline
// applies here too).
const TABLE: readonly ClassRow[] = [
  { class: 'O5V', teffK: 41400, logL: 5.54, colourBV: -0.323, absMagV: -5.35, radiusSol: 11.45, massSol: 43 },
  { class: 'O6V', teffK: 39500, logL: 5.36, colourBV: -0.321, absMagV: -5.10, radiusSol: 10.27, massSol: 35 },
  { class: 'O7V', teffK: 37100, logL: 5.18, colourBV: -0.318, absMagV: -4.80, radiusSol: 9.42, massSol: 28 },
  { class: 'O8V', teffK: 35100, logL: 4.99, colourBV: -0.315, absMagV: -4.50, radiusSol: 8.47, massSol: 23.6 },
  { class: 'O9V', teffK: 33300, logL: 4.82, colourBV: -0.312, absMagV: -4.20, radiusSol: 7.72, massSol: 20.2 },
  { class: 'B0V', teffK: 31400, logL: 4.65, colourBV: -0.301, absMagV: -3.90, radiusSol: 7.16, massSol: 17.7 },
  { class: 'B1V', teffK: 26000, logL: 4.13, colourBV: -0.278, absMagV: -3.00, radiusSol: 5.71, massSol: 11.8 },
  { class: 'B2V', teffK: 20600, logL: 3.43, colourBV: -0.215, absMagV: -1.80, radiusSol: 4.06, massSol: 7.3 },
  { class: 'B3V', teffK: 17000, logL: 2.99, colourBV: -0.178, absMagV: -1.20, radiusSol: 3.61, massSol: 5.4 },
  { class: 'B4V', teffK: 16400, logL: 2.89, colourBV: -0.165, absMagV: -1.00, radiusSol: 3.46, massSol: 5.1 },
  { class: 'B5V', teffK: 15700, logL: 2.77, colourBV: -0.156, absMagV: -0.85, radiusSol: 3.36, massSol: 4.7 },
  { class: 'B6V', teffK: 14500, logL: 2.57, colourBV: -0.140, absMagV: -0.55, radiusSol: 3.27, massSol: 4.3 },
  { class: 'B7V', teffK: 14000, logL: 2.48, colourBV: -0.128, absMagV: -0.40, radiusSol: 2.94, massSol: 3.92 },
  { class: 'B8V', teffK: 12300, logL: 2.19, colourBV: -0.109, absMagV: 0.00, radiusSol: 2.86, massSol: 3.38 },
  { class: 'B9V', teffK: 10700, logL: 1.86, colourBV: -0.070, absMagV: 0.50, radiusSol: 2.49, massSol: 2.75 },
  { class: 'A0V', teffK: 9700, logL: 1.58, colourBV: 0.000, absMagV: 0.99, radiusSol: 2.193, massSol: 2.18 },
  { class: 'A1V', teffK: 9300, logL: 1.49, colourBV: 0.035, absMagV: 1.16, radiusSol: 2.136, massSol: 2.05 },
  { class: 'A2V', teffK: 8800, logL: 1.38, colourBV: 0.070, absMagV: 1.35, radiusSol: 2.117, massSol: 1.98 },
  { class: 'A3V', teffK: 8600, logL: 1.23, colourBV: 0.100, absMagV: 1.70, radiusSol: 1.861, massSol: 1.86 },
  { class: 'A4V', teffK: 8250, logL: 1.13, colourBV: 0.140, absMagV: 1.94, radiusSol: 1.794, massSol: 1.93 },
  { class: 'A5V', teffK: 8100, logL: 1.09, colourBV: 0.160, absMagV: 2.01, radiusSol: 1.785, massSol: 1.88 },
  { class: 'A6V', teffK: 7910, logL: 1.05, colourBV: 0.185, absMagV: 2.12, radiusSol: 1.775, massSol: 1.83 },
  { class: 'A7V', teffK: 7760, logL: 1.00, colourBV: 0.210, absMagV: 2.23, radiusSol: 1.750, massSol: 1.77 },
  { class: 'A8V', teffK: 7590, logL: 0.96, colourBV: 0.250, absMagV: 2.32, radiusSol: 1.747, massSol: 1.81 },
  { class: 'A9V', teffK: 7400, logL: 0.92, colourBV: 0.270, absMagV: 2.43, radiusSol: 1.747, massSol: 1.75 },
  { class: 'F0V', teffK: 7220, logL: 0.86, colourBV: 0.295, absMagV: 2.57, radiusSol: 1.728, massSol: 1.61 },
  { class: 'F1V', teffK: 7020, logL: 0.79, colourBV: 0.330, absMagV: 2.76, radiusSol: 1.679, massSol: 1.50 },
  { class: 'F2V', teffK: 6820, logL: 0.71, colourBV: 0.370, absMagV: 2.97, radiusSol: 1.622, massSol: 1.46 },
  { class: 'F3V', teffK: 6750, logL: 0.67, colourBV: 0.390, absMagV: 3.08, radiusSol: 1.578, massSol: 1.44 },
  { class: 'F4V', teffK: 6670, logL: 0.62, colourBV: 0.410, absMagV: 3.20, radiusSol: 1.533, massSol: 1.38 },
  { class: 'F5V', teffK: 6550, logL: 0.56, colourBV: 0.440, absMagV: 3.37, radiusSol: 1.473, massSol: 1.33 },
  { class: 'F6V', teffK: 6350, logL: 0.43, colourBV: 0.486, absMagV: 3.69, radiusSol: 1.359, massSol: 1.25 },
  { class: 'F7V', teffK: 6280, logL: 0.39, colourBV: 0.500, absMagV: 3.80, radiusSol: 1.324, massSol: 1.21 },
  { class: 'F8V', teffK: 6180, logL: 0.29, colourBV: 0.530, absMagV: 4.05, radiusSol: 1.221, massSol: 1.18 },
  { class: 'F9V', teffK: 6050, logL: 0.22, colourBV: 0.560, absMagV: 4.25, radiusSol: 1.167, massSol: 1.13 },
  { class: 'G0V', teffK: 5930, logL: 0.13, colourBV: 0.595, absMagV: 4.48, radiusSol: 1.100, massSol: 1.06 },
  { class: 'G1V', teffK: 5860, logL: 0.08, colourBV: 0.622, absMagV: 4.62, radiusSol: 1.060, massSol: 1.03 },
  { class: 'G2V', teffK: 5770, logL: 0.01, colourBV: 0.650, absMagV: 4.80, radiusSol: 1.012, massSol: 1.00 },
  { class: 'G3V', teffK: 5720, logL: -0.01, colourBV: 0.660, absMagV: 4.87, radiusSol: 1.002, massSol: 0.99 },
  { class: 'G4V', teffK: 5680, logL: -0.04, colourBV: 0.670, absMagV: 4.93, radiusSol: 0.991, massSol: 0.985 },
  { class: 'G5V', teffK: 5660, logL: -0.05, colourBV: 0.680, absMagV: 4.98, radiusSol: 0.977, massSol: 0.98 },
  { class: 'G6V', teffK: 5600, logL: -0.10, colourBV: 0.700, absMagV: 5.10, radiusSol: 0.949, massSol: 0.97 },
  { class: 'G7V', teffK: 5550, logL: -0.13, colourBV: 0.710, absMagV: 5.20, radiusSol: 0.927, massSol: 0.95 },
  { class: 'G8V', teffK: 5480, logL: -0.17, colourBV: 0.730, absMagV: 5.30, radiusSol: 0.914, massSol: 0.94 },
  { class: 'G9V', teffK: 5380, logL: -0.26, colourBV: 0.775, absMagV: 5.55, radiusSol: 0.853, massSol: 0.90 },
  { class: 'K0V', teffK: 5270, logL: -0.34, colourBV: 0.816, absMagV: 5.78, radiusSol: 0.813, massSol: 0.88 },
  { class: 'K1V', teffK: 5170, logL: -0.39, colourBV: 0.857, absMagV: 5.95, radiusSol: 0.797, massSol: 0.86 },
  { class: 'K2V', teffK: 5100, logL: -0.43, colourBV: 0.884, absMagV: 6.07, radiusSol: 0.783, massSol: 0.82 },
  { class: 'K3V', teffK: 4830, logL: -0.55, colourBV: 0.990, absMagV: 6.50, radiusSol: 0.755, massSol: 0.78 },
  { class: 'K4V', teffK: 4600, logL: -0.69, colourBV: 1.090, absMagV: 6.98, radiusSol: 0.713, massSol: 0.73 },
  { class: 'K5V', teffK: 4440, logL: -0.76, colourBV: 1.150, absMagV: 7.28, radiusSol: 0.701, massSol: 0.70 },
  { class: 'K6V', teffK: 4300, logL: -0.86, colourBV: 1.240, absMagV: 7.64, radiusSol: 0.669, massSol: 0.69 },
  { class: 'K7V', teffK: 4100, logL: -1.00, colourBV: 1.340, absMagV: 8.16, radiusSol: 0.630, massSol: 0.64 },
  { class: 'K8V', teffK: 3990, logL: -1.06, colourBV: 1.363, absMagV: 8.43, radiusSol: 0.615, massSol: 0.62 },
  { class: 'K9V', teffK: 3930, logL: -1.10, colourBV: 1.400, absMagV: 8.56, radiusSol: 0.608, massSol: 0.59 },
  { class: 'M0V', teffK: 3850, logL: -1.16, colourBV: 1.420, absMagV: 8.80, radiusSol: 0.588, massSol: 0.57 },
  { class: 'M1V', teffK: 3660, logL: -1.39, colourBV: 1.485, absMagV: 9.64, radiusSol: 0.501, massSol: 0.50 },
  { class: 'M2V', teffK: 3560, logL: -1.54, colourBV: 1.505, absMagV: 10.21, radiusSol: 0.446, massSol: 0.44 },
  { class: 'M3V', teffK: 3430, logL: -1.79, colourBV: 1.530, absMagV: 11.15, radiusSol: 0.361, massSol: 0.37 },
  { class: 'M4V', teffK: 3210, logL: -2.14, colourBV: 1.650, absMagV: 12.61, radiusSol: 0.274, massSol: 0.23 },
  { class: 'M5V', teffK: 3060, logL: -2.52, colourBV: 1.830, absMagV: 14.15, radiusSol: 0.196, massSol: 0.162 },
  { class: 'M6V', teffK: 2810, logL: -2.98, colourBV: 2.010, absMagV: 16.32, radiusSol: 0.137, massSol: 0.102 },
  { class: 'M7V', teffK: 2680, logL: -3.19, colourBV: 2.120, absMagV: 17.70, radiusSol: 0.120, massSol: 0.090 },
  { class: 'M8V', teffK: 2570, logL: -3.28, colourBV: 2.150, absMagV: 18.60, radiusSol: 0.114, massSol: 0.085 },
  { class: 'M9V', teffK: 2380, logL: -3.52, colourBV: 2.170, absMagV: 19.40, radiusSol: 0.102, massSol: 0.079 },
];

/** Every class this module knows, in the table's own (hottest -> coolest)
 *  order. Iteration elsewhere - e.g. Stage 3's birth-fraction computation -
 *  walks THIS array, never re-derives an order from the type. */
export const STELLAR_CLASSES: readonly StellarClass[] = TABLE.map((r) => r.class);

const BY_CLASS: ReadonlyMap<StellarClass, ClassRow> = new Map(TABLE.map((r) => [r.class, r]));

function row(c: StellarClass): ClassRow {
  const r = BY_CLASS.get(c);
  if (!r) throw new Error(`stellarProperties: unknown class ${JSON.stringify(c)}`);
  return r;
}

/* ------------------------------ accessors ---------------------------------- */

export function teffK(c: StellarClass): number { return row(c).teffK; }
export function colourBV(c: StellarClass): number { return row(c).colourBV; }
export function radiusSol(c: StellarClass): number { return row(c).radiusSol; }

/** Msun. The brief's own name for this accessor. Trivial once the table
 *  exists - kept as a named export because `Population.nLocal`-adjacent code
 *  and Stage 3's deconvolution both want "the representative mass of this
 *  class" without reaching into the table shape themselves. */
export function representativeMass(c: StellarClass): number { return row(c).massSol; }

/** Lsun, from the table's own log10(L/Lsun) column. */
export function luminositySol(c: StellarClass): number { return Math.pow(10, row(c).logL); }

/** Mv, the Mamajek MEAN-SEQUENCE value for this class. See the header trap
 *  note: this is NOT the Sun's own 4.83 for `absMagV('G2V')`, and must not be
 *  "corrected" to be - it would stop being the class mean. */
export function absMagV(c: StellarClass): number { return row(c).absMagV; }

/** The Sun's own IAU-nominal absolute V magnitude - a SPECIFIC star, not the
 *  G2V class mean. IAU 2015 Resolution B2 (doi:10.48550/arXiv.1510.06262).
 *  `sky` and any module that means Sol itself, not "a G2V-like star", reads
 *  this rather than `absMagV('G2V')`. */
export const SUN_ABS_MAG_V = 4.83;

/* ----------------------- mass-luminosity interpolation --------------------- */

// Same 65 rows, re-sorted by MASS ascending for interpolation. The Mamajek
// sequence is empirical, not a smooth fit, so mass is not perfectly monotonic
// against Teff (e.g. A4V's tabulated mass sits fractionally above A5V's) -
// true of the source, not a transcription slip, and harmless here: log-log
// interpolation over a mass-sorted array just produces a very slightly wiggly
// L(M) in that one corner, never a non-finite or negative result.
const BY_MASS: readonly ClassRow[] = [...TABLE].sort((a, b) => a.massSol - b.massSol);
const LOG_MASS: readonly number[] = BY_MASS.map((r) => Math.log10(r.massSol));
const LOG_LUM: readonly number[] = BY_MASS.map((r) => r.logL);

/**
 * log10(L/Lsun) for an arbitrary mass, by linear interpolation in log-log
 * space against the Mamajek table. Extrapolates beyond the table's covered
 * range (0.079-43 Msun) using the nearest boundary segment's slope, rather
 * than clamping flat - a flat clamp would silently give every very-low-mass
 * or very-high-mass draw the same lifetime, which is worse than a linear
 * extrapolation's honestly-bounded error.
 */
function log10LuminosityForMass(massSol: number): number {
  const lm = Math.log10(massSol);
  const n = LOG_MASS.length;
  if (lm <= LOG_MASS[0]!) {
    const slope = (LOG_LUM[1]! - LOG_LUM[0]!) / (LOG_MASS[1]! - LOG_MASS[0]!);
    return LOG_LUM[0]! + slope * (lm - LOG_MASS[0]!);
  }
  if (lm >= LOG_MASS[n - 1]!) {
    const slope = (LOG_LUM[n - 1]! - LOG_LUM[n - 2]!) / (LOG_MASS[n - 1]! - LOG_MASS[n - 2]!);
    return LOG_LUM[n - 1]! + slope * (lm - LOG_MASS[n - 1]!);
  }
  // binary search for the bracketing pair
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (LOG_MASS[mid]! <= lm) lo = mid; else hi = mid;
  }
  const t = (lm - LOG_MASS[lo]!) / (LOG_MASS[hi]! - LOG_MASS[lo]!);
  return LOG_LUM[lo]! + t * (LOG_LUM[hi]! - LOG_LUM[lo]!);
}

/**
 * Multiplicative luminosity correction for metallicity, at FIXED mass.
 * Lower [Fe/H] -> lower envelope opacity -> hotter, more luminous star at the
 * same mass -> shorter main-sequence lifetime. The DIRECTION is textbook
 * stellar-structure behaviour (it is why metal-poor globular-cluster main
 * sequences sit blueward of open-cluster ones at fixed mass); the MAGNITUDE
 * below is `tunable`, not read off Choi 2016 - seue the header. */
const FEH_LOG_LUM_PER_DEX = 0.15;   // tunable

function log10LuminosityForMassFeh(massSol: number, feh: number): number {
  return log10LuminosityForMass(massSol) - FEH_LOG_LUM_PER_DEX * feh;
}

/**
 * Anchor: the Sun's total main-sequence lifetime, in Gyr. A standard
 * order-of-magnitude figure for a solar-type star's full core-hydrogen-burning
 * span (current solar age ~4.6 Gyr is roughly the midpoint). `calibrated` -
 * this whole function is an M/L approximation, not a MIST-grid readout; see
 * the header for the explicit upgrade path.
 */
const TAU_SUN_GYR = 10.0;   // calibrated

/**
 * Main-sequence lifetime, Gyr, for a continuous mass and metallicity.
 * tau(M, feh) = TAU_SUN_GYR * (M/Msun) / (L(M,feh)/Lsun) - the standard
 * "nuclear fuel over burn rate" scaling, self-consistent with the Mamajek
 * mass-luminosity relation at feh = 0 by construction (tau(1, 0) lands within
 * a few percent of TAU_SUN_GYR because the table's own G2V point is not
 * exactly L = 1, which is honest: the table is an ensemble mean, not the Sun).
 */
export function msLifetimeGyr(massSol: number, feh: number): number {
  if (!(massSol > 0)) throw new Error(`msLifetimeGyr: massSol must be > 0, got ${massSol}`);
  const l = Math.pow(10, log10LuminosityForMassFeh(massSol, feh));
  return (TAU_SUN_GYR * massSol) / l;
}

/**
 * Inverse of `msLifetimeGyr` in mass: the mass whose main-sequence lifetime
 * exactly equals `ageGyr` - i.e. the mass just now leaving the main
 * sequence for a population of this age. `derived` - bisection against
 * `msLifetimeGyr` itself rather than a separately-fitted formula, so this
 * can never numerically disagree with the lifetime relation it inverts
 * (gate 1's own monotonicity guarantee is exactly what makes the bisection
 * safe). Added 16 Aug 2026 to thread a physically real progenitor lower
 * bound into `remnants.ts`'s white-dwarf chain.
 */
export function turnoffMassSol(ageGyr: number, feh: number): number {
  if (!(ageGyr > 0)) throw new Error(`turnoffMassSol: ageGyr must be > 0, got ${ageGyr}`);
  let lo = 0.08, hi = 100;
  // msLifetimeGyr is monotonically DECREASING in mass, so a shorter target
  // age moves the root toward hi.
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (msLifetimeGyr(mid, feh) > ageGyr) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. `msLifetimeGyr` is monotonically decreasing in mass at fixed feh.
 *  2. At fixed mass, LOWER [Fe/H] gives a SHORTER lifetime (Stage 1's own gate).
 *  3. `msLifetimeGyr(1, 0)` lands within an order-of-magnitude sanity band of
 *     10 Gyr - it is a `calibrated` approximation, not a promise of precision.
 *  4. `absMagV('G2V')` is close to but NOT bit-identical to `SUN_ABS_MAG_V` -
 *     the header's trap, asserted rather than merely documented.
 *  5. The table is well-formed: 65 unique classes, Teff strictly decreasing
 *     hottest -> coolest in table order, every mass/radius/luminosity positive.
 */
export const STELLAR_PROPERTIES_GATES = 5 as const;

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Main-sequence class', status: 'sourced',
    short: 'A star\'s spectral type on the main sequence (e.g. G2V).',
    long: 'Sixty-five classes, O5V to M9V, every whole subtype, with temperature, colour, luminosity, mass and radius from Eric Mamajek\'s living EEM dwarf sequence table (Pecaut & Mamajek 2013).',
    source: 'Pecaut & Mamajek 2013, ApJS 208, 9; table retrieved 2026-08-15, version 2022.04.16',
  },
  {
    term: 'Main-sequence lifetime', status: 'calibrated',
    short: 'How long a star of a given mass and metallicity stays on the main sequence.',
    long: 'An M/L-based analytic approximation, NOT a literal MIST grid interpolation (which would need gigabytes of tables this plugin cannot ship). The mass-luminosity relation is read off the sourced Mamajek table; the metallicity correction is a calibrated multiplier.',
    source: 'Choi et al. 2016, ApJ 823, 102 (MIST) is the named upgrade-path target, not the source of today\'s numbers',
  },
];
