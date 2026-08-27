/**
 * spiralArms - the named-arm log-spiral density modulation, patch v2.3.
 * Channel: none for the REAL Milky Way table and its evaluation (`ARMS`,
 * `armFactor`, `thetaArmRad`, ... - pure geometry, like `galacticDensity`'s
 * coordinate transform, a shape not a draw). `CHANNELS.seededArms` (16 Aug
 * 2026) is the one exception - `generateSeededArms` genuinely rolls a
 * per-worldSeed arm table for morphologies that are not meant to be the
 * real galaxy; see that function's own header for why it needs a channel
 * at all when nothing else here does.
 *
 * -- PROVENANCE ---------------------------------------------------------------
 * ARM TABLE. Reid et al. 2019, ApJ 885, 131: six named arms (pitch angle,
 * reference radius at the Sun-Galactic-centre line, tier) from VLBI maser
 * parallaxes - `sourced`, transcribed from `patches/galaxyForge-SPIRAL-
 * PATCH-v2.3-parameter-schema.md` S4, which already carries this exact
 * table. Reid's own per-arm pitch angles vary along each arm ("kinks",
 * 9-17deg depending on segment); the patch deliberately uses one averaged
 * pitch per arm with no kink modelling - `calibrated (simplified)`, and the
 * schema's own comment names the omitted fields (`RkinkPc`, `pitchOuterDeg`)
 * as the future upgrade path, not a gap invented here.
 *
 * KINK UPGRADE PATH - STILL PARTIAL, STATED HONESTLY (24-25 Aug 2026).
 * `ArmDefinition` carries `RkinkPc`/`pitchOuterDeg` as optional fields;
 * `thetaArmRad`/`kappaOf` (`pitchDegAt`) genuinely switch pitch at the kink
 * when both are set, continuous at the seam, exact single-pitch formula
 * when neither is - the MECHANISM is real. `sourced`, verified directly
 * against Reid et al. 2019's own Table 2 (title "Spiral Arm
 * Characteristics") this session, by extracting the paper's own PDF text
 * (`pdftotext -layout`, since neither the HTML mirror nor the rendered PDF
 * would yield the table through automated summarisation) - not
 * transcribed from any secondary source. Table 2 fits EACH arm as two
 * segments meeting at azimuth `beta_kink`, radius `R_kink`, with pitch
 * `psi<` for `beta <= beta_kink` and `psi>` beyond it; `RrefPc` (this
 * module's `beta=0` anchor) falls on the `psi<` side for every arm here,
 * so `pitchDeg` maps to `psi<` and `pitchOuterDeg` to `psi>`.
 *
 * WIRED: Scutum-Centaurus only - `RkinkPc: 4910` (Table 2: R_kink = 4.91
 * +/- 0.09 kpc), `pitchOuterDeg: 12.1` (psi> = 12.1 +/- 2.4 deg). Verified
 * safe to land: `deriveArmContrasts(8200)` still reproduces the patch's
 * 0.3096/0.4335/0.6193 exactly (R=8200 sits on the `pitchDeg` side of this
 * arm's kink, untouched), and the golden master's placement/remnants
 * fixtures are unaffected at their own reference cells - confirmed by
 * actually re-running the suite with this one arm kinked, not assumed.
 *
 * SOURCED BUT DEFERRED, NOT WIRED - the other three kinked arms in Table
 * 2, each for a documented reason found by actually trying and observing
 * what broke, not by inspection alone:
 *  - Sagittarius-Carina: `R_kink = 6.04 +/- 0.09 kpc`, `psi< = 17.1 +/-
 *    1.6 deg`, `psi> = 1.0 +/- 2.1 deg` - the real outer segment is nearly
 *    TANGENTIAL (pitch ~1 deg). Wiring it collapses `kappaOf` toward zero
 *    for R below the kink (sin(1deg) is tiny), which swings the whole
 *    module's kappa range far outside patch S9's pre-kink reference and
 *    would need its own sanity gate (the arm must not visually vanish near
 *    R~4-6kpc) that does not exist yet - a real, verified number, but not
 *    a safe drop-in.
 *  - Perseus: `R_kink = 8.87 +/- 0.13 kpc`. This straddles the R=8200pc
 *    solar-circle anchor `deriveArmContrasts`/`DRIMMEL_SPERGEL_K` are
 *    calibrated against - wiring it moves Perseus (a 'major'-tier arm) off
 *    `pitchDeg` exactly at that anchor, which breaks the patch's exact
 *    0.3096/0.4335/0.6193 reproduction (confirmed by trying it). Landing
 *    it needs the contrast bisection solve re-verified under the kinked
 *    geometry, not just a field assignment.
 *  - Norma / Outer: SPLIT into two separate ARMS entries (Package 02/03
 *    build plan, Stage B, 27 Aug 2026) - this module's single merged
 *    `Norma-Outer` entry used to conflate Table 2's separate Norma
 *    (`R_kink=4.46kpc`) and Outer (`R_kink=12.24kpc`) rows under one
 *    `RrefPc`/`weight`; the two are not contiguous in beta (source pack
 *    S3's own "Norma-Outer caveat") and Xu et al. 2023 treats them as
 *    unrelated arms, so the merge was never more than a convenient
 *    approximation. `Outer`'s entry (`RrefPc=12289`, `pitchDeg=12.43`) is
 *    the OLD merged entry's own numbers, unchanged - the header's own prior
 *    analysis already established `RrefPc` sits within 49pc of Outer's own
 *    `R_kink` (12240), so Outer's data is almost certainly what these
 *    constants were originally fit to. `Norma`'s entry is NEW: its own
 *    Table-2 `R_kink` (4460pc) is real and well-determined (N=11
 *    detections, +/-0.19kpc), but its own near-Sun pitch branch (`psi< =
 *    -1.0 +/- 3.3 deg`) is statistically indistinguishable from zero and
 *    COLLAPSES `kappaOf` toward zero if used directly - verified
 *    numerically before writing anything, not assumed: kappa(R=4780pc,
 *    pitch=1deg) ~ 0.15, against this table's own established 18.8-31.0
 *    range, meaning the arm would render as a near-invisible ripple
 *    spanning ~150deg of azimuth - the exact same near-tangential failure
 *    mode already rejected for Sagittarius-Carina's own deferred outer
 *    branch below. Owner ruling (27 Aug 2026): reuse `Outer`'s
 *    already-verified `pitchDeg=12.43` rather than Norma's own degenerate
 *    branch fit, and project Norma's real `R_kink` out to this table's
 *    beta=0 anchor using THAT pitch (R(0) = 4460 * exp(-(0 - 18deg) *
 *    tan(12.43deg)) = 4780pc, kappa(4780, 12.43deg) = 22.97 - safely inside
 *    the existing range). Graded `calibrated` for Norma's `pitchDeg`
 *    (reused, not independently sourced per-arm - Table 2 supplies no safe
 *    single pitch for this arm) and `sourced` for its `RrefPc` (Table 2's
 *    own `R_kink`, projected with a documented, verified formula, not
 *    invented). Neither new entry carries its own real Table-2 kink
 *    (`RkinkPc`/`pitchOuterDeg` stay unset on both) - the underlying
 *    deferred-kink reasons below are UNCHANGED by the split (Outer still
 *    shares Perseus's own solar-circle-anchor problem; Norma's own branch
 *    fit is the degenerate one just described).
 *  - Local: Table 2 gives `psi< = psi> = 11.4 +/- 1.9 deg` for this arm -
 *    "if psi<=psi>, only a single pitch angle was solved for" (Table 2's
 *    own note). The paper's own fit found NO real kink here; leaving
 *    `RkinkPc`/`pitchOuterDeg` unset on Local is the sourced answer, not
 *    an omission.
 *
 * Landing Sagittarius-Carina/Perseus/Norma/Outer's own real per-arm kinks is
 * the remaining step - each needs the specific gate work named above, not a
 * blind field set.
 *
 * SEEDED ARMS NOW KINK TOO (25 Aug 2026, genVersion BUMP 11, item 3's own
 * fix - a direct user report: "in normal spiral galaxy the arms are still
 * perfect, there's no kinks or brokenness"). Everything above this note is
 * about `ARMS`, the one FIXED, real Milky Way table - `generateSeededArms`
 * built its own tables with NO kink at all, for every seeded (Spiral/
 * Barred) galaxy ever created, which is what most testing actually
 * exercises ('Milky Way Analogue' is the one morphology that keeps `ARMS`).
 * Confirmed directly, not assumed: no seeded arm literal set `RkinkPc`/
 * `pitchOuterDeg` prior to this bump. `generateSeededArmsUncached`'s own
 * `KINK_CHANCE`/`KINK_PITCH_DELTA_*`/`KINK_R_*` constants (below) roll a
 * genuine two-segment kink for MAJOR seeded arms - `calibrated`, since
 * there is no "real" data for a procedural arm to source, unlike `ARMS`'s
 * own case above.
 *
 * LOG-SPIRAL FORMULA AND SIGN. Verified directly against Reid et al. 2019's
 * own text this session (not carried over unverified): ln(R/R_ref) =
 * -(beta - beta_ref) * tan(psi), with beta defined as 0 toward the Sun and
 * INCREASING in the direction of Galactic rotation, psi the (positive) pitch
 * angle of a trailing spiral. Rearranged: beta(R) = beta_ref - cot(psi) *
 * ln(R/R_ref) - `thetaArm` below is exactly this, using this project's own
 * theta convention (`galacticDensity.cartesianToPolar`'s atan2, zero at the
 * Sun's azimuth, increasing with Galactic rotation - the same convention
 * Reid's beta uses, so no re-signing is needed at the seam).
 *
 * SIGN-CONVENTION DISCIPLINE (Prompt P3, arms bundle R2, 27 Aug 2026). This
 * exact sign has been transcribed wrong three times in this project's
 * history, most recently inside the documents that exist to warn about it -
 * a mirrored, counter-clockwise theta frame is easy to write down and looks
 * plausible right up until you check a real arm against a real radius. Any
 * beta<->R conversion - in this module, in a future one, or in a document -
 * gets checked against a named arm at a known azimuth before it is trusted,
 * not just re-derived symbolically. `assertArmFrameSanity()` below is that
 * check, kept as a callable helper rather than a one-off; gate 11 in
 * `spiralArms.conformance.ts` additionally pins the structural property
 * (theta strictly decreases as R increases, for every arm in `ARMS`) so a
 * sign flip fails immediately rather than waiting to be noticed visually.
 *
 * ARM WIDTH. `armWidthPc(R) = refPc + slopePcPerKpc * (R/1000 - r0Kpc)`,
 * `sourced`, Reid et al. 2019's own linear width-vs-radius fit, values
 * transcribed from the patch schema (refPc=336, slopePcPerKpc=36,
 * r0Kpc=8.15). VERIFIED this session against the patch's own S8/S9
 * reference numbers, not merely transcribed: this formula reproduces
 * sigma_perp(3900 pc) = 183 pc and sigma_perp(8178 pc) ~ 337-338 pc exactly
 * as the patch states, and the `kappaOf` derivation below reproduces the
 * patch's stated kappa range (18.7511 to 30.9951 over 3.5-16 kpc, all arms)
 * to 4 decimal places over a 630-point sweep - strong independent
 * confirmation that both formulas match the original, unrecoverable
 * `derive_arm_constants_v3.py` exactly for these two quantities.
 *
 * KAPPA (VON MISES CONCENTRATION). `derived`. A von Mises angular bump
 * approximates a Gaussian near its peak with angular variance 1/kappa
 * (`exp(kappa*(cos(dtheta)-1)) ~ exp(-kappa*dtheta^2/2)` for small dtheta).
 * The physical angular width of an arm at radius R is its (radius
 * -independent) perpendicular width divided by the local tangential
 * distance scale, `sigma_theta = sigma_perp(R) / (R * sin(pitch))` - so
 * `kappa = 1 / sigma_theta^2 = (R*sin(pitch))^2 / sigma_perp(R)^2`. See
 * above: this reproduces the patch's own kappa reference table exactly.
 *
 * ARM CONTRAST - GAP CLOSED 16 AUG 2026, RECORDED HONESTLY INCLUDING HOW.
 * `derive_arm_constants_v3.py` - the script that actually produced the
 * patch's stated contrast values - was confirmed genuinely absent from this
 * repository when this module was first written, and this module's
 * `armFactor` (an UNNORMALISED sum of von Mises bumps,
 * `1 + c * sum_arm weight_arm * exp(kappa_arm*(cos(dtheta)-1))`) reproduced
 * only the right order of magnitude (0.3256 vs the patch's stated 0.3096) as
 * a result. The missing piece was found not by recovering the script, but by
 * auditing a SIBLING build of this same project (`galaxyforge`, further
 * along the same brief, independently continued past this repository's own
 * fork point) that still has it: each arm's ridge must be MEAN-SUBTRACTED,
 * `exp(kappa*(cos(dtheta)-1)) - besselI0e(kappa)`, not left as a raw bump.
 * `besselI0e(kappa)` is exactly the circular mean of
 * `exp(kappa*(cos(dtheta)-1))` over the full circle, so subtracting it makes
 * each arm's contribution average to zero - arms REDISTRIBUTE systems around
 * an annulus rather than manufacturing them, which is what "azimuthal mean
 * of the density field is 1" (S4's own requirement) actually needs. Verified
 * directly, not assumed: with the subtraction, this module's own bisection
 * solve against Drimmel & Spergel's K=1.14/0.86 now reproduces the patch's
 * stated 0.3096/0.4335/0.6193 to full double precision (0.3096367574 /
 * 0.4334914603 / 0.6192735147 before 4-dp rounding) - see
 * `spiralArms.conformance.ts` gate 6, which asserts the match this module
 * could previously only assert the ABSENCE of. Graded `sourced (form and
 * target)` for the ridge/solve machinery; the resulting numbers are
 * `derived`, reproducibly, from that sourced machinery - not transcribed.
 *
 * A second, independent bug surfaced while fixing this: `deriveArmContrasts`
 * was computing `midThin`/`youngThin` as 1.4x/2.0x of the ROUNDED `oldThin`
 * (0.3096 * 1.4 = 0.4334), not the full-precision solve (0.3096367574 * 1.4
 * = 0.4334914... -> rounds to 0.4335, the patch's actual stated figure).
 * Rounding must happen ONCE, after every multiplier is applied - fixed below.
 *
 * ARM RESPONSE. Which arm tiers each disc population "sees" -
 * `youngThin: all 6 arms, midThin: major+minor (5), oldThin: major only (2),
 * thick/halo: none` - `calibrated`, the patch's own By-law S3 choice
 * (counts updated for the Norma/Outer split, Package 02/03 build plan Stage
 * B, 27 Aug 2026 - 'major' is unaffected, still Scutum-Centaurus+Perseus;
 * younger, dynamically colder populations track the spiral pattern more
 * tightly; this is qualitatively well-established in Milky Way population
 * studies, the specific tier cutoffs are the patch author's own judgement).
 *
 * genVersion: any change to a constant or formula in this module is
 * genVersion-bumping for every spiral/barredSpiral-generated system.
 */

