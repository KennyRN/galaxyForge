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
 * NOT bumped again by anything built in this same pass.
 */
export const CURRENT_GEN_VERSION = 5;
