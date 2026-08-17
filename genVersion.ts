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
 */
export const CURRENT_GEN_VERSION = 9;