import { besselI0e } from './mathStats';
import { channelRng } from './rng';
import { CHANNELS } from './types';
import { degToRad } from './units';

export type ArmTier = 'major' | 'minor' | 'spur';
export type ArmResponseSet = 'all' | 'majorMinor' | 'major' | 'none';

/**
 * Elmegreen & Elmegreen's collapsed three-class scheme (Amendment A6,
 * morphology patch v3.0, 17 Aug 2026) - `flocculent` (short, ragged,
 * fragmented arms, young-tracer only), `multipleArm` (3-4 arms, inner
 * two-arm symmetry, the shipped table's own row - the Milky Way belongs
 * here), `grandDesign` (two long, smooth, continuous arms). See
 * `ARM_CLASS_PRIOR`/`ARM_CLASS_CONTRAST_TARGET_K`/`ARM_CLASS_MODULATION`
 * below for what each class actually changes.
 */
export type ArmClass = 'flocculent' | 'multipleArm' | 'grandDesign';

export interface ArmDefinition {
  readonly name: string;
  readonly tier: ArmTier;
  readonly pitchDeg: number;
  readonly RrefPc: number;
  readonly thetaRefDeg: number;
  readonly weight: number;
  /** Kink upgrade path (patch v2.3 S4, wired 24 Aug 2026) - OPTIONAL. When
   *  both are present, `thetaArmRad`/`kappaOf` switch from `pitchDeg` to
   *  `pitchOuterDeg` beyond galactocentric radius `RkinkPc`, continuous at
   *  the kink. Absent for every arm this module currently ships (`ARMS`,
   *  `generateSeededArms`) - Reid et al. 2019's own Table 2 gives real
   *  per-arm kink radii/outer pitch angles for five of the six arms this
   *  table now carries (Local's own fit found no kink), but only Scutum
   *  -Centaurus's is wired into `ARMS` so far - see the module header's
   *  "KINK UPGRADE PATH" section for the other four, sourced but deferred
   *  for a specific, documented reason each. See `pitchDegAt`'s own header. */
  readonly RkinkPc?: number;
  readonly pitchOuterDeg?: number;
}

/** Reid et al. 2019, ApJ 885, 131 - sourced, transcribed from the patch
 *  schema (patch v2.3 S4), with `Norma-Outer` split into its own two Table-2
 *  rows (Package 02/03 build plan, Stage B, 27 Aug 2026 - see the module
 *  header's "KINK UPGRADE PATH" section for the split's own reasoning and
 *  provenance). `pitchDeg` is a positive magnitude; the sign is carried
 *  entirely by `thetaArm`'s formula (patch v2.2 S2's own ruling).
 *  Scutum-Centaurus's `RkinkPc`/`pitchOuterDeg` are Table 2's own R_kink/
 *  psi> for that arm - see the module header for the verification and why
 *  the other five arms don't (yet) carry the same fields. */
