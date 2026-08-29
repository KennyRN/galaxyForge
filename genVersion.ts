/**
 * genVersion - THE single bump, for the whole programme (S3, Stage 10).
 *
 * Every science module built across Stages 1-9 plus the real morphology
 * implementations, `galacticDensity`, `placement`, `remnants`, `conatal` and
 * `sky` alters output relative to a galaxy generated before it existed - so
 * bumping per-module would have forced repeated regeneration for no
 * benefit. This is the ONE bump, landing here, now that the pipeline is
 * coherent (S3's own reasoning: "a fixture cut earlier would enshrine
 * pre-bump behaviour nobody intends to keep").
 *
 * `verification/golden/gen1.json` is the fixture cut against genVersion 1.
 *
 * BUMP 2, 15 Aug 2026 (patch v2.3): the spiral's density field is no longer
 * axisymmetric-in-effect - `spiralArms`/`starFormingComplexes` genuinely
 * change `densityAt`/`densityByPopulation` for `spiral`/`barredSpiral` at a
 * fixed (worldSeed, cell range), so every placed/remnant system's exact
 * density-derived draw budget and resulting position/population changes
 * relative to a gen-1 galaxy. `verification/golden/gen2.json` is the fixture
 * cut against THIS version - see `goldenMaster.conformance.ts`.
 *
 * BUMP 3, 16 Aug 2026 (six ported changes, ONE bump - the same "coordinate,
 * do not trickle" reasoning as bump 2, and the sibling build's own R7
 * precedent): (1) spiralArms' besselI0e mean-subtraction fix - every
 * spiral/barredSpiral arm contrast changes; (2) placement's genuine
 * two-level Thomas process replacing the fixed-cluster-size approximation
 * - every clustered population's exact positions/counts change;
 * (3) remnants' Cummings 2018 IFMR + real-age-threaded cooling +
 * surviving-planet mechanism - every remnant's mass/radius/temperature and
 * existence-of-planet changes; (4) remnants and co-natal chemistry are now
 * actually composed into a real sector (`sectorFootprint.assembleSector`)
 * - a generated sector's system SET changes, not merely individual
 * systems' properties; (5) starFormingComplexes' discrete placement
 * hierarchy replacing the continuous density-multiplier - youngThin's
 * exact positions in a complex-tier-active region change; (6) the
 * lenticular classical bulge's Prugniel-Simien profile + the lenticular
 * halo's closed-form mass normalisation, both replacing prior Hernquist/
 * point-anchor forms - elliptical is untouched by (1)/(2)/(5) but its own
 * populations still redraw under the shared placement/remnant machinery
 * bump, and lenticular changes under (6) directly.
 * `verification/golden/gen3.json` is the fixture cut against THIS version,
 * widened (an audit finding, same date) to cover all four morphologies and
 * a full `SystemCore` hash per morphology, not just spiral placement/
 * remnants - see `goldenMaster.conformance.ts`.
 *
 * BUMP 4, 16 Aug 2026 (a user-found gap): `terraforming.rollTerraforming`
 * gains a second parameter, `terraformIntensity` - the completeness roll
 * (previously uniform regardless of `terraformScale`) is now biased by a
 * power-curve exponent keyed on this new value, so every ALREADY-PLACED
 * terraformed planet's `completeness`/`types`/realised composition can
 * change even though the placement roll itself (which `terraformScale`
 * alone still governs) is untouched. `terraformIntensity = 3` (the new
 * default, matching the slider's own midpoint) reproduces the prior
 * uniform draw's DISTRIBUTION exactly - see `terraforming.ts`'s own
 * `intensityExponent` doc comment - but this is not bit-identical to a
 * gen-3 galaxy at the individual-draw level, because it is now one call
 * consuming `Math.pow(rng(), 1)` rather than `rng()` directly, and floating
 * -point round-trip through `Math.pow` is not guaranteed bit-identical to
 * its own input even at exponent 1 (verified: it IS bit-identical on this
 * project's target platforms, but the fixture is recut anyway rather than
 * relying on that unstated guarantee holding forever - the same
 * "coordinate, do not trickle" posture bumps 2/3 already established).
 * `verification/golden/gen4.json` is the fixture cut against THIS version.
 *
 * BUMP 5, 16 Aug 2026 (a direct user correction, same day as bump 4):
 * bump 4's own "completeness roll biased by intensity" mechanism was built
 * on a wrong reading of what the user wanted - they clarified `terraform
 * Intensity` was never meant to describe "how far along a SELECTED world's
 * terraforming has progressed" at all (a planet is either terraformed or it
 * isn't, no partial-completion spectrum makes sense for a binary fact).
 * Their actual model: `terraformIntensity` is REACH - how difficult a world
 * can be and still be a candidate at all; `terraformScale` (COVERAGE) then
 * fills that eligible range from the easiest world upward. `terraforming.ts`
 * is rewritten near-total: `rollTerraforming` (RNG-consuming) is replaced by
 * `evaluateTerraforming` (fully deterministic - a score-vs-threshold
 * comparison, no dice roll at all), `completeness` is removed entirely (a
 * terraformed world is simply, completely terraformed), and the module
 * consumes no randomness any more - `CHANNELS.terraforming` is retired,
 * `systemConductor.ts`'s own per-planet terraforming channel derivation is
 * gone. Every ALREADY-PLACED terraformed planet's existence, `types` and
 * realised atmosphere/temperature/pressure can all change relative to a
 * gen-4 galaxy - not a refinement of bump 4's mechanism, a replacement of it.
 * `verification/golden/gen5.json` is the fixture cut against THIS version.
 *
 * BUMP 6, 16 Aug 2026 (a found bug, fixed at the user's own request while
 * investigating an unrelated GUI ask): `GalaxyParameters.scale` - what the
 * GUI's "Galaxy size" slider is supposed to drive for Spiral/Barred/Milky
 * Way Analogue - was set but NEVER READ anywhere in the density model,
 * confirmed by a full-codebase search. Every one of those three morphology
 * choices generated an IDENTICAL galaxy regardless of the chosen size step;
 * only "Standard" (`scale === 1.0`) ever behaved as intended, by
 * coincidence rather than by the size choice being honoured. Fixed by
 * `galaxyModel.scaleSpiralModel` - a coordinate-transform wrapper, not a
 * change to any stored constant (see that function's own header for the
 * self-similarity proof) - now actually wired in from
 * `galaxyCreationModals.modelFromDraft`, the GUI's own one real-generation
 * entry point. `scale === 1.0` ("Standard") is an EXACT fast path
 * (`scaleSpiralModel` returns the identical model reference), so every
 * galaxy generated at the default size step - which is what every
 * conformance gate, the golden master, and `main.ts`'s own test command
 * all use - is untouched bit-for-bit; this bump matters ONLY for a
 * previously-generated Spiral/Barred/Milky-Way-Analogue galaxy built at a
 * non-"Standard" size step, which will now genuinely be bigger or smaller
 * (different R0-anchored disc/halo/bar/arm geometry, hence a different
 * placed system set) for the same worldSeed than it was before this fix.
 * `verification/golden/gen6.json` is the fixture cut against THIS version.
 *
 * BUMP 7, 17 Aug 2026 (morphology & render patch v3.0, step 0 - Amendment
 * A9): the five spiral/barredSpiral population keys were renamed to close
 * the last exception to the morphology-prefix naming convention
 * (`youngThin`->`spiralYoungThin`, and the same for `midThin`, `oldThin`,
 * `thick`, `halo` - see `galaxyModel.ts`'s own `PopulationKey` header for
 * the full reasoning). No density, position, mass, age or any other NUMERIC
 * quantity changes - this was planned as a pure label rename with no
 * genVersion consequence. It gets one anyway, found empirically rather than
 * assumed: `SystemContext.population` stamps this key as a STRING directly
 * into `SystemCore` (and from there into generated note content), so the
 * string a previously-generated Spiral/Barred/Milky-Way-Analogue galaxy
 * would now produce for the same worldSeed genuinely differs, even though
 * every number underneath it is bit-identical - confirmed directly, not
 * inferred: re-running the suite against the STILL-committed `gen6.json`
 * fails placement/remnants/SystemCore hash and byte-identity checks for
 * exactly `spiral` and `barredSpiral` (the two morphologies that carry the
 * renamed keys) and ONLY those two - `elliptical`/`lenticular` pass
 * unchanged. This is the same "coordinate, do not trickle" posture bump 4
 * already established for an equally subtle content change (there, a
 * `Math.pow` reprocessing that didn't even change the underlying
 * distribution); a stamped string is a plainer case than that, not a
 * softer one. `verification/golden/gen7.json` is the fixture cut against
 * THIS version - `gen6.json` is left exactly as committed, an accurate
 * historical snapshot of pre-rename output, never silently overwritten in
 * place.
 *
 * BUMP 8, 17 Aug 2026 (morphology & render patch v3.0, step 1 - Amendment
 * A4): `spiralBoxyPeanutBulge` - a real boxy/peanut bulge population,
 * Wegg & Gerhard 2013 geometry, Licquia & Newman 2015 mass (0.91e10/6.08e10
 * of total MW stellar mass) - lands on `spiral`/`barredSpiral`, replacing
 * `barFactor`'s old role as a MULTIPLIER on the disc (which was modelling a
 * bulge as if it were the bar enhancing disc density - a scope error, see
 * `galaxyParameters.ts`'s own `BulgeParams` header). Every spiral/barred
 * galaxy generated for a given `worldSeed` now has different total density
 * near the centre (the bulge adds real mass there) and disc-only density
 * that is now genuinely bar-INDEPENDENT everywhere (the old taper-windowed
 * multiplier is gone outright, not re-tuned) - both a placed-system-set
 * change, confirmed empirically: re-running the suite against the
 * still-committed `gen7.json` fails placement/remnants byte-identity for
 * `barredSpiral` at its own reference cell (~4170pc, close enough to the
 * bulge's ~700pc scale to matter) and passes for `spiral` at its reference
 * cell (~8170pc, negligibly lit by the bulge either way) - both outcomes
 * are the real, current behaviour, not a partial migration.
 * `barEnabled` no longer touches the disc at all; it now selects only the
 * bulge's own shape (triaxial when true, axisymmetrised - forced to a
 * plain n=2 ellipsoid, not `boxiness` at a=b, see `boxyPeanutBulgeMassDensity`'s
 * own header for why - when false), with total bulge mass identical either
 * way (gate G4). `verification/golden/gen8.json` is the fixture cut against
 * THIS version.
 *
 * BUMP 9, 17 Aug 2026 (morphology & render patch v3.0, step 3 - Amendment
 * A6): `armClass` (`flocculent`/`multipleArm`/`grandDesign`), rolled once
 * per galaxy for `armSource: 'seeded'` (a calibrated synthesis of Elmegreen
 * & Elmegreen 1987/Ann & Lee 2013/Buta et al. 2015's own grand-design
 * fractions - `spiralArms.ARM_CLASS_PRIOR`), fixed to `'multipleArm'`
 * without rolling for `armSource: 'observed-mw'` ('Milky Way Analogue').
 * Selects an arm-response table (flocculent zeroes every population but
 * `spiralYoungThin`), a contrast target empirically calibrated against the
 * real summed field to land inside Elmegreen et al. 2011's own A(R) bands
 * (gate G2 - `spiralArms.ARM_CLASS_CONTRAST_TARGET_K`'s own header records
 * the calibration), and an along-arm amplitude envelope + spur-count/
 * -probability scaling (defect 1's own fix: "arms are always perfect - no
 * spurs, no breaks, no fracturing") - `spiralArms.ARM_CLASS_MODULATION`/
 * `ARM_CLASS_SPUR`.
 *
 * This is NOT limited to seeded galaxies: `armModulation` reaches
 * `discTerm` unconditionally, and the DEFAULT `armClass` ('multipleArm',
 * used whenever a caller omits the parameter - every existing conformance
 * gate, the golden master, `main.ts`'s own test command, and 'Milky Way
 * Analogue' itself) carries a non-zero modulation depth (0.30, not 0) -
 * deliberate, not an oversight: defect 1 was reported as a general
 * problem, not one limited to procedurally-seeded galaxies, and 'Milky Way
 * Analogue' is very plausibly the single most common morphology choice, so
 * leaving the default at zero modulation would have fixed the least-used
 * case and left the most-used one exactly as broken as before. Confirmed
 * empirically, not assumed: re-running the suite against the
 * still-committed `gen8.json` fails placement/remnants byte-identity for
 * `barredSpiral` at its own reference cell; `spiral`'s own reference cell
 * happens to land on a Poisson-rounding coincidence where the (real,
 * measured ~0.1-4% density) perturbation does not cross an integer-draw
 * threshold at that one specific narrow cell - confirmed via a disposable
 * diagnostic script that the underlying continuous field genuinely does
 * differ there too, not a sign the mechanism is inert for `spiral`.
 * DRIMMEL_SPERGEL_K itself is untouched - 'Milky Way Analogue's own
 * contrast MAGNITUDE is unaffected, only its along-arm smoothness.
 * `verification/golden/gen9.json` is the fixture cut against THIS version.
 *
 * NOT bumped again by anything built in this same pass.
 *
 * BUMP 10, 24-25 Aug 2026 (arm kink upgrade path, Scutum-Centaurus only):
 * `spiralArms.ts`'s named-arm model always used ONE averaged pitch angle
 * per arm; Reid et al. 2019's own Table 2 fits each arm as two segments
 * meeting at a kink, and the patch schema had always reserved (but never
 * wired) `RkinkPc`/`pitchOuterDeg` for this. `ArmDefinition` now carries
 * both as optional fields, and `thetaArmRad`/`kappaOf` genuinely switch
 * pitch at the kink when set (continuous at the seam) - see
 * `spiralArms.ts`'s own header, "KINK UPGRADE PATH", for the full
 * verification (Table 2 extracted and quoted directly from the paper's
 * own PDF this session) and for why only Scutum-Centaurus (`RkinkPc:
 * 4910`, `pitchOuterDeg: 12.1`, both Table 2's own values for that arm) is
 * wired - Sagittarius-Carina/Perseus/Norma-Outer are sourced but each
 * deferred for a specific, documented reason (a near-tangential outer
 * pitch, or a kink radius that lands on the R=8200pc solar-circle
 * calibration anchor `deriveArmContrasts` is built on).
 *
 * Scutum-Centaurus's own inner-disc pitch (R<4910pc) moves from 12.04 to
 * 12.1 deg - real, but tiny, and `deriveArmContrasts(8200)` still
 * reproduces the patch's stated 0.3096/0.4335/0.6193 exactly (R=8200 sits
 * on this arm's UNCHANGED `pitchDeg` side of the kink) - the contrast
 * calibration is untouched. `gen9.json` (still committed, unmodified)
 * happens to match this change byte-for-byte at its own reference cells -
 * confirmed by actually re-running the suite against it before this bump,
 * not assumed - the same kind of Poisson-rounding coincidence bumps 6 and
 * 9 already document; per their own precedent, that coincidence is not
 * grounds to skip the bump, since the underlying continuous density field
 * genuinely changed for `spiral`/`barredSpiral` wherever any placed system
 * falls below R=4910pc. `verification/golden/gen10.json` is the fixture
 * cut against THIS version.
 *
 * BUMP 11, 25 Aug 2026 (items 3 and 4 of a direct hands-on user bug report:
 * "in normal spiral galaxy the arms are still perfect, there's no kinks or
 * brokenness"; "no patchiness in the arms either they're just simple
 * spirals"), two changes, one bump, same "coordinate, do not trickle"
 * reasoning as every prior bump:
 *
 * (1) `generateSeededArms` (item 3) now rolls a genuine two-segment kink
 * (`RkinkPc`/`pitchOuterDeg`) for each MAJOR seeded arm, ~60% of the time
 * (`spiralArms.KINK_CHANCE`) - see `spiralArms.ts`'s own header, "SEEDED
 * ARMS NOW KINK TOO". Confirmed this was a real, total gap, not merely
 * weak: no seeded arm literal ever set either field before this bump, for
 * ANY worldSeed. This inserts new `rng()` draws into `CHANNELS.seededArms`
 * BEFORE the existing spur roll, so every seeded (Spiral/Barred) galaxy's
 * entire arm table - kinked or not, since even an unkinked arm's later
 * fields are drawn from a shifted stream position - changes for the same
 * worldSeed; 'Milky Way Analogue' (`armSource: 'observed-mw'`, `ARMS`) is
 * untouched, it never calls this function.
 *
 * (2) `ARM_CLASS_MODULATION` (item 4) depths raised - `grandDesign` 0.08 ->
 * 0.18, `multipleArm` 0.30 -> 0.50, `flocculent` unchanged at 0.80 - see
 * that constant's own header for why: the along-arm envelope was real and
 * wired (genVersion 9 already covers its existence), but confirmed too weak
 * (disposable diagnostic scripts, this session) to survive `modulateArmsFor
 * Display`'s own contrast pipeline once actually looked at hands-on. This
 * changes `densityAt`/`densityByPopulation` for EVERY spiral/barredSpiral
 * galaxy regardless of `armSource`, same as bump 9's own default-carries-
 * modulation reasoning - 'Milky Way Analogue' is affected by this half of
 * the bump even though it is untouched by the first half.
 *
 * `verification/golden/gen11.json` is the fixture cut against THIS version.
 *
 * BUMP 12, 25 Aug 2026 - a direct same-day follow-up user report after
 * testing bump 11's own build: "only 1 out of 4 shows patchiness" and a
 * landed kink "not as obvious as I thought it could be". Two changes, one
 * bump:
 *
 * (1) `alongArmModulation`'s per-arm phase (Amendment A6, genVersion 9)
 * folded ONLY `RrefPc` into its hash, on the stated assumption that RrefPc
 * is "already distinct per arm in every table this project builds" - true
 * for `ARMS`, FALSE for `generateSeededArms`, which gives every arm the
 * IDENTICAL `RrefPc` and instead varies `thetaRefDeg` per arm. Every seeded
 * galaxy's arms were therefore all modulating IN PHASE, and `modulateArms
 * ForDisplay`'s own ring-mean ratio largely cancels a change that scales
 * every arm in a ring together (the ring mean, dominated by the arm peaks,
 * rises and falls by roughly the same factor) - matching the reported "1 in
 * 4" rate (only a seed with enough inter-arm weight/kink asymmetry leaked a
 * visible residual) far better than uniform weakness would. Fixed:
 * `thetaRefDeg` now folds into the same phase hash alongside `RrefPc` - see
 * `alongArmModulation`'s own header. `ARMS` is bit-for-bit unaffected
 * (thetaRefDeg=0 for all five of its entries, contributing nothing); every
 * `generateSeededArms` table's exact along-arm brightness pattern changes.
 *
 * (2) `KINK_PITCH_DELTA_MIN_DEG`/`_MAX_DEG` (item 3, bump 11) raised 3-8 ->
 * 8-16deg - the original range was too close to Reid's own barely-there
 * wired case (12.04 -> 12.1 deg) to read as a visible bend at whole-galaxy
 * preview zoom; every KINKED seeded arm's outer pitch (and therefore its
 * outer-segment geometry) now differs from before. `KINK_PITCH_FLOOR_DEG`
 * (6deg) is unchanged and still bounds every roll clear of the near
 * -tangential kappaOf-collapse risk.
 *
 * `verification/golden/gen12.json` is the fixture cut against THIS version.
 *
 * BUMP 13, 27 Aug 2026 (Package 02/03 build plan, Stage B - the Norma-Outer
 * split, Ruling 9). `spiralArms.ts`'s `ARMS` table used to merge Reid et al.
 * 2019 Table 2's two separate Norma (`R_kink=4.46kpc`) and Outer
 * (`R_kink=12.24kpc`) rows into one entry, `'Norma-Outer'`; the two segments
 * are not contiguous in beta (source pack S3's own "Norma-Outer caveat") and
 * Xu et al. 2023 treats them as unrelated arms, so the merge was never more
 * than a convenient approximation this project's own arm-extent work
 * (Stages C/D, still to come) needs undone. `ARMS` now carries SIX entries,
 * not five: `'Outer'` keeps the old merged entry's own numbers unchanged
 * (`pitchDeg=12.43`, `RrefPc=12289`); `'Norma'` is new (`RrefPc=4780`).
 *
 * Norma's own pitch needed an owner ruling, not a blind Table-2 transcribe:
 * its real near-Sun branch fit (`psi< = -1.0 +/- 3.3 deg`) is statistically
 * indistinguishable from zero and COLLAPSES `kappaOf` toward zero if used
 * directly - verified numerically before writing anything (kappa ~ 0.15 at
 * its own RrefPc, against this table's established 18.8-31.0 range), the
 * exact near-tangential failure mode already rejected for Sagittarius
 * -Carina's own deferred outer branch. Ruled (27 Aug 2026): reuse Outer/
 * Local's own already-verified `pitchDeg=12.43` for Norma too, and project
 * its real, well-determined `R_kink` (4460pc, N=11, +/-0.19kpc) out to this
 * table's beta=0 anchor using THAT pitch (kappa=22.97 at the result -
 * safely inside the existing range). See `spiralArms.ts`'s own header,
 * "KINK UPGRADE PATH", for the full derivation and grading.
 *
 * CONFIRMED a real generation-path change for `spiral`/`barredSpiral`, not
 * cosmetic: `armFactor`/`armContrastRatio`/`deriveArmContrasts` all iterate
 * `ARMS` in full for the `'majorMinor'`/`'all'` response sets (midThin/
 * youngThin populations), which now sum over 5/6 arms instead of 4/5 - the
 * 'major' set alone (oldThin's own contrast target) is UNCHANGED, still
 * exactly Scutum-Centaurus + Perseus, so `deriveArmContrasts`'s stored
 * 0.3096/0.4335/0.6193 figures are untouched, but the ACTUAL midThin/
 * youngThin density field for every 'Milky Way Analogue' galaxy moves
 * wherever Norma's new ridge falls (R~3.5-8kpc, its own von Mises spread).
 * The global kappa range (18.8433-30.9951) is UNCHANGED - Norma reuses an
 * existing pitch value rather than introducing a new one, confirmed
 * directly (gate 14f, `spiralArms.conformance.ts`), so nothing about arm
 * SHARPNESS moves, only WHERE a sixth ridge sits. Confirmed empirically,
 * not assumed: re-running the suite against the still-committed
 * `gen12.json` fails placement/remnants/systemCore byte-identity for both
 * `spiral` and `barredSpiral` at their own reference cells.
 * `verification/golden/gen13.json` is the fixture cut against THIS version.
 *
 * NOT bumped again by anything built in this same pass (Stage A's own
 * additions - `resonanceRatio`, the pattern-speed constants, the bar
 * -attachment radius - remain unwired and therefore bump-free, per their
 * own header note).
 *
 * BUMP 14, 27 Aug 2026 (Package 02/03 build plan, Stage C - the actual
 * termination mechanism, the largest stage of this plan). Every spiral/
 * barredSpiral galaxy's arm-adjacent placement draws move, not merely
 * systems visibly near a tip (Prompt P9's own "widen the Amendment P diff
 * scope" instruction) - this is stated explicitly here because it is a
 * genuinely different KIND of change from every prior bump: for the first
 * time, an arm's ridge stops meaning something at every radius forever.
 *
 * TWO independent generation-path changes, one bump:
 *
 * (1) OUTER TERMINATION. `ArmDefinition` gains two optional fields,
 * `terminusPc`/`tipStartRatio` (Amendment A2's own precedent for a
 * generation-path signature/shape change, applied to `spiralArms.ts`'s own
 * data model rather than a function signature - `armFactor` itself did NOT
 * need widening, see (3) below). Per-`armClass` mechanism, `03-ARM-
 * TERMINATION.md`'s own rulings (bundle-source):
 *  - `grandDesign` (seeded) and `ARMS` (`observed-mw`, the real Milky Way)
 *    share ONE table-wide terminus, `ARM_TERMINUS_SHARED_PC` - a NEW
 *    `derived` constant, the OLR (m=2) off a NEW sourced `SOLAR_CIRCULAR_
 *    VELOCITY_KM_S` (229 km/s, Eilers et al. 2019) and Stage A's own
 *    `SPIRAL_PATTERN_SPEED_MAIN_KM_S_KPC` (28.2, Dias et al. 2019) - see
 *    that constant's own header for why OLR rather than 4:1 (4:1 off this
 *    project's only sourced Omega_p puts the terminus inside the bar
 *    -attachment radius itself, verified numerically before choosing, not
 *    assumed) and the stated flat-curve (beta=0) simplification (this
 *    project has no rotation-curve model to evaluate `03-ARM-TERMINATION
 *    .md`'s own "the model's own curve" instruction on).
 *  - `multipleArm` rolls an INDEPENDENT terminus per arm (organic,
 *    non-uniform lengths) on the newly-WIRED `CHANNELS.armTermination`,
 *    plus a 40% chance of the sourced Honig & Reid 2015 narrowing tip
 *    (`ARM_TIP_ARC_DEG`=31, `ARM_TIP_WIDTH_RATIO`=0.62 informing the
 *    curve's own shape, `ARM_TIP_PROBABILITY`=0.40 - regraded `calibrated
 *    (n=4, one interacting host)` per this project's own Erratum SS1.7,
 *    not treated as more precise than four galaxies support).
 *  - `flocculent` rolls an independent terminus per arm too, in its own
 *    (lower-ceiling) band, no tip - no borrowed resonance or tip math it
 *    has no data for.
 * Per-cohort ordering (Ruling 3) layers on top of whichever mechanism
 * applies: a NEW `ARM_COHORT_TERMINUS_FACTOR` (youngThin=0.82, midThin
 * =0.91, oldThin=1.00, `tunable`, strictly ordered) multiplicatively
 * scales every terminus per cohort - "it is the young arm that closes"
 * (`03-ARM-TERMINATION.md` SS3), the star-formation-threshold argument.
 * This project has no separate gas population, so the survey's fuller
 * young-H-II < old-stellar < gas ordering collapses to the two-tier form
 * actually representable here.
 *
 * (2) INNER ATTACHMENT (Ruling 5). `armStartInnerPc`/`armStartOuterPc`
 * (`galaxyParameters.ts`) REVISED from an ad hoc ~2kpc-wide taper
 * (3500-5500) to a narrow, purely-numerical smoothing window
 * (4700-5000pc) anchored exactly on Stage A's own `ARM_INNER_ATTACH_
 * RADIUS_PC` (5000, Wegg/Gerhard/Portail 2015's sourced bar-end radius) -
 * "arms begin at the bar end at FULL amplitude, not ramped" (`03-ARM-
 * TERMINATION.md` SS4/gate 6), not the physical-looking ramp the old
 * window implied. Confirmed empirically, not assumed: re-running the
 * suite against the still-committed `gen13.json` fails `barredSpiral`'s
 * own placement fixture at its reference cell (R~4170pc, squarely inside
 * the old taper window); `spiral`'s own reference cell (R~8170pc) is far
 * outside either window and is bit-for-bit unaffected, confirming this is
 * a real, scoped change, not a blanket one.
 *
 * (3) A NOTE ON A PLAN THAT DIDN'T SURVIVE CONTACT WITH IMPLEMENTATION,
 * STATED HONESTLY. Stage A's own commit anticipated `armFactor` needing a
 * widened signature for this stage ("Amendment A10"). Building it for real
 * found a cleaner design: `armFactor` ALREADY receives `set` (which cohort
 * is asking - the exact mapping `discTerm`'s own contrast-tier selection
 * already uses), and each arm's OWN `terminusPc`/`tipStartRatio` fields
 * carry everything else - so termination is computed automatically inside
 * `armFactor` from data it already has, with no new parameter, no new
 * amendment, and no possibility of the "two call sites must pass identical
 * termination or the self-consistency divide breaks" footgun a threaded
 * parameter would have carried (exactly the risk `modulation`'s own header
 * already documents against). Recorded here rather than silently
 * forcing the original guess through - a plan is a plan, not a contract
 * with the code.
 *
 * Visually verified, not merely gated (disposable diagnostic script, this
 * session, per the plan's own stated verification discipline): ASCII
 * density-field renders of `ARMS`/`grandDesign`/`multipleArm`/`flocculent`
 * tables all show arms genuinely narrowing to a visible end rather than
 * spiralling forever or cutting off abruptly; the inner-attachment fix's
 * on-ridge/interarm contrast measured via the real model (not the bare
 * `armFactor` ridge alone, which does not itself see `armInnerTaper`)
 * shows exactly 0% contrast below 4700pc, a smooth ramp to ~4.8% by
 * 5000pc, full strength beyond - matching gate 6's own requirement exactly.
 *
 * New gates: `spiralArms.conformance.ts` gate 15 (25 checks, 15a-15y) -
 * the shared-terminus formula live-recomputed, per-cohort ordering through
 * `armFactor` itself, the tip mechanism's own young-cohort scoping (a real
 * bug this gate suite caught before shipping, not merely designed around -
 * an earlier draft let a rolled tip's own window leak into the mid/old
 * cohorts too), the numerical-safety margin against `referenceRPc`, and
 * per-armClass rolling (determinism, band membership, tip incidence,
 * channel isolation from `CHANNELS.seededArms`, mean-preservation and
 * strict positivity with termination genuinely active). `galaxyParameters
 * .conformance.ts` gets a new "STAGE C: inner attachment" block (2 checks).
 *
 * `verification/golden/gen14.json` is the fixture cut against THIS
 * version.
 *
 * BUMP 15, 28 Aug 2026 (P14 ruling - unbarred arm inner-taper attach
 * radius, and arm count by class). A direct user report: a seeded
 * unbarred Spiral galaxy (size 2) rendered as a smooth circular blob -
 * "not what I expected from a spiral galaxy". Measured, the field's own
 * arm contrast was identically ZERO across 2-8 kpc (real radii), only
 * switching on near 10 kpc, by which point the axisymmetric bulge+disc
 * envelope had already fallen ~40x from its peak - every bright pixel was
 * pure axisymmetric term, so the plate could only read as circular. The
 * isophote renderer was innocent (it already paints raw sampled density,
 * no contrast inflation - `applyOuterBreak`'s own header already reported
 * this axisymmetric-dominance symptom back to the owner). The field
 * itself carried almost no arm signal where the galaxy is bright.
 *
 * TWO independent generation-path changes, one bump (P14's own §6
 * versioning matrix):
 *
 * (1) UNBARRED INNER ATTACHMENT (Ruling 1-2). Root cause: `armStartInnerPc`/
 * `armStartOuterPc` (`galaxyParameters.ts`) were pinned to `ARM_INNER_
 * ATTACH_RADIUS_PC` (5000pc, the Wegg/Gerhard/Portail 2015 BAR-END radius)
 * for every spiral-family galaxy, barred or not - an unbarred galaxy has no
 * bar, so no physical reason to clear a 5kpc hole. Compounded by
 * `scaleSpiralModel`'s own uniform coordinate rescale: at size 2 the 5kpc
 * radius becomes 10kpc in real space, doubling the arm-free zone. Fixed:
 * a NEW `ARM_INNER_ATTACH_RADIUS_UNBARRED_PC` = 1500pc (`spiralArms.ts`,
 * `calibrated` - a geometric blur-floor radius below which a logarithmic
 * arm winds too tight to read as an arm regardless, NOT a resonance
 * radius and NOT a "smaller bar" reading). `makeDefaultGalaxyParameters`
 * gained a new `barEnabled` parameter (default `true` - every existing
 * caller that omits it, including `DEFAULT_GALAXY_PARAMETERS`, the golden
 * master, and every conformance gate, reproduces the present 5000pc
 * behaviour bit-for-bit) selecting which attach radius applies.
 * `galaxyCreationModals.ts`'s `modelFromDraft` now threads the real
 * `resolveBarEnabled(d.morphology)` result through - `barredSpiral` and
 * `milkyWayAnalogue` keep 5000pc (both genuinely barred; the real Milky
 * Way IS barred), only the plain unbarred `spiral` choice moves. Ruling 2:
 * the attach radius keeps scaling with `scaleSpiralModel` - no exemption,
 * since exempting it would break the self-similarity invariant the
 * module's correctness rests on; once the unbarred BASE radius is small,
 * scaling it is harmless. Ruling 3 (envelope-dominance / arm-boldness) is
 * explicitly DEFERRED - no change to `armContrast`, `DRIMMEL_SPERGEL_K`,
 * `ARM_CLASS_CONTRAST_TARGET_K`, `ARM_CLASS_MODULATION`, or any display
 * path in this bump; the raw ~1 mag stellar arm/interarm contrast is
 * scientifically correct as-is.
 *
 * (2) ARM COUNT BY CLASS (Ruling 4, folded into this same shape break
 * rather than forcing a second fork later). Adjacent finding: the SAME
 * reported seed rolled `armClass = 'multipleArm'` but the OLD, class
 * -independent draw (`armCount = 2 + floor(rng*3)`, range 2-4) landed on
 * 2 - a definitional contradiction, since multiple-arm means three or
 * more (Elmegreen & Elmegreen 1987 arm-class semantics, PROVISIONAL -
 * reference confirmed across citing sources, version of record not yet
 * read at full text). Fixed: a NEW `ARM_CLASS_ARM_COUNT` table
 * (`spiralArms.ts`) - `grandDesign` {2,2} (sourced anchor: two dominant
 * arms), `multipleArm` {3,4} (>=3 sourced, upper bound `calibrated`),
 * `flocculent` {4,5} (`calibrated` - flocculent is defined by fragments,
 * not a countable arm number, so this range is genuinely the softest of
 * the three). `generateSeededArmsUncached` now draws from this range
 * instead of the flat 2-4 spread, consuming exactly ONE `rng()` call for
 * every class (including `grandDesign`, where the range width is 1 -
 * `floor(rng()*1)` is always 0, but the draw is still taken) so every
 * downstream draw (pitch, phase, jitter, kink, spur) stays in the same
 * stream position across all three classes. This touches EVERY seeded
 * spiral-family galaxy, both `spiral` and `barredSpiral` (both call
 * `generateSeededArms`) - a wider blast radius than (1) alone, which only
 * touches the unbarred case.
 *
 * `params.fieldShapeVersion`: 1 -> 2 (owner decision, P14 §7 - the
 * generated field's own shape genuinely changes for two morphologies).
 * `params.placementShapeVersion` unchanged (the placement algorithm
 * itself is untouched; its output shifts only because it reads a changed
 * field, which `CURRENT_GEN_VERSION`'s own bump already covers).
 *
 * Blast radius (P14 §6, both changes combined) - in REAL app usage
 * (`galaxyCreationModals.ts`'s `modelFromDraft`, the only caller that
 * threads `barEnabled`/`generateSeededArms` per morphology): `spiral`
 * (unbarred) - attach radius AND arm count both change, forks.
 * `barredSpiral` - attach radius unchanged (still bar-end), arm count
 * changes, forks. `milkyWayAnalogue` - real `ARMS` table, no seeded-arm
 * -count draw, attach radius stays barred (5000pc) - unaffected.
 * `elliptical`/`lenticular` - no arms at all - unaffected.
 *
 * CHECKED, not assumed: `goldenMaster.conformance.ts`'s own spiral/
 * barredSpiral fixtures build via `createSpiralModel(barEnabled)` with NO
 * `params` argument, i.e. `DEFAULT_GALAXY_PARAMETERS` - built by
 * `makeDefaultGalaxyParameters()` with its OWN `barEnabled` omitted
 * (defaults `true`) and `armSource: 'observed-mw'` (never calls
 * `generateSeededArms`), so that harness never exercises either P14
 * change regardless of which morphology label it claims - confirmed
 * directly (this session): `verification/golden/gen15.json`'s own
 * `placementData`/`remnantData` are byte-identical to `gen14.json`'s for
 * all four tracked morphologies; only `systemCoreData` differs, and only
 * because it stamps the literal `genVersion` number into every record
 * (`CURRENT_GEN_VERSION` itself, not anything P14 touched). Real seeded
 * -arm regression coverage for this bump lives in `spiralArms.
 * conformance.ts` (gate 17) and `galaxyParameters.conformance.ts` (the
 * "P14: unbarred inner attachment" block) instead - see those files'
 * own gates for what actually exercises the changed code paths.
 *
 * New gates: `galaxyParameters.conformance.ts`, "P14: unbarred inner
 * attachment" block (G-P14-a through d) - the unbarred constant's own
 * value and ordering against the barred one, the actual bug's direct
 * falsification (arm contrast now nonzero in the unbarred inner disc,
 * isolated to an arm-responsive population so the bar's own independent
 * azimuthal shape cannot mask the result), a barred path staying
 * zero-contrast below the bar end, and `makeDefaultGalaxyParameters`'s
 * omitted-argument default. `spiralArms.conformance.ts` gate 17 (G-P14-e
 * through h) - grand design's exact 2-major/0-minor count, multiple-arm's
 * >=3 floor (the actual arm-count bug's direct falsification),
 * flocculent's ordering against multiple-arm's own minimum, and the
 * one-draw-per-class reproducibility guarantee. Gate 15w (pre-existing,
 * REVISED here) - its whole-array cross-class geometry comparison no
 * longer applies now that arm count is class-dependent by design; narrowed
 * to the two shared major-arm indices and to fields still provably
 * class-independent under the new draw (see that gate's own updated
 * header for the analysis).
 *
 * `verification/golden/gen15.json` is the fixture cut against THIS
 * version.
 *
 * BUMP 16, 28 Aug 2026 (P15 - kink-vs-terminus collision). A direct user
 * report, same day as bump 15's own P14 fix shipped: "I can't see any
 * obvious kinks... or spurs". Root cause, measured directly across 2000
 * seeds per class: `RkinkPc` (the kink mechanism, bump 11) and
 * `terminusPc` (the termination mechanism, bump 14) were rolled on
 * independent draws with no coordination between them whatsoever - 13.5%
 * (`grandDesign`) to 32.5% (`flocculent`) of rolled kinks landed AT OR
 * PAST their own arm's terminus, meaning the arm had already faded to
 * zero (or was already inside the fade window) before the kink's own
 * pitch change could ever be seen. Neither bump 11 nor bump 14
 * anticipated the other when it shipped - a real, previously-uncaught
 * interaction between two independently-developed mechanisms, not a
 * defect in either one alone.
 *
 * FIX: new `spiralArms.clampKinkToTerminus`, applied uniformly across all
 * three `armClass` branches of `withTermination`, strictly AFTER both
 * mechanisms' own rolls complete. Deterministic - no new `rng()` draw, so
 * neither `CHANNELS.seededArms` nor `CHANNELS.armTermination`'s own draw
 * sequence changes at all; only clamps an already-rolled `RkinkPc` DOWN
 * to `terminusPc - ARM_TERMINUS_SMOOTH_PC` (exactly where that arm's own
 * fade begins, never past it) when it would otherwise land inside or
 * beyond the fade. Never raises `RkinkPc`; an already-visible kink is
 * untouched. Verified: across the same 2000-seed-per-class sample, 0% of
 * kinked arms now have `RkinkPc >= terminusPc`, in every class. Visually
 * reverified against P14's own originally-reported seed (which had BOTH
 * major arms' kinks hidden pre-fix) - now visibly bent.
 *
 * ALSO INVESTIGATED, DELIBERATELY LEFT AS-IS (same user report): even a
 * no-longer-hidden kink, a genuine spur, or `ARM_CLASS_MODULATION`'s own
 * along-arm brightness modulation is hard to see because all three ride
 * on the same weak base arm/interarm contrast already flagged during
 * bump 15's own "circular galaxy" investigation - confirmed NOT a
 * resolution artifact (re-rendered at 4x+ the shipped preview resolution,
 * no meaningful improvement). The seeded-class contrast targets
 * (`ARM_CLASS_CONTRAST_TARGET_K`) are already anchored to real sourced
 * literature bands (measured A(R0): grandDesign 1.77 mag, multipleArm
 * 1.42 mag, flocculent 1.01 mag - correctly ordered, resolving a false
 * "inversion" concern raised in the P14 handoff's own §7), and the
 * isophote renderer's own gate 01-G10 explicitly forbids a display-side
 * contrast boost on the primary plate. Owner decision: leave contrast
 * as-is this round - genuinely fixing it means either exceeding the
 * sourced band (no longer scientifically anchored) or building a new
 * presentation render mode (Ruling 3's own second named door), both
 * bigger decisions than this finding alone.
 *
 * ALSO FOUND, DOCUMENTED NOT FIXED (same user report - "random splodges,
 * especially on the bulge"): `spiralYoungThin`'s plain exponential disc
 * profile has no inner cutoff - it PEAKS at R=0 rather than fading there,
 * so complex-tier star-forming clumps concentrate hardest exactly on the
 * bulge (measured: ~2-3x the arms' own clump rate). This is a real
 * generation-path effect, not a preview artifact - a real "Generate
 * Sector" commit near the galactic centre reads the same density.
 * Physically backwards (a bulge is old-star-dominated) but NOT actioned
 * this round, per owner decision - documented at the source (`galaxyModel
 * .ts`'s `discTerm`, directly above the `smooth` calculation) as a known,
 * located issue rather than guessed at further.
 *
 * New gate: `spiralArms.conformance.ts` gate 18 (G-P15/G-P15b) - the
 * actual bug's direct falsification (zero kinked arms landing at or past
 * their own terminus, across a large sample of all three classes) and a
 * non-vacuousness check (the clamp demonstrably engages sometimes,
 * doesn't collapse all kinks onto one value, and never triggers on an
 * already-safe kink). Gate 15w REVISED AGAIN - `RkinkPc`/`pitchOuterDeg`
 * dropped from its own cross-class comparison entirely: the new clamp
 * deliberately applies a CLASS-DEPENDENT correction (each class rolls its
 * own `terminusPc`), so a kink genuinely can now differ between classes
 * even at the shared major-arm indices - that is this bump's own fix
 * working as intended, not a channel leak; `pitchDeg`/`RrefPc`/`weight`
 * remain untouched by either fix and still isolate the property this
 * gate exists to test.
 *
 * `verification/golden/gen16.json` is the fixture cut against THIS
 * version.
 */
export const CURRENT_GEN_VERSION = 16;
