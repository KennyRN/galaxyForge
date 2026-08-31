/**
 * ism - interstellar medium (gas + dust) volume density. The RELATIVE field
 * (`ismDensityAt`) is RENDER-ONLY (Amendment A8, morphology patch v3.0,
 * 17 Aug 2026); the ABSOLUTE midplane accessor (`absoluteMidplaneDensityCm3`,
 * P17, 30 Aug 2026) IS on the generation path - see below.
 *
 * -- SCOPE, STATED PLAINLY -----------------------------------------------------
 * `ismDensityAt` owns gas/dust volume density for the PREVIEW only: no
 * `SystemCore` field reads it, no note content changes because of it, it does
 * not participate in `genVersion` - the same "alters what you see, never what
 * exists" invariant `densityMap.ts` states for itself. `sky.ts`'s own header
 * records why sector-level extinction is not yet coupled into apparent
 * magnitude and what that future coupling would cost.
 *
 * -- P17: THE ABSOLUTE MIDPLANE ACCESSOR IS NOT RENDER-ONLY ------------------
 * `absoluteMidplaneDensityCm3(R, z)` = the same relative vertical/radial
 * profile shape as `ismDensityAt` (arm modulation dropped - it is a smooth
 * axisymmetric envelope), scaled by a sourced normalisation
 * `N_MIDPLANE_R0_CM3` so it returns a real number density in cm^-3.
 * `nebulaMorphology.ts` reads it (via `starFormingComplexes.placeYoungClustered`)
 * to size the Stromgren sphere and Weaver wind shell of every star-forming
 * complex - which MOVES placed young systems. So this accessor:
 *   - LOSES the Amendment A8 render-only exemption. It joins the `genVersion`
 *     / `galaxyConfigHash` contract: the day `N_MIDPLANE_R0_CM3` or the
 *     profile shape changes, spiral/barredSpiral/milkyWayAnalogue galaxies
 *     fork.
 *   - is the FIRST science stone of the full ISM-module promotion (a
 *     separately-specced later workstream). It is deliberately the minimal
 *     forward-compatible slice - one accessor, one constant - not a throwaway.
 *   - is read by exactly ONE module, `nebulaMorphology.ts` (via
 *     `nebulaNatalDensityCm3`; revised gate 8b). `ismDensityAt` (relative)
 *     stays read by exactly ONE module, `galaxyCreationModals.ts` (gate 8a,
 *     unchanged). Both are tripwires.
 * `ismDensityAt` and its render callers are a NON-CHANGE guard here -
 * byte-identical, verified (gate 9).
 *
 * Consumes the EXISTING arm field (`spiralArms.armFactor`) for its own
 * azimuthal modulation rather than rolling independent arm structure -
 * `starFormingComplexes.ts` and `spiralArms.ts` own where stars actually
 * FORM; this module's arm response is DERIVED from the same geometry they
 * already compute, never a second, competing arm model (A8's own rule,
 * Law 1 - "no reaching into another module's owned quantity").
 *
 * -- PROVENANCE ------------------------------------------------------------
 * SCALE HEIGHTS AT THE SOLAR RADIUS. `sourced`: multiple corroborating
 * literature estimates converge on ~100 pc for the molecular (H2) layer at
 * the solar position (R~8.2 kpc) - Nakanishi & Sofue 2006's own 3D
 * molecular-gas map of the whole Milky Way disc states the molecular scale
 * height varies "between ~50 and 200 pc as one moves from the centre to
 * R~10 kpc", and independently gives the atomic (HI) scale height as ~2x
 * the molecular value AT EVERY RADIUS - the ratio this module uses
 * (`ATOMIC_TO_MOLECULAR_SCALE_HEIGHT_RATIO`). An EARLIER draft of this
 * module estimated h_H2(R0) by linearly interpolating between Nakanishi &
 * Sofue's own two stated endpoints (50pc at R=0, 200pc at R=10kpc), which
 * gives ~173pc at R0=8178pc - notably higher than what direct
 * solar-radius-specific literature actually reports. That estimate was
 * caught and replaced before use, not carried through: a two-point linear
 * interpolation across a wide radial range is a poor proxy for the true
 * (non-linear) profile's value near one endpoint, and a second web search
 * targeted specifically at the solar radius returned the ~100pc figure
 * directly, corroborated across several independent summaries. `100 pc` is
 * used here, not the interpolated ~173pc.
 *
 * FLARING FORM. `calibrated`, not sourced to a specific functional form:
 * Kalberla & Kerp 2009 (ARA&A review) describe the HI layer's FWHM beyond
 * the solar circle (R=5-35kpc) as an exponential function of R with their
 * own fitted parameters, and separately characterise the inner disc
 * (4-8kpc) with a dual-Gaussian form - neither could be reliably
 * reconstructed from the accessible text this session (the source PDF did
 * not parse cleanly, same finding as an earlier session's attempt at this
 * same citation). Rather than guess at Kalberla's own fit constants, this
 * module uses a single smooth EXPONENTIAL flaring form anchored exactly at
 * the sourced R0 scale heights, `FLARE_SCALE_LENGTH_PC` chosen so the
 * molecular scale height grows by roughly a factor of a few by R~20kpc -
 * matching the qualitative "flares strongly with radius" finding both
 * sourced papers agree on, without claiming their own specific fitted
 * curve.
 *
 * RADIAL SURFACE DENSITY. `calibrated`, NOT sourced: no V5 obligation
 * covered the ISM's own radial falloff, only its vertical scale heights.
 * Real molecular gas in spiral galaxies (the Milky Way included, via its
 * own "molecular ring" concentration around R~4-5kpc) is typically MORE
 * centrally concentrated than the old stellar disc, not modelled as a ring
 * here (added complexity this render-only preview does not need) but
 * approximated with a shorter exponential scale length than the stellar
 * thin disc's own (Juric et al. 2008, 2600pc) - `ISM_RADIAL_SCALE_LENGTH_PC`
 * below.
 *
 * ARM RESPONSE. `calibrated`: gas and dust are observationally MORE tightly
 * confined to spiral arms than any stellar population (they trace the
 * spiral shock directly, not merely a dynamically-cooled response to it) -
 * this module's own arm contrast is set ABOVE `youngThin`'s own derived
 * contrast (`spiralArms.deriveArmContrasts`'s 2.0x-over-`oldThin` figure),
 * via `ISM_ARM_CONTRAST_MULTIPLIER`, applied to the SAME arm geometry
 * (`spiralArms.armFactor`, `set: 'all'`) rather than any independently
 * rolled structure.
 *
 * ABSOLUTE MIDPLANE NORMALISATION (P17). `N_MIDPLANE_R0_CM3` = 1.17 cm^-3,
 * `sourced` - the total-hydrogen (H-nuclei) midplane number density at the
 * solar radius, read verbatim from McKee, Parravano & Hollenbach 2015
 * (ApJ 814, 13; DOI 10.1088/0004-637X/814/1/13), Section 5.4 ("n_H0 = 1.17"),
 * and independently the sum of the Table 2 midplane component densities
 * (H2 0.15 + HI CNM 0.80 + HI WNM1 0.13 + HI WNM2 0.077 + HII 0.0154).
 * Table 2's column is H NUCLEI density, so the H2 row is not doubled, and the
 * CO-dark H2 is already folded into it (Section 5.1) - 1.17 is final, no
 * pending decimal. The two surface densities previously quoted here
 * (Sigma_HI 7.8, Sigma_H2 0.7 Msol/pc^2, H only) are Table 2's He-corrected
 * 10.9 / 1.0 divided by 1.4 and remain correct. The HII figure excludes the
 * local Gum Nebula (Table 2 note d), so 1.17 is the smooth diffuse
 * volume-average - exactly the ambient reservoir a Stromgren/Weaver
 * consumer wants. NOTE: this is the DIFFUSE backdrop, NOT the density the
 * Stromgren/Weaver region-expansion laws run against inside a young complex -
 * that is the natal molecular clump (`nebulaMorphology.nebulaNatalDensityCm3`,
 * ~1e3 cm^-3).
 *
 * genVersion: `ismDensityAt` (relative) does NOT participate - render-only.
 * `absoluteMidplaneDensityCm3` DOES, from P17 on - see the P17 block above.
 */