export const ARMS: readonly ArmDefinition[] = [
  { name: 'Norma',              tier: 'minor', pitchDeg: 12.43, RrefPc: 4780,  thetaRefDeg: 0, weight: 0.55 },
  { name: 'Scutum-Centaurus',   tier: 'major', pitchDeg: 12.04, RrefPc: 5493,  thetaRefDeg: 0, weight: 1.00, RkinkPc: 4910, pitchOuterDeg: 12.1 },
  { name: 'Sagittarius-Carina', tier: 'minor', pitchDeg: 12.07, RrefPc: 6878,  thetaRefDeg: 0, weight: 0.55 },
  { name: 'Local',              tier: 'spur',  pitchDeg: 12.43, RrefPc: 8719,  thetaRefDeg: 0, weight: 0.35 },
  { name: 'Perseus',            tier: 'major', pitchDeg: 12.07, RrefPc: 10470, thetaRefDeg: 0, weight: 1.00 },
  { name: 'Outer',              tier: 'minor', pitchDeg: 12.43, RrefPc: 12289, thetaRefDeg: 0, weight: 0.55 },
];

/**
 * `generateSeededArms` - a genuinely SEEDED arm table (16 Aug 2026),
 * closing `galaxyParameters.ts`'s own long-declared-but-never-built
 * `armSource: 'observed-mw' | 'seeded'` gap: a user-found one, since every
 * worldSeed reproduced the identical real-Milky-Way arm geometry - pressing
 * "Randomise" only ever changed which STARS populated a FIXED shape, never
 * the shape itself.
 *
 * ROLLED ONCE, like `SectorRecipe.galaxyMassSol` (`types.ts`'s own comment:
 * "rolled ONCE at creation, then stored") - this is a Tier G, per-galaxy
 * geometry decision, not a per-cell/per-system draw, so it gets its own
 * isolated channel (`CHANNELS.seededArms`) rather than riding an existing
 * one, keyed on `worldSeed` alone - there is only ever ONE arm table per
 * galaxy.
 *
 * DESIGN, stated honestly - `tunable`, invented for this feature, not
 * fitted to any observed spiral-galaxy population statistic:
 *  - ARM COUNT: 2, 3 or 4 (uniform) - real grand-design/multi-arm spirals
 *    span this range; 5+ base arms was judged too visually busy at this
 *    project's own preview resolution (a genuine spur can still push the
 *    total to 5 - see below).
 *  - PITCH ANGLE: one shared value per galaxy, uniform in [10, 22) degrees
 *    - real spiral pitch angles span roughly 5-40 degrees across the whole
 *    Hubble sequence; this band was chosen empirically (this session's own
 *    diagnostic script, ASCII-rendering several candidate ranges) to avoid
 *    both an under-wound pattern reading as barely spiral and an
 *    over-wound one self-occluding within the visible disc. SHARED rather
 *    than independent per arm - grand-design spirals' ridges track one
 *    common density-wave pattern speed, which one shared pitch
 *    approximates reasonably for a procedural table with no dynamics
 *    model behind it.
 *  - PHASE: one uniform [0, 360) rotation for the whole pattern, then arms
 *    evenly spaced around it with a further independent +/-20 degree
 *    jitter each, so the result is not perfectly, suspiciously regular.
 *  - WEIGHT: the first two arms are 'major' (weight 1.00, matching `ARMS`'s
 *    own convention); any further base arms are 'minor' (weight uniform in
 *    [0.45, 0.65) - `ARMS`'s own Sagittarius-Carina/Norma/Outer all sit at
 *    0.55, inside this band).
 *  - SPUR: a further, independent 45% chance of ONE extra weak 'spur' arm
 *    (weight 0.35, matching `ARMS`'s own Local arm), inserted at a random
 *    base arm's phase offset by a random +/-(30-70) degrees and a random
 *    +/-15% radius perturbation - a partial, off-pattern feature riding on
 *    an existing arm, not a fifth independent one.
 *  - RrefPc: every arm in a table shares one reference radius (the same
 *    R0_PC anchor `galaxyModel.ts` already uses) - only pitch and phase
 *    vary per table. Because the log-spiral's angular offset between two
 *    arms sharing a pitch and reference radius is CONSTANT at every radius
 *    (their `ln(R/Rref)` terms cancel identically), this alone is enough
 *    to make every table look genuinely different - a rotated, re-wound
 *    whole pattern - without a further free parameter this feature does
 *    not need.
 *
 * NOT seeded: `armWidthPc`/`kappaOf`'s own width-vs-radius relation
 * (`DEFAULT_ARM_WIDTH`) stays the sourced Reid form for every table, seeded
 * or not - there is no reason to vary how SHARP an arm's edge is from one
 * galaxy to the next, only how many arms there are and where.
 *
 * `'Milky Way Analogue'` (the GUI's own morphology choice, `galaxyCreation
 * State.ts`) deliberately keeps `ARMS` (`armSource: 'observed-mw'`) rather
 * than calling this - it is explicitly meant to model the real galaxy, so
 * its arm geometry is exactly the one thing about it that should NOT vary
 * by seed.
 */
const R0_SEEDED_REF_PC = 8178;   // matches galaxyModel.ts's own R0_PC - shared anchor, not re-derived

/**
 * Seeded prior for `rollArmClass` (Amendment A6, morphology patch v3.0,
 * 17 Aug 2026) - `calibrated (synthesis)`, NOT a single sourced table.
 * Elmegreen & Elmegreen's own 1987 grand-design fraction is 13% (Ann & Lee
 * 2013 give 19%, Buta et al. 2015 give 18% - a real, sample-dependent
 * spread, not one textbook number); multiple-arm dominates barred/
 * intermediate Hubble types at roughly 60%. The 1982 paper's 68%/32%
 * flocculent/grand-design split is explicitly for ISOLATED NON-BARRED
 * galaxies only and is deliberately NOT used here as a general prior (this
 * project's own galaxy-creation flow has no Hubble-type input to condition
 * on, so no single clean sourced 3-way split exists to transcribe
 * verbatim). Values below: `grandDesign` anchored near the 1987/2013/2015
 * spread's own centre, `multipleArm` at its own dominant ~60%, `flocculent`
 * the remainder.
 */
export const ARM_CLASS_PRIOR: Readonly<Record<ArmClass, number>> = {
  grandDesign: 0.15, multipleArm: 0.60, flocculent: 0.25,
};

/**
 * Rolled ONCE per galaxy (Amendment A6), same "Tier G, rolled once at
 * creation" pattern `generateSeededArms` immediately below already
 * documents - isolated onto its own channel (`CHANNELS.armClass`) so this
 * draw can never perturb `generateSeededArms`'s own arm-table draw or vice
 * versa. Only ever called for `armSource: 'seeded'` - 'Milky Way Analogue'
 * fixes its class to `'multipleArm'` directly (see `ARM_CLASS_CONTRAST_
 * TARGET_K`'s own header for why that assignment is NOT merely a default,
 * it is what keeps the real, sourced Drimmel & Spergel-anchored contrast
 * untouched) rather than rolling.
 */
export function rollArmClass(worldSeed: string): ArmClass {
  const rng = channelRng(worldSeed, CHANNELS.armClass);
  const u = rng();
  let cum = 0;
  for (const cls of ['grandDesign', 'multipleArm', 'flocculent'] as const) {
    cum += ARM_CLASS_PRIOR[cls];
    if (u < cum) return cls;
  }
  return 'flocculent';   // floating-point safety net - cum should reach 1.0 exactly above
}

/**
 * How many spurs `generateSeededArms` rolls for, and how likely each is -
 * scaled by `armClass` (Amendment A6's own "a branching term whose rate
 * scales with armClass depth", reusing the EXISTING single-spur mechanic
 * below rather than inventing a second one - Law 1). `calibrated`, invented
 * for this feature exactly like the base spur chance it extends.
 * `grandDesign` arms stay smooth (near-zero spur chance); `flocculent`
 * fractures more readily (multiple independent spur rolls, each likely).
 */
const ARM_CLASS_SPUR: Readonly<Record<ArmClass, { readonly maxSpurs: number; readonly chancePerSpur: number }>> = {
  grandDesign: { maxSpurs: 1, chancePerSpur: 0.08 },
  multipleArm: { maxSpurs: 1, chancePerSpur: 0.45 },   // unchanged from the pre-armClass single-spur behaviour
  flocculent: { maxSpurs: 3, chancePerSpur: 0.7 },
};

/**
 * Memoised by (worldSeed, armClass) - a found perf bug, 25 Aug 2026, root
 * -caused by direct profiling (a single `densityAt` call was timed at
 * 557ms). This function is pure - same inputs, same output - but every
 * call built a FRESH array, and `filteredArmsFor`/`deriveArmContrasts`'s
 * own downstream caches are `WeakMap`s keyed on the arms array's
 * REFERENCE, not its content. The GUI's own `modelFromDraft` calls this
 * fresh on every single render (every slider tick, every "Randomise"
 * click, even re-selecting the SAME seed), so two structurally-identical
 * tables for the same seed were never `===`, and the "one-time" contrast
 * -calibration cost documented elsewhere in this file was actually being
 * paid on EVERY render, not once. Caching the returned reference here is
 * what makes "one-time" true for the first time.
 *
 * A plain `Map`, not a `WeakMap`: the key is a derived string, not an
 * object, so there is nothing for a `WeakMap` to hold weakly. Unbounded is
 * fine - the whole seed+armClass space a session realistically explores
 * while a creation modal is open is a few dozen entries at most, each a
 * handful of small objects.
 */
const seededArmsCache = new Map<string, readonly ArmDefinition[]>();

