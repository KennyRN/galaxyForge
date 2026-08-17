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
 * NOT bumped again by anything built in this same pass.
 */
export const CURRENT_GEN_VERSION = 7;