import { armFactor, deriveArmContrasts, ARMS, DEFAULT_ARM_WIDTH, type ArmDefinition, type ArmWidthParams } from './spiralArms';

import type { GlossaryEntry } from './types';

/** pc, `sourced` (interpolated to the solar radius - see header). */
export const H_MOLECULAR_R0_PC = 100;
/** `sourced`, Nakanishi & Sofue 2006 - atomic scale height is ~2x molecular
 *  at every radius, held constant with R (only the molecular anchor and
 *  the shared flaring form vary; the ratio itself does not). */
export const ATOMIC_TO_MOLECULAR_SCALE_HEIGHT_RATIO = 2.0;
/** pc, `calibrated` - the exponential flaring e-folding length, chosen so
 *  the molecular scale height grows by roughly a factor of a few by
 *  R~20000pc (see header - not Kalberla & Kerp's own unreconstructed fit). */
export const FLARE_SCALE_LENGTH_PC = 10800;
/** pc, `calibrated` - shorter than the stellar thin disc's own 2600pc
 *  (Juric et al. 2008), reflecting real spiral galaxies' more centrally
 *  concentrated molecular gas, without modelling a molecular ring. */
export const ISM_RADIAL_SCALE_LENGTH_PC = 1600;
/** `calibrated` - multiplies the 'major'-set-derived `oldThin` contrast
 *  (`spiralArms.deriveArmContrasts`) to get the ISM's own, deliberately
 *  stronger-than-any-stellar-population arm response (see header). */