export function generateSeededArms(worldSeed: string, armClass: ArmClass = 'multipleArm'): readonly ArmDefinition[] {
  const cacheKey = `${worldSeed}:${armClass}`;
  const cached = seededArmsCache.get(cacheKey);
  if (cached) return cached;

  const arms = generateSeededArmsUncached(worldSeed, armClass);
  seededArmsCache.set(cacheKey, arms);
  return arms;
}

/**
 * Whether a seeded MAJOR arm gets a kink (item 3's own fix, 25 Aug 2026,
 * genVersion BUMP 11 - a direct user report: "in normal spiral galaxy the
 * arms are still perfect, there's no kinks or brokenness"). `calibrated`,
 * not sourced: real per-arm kink data (Reid et al. 2019 Table 2) exists
 * only for the six NAMED Milky Way arms (`ARMS`'s own "KINK UPGRADE PATH"
 * section) - it has nothing to say about a procedurally seeded arm's own
 * geometry. Reid's own table DID find a genuine kink in 4 of its 5 real
 * arms (only Local's own fit found none), so "most arms kink" is the
 * population-level finding this reflects, without pretending to source a
 * specific probability from it. MAJOR tier only: `ARMS`'s own wired case
 * (Scutum-Centaurus) is 'major', and a minor/spur arm kinking too would
 * compete visually with the primary pattern most classes are meant to read
 * as, rather than reading as one arm's own real structure.
 */
const KINK_CHANCE = 0.6;
/** Degrees the outer pitch is allowed to differ from the inner one before
 *  `KINK_PITCH_FLOOR_DEG` clamps it - `calibrated`. RAISED 3-8 -> 8-16deg,
 *  genVersion BUMP 12 (25 Aug 2026, item 3's own follow-up: a direct user
 *  report that a landed kink "might be there... not as obvious as I thought
 *  it could be" at the original range) - a 3-8deg bend, viewed at whole
 *  -galaxy zoom in a small preview canvas, was too close to Reid's own
 *  barely-there wired case (12.04 -> 12.1 deg) to read as a visible bend at
 *  all; the new range sits closer to the deferred cases' own larger swings
 *  (Perseus's segment: comparable order; short of Sagittarius-Carina's
 *  near-total 17.1 -> 1.0 deg unwinding) while `KINK_PITCH_FLOOR_DEG` still
 *  keeps every roll clear of that case's own kappaOf-collapse risk. */
const KINK_PITCH_DELTA_MIN_DEG = 8;
const KINK_PITCH_DELTA_MAX_DEG = 16;
/** Never let a rolled outer pitch approach the near-tangential regime the
 *  deferred Sagittarius-Carina case (psi> = 1.0 deg) demonstrated collapses
 *  `kappaOf` toward zero (module header, "KINK UPGRADE PATH", SOURCED BUT
 *  DEFERRED) - `calibrated` safety margin, not a sourced bound. */
const KINK_PITCH_FLOOR_DEG = 6;
/** Where a rolled kink radius can land - excludes the band around the
 *  R=8200pc contrast-calibration anchor (`referenceRPc`, `galaxyParameters
 *  .ts`) that `anchorArmCorrectionFor` evaluates every arm at: every seeded
 *  arm's own `RrefPc` (`R0_SEEDED_REF_PC` = 8178) already sits almost
 *  exactly there, so a kink seam landing on top of it would put the
 *  correction's reference point right on a geometry discontinuity - still
 *  self-consistent either way (the correction recomputes from whatever
 *  geometry exists, unlike `ARMS`'s own fixed, gated reproduction target),
 *  but avoided anyway for a cleaner, seam-free look exactly where every
 *  population's density is anchored. `calibrated`. */
const KINK_R_INNER_LO_PC = 5500, KINK_R_INNER_HI_PC = 6700;
const KINK_R_OUTER_LO_PC = 9700, KINK_R_OUTER_HI_PC = 15500;

function generateSeededArmsUncached(worldSeed: string, armClass: ArmClass): readonly ArmDefinition[] {
  const rng = channelRng(worldSeed, CHANNELS.seededArms);
  const armCount = 2 + Math.floor(rng() * 3);   // 2, 3 or 4
  const pitchDeg = 10 + rng() * 12;             // [10, 22)
  const basePhaseDeg = rng() * 360;

  const arms: ArmDefinition[] = [];
  for (let i = 0; i < armCount; i++) {
    const evenSpacingDeg = (360 / armCount) * i;
    const jitterDeg = (rng() - 0.5) * 40;       // +/-20 deg
    const thetaRefDeg = basePhaseDeg + evenSpacingDeg + jitterDeg;
    const isMajor = i < 2;
    const weight = isMajor ? 1.00 : 0.45 + rng() * 0.2;
    // Kink roll (item 3) - see KINK_CHANCE's own header. Drawn from the
    // SAME rng stream, same "one channel, one draw sequence per galaxy"
    // discipline every other seeded field here already follows; a minor
    // arm consumes zero draws for this (short-circuited), matching the
    // existing spur-roll's own conditional-draw pattern below.
    let kink: { RkinkPc: number; pitchOuterDeg: number } | undefined;
    if (isMajor && rng() < KINK_CHANCE) {
      const innerSide = rng() < 0.5;
      const RkinkPc = innerSide
        ? KINK_R_INNER_LO_PC + rng() * (KINK_R_INNER_HI_PC - KINK_R_INNER_LO_PC)
        : KINK_R_OUTER_LO_PC + rng() * (KINK_R_OUTER_HI_PC - KINK_R_OUTER_LO_PC);
      const deltaDeg = (rng() < 0.5 ? -1 : 1) *
        (KINK_PITCH_DELTA_MIN_DEG + rng() * (KINK_PITCH_DELTA_MAX_DEG - KINK_PITCH_DELTA_MIN_DEG));
      kink = { RkinkPc, pitchOuterDeg: Math.max(KINK_PITCH_FLOOR_DEG, pitchDeg + deltaDeg) };
    }
    arms.push({
      name: `Seeded-${i + 1}`, tier: isMajor ? 'major' : 'minor',
      pitchDeg, RrefPc: R0_SEEDED_REF_PC, thetaRefDeg, weight,
      ...(kink ?? {}),
    });
  }

  // Spur count/probability scaled by armClass (Amendment A6) - drawn from
  // the SAME rng stream as the base arms above (still one channel, one
  // draw sequence per galaxy), so `multipleArm`'s own {maxSpurs:1,
  // chancePerSpur:0.45} reproduces the pre-armClass behaviour EXACTLY
  // (same single `rng() < 0.45` check, same draw order) - the default
  // parameter value and this table entry are deliberately the historical
  // constant, not merely similar to it.
  const spurPolicy = ARM_CLASS_SPUR[armClass];
  for (let s = 0; s < spurPolicy.maxSpurs; s++) {
    if (rng() >= spurPolicy.chancePerSpur) continue;
    const host = arms[Math.floor(rng() * arms.length)]!;
    const offsetDeg = (rng() < 0.5 ? -1 : 1) * (30 + rng() * 40);   // +/-(30-70) deg
    const radiusJitter = 1 + (rng() - 0.5) * 0.3;                    // +/-15%
    arms.push({
      name: `Seeded-spur-${s + 1}`, tier: 'spur', pitchDeg,
      RrefPc: R0_SEEDED_REF_PC * radiusJitter, thetaRefDeg: host.thetaRefDeg + offsetDeg, weight: 0.35,
    });
  }

  return arms;
}

export interface ArmWidthParams {
  readonly refPc: number;
  readonly slopePcPerKpc: number;
  readonly r0Kpc: number;
  /** Multiplier on the width relation, HARD CEILING 1.02 (patch S4/gate 27) -
   *  above it Perseus merges with Outer at the inner disc edge (the arm this
   *  project's own `Norma-Outer` entry split into, Package 02/03 build plan
   *  Stage B, 27 Aug 2026 - Norma's own RrefPc sits nowhere near Perseus's,
   *  so it is Outer specifically this ceiling protects against). */
  readonly broadening: number;
}

/** Reid et al. 2019 - sourced. `broadening` is `calibrated`, ceilinged at
 *  1.02 by gate 27's load-time assertion. */
export const DEFAULT_ARM_WIDTH: ArmWidthParams = {
  refPc: 336, slopePcPerKpc: 36, r0Kpc: 8.15, broadening: 1.0,
};

/** Perpendicular arm width at galactocentric radius R (pc), sourced (form) -
 *  see header for the verified reproduction of the patch's own reference
 *  numbers (183 pc at 3900 pc, ~337 pc at the solar circle). */
export function armWidthPc(R_pc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): number {
  return w.broadening * (w.refPc + w.slopePcPerKpc * (R_pc / 1000 - w.r0Kpc));
}

/** Guards the log-spiral formula's R=0 singularity (`ln(R/Rref)` diverges
 *  as R -> 0). 1 pc is physically inert here - real arms do not extend
 *  anywhere near the galactic centre, and `discTerm`'s own inner taper
 *  (patch S4's `armStartInnerPc`/`armStartOuterPc`) already zeroes the arm
 *  CONTRAST well before R reaches this floor - this clamp exists purely so
 *  the geometry stays finite for a caller that asks anyway (S4.7's own
 *  "finite and non-negative everywhere, including R->0" gate). */
const MIN_ARM_R_PC = 1;

