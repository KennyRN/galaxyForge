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
 * NOT bumped again by anything built in this same pass - a future science
 * change (replacing the calibrated `msLifetimeGyr` M/L approximation with a
 * real MIST grid interpolation, say) is what the NEXT bump is for.
 *
 * `verification/golden/gen1.json` is the fixture cut against this version -
 * see `goldenMaster.conformance.ts`.
 */
export const CURRENT_GEN_VERSION = 1;