export const ISM_ARM_CONTRAST_MULTIPLIER = 2.6;

/** cm^-3, total-hydrogen (H-nuclei) midplane number density at R0. `sourced` -
 *  McKee, Parravano & Hollenbach 2015 (ApJ 814, 13), Section 5.4 verbatim,
 *  cross-checked against the Table 2 component sum; see this module's header.
 *  On the generation path from P17, so a change here forks spiral-family
 *  galaxies once a generation module consumes it. */
export const N_MIDPLANE_R0_CM3 = 1.17;

const R0_PC = 8178;   // matches galaxyModel.ts's own R0_PC/spiralArms.ts's R0_SEEDED_REF_PC - shared anchor, not re-derived

export interface IsmParams {
  readonly hMolecularR0Pc: number;
  readonly atomicToMolecularScaleHeightRatio: number;
  readonly flareScaleLengthPc: number;
  readonly radialScaleLengthPc: number;
  readonly armContrastMultiplier: number;
  /** cm^-3, P17 - the absolute-density normalisation (see `N_MIDPLANE_R0_CM3`).
   *  Consumed ONLY by `absoluteMidplaneDensityCm3`; `ismDensityAt` (relative,
   *  render-only) never reads it, so the render path is unaffected. */
  readonly midplaneNormalisationCm3: number;
}

export const DEFAULT_ISM_PARAMS: IsmParams = {
  hMolecularR0Pc: H_MOLECULAR_R0_PC,
  atomicToMolecularScaleHeightRatio: ATOMIC_TO_MOLECULAR_SCALE_HEIGHT_RATIO,
  flareScaleLengthPc: FLARE_SCALE_LENGTH_PC,
  radialScaleLengthPc: ISM_RADIAL_SCALE_LENGTH_PC,
  armContrastMultiplier: ISM_ARM_CONTRAST_MULTIPLIER,
  midplaneNormalisationCm3: N_MIDPLANE_R0_CM3,
};

/** Molecular scale height at galactocentric radius R - a smooth exponential
 *  flare anchored exactly at `hMolecularR0Pc` (R=R0), never below its own
 *  R0 anchor for R<R0 either (the same functional form extrapolates
 *  inward, not merely outward - there is no sourced reason to assume the
 *  flare stops or reverses inside the solar circle, and the exponential
 *  form is smooth and positive everywhere by construction). */
function molecularScaleHeightPc(R_pc: number, params: IsmParams): number {
  return params.hMolecularR0Pc * Math.exp((R_pc - R0_PC) / params.flareScaleLengthPc);
}