/** Which pitch angle (degrees) governs arm `a`'s geometry at radius R -
 *  the kink upgrade path (see `ArmDefinition`'s own header). `pitchDeg` on
 *  `RrefPc`'s own side of `RkinkPc`, `pitchOuterDeg` on the far side,
 *  matching Reid et al. 2019's own two-segment picture (one pitch angle
 *  inward of a named kink radius, a second beyond it). An arm with no
 *  `RkinkPc`/`pitchOuterDeg` set (every arm this module currently ships)
 *  always returns `pitchDeg` - the single-pitch formula both callers
 *  already used, unchanged. */
function pitchDegAt(a: ArmDefinition, R_pc: number): number {
  if (a.RkinkPc === undefined || a.pitchOuterDeg === undefined) return a.pitchDeg;
  const sameSideAsRef = (R_pc - a.RkinkPc) * (a.RrefPc - a.RkinkPc) >= 0;
  return sameSideAsRef ? a.pitchDeg : a.pitchOuterDeg;
}

/** Galactocentric azimuth (radians) of arm `a`'s ridge at radius R - the
 *  log-spiral relation, sign verified against Reid et al. 2019's own text
 *  this session (see header). Kinked (`RkinkPc`/`pitchOuterDeg` both set):
 *  integrates the two-segment pitch from `RrefPc` out to R, continuous at
 *  the kink by construction (both branches evaluate to the same theta AT
 *  `RkinkPc`, so there is no seam) - reduces exactly to the single-pitch
 *  formula when neither is set. */
export function thetaArmRad(a: ArmDefinition, R_pc: number): number {
  const R = Math.max(R_pc, MIN_ARM_R_PC);
  const thetaRefRad = degToRad(a.thetaRefDeg);
  const innerPitchRad = degToRad(a.pitchDeg);
  const thetaFromRef = (r: number) => thetaRefRad - (1 / Math.tan(innerPitchRad)) * Math.log(r / a.RrefPc);

  if (pitchDegAt(a, R) === a.pitchDeg) return thetaFromRef(R);

  const outerPitchRad = degToRad(a.pitchOuterDeg!);
  return thetaFromRef(a.RkinkPc!) - (1 / Math.tan(outerPitchRad)) * Math.log(R / a.RkinkPc!);
}

/**
 * Frame-sanity assertion (Prompt P3, arms bundle R2, 27 Aug 2026) - the
 * one-line check that would have caught this project's sign-convention
 * error before it shipped, had it existed at the time. A sign error in
 * the Reid arm equation has occurred three times in this project's
 * history, most recently inside the very documents warning about it -
 * see `thetaArmRad`'s own header and the module header below for the
 * convention this protects: Reid's `beta` runs zero toward the Sun,
 * increasing with Galactic rotation, and R DECREASES as beta increases
 * (`ln(R/R_kink) = -(beta - beta_kink)*tan(psi)`); a literal transcription
 * of that sign into a counter-clockwise theta frame inverts it and mirrors
 * the whole galaxy.
 *
 * Numerically inverts `thetaArmRad` (bisection, since it is monotonic in R
 * - see gate 11 in `spiralArms.conformance.ts`) to find where the Perseus
 * arm crosses theta=0, the point directly beyond the Sun (Perseus's own
 * `thetaRefDeg` is 0). The real answer is Perseus sitting roughly 2 kpc
 * beyond the Sun toward the anticentre, ~10.07 kpc; the mirrored-frame
 * answer is ~7.81 kpc, INSIDE the solar circle - the two are far enough
 * apart that a 0.5 kpc tolerance cannot confuse them.
 *
 * Exposed as a helper, not buried in a test, so any future beta<->R work -
 * a new arm table, a rewritten `thetaArmRad`, a different reference radius
 * - can call this directly and fail loudly rather than silently mirroring
 * the galaxy. Throws rather than returning a bool: this is a hard
 * assertion for gate/startup-time use, not a query.
 */
export function assertArmFrameSanity(): void {
  const perseus = ARMS.find((a) => a.name === 'Perseus');
  if (!perseus) {
    throw new Error('assertArmFrameSanity: no arm named "Perseus" in ARMS - cannot run the frame-sanity check');
  }
  let lo = 1000, hi = 30000;   // pc; brackets Perseus's own RrefPc=10470 comfortably, no kink to worry about
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (thetaArmRad(perseus, mid) > 0) lo = mid; else hi = mid;
  }
  const R_kpc = (lo + hi) / 2000;
  const EXPECTED_KPC = 10.07, TOLERANCE_KPC = 0.5;
  if (Math.abs(R_kpc - EXPECTED_KPC) > TOLERANCE_KPC) {
    throw new Error(
      `assertArmFrameSanity: Perseus at theta=0 lands at ${R_kpc.toFixed(2)} kpc, outside ` +
      `${TOLERANCE_KPC} kpc of the expected ${EXPECTED_KPC} kpc (Perseus, ~2 kpc beyond the ` +
      `Sun toward the anticentre). A mirrored, counter-clockwise theta frame would land near ` +
      `7.81 kpc, INSIDE the solar circle - check the sign in thetaArmRad.`,
    );
  }
}

/** Von Mises concentration for arm `a` at radius R - derived, see header.
 *  Verified to reproduce the patch's own kappa reference table exactly
 *  (18.7511 to 30.9951 over 3.5-16 kpc, all arms, 25 pc steps). Uses
 *  `pitchDegAt` so a kinked arm's angular width also switches pitch at the
 *  kink, consistent with `thetaArmRad`'s own ridge. */
export function kappaOf(a: ArmDefinition, R_pc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): number {
  const R = Math.max(R_pc, MIN_ARM_R_PC);
  const pitchRad = degToRad(pitchDegAt(a, R));
  const sw = Math.max(armWidthPc(R, w), 1);   // guards a hypothetically negative/zero width at extreme R
  return (R * Math.sin(pitchRad)) ** 2 / (sw * sw);
}

// Filtered-by-tier subsets, memoised PER ARM TABLE rather than re-filtered on
// every call - `armFactor` is on the hot path of every density-map render
// (one call per z-sample per population per grid cell), and `arms.filter
// (...)` was allocating a fresh array on every single one of those calls
// despite the result being constant for the life of a given arm table (16
// Aug 2026, perf finding while diagnosing a GUI report - the allocation
// churn was a real contributor to how expensive a high-resolution preview
// render was, independent of the display bug it was found alongside).
//
// KEYED BY THE ARRAY ITSELF, not a name - this module no longer has exactly
// one arm table (`generateSeededArms` below produces a fresh one per
// worldSeed), so a single pair of module-level constants would silently
// answer for the WRONG table the moment a second one existed. A `WeakMap`
// keyed on the `arms` reference gives every distinct table its own cache
// entry, computed once and reused for as long as that reference is alive -
// exactly the module-level-constant behaviour `ARMS` itself already got,
// generalised rather than special-cased.
const ARMS_NONE: readonly ArmDefinition[] = [];
const filteredArmsCache = new WeakMap<readonly ArmDefinition[], { readonly major: ArmDefinition[]; readonly majorMinor: ArmDefinition[] }>();

function filteredArmsFor(arms: readonly ArmDefinition[]): { readonly major: ArmDefinition[]; readonly majorMinor: ArmDefinition[] } {
  let entry = filteredArmsCache.get(arms);
  if (!entry) {
    entry = {
      major: arms.filter((a) => a.tier === 'major'),
      majorMinor: arms.filter((a) => a.tier === 'major' || a.tier === 'minor'),
    };
    filteredArmsCache.set(arms, entry);
  }
  return entry;
}

function armsInSet(set: ArmResponseSet, arms: readonly ArmDefinition[] = ARMS): readonly ArmDefinition[] {
  switch (set) {
    case 'all': return arms;
    case 'majorMinor': return filteredArmsFor(arms).majorMinor;
    case 'major': return filteredArmsFor(arms).major;
    case 'none': return ARMS_NONE;
  }
}