function sech2(x: number): number {
  const c = Math.cosh(x);
  return 1 / (c * c);
}

/**
 * ISM (gas+dust) relative volume density at (R, theta, z) - UNNORMALISED
 * (peak order-unity at the reference point, not tied to any absolute
 * column density or mass), since this is a display/preview quantity, not a
 * `SystemCore`-consumed one (see header). Combines a molecular component
 * (thin, strongly arm-modulated) and an atomic component (thicker, still
 * arm-modulated but the molecular layer is what actually produces a
 * visible dust lane against the stellar disc's own much greater thickness).
 *
 * `arms`/`armWidth` default to the real Milky Way table, matching every
 * other module's own convention (`spiralArms.armFactor` itself) - a caller
 * with a seeded/class-selected table passes it through explicitly, same
 * pattern as `discTerm`'s own `params.arms`.
 */
export function ismDensityAt(
  R_pc: number, theta_rad: number, z_pc: number,
  params: IsmParams = DEFAULT_ISM_PARAMS,
  arms: readonly ArmDefinition[] = ARMS, armWidth: ArmWidthParams = DEFAULT_ARM_WIDTH,
): number {
  const hMol = molecularScaleHeightPc(R_pc, params);
  const hAtomic = hMol * params.atomicToMolecularScaleHeightRatio;
  const radial = Math.exp(-R_pc / params.radialScaleLengthPc);
  const molecular = radial * sech2(z_pc / hMol);
  const atomic = radial * sech2(z_pc / hAtomic);

  const baseContrast = deriveArmContrasts(R0_PC, armWidth, arms).oldThin;
  const armMod = armFactor('all', baseContrast * params.armContrastMultiplier, R_pc, theta_rad, armWidth, arms);

  // Molecular gas carries most of the arm/interarm contrast and most of
  // the dust-lane-scale thinness; atomic gas is the thicker, gentler
  // envelope around it - weighted 1:1 in this unnormalised display
  // quantity (there is no sourced mass ratio this render-only field needs
  // to reproduce exactly).
  return (molecular + atomic) * Math.max(armMod, 0);
}

/**
 * P17 - ABSOLUTE total-hydrogen number density, cm^-3, at galactocentric
 * (R, z). NOT render-only (see this module's own header): read by
 * `starFormingComplexes.placeYoungClustered` to size every star-forming
 * complex's Stromgren sphere and Weaver wind shell, which moves placed young
 * systems - so this participates in `genVersion` from P17 on.
 *
 * Shape: the SAME radial exponential and vertical `sech2` profile shape as
 * `ismDensityAt`, but ARM MODULATION DROPPED (a smooth axisymmetric envelope -
 * `nebulaMorphology` wants the ambient reservoir density, not the local arm
 * shock, and the complex placement's own `youngSurfaceAt` already carries the
 * arm structure). Normalised so the value at (R0, z=0) equals
 * `params.midplaneNormalisationCm3` exactly: the reference profile there is
 * `exp(-R0/radialScaleLengthPc) * sech2(0) * 2` (molecular + atomic, both
 * `sech2(0)=1`, 1:1 as in `ismDensityAt`), so the normalisation constant
 * divides that out.
 *
 * The FIRST science stone of the full ISM promotion - deliberately minimal
 * (one accessor, one constant), forward-compatible, not a throwaway stub.
 */
export function absoluteMidplaneDensityCm3(
  R_pc: number, z_pc: number, params: IsmParams = DEFAULT_ISM_PARAMS,
): number {
  const shapeAt = (R: number, z: number): number => {
    const hMol = molecularScaleHeightPc(R, params);
    const hAtomic = hMol * params.atomicToMolecularScaleHeightRatio;
    const radial = Math.exp(-R / params.radialScaleLengthPc);
    return radial * (sech2(z / hMol) + sech2(z / hAtomic));
  };
  const refShape = shapeAt(R0_PC, 0);   // = exp(-R0/l) * 2, strictly > 0
  return params.midplaneNormalisationCm3 * (shapeAt(R_pc, z_pc) / refShape);
}

/* --------------------------------- glossary ----------------------------------- */