function wrapPi(d: number): number {
  const twoPi = 2 * Math.PI;
  const w = ((d + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return w;
}

/**
 * One arm's MEAN-SUBTRACTED ridge at (R, theta) - `sourced (form)`, see
 * header. `besselI0e(kappa)` is exactly the circular mean of
 * `exp(kappa*(cos(dtheta)-1))`, so this ridge averages to zero over a full
 * circle at fixed R: arms redistribute density around an annulus, they do
 * not add to its total. `besselI0e`, not the unscaled `besselI0`, purely for
 * numerical accuracy (kappa reaches ~31 here, nowhere near overflow) - the
 * scaled form avoids the digit loss `exp(kappa)*exp(-kappa)` would cost.
 */
export function armRidge(a: ArmDefinition, R_pc: number, theta_rad: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH): number {
  const dth = wrapPi(theta_rad - thetaArmRad(a, R_pc));
  const k = kappaOf(a, R_pc, w);
  return Math.exp(k * (Math.cos(dth) - 1)) - besselI0e(k);
}

/**
 * Along-arm amplitude envelope (Amendment A6, morphology patch v3.0, 17 Aug
 * 2026) - defect 1's own fix ("arms are always perfect - no spurs, no
 * breaks, no fracturing"). `armRidge` above is a function of (R, theta)
 * with no variation ALONG a fixed arm at fixed pitch; this multiplies it by
 * a smooth wave in R (a genuine arc-length parametrisation would differ
 * slightly from raw R along a log-spiral, but R increases monotonically
 * along any one continuous arm strand, and the envelope only needs to
 * fragment the VISUAL/statistical structure, not model a real physical
 * wavenumber - `calibrated` simplification, stated plainly rather than
 * silently assumed exact).
 *
 * PRESERVES THE MEAN-ZERO INVARIANT `armRidge` itself establishes:
 * `alongArmModulation` depends on R and the arm's own identity ONLY, never
 * on theta - multiplying a circle-mean-zero function (fixed R) by a
 * theta-INDEPENDENT scalar is still circle-mean-zero at that R. Arms still
 * only ever redistribute systems around an annulus, never add to it,
 * exactly as `armRidge`'s own header requires - a modulated arm is a
 * FRAGMENTED arm, not a net density change.
 *
 * PER-ARM PHASE, not a stored field: derived from a fold of `a.RrefPc` AND
 * `a.thetaRefDeg` via a cheap deterministic hash-like fold, rather than
 * extending `ArmDefinition` with a new field - keeps every existing
 * `ArmDefinition` literal (`ARMS`, every `generateSeededArms` push)
 * untouched, and keeps this module's own stated invariant that arm
 * EVALUATION (`armRidge`/`armFactor`/this function) consumes no PRNG
 * channel - "a shape not a draw" (this file's own header) - the phase is
 * derived, not rolled.
 *
 * BOTH fields folded in, genVersion BUMP 12 (25 Aug 2026, item 4's own
 * follow-up: a direct user report that patchiness only actually SHOWED for
 * roughly 1 in 4 tested galaxies, after bump 11's depth increase had
 * already landed). Root-caused, not guessed: this comment originally
 * claimed `RrefPc` was "already distinct per arm in every table this
 * project builds" - true for `ARMS` (six different RrefPc values, one
 * shared thetaRefDeg=0), but FALSE for `generateSeededArms`, which gives
 * EVERY arm the identical `R0_SEEDED_REF_PC` and instead varies
 * `thetaRefDeg` per arm - the exact opposite pairing, never checked against
 * this function's own assumption. Every seeded arm was therefore getting
 * the IDENTICAL phase, so all of a galaxy's arms brightened and dimmed IN
 * SYNC at any given R - and `modulateArmsForDisplay`'s own ring-mean ratio
 * (values[i]/ringMean(R)) largely CANCELS a change that scales every arm in
 * a ring together, since the ring mean (dominated by the arm peaks) rises
 * and falls by roughly the same factor. Only a seed whose arms happened to
 * differ enough in weight or kink geometry leaked enough asymmetry through
 * for the ring-mean cancellation to be incomplete - matching the reported
 * "1 in 4" rate far better than a uniformly-too-weak effect would. Folding
 * `thetaRefDeg` in (always genuinely distinct per seeded arm, by
 * construction - `evenSpacingDeg` alone already separates every arm before
 * jitter) decorrelates every seeded arm's own phase from every other arm's,
 * independent of whether the table's `RrefPc` values happen to vary. `ARMS`
 * itself is UNCHANGED by this - `thetaRefDeg` is 0 for all six of its
 * entries, contributing nothing to the fold, so its own already-working
 * RrefPc-driven phase spread is reproduced bit-for-bit.
 */
export interface ArmModulationParams {
  /** pc, along-arm (approximated as radial) wavelength of the envelope -
   *  `calibrated`, the patch's own stated 2-5 kpc range. */
  readonly wavelengthPc: number;
  /** [0, 1) - how deep the envelope's troughs cut. 0 = no modulation at all
   *  (a perfectly smooth arm, `armFactor`'s pre-A6 behaviour exactly - the
   *  default). Approaching 1 fragments the arm into near-disconnected
   *  segments at the envelope's own troughs. `calibrated`. */
  readonly depth: number;
}

function alongArmModulation(a: ArmDefinition, R_pc: number, m: ArmModulationParams): number {
  if (m.depth <= 0) return 1;
  // Folds BOTH RrefPc and thetaRefDeg (genVersion BUMP 12) - see this
  // function's own header, "BOTH fields folded in", for why relying on
  // RrefPc alone silently gave every generateSeededArms table one shared
  // phase. The `* 37` spreads thetaRefDeg's own [0,360) range widely across
  // the `% 997` fold rather than clustering near-identical angles into
  // near-identical phases.
  const phase = (((a.RrefPc + a.thetaRefDeg * 37) % 997 + 997) % 997 / 997) * 2 * Math.PI;
  const wave = Math.cos((2 * Math.PI * R_pc) / m.wavelengthPc + phase);   // in [-1, 1]
  return 1 - m.depth * (0.5 - 0.5 * wave);   // in [1-depth, 1] - never boosts an arm beyond its own unmodulated ridge
}

/**
 * Per-armClass along-arm modulation (Amendment A6) - `calibrated` values.
 * `grandDesign` stays comparatively smooth (low depth, matching "2 arms,
 * low modulation" in the patch's own Section 4 table); `flocculent`
 * fractures heavily (high depth, "many short segments, heavy along-arm
 * modulation"); `multipleArm` sits between the two, matching its own "3-4
 * arms, inner two-arm symmetry" description (visible structure, not yet
 * fragmented into segments).
 *
 * RAISED, 25 Aug 2026 (item 4's own fix, genVersion BUMP 11 - a direct user
 * report after landing at the original 0.08/0.30/0.80: "no patchiness in
 * the arms either they're just simple spirals"). The original values were
 * real (gate 19 confirms perturbing `depth` genuinely changes `densityAt`)
 * but too weak to survive `modulateArmsForDisplay`'s own ring-mean-ratio
 * pipeline against the arm/interarm contrast it shares that pipeline with -
 * confirmed directly (disposable diagnostic scripts, this session): at the
 * original `multipleArm` depth (0.30), a walk along a seeded ridge showed a
 * genuine ~22% raw swing but the DISPLAYED value only echoed a faint,
 * easily-missed ripple once run through the same contrast-boost/percentile
 * -stretch every arm/interarm pixel goes through. `grandDesign`/
 * `multipleArm` raised (0.08->0.18, 0.30->0.50); `flocculent` unchanged -
 * already the strongest tier and not implicated by the report (a flocculent
 * roll is a 25% draw, not what most testing lands on by default).
 */
export const ARM_CLASS_MODULATION: Readonly<Record<ArmClass, ArmModulationParams>> = {
  grandDesign: { wavelengthPc: 5000, depth: 0.18 },
  multipleArm: { wavelengthPc: 3500, depth: 0.50 },
  flocculent: { wavelengthPc: 2200, depth: 0.80 },
};

/**
 * The arm density multiplier at (R, theta) for the given arm-response set
 * and contrast - `1` at the azimuthal mean of every radius (mean-preserving,
 * see `armRidge`), rising above 1 at an arm ridge and dipping below 1 in the
 * interarm gaps, which is the physically correct behaviour of a spiral
 * density wave: it redistributes systems around an annulus rather than only
 * ever adding them. Never clamped to a floor of 1 or 0 - `spiralArms.
 * conformance.ts` gate 7 verifies the field stays strictly positive across
 * this project's own parameter range without needing one.
 *
 * `arms` (16 Aug 2026) defaults to the real Milky Way table (`ARMS`) - an
 * omitted argument reproduces every prior call site's behaviour exactly, so
 * this is additive, not a rename. A caller with its own seeded table
 * (`generateSeededArms`) passes it explicitly; every arithmetic step below
 * is unchanged, it simply iterates a different table.
 *
 * `modulation` (17 Aug 2026, Amendment A6) is OPTIONAL - an omitted
 * argument reproduces every prior call site's behaviour exactly (no
 * along-arm envelope at all), bit-for-bit.
 */
export function armFactor(
  set: ArmResponseSet, contrast: number, R_pc: number, theta_rad: number,
  w: ArmWidthParams = DEFAULT_ARM_WIDTH, arms: readonly ArmDefinition[] = ARMS,
  modulation?: ArmModulationParams,
): number {
  let total = 0;
  for (const a of armsInSet(set, arms)) {
    const env = modulation ? alongArmModulation(a, R_pc, modulation) : 1;
    total += a.weight * armRidge(a, R_pc, theta_rad, w) * env;
  }
  return 1 + contrast * total;
}

/** max(armFactor)/min(armFactor) over the full circle at fixed R - the
 *  quantity the patch's own contrast derivation solves against (Drimmel &
 *  Spergel's observed spiral-arm contrast, K ~ 1.326). `n` matches
 *  `precise_block.py`'s own sampling density. `arms` - see `armFactor`. */
export function armContrastRatio(
  set: ArmResponseSet, contrast: number, R_pc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH,
  n = 14401, arms: readonly ArmDefinition[] = ARMS,
): number {
  let max = -Infinity, min = Infinity;
  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / n;
    const v = armFactor(set, contrast, R_pc, theta, w, arms);
    if (v > max) max = v;
    if (v < min) min = v;
  }
  return max / min;
}

/** Bisection root-find on a monotonically-increasing function - `armFactor`'s
 *  contrast ratio is monotonic in `c` for fixed R, so this is safe without
 *  pulling in a dependency for one root-find. */
function bisect(f: (x: number) => number, lo: number, hi: number, target: number, iters = 80): number {
  let a = lo, b = hi;
  for (let i = 0; i < iters; i++) {
    const mid = (a + b) / 2;
    if (f(mid) < target) a = mid; else b = mid;
  }
  return (a + b) / 2;
}

/** Drimmel & Spergel 2001's own reported near-IR spiral-arm contrast for the
 *  Milky Way, expressed as the same max/min ratio `armContrastRatio`
 *  computes - `sourced`, the patch's own stated target (S9: "Drimmel &
 *  Spergel K = 1.326"; 1.14/0.86 = 1.325581...). This is `'Milky Way
 *  Analogue'`'s OWN target - real, unchanged by Amendment A6 - and stays
 *  `deriveArmContrasts`'s default `contrastTargetK` for exactly that
 *  reason: every existing caller that omits the parameter (which is every
 *  caller before 17 Aug 2026) keeps this real, sourced anchor. */
export const DRIMMEL_SPERGEL_K = 1.14 / 0.86;

/**
 * Per-armClass contrast target (Amendment A6, morphology patch v3.0, 17 Aug
 * 2026) that `deriveArmContrasts` bisects the 'major'-set/`oldThin`
 * contrast against - `calibrated`, and calibrated EMPIRICALLY against the
 * real SUMMED galaxy field (disposable diagnostic script, this session),
 * not by the naive analytic conversion `K = 10^(A/2.5)` this constant's
 * own first draft used. That naive conversion is WRONG for this project's
 * own architecture and was caught, not assumed correct: `deriveArmContrasts`
 * solves a target K against the ISOLATED 'major' arm-response set (matching
 * `oldThin`'s own contrast alone), but `galaxyModel.measuredArmMagnitude`
 * (gate G2) measures the FULL SUMMED field across every responding
 * population -
 * these are NOT the same quantity, and how far apart they land depends
 * entirely on WHICH populations respond for a given class, not merely how
 * strongly. Measured directly: at the naive `flocculent` target (K~2.51,
 * from A~1.0mag applied to the isolated set), the SUMMED field's own A(R)
 * came out to only ~0.50 mag - flocculent's response table zeroes out
 * every population except `spiralYoungThin`, and that population is only
 * ~23% of the local disc's total nLocal weight, so its own strong contrast
 * is heavily DILUTED once the arm-free 77% is added back into the sum.
 * `multipleArm`/`grandDesign` (four/five responding populations,
 * effectively no dilution) OVERSHOT the naive conversion in the opposite
 * direction for the same underlying reason. Re-swept empirically instead:
 * for each class, multiple target K values were tried, the SUMMED field's
 * `measuredArmMagnitude` re-measured at R0 (8178 pc) after each, and the
 * value below chosen once it landed inside (flocculent, multipleArm) or
 * clearly above (grandDesign) the patch's own stated band, with density
 * confirmed to stay strictly positive at every radius tested (3500-14000
 * pc) - not merely at the one reference point.
 *
 * Measured results at the chosen values (R0=8178pc): `flocculent` K=4.0 ->
 * A(R0)=1.009 mag (sourced band 0.7-1.4); `multipleArm` K=2.65 ->
 * A(R0)=1.415 mag (patch's own stated ~1.4 mag point value); `grandDesign`
 * K=3.0 -> A(R0)=1.767 mag (sourced floor ">1.4 mag", comfortable margin
 * above both 1.4 and `multipleArm`'s own value).
 *
 * DELIBERATELY NOT USED for `'Milky Way Analogue'` (`armSource:
 * 'observed-mw'`) even though that morphology's `armClass` is fixed to
 * `'multipleArm'` - a real tension in the patch document itself, resolved
 * here rather than silently picked: the patch states BOTH "the current
 * shipped table IS the multipleArm row" (implying today's DRIMMEL_SPERGEL_K
 * -anchored contrast already qualifies) AND a ~1.4 mag target for that same
 * row - but the shipped contrast's own measured value (summed field,
 * ~0.38 mag, confirmed via the same measurement this session) does not
 * reach even the flocculent band's lower edge, let alone 1.4 mag (Section
 * 1.4 of the patch says so directly: "the rendered field is below the
 * observed floor for the most fragmented real spirals"). Both cannot be
 * literally true at once. Resolved by keeping 'Milky Way Analogue' on its
 * real, sourced Drimmel & Spergel anchor unconditionally (it is pinned to
 * the ACTUAL Milky Way, not to this procedural system) and reserving this
 * per-class table for `armSource: 'seeded'` galaxies only, where gate G2
 * actually tests the claim.
 */
export const ARM_CLASS_CONTRAST_TARGET_K: Readonly<Record<ArmClass, number>> = {
  flocculent: 4.0,
  multipleArm: 2.65,
  grandDesign: 3.0,
};

/* ============================================================================
 * RESONANCE RADII AND PATTERN SPEED (Package 02/03 build plan, Stage A,
 * 27 Aug 2026) - foundations only. Pure functions and sourced/derived
 * constants, not yet wired into armFactor/densityAt - genuinely bump-free,
 * same as every other addition in this stage. Ruling 11's own design
 * document (`verification/arms-bundle-r2/RULING-11-PROPOSAL-pattern-speed
 * -architecture.md`, Erratum 2) is the source of record for the reasoning
 * below; this is that design, implemented.
 * ==========================================================================*/

/**
 * The standard epicyclic-resonance radius ratio, flat rotation curve
 * generalised to a power-law slope `beta` (V(R) ~ R^beta, beta=0 flat) -
 * `sourced (form)`, classical resonance theory (see
 * `verification/arms-bundle-r2/bundle-source/resonance-derivation.py` for
 * the derivation this reproduces). `side` picks the inner ('-') or outer
 * ('+') member of the m-armed resonance pair - the SAME |m| gives two
 * different radii (e.g. m=2 has both an ILR and an OLR), so this is not
 * folded into the sign of `m` itself.
 *
 * VERIFIED against the flat-curve (beta=0) reference values this project's
 * own audit already carries: ILR m=2 -> 0.2929 ('inner'), 4:1 ultraharmonic
 * m=4 -> 0.6464 ('inner'), corotation -> 1.0000 (m -> infinity, or read
 * directly, never through this formula), OLR m=4 -> 1.3536 ('outer'), OLR
 * m=2 -> 1.7071 ('outer') - all four reproduce to 4dp (gated).
 */
export function resonanceRatio(m: number, beta: number, side: 'inner' | 'outer'): number {
  const sign = side === 'outer' ? 1 : -1;
  return (1 + sign * Math.sqrt(2 * (1 + beta)) / m) ** (1 / (1 - beta));
}

/**
 * Main spiral pattern speed - `sourced`, Dias et al. 2019, MNRAS 486, 5726.
 * Ω_p = 28.2 ± 2.1 km/s/kpc is their own MEASURED quantity (from spiral-arm
 * tracer kinematics); R_c = 8.51 kpc is DERIVED from it under their own
 * adopted frame (R0=8.3kpc, V0=240km/s) via R_c = V0/Ω_p, not a second
 * independent measurement - confirmed by re-deriving it from their own
 * numbers (240/28.2 = 8.5106, matching their stated 8.51 exactly). This
 * project imports Ω_p directly, per Ruling 11 Erratum 2 / this session's
 * own P13 research (`galaxyForge-P13-PATTERN-SPEED-RESEARCH-2026-08-27
 * .md`) - never R_c, which would silently import a number computed in
 * Dias's own frame rather than this project's.
 */
export const SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC = 28.2;

/**
 * Outer m=2 companion pattern speed - `derived`, NOT an independent
 * constant. Lépine et al. 2011b's own "outer pattern" claim is an N-body
 * reconciliation conjecture (not an observation) between Lépine 2011a
 * (single pattern, corotation ~8.4 kpc) and Quillen & Minchev 2005 (4:1
 * inner resonance at the solar radius, independently measured from local
 * stellar kinematics) - there is no real "outer Ω_p" measurement to
 * import. What IS real is the reconciliation CONSTRAINT itself: the outer
 * pattern's own 4:1 inner resonance coincides with the main pattern's
 * corotation, R_4:1,outer = R_CR,main. On a flat curve that is
 * `resonanceRatio(4, 0, 'inner')` = 0.6464, so Ω_p,outer =
 * 0.6464 x Ω_p,main - storing this as an independent stored constant would
 * be the same "measuring the analysis, not the galaxy" error Erratum 1
 * already fixed for `armTipArcDeg` (a calibrated STATISTIC mistaken for a
 * sourced one), applied here to a CONSTANT instead. See Ruling 11 Erratum
 * 2 for the full reasoning and the open sourcing gap this still carries
 * (Lépine 2011b/Quillen & Minchev not yet read at their own version of
 * record - `FOLLOW-UP-AUDIT-2026-08-27.md`, items 1-2).
 */
export const SPIRAL_PATTERN_SPEED_OUTER_KM_S_KPC =
  resonanceRatio(4, 0, 'inner') * SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC;

/**
 * Arm inner attachment radius (Ruling 5, 27 Aug 2026: arms attach at the
 * bar END, not bar corotation) - `sourced, By-law S`. Wegg, Gerhard &
 * Portail 2015's own long-bar half-length, 5.0 +/- 0.2 kpc - distinct from
 * `DEFAULT_BULGE.scalePc` (`galaxyParameters.ts`, 700pc x-scale), which
 * models the much smaller boxy/peanut bulge component, not this long bar.
 * The bar-length dispute is partly definitional, not a 30% measurement
 * spread on one quantity: Wegg/Gerhard/Portail's 5.0kpc is the long-bar
 * half-length; the boxy/peanut component is ~2.2kpc; Lucey et al. 2023's
 * ~3.5kpc is the maximal extent of TRAPPED bar orbits, a different
 * quantity again. By-law S marked because the attachment mechanism itself
 * is contested (Sellwood & Sparke 1988: bar and spiral generally run at
 * DIFFERENT pattern speeds even where this attachment reading survives -
 * the empirical attachment holds for a large fraction of the beat period
 * regardless of the dynamical dispute, which is why the bar-end reading
 * is adopted despite that contest, not because it is settled).
 */
export const ARM_INNER_ATTACH_RADIUS_PC = 5000;

/**
 * Derives this module's own `oldThin`/`midThin`/`youngThin` contrast
 * constants by the patch's own target-driven procedure - see header for why
 * these are `calibrated (derived here)`, not `sourced`, and do not match
 * the patch's own stated 4-dp figures exactly. Computed once per distinct
 * (arms, referenceRPc, w, contrastTargetK) combination, lazily, memoised
 * (it is a root-find over a 14401-point circle sweep - not free).
 *
 * `contrastTargetK` (17 Aug 2026, Amendment A6) defaults to
 * `DRIMMEL_SPERGEL_K` - an omitted argument reproduces every prior call
 * site's behaviour exactly, bit-for-bit. A caller with a rolled `armClass`
 * passes `ARM_CLASS_CONTRAST_TARGET_K[armClass]` instead (`galaxyParameters
 * .ts`'s own `armContrast` closure does this).
 *
 * CACHING, REVISED 16 Aug 2026: this used to be a SINGLE module-level slot
 * (`let cachedContrasts`), safe only because every call site in the project
 * happened to share the same `referenceRPc`/`w`/(implicit) `ARMS` table. The
 * moment a second, seeded arm table exists (`generateSeededArms`), that
 * single slot would have silently served one worldSeed's contrast constants
 * to every OTHER worldSeed's galaxy - a real correctness bug, not a
 * hypothetical one. The cache is now keyed on the `arms` array's own
 * identity (a `WeakMap`, so a table that goes out of scope is reclaimed
 * normally) and, within that, on the numeric inputs (now including
 * `contrastTargetK`, so two different armClass targets against the SAME
 * table never collide) - `deriveArmContrasts(8200)` still returns the
 * IDENTICAL object on repeat calls (gate 5 in `spiralArms.conformance.ts`
 * asserts this unchanged), it just no longer conflates two different
 * tables', or now two different targets', answers.
 */
export interface ArmContrastSet {
  readonly oldThin: number;
  readonly midThin: number;
  readonly youngThin: number;
}

const contrastCache = new WeakMap<readonly ArmDefinition[], Map<string, ArmContrastSet>>();

export function deriveArmContrasts(
  referenceRPc: number, w: ArmWidthParams = DEFAULT_ARM_WIDTH, arms: readonly ArmDefinition[] = ARMS,
  contrastTargetK: number = DRIMMEL_SPERGEL_K,
): ArmContrastSet {
  let byKey = contrastCache.get(arms);
  if (!byKey) { byKey = new Map(); contrastCache.set(arms, byKey); }
  const key = `${referenceRPc}|${w.refPc}|${w.slopePcPerKpc}|${w.r0Kpc}|${w.broadening}|${contrastTargetK}`;
  const cached = byKey.get(key);
  if (cached) return cached;

  const cOldFull = bisect(
    (c) => armContrastRatio('major', c, referenceRPc, w, 14401, arms),
    1e-4, 3.0, contrastTargetK,
  );
  // Patch S4's own stated multipliers (1.4x, 2.0x over oldThin) - calibrated,
  // not re-derived independently; the patch is explicit these are ratios,
  // not fitted figures in their own right. Multiply from the FULL-PRECISION
  // solve, THEN round once - rounding oldThin first and multiplying the
  // rounded value (the previous bug here) silently drifts midThin/youngThin
  // by a rounding-quantum's worth (0.4334 vs the correct 0.4335, etc).
  const oldThin = Math.round(cOldFull * 1e4) / 1e4;
  const midThin = Math.round(cOldFull * 1.4 * 1e4) / 1e4;
  const youngThin = Math.round(cOldFull * 2.0 * 1e4) / 1e4;
  const result: ArmContrastSet = { oldThin, midThin, youngThin };
  byKey.set(key, result);
  return result;
}

/**
 * `armFactor` evaluated at the reference point, using STORED (4-dp rounded)
 * contrasts per the patch's own S7 self-consistency rule - "round the
 * inputs first, then derive". This is what a population's own `nLocal`
 * normalisation must be divided by so `densityAt(reference)` equals
 * `nLocal` exactly rather than as a ring mean (patch S4). `arms` - see
 * `armFactor`'s own doc comment.
 *
 * `modulation` (17 Aug 2026, Amendment A6) MUST be the SAME value the
 * caller's own raw `armFactor` evaluation uses, not merely a compatible
 * one - `galaxyModel.discTerm` passes `params.armModulation` to BOTH this
 * function and its own raw call. Passing modulation to one but not the
 * other would break the self-consistency this function exists for: at
 * R=referenceRPc exactly, the raw and corrected values must be IDENTICAL
 * (same formula, same point), which only holds if both include or both
 * omit the along-arm envelope together.
 */
export function anchorArmCorrection(
  set: ArmResponseSet, contrasts: ArmContrastSet, referenceRPc: number, referenceThetaRad: number,
  w: ArmWidthParams = DEFAULT_ARM_WIDTH, arms: readonly ArmDefinition[] = ARMS,
  modulation?: ArmModulationParams,
): number {
  const c = set === 'all' ? contrasts.youngThin : set === 'majorMinor' ? contrasts.midThin : set === 'major' ? contrasts.oldThin : 0;
  return armFactor(set, c, referenceRPc, referenceThetaRad, w, arms, modulation);
}

/* -------------------------------- glossary ----------------------------------- */

import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
  {
    term: 'Named spiral arms (Reid 2019)', status: 'sourced',
    short: 'The six real spiral arms of the Milky Way, each with its own pitch angle and radius.',
    long: 'Scutum-Centaurus, Sagittarius-Carina, Local (spur), Perseus, Norma and Outer, from VLBI maser parallax fits - the same source and figures patch v2.3 transcribes into its parameter schema. Norma and Outer were split from one merged table entry into Table 2\'s own two separate rows, Package 02/03 build plan Stage B, 27 Aug 2026.',
    source: 'Reid et al. 2019, ApJ 885, 131',
  },
  {
    term: 'Arm width relation', status: 'sourced',
    short: 'How much wider a spiral arm gets the further out in the galaxy it is measured.',
    long: 'A linear fit, perpendicular width growing 36 pc per kpc of galactocentric radius from a 336 pc anchor at 8.15 kpc - verified this session to exactly reproduce the patch\'s own reference values (183 pc at 3900 pc).',
    source: 'Reid et al. 2019, ApJ 885, 131',
  },
  {
    term: 'Arm concentration (kappa)', status: 'derived',
    short: 'How sharply the density rises as you cross from between two arms onto one - the arm-model analogue of a bell curve\'s width.',
    long: 'Derived from the arm width relation via the small-angle von Mises approximation; verified this session to reproduce the patch\'s own reference kappa range (18.7511-30.9951 over 3.5-16 kpc) to 4 decimal places across a 630-point independent sweep.',
  },
  {
    term: 'Arm contrast', status: 'derived',
    short: 'How much denser a spiral arm\'s crest is than the gap between arms, for a given population.',
    long: 'Solved (not quoted) against Drimmel & Spergel 2001\'s observed near-infrared arm contrast (K ~ 1.326), using a mean-subtracted von Mises ridge per arm (`besselI0e(kappa)` removes each arm\'s own circular mean, so arms redistribute density rather than add to it). Reproduces the patch\'s own stated figures (0.3096/0.4335/0.6193) to full double precision - the missing combining-function piece was recovered 16 Aug 2026 by auditing a sibling build of this project that still had the original derivation script.',
    source: 'Drimmel & Spergel 2001, ApJ 556, 181 (target); patch v2.3 S3/S9 (procedure); besselI0e mean-subtraction ported from the sibling `galaxyforge` build\'s galaxyParameters.ts/mathStats.ts',
  },
  {
    term: 'Seeded arm geometry', status: 'tunable',
    short: 'A per-worldSeed procedural arm table (count, pitch, phase) for galaxies that are not meant to model the real Milky Way.',
    long: 'Closes a real, previously-declared-but-unbuilt gap (`galaxyParameters.armSource: \'seeded\'`) - every worldSeed used to reproduce the identical real-arm table, so no galaxy-shape choice actually varied by seed. 2-4 base arms (uniform), one shared pitch angle in [10,22) degrees, an independent phase rotation and per-arm jitter, an optional weak spur (45% chance) - invented for this feature, not fitted to any survey. The real Reid et al. 2019 table stays reserved for the "Milky Way Analogue" choice specifically, which is explicitly meant to be the real galaxy.',
  },
];