export const glossary: GlossaryEntry[] = [
  {
    term: 'ISM midplane density normalisation', status: 'sourced',
    short: 'The absolute total-hydrogen number density of the interstellar medium at the Sun\'s distance from the galactic centre, about one atom per cubic centimetre.',
    long: 'N_MIDPLANE_R0_CM3 = 1.17 cm^-3, read verbatim from McKee, Parravano & Hollenbach 2015 Section 5.4 and cross-checked against the Table 2 midplane component sum (H2 + three HI phases + HII). Sets the absolute scale of `absoluteMidplaneDensityCm3` - the diffuse ISM backdrop, and the dispersed medium a superbubble later expands into. The denser natal molecular clump that ionised spheres actually grow inside is a separate ~1e3 cm^-3 quantity (`nebulaMorphology`).',
    source: 'McKee, Parravano & Hollenbach 2015, ApJ 814, 13.',
  },
];

/* --------------------------------- gates ------------------------------------ */

/**
 * Invariants this module owes:
 *  1. PURITY - same inputs give a bit-identical result, always.
 *  2. NO CHANNEL - `CHANNELS` reserves a key for this module
 *     (`CHANNELS.ism`) but nothing here ever calls `channelRng` - render-
 *     only means it rolls nothing, per A8 (mirrors `densityMap.ts`'s own
 *     "no channel" invariant, gate 6 there).
 *  3. NON-NEGATIVE AND FINITE everywhere, including R=0 and z=0.
 *  4. PEAKS AT z=0 for fixed (R, theta) - `sech2` is maximal at its own
 *     argument 0, and both components share that property; the combined
 *     sum inherits it since neither component can be negative.
 *  5. THE MOLECULAR LAYER IS GENUINELY THINNER than the atomic layer, at
 *     every radius - `atomicToMolecularScaleHeightRatio > 1` is enforced
 *     by construction (`DEFAULT_ISM_PARAMS`), and this gate confirms the
 *     REAL (thicker-atomic) combined field retains MORE relative density
 *     at moderate |z| than an "all-thin" (ratio=1) version of the same
 *     field would, at a fixed R - the atomic tail genuinely props up the
 *     total at larger z, the property that makes a visible dust LANE
 *     (the molecular layer alone) distinct from the wider gas envelope
 *     around it, not merely two components of one shape.
 *  6. SCALE HEIGHT FLARES WITH RADIUS - `molecularScaleHeightPc` is
 *     strictly increasing in R (matches the sourced "flares strongly with
 *     radius" finding both cited papers agree on).
 *  7. ARM MODULATION IS REAL - `ismDensityAt` varies with theta at fixed
 *     (R, z) for a model with live arm contrast (reuses `spiralArms
 *     .armFactor` directly - this is not a manufactured, independent arm
 *     signal, Law 1).
 *  8a. G5 (Step 6) - `ismDensityAt` (the RELATIVE, render-only field) is
 *     called from exactly ONE module, `galaxyCreationModals.ts` (the render
 *     layer's diametral side-on view) - grepped directly across the project
 *     root. Breaks loudly the day the RELATIVE field is wired into `sky.ts`
 *     or any other `SystemCore` path without reading this header first.
 *  8b. P17 - `absoluteMidplaneDensityCm3` (the ABSOLUTE, generation-path
 *     accessor) is called from exactly ONE module, `nebulaMorphology.ts`
 *     (inside `nebulaNatalDensityCm3`). Same tripwire discipline as 8a, for
 *     the accessor that feeds the region-expansion scales.
 *  9. P17 - `absoluteMidplaneDensityCm3(R0, 0)` equals
 *     `midplaneNormalisationCm3` exactly (the normalisation is anchored, not
 *     approximate), and the accessor is strictly positive, finite, decreasing
 *     in |z| at fixed R and decreasing in R at fixed z=0.
 *  10. P17 NON-CHANGE GUARD - `ismDensityAt` is byte-identical for a battery
 *     of probes before/after the absolute-accessor addition (the relative
 *     render field and its callers are untouched); `absoluteMidplaneDensityCm3`
 *     never reads the arm field (theta-independent by construction).
 */
export const ISM_GATES = 10 as const;
