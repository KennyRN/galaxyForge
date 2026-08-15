# StarForge - what changed since the 1 August bundle

**This package supersedes `2026-08-01_-_galaxyForge_pm.zip` entirely. Discard that
zip and anything derived from it.** Every file it contained is here, either
byte-identical or updated as recorded below.

`galaxyModel.ts`, `galacticDensity.ts` and `stage0.conformance.ts` are
**byte-identical** to the 1 August originals - verified by `cmp`, not by eye.
`types.ts` differs by **exactly one hunk**, correction C1, and nothing else.

Gates at time of packaging: **48/48 green, typecheck clean**, verified under
TypeScript 5.9.3, 6.0.3 and 7.0.2.

---

## New files

| file | what it is |
|---|---|
| `AGENT.md` | **Start here.** 70 lines: the loop, the six laws, where to look, the add-a-module checklist, and the five things that will bite |
| `MODULE-STATUS.md` | Manifest of all 23 concerns - status, PRNG channel ownership, suite coverage. **Generated**, never hand-edited |
| `densityMap.ts` | New module: the density field sampled for display and region choice. 3D-native, slab map is its z-reduction |
| `densityMap.conformance.ts` | Its 11 gates |
| `tsconfig.json` | Mirrors the gate flags; **gate S2 asserts they match** |
| `package.json` | Pins `typescript` **exactly** (6.0.3, no range); scripts for gates, status, typecheck |
| `.gitignore` | `node_modules/`, `.gate-tmp/`, `build/`, the anchor query's JSON output |
| `verification/reyle_anchor.py` | The S2.3 anchor query, ready to run |
| `verification/module-status.js` | Generates `MODULE-STATUS.md` |

## Corrections applied to shipped code

**C1 - `types.ts`.** The `conatalGroupId` doc comment described the design the
owner *rejected*: it still promised a chance-alignment branch that the Build 2
realism ruling deleted. A contributor following it would have built the wrong
thing, and no gate would have caught them - the gates test channels and field
expressibility, not comment accuracy. Replaced with the S2.4 text.

**C11 - the conformance harness could not start.** `run-gates.js` invoked
`npx --yes tsc` with `--moduleResolution node10 --ignoreDeprecations 6.0`, a flag
pair valid in **exactly one TypeScript major**: 5.x rejects the second (TS5103),
7.x has removed the first (TS5108). Since `npx --yes` resolves to *latest*, the
documented first instruction of the brief - "run it before touching anything" -
failed with a compiler-configuration error on any machine set up after the
TypeScript 7 release. A suite that cannot start reads as an environment problem
rather than a red build, so it gets shrugged off. Separately, the script computed
its root as `__dirname/..` while the bundle shipped it **flat**, so as shipped it
printed `MISSING: types.ts` and exited before compiling anything.

**C10 - the 10 pc catalogue edition seam.** The density anchor took 336 systems
(Reyle 2022) while the multiplicity took a breakdown summing to 339 (Reyle 2021)
- two editions in adjacent ledger rows, with S8 listing them as one merged
source. A 0.9 % arithmetic effect no gate would catch, but the anchor and
`meanStarsPerSystem()` would have drifted permanently apart once the restricted
query landed. Resolved in S4.1.

**C12, C13** - MacArthur scoping and the anchor query's table name/endpoint.
See S2.4, which now carries a table of **exactly where every correction landed**.
Nine of thirteen are already in; four are still owed and are listed there.

## Verifications closed

**Both remaining source pins.** *Terzic & Graham 2005* - confirmed against the
published abstract; the finer statements the brief quotes are verbatim in Terzic
& Sprague 2007 S4.1, the same author restating himself. Sample is **eight
ellipticals**; that scope is now recorded beside the mass-floor ruling. It is
load-bearing, so an earlier suggestion to demote it to "form only" was withdrawn.
*MacArthur 2003* - confirmed, but the sample is **121 late-type spirals** and the
ratio *rises* toward earlier types, so it does not check the S0 population it was
being used to check. Kept and scoped, not promoted to independent confirmation.

**C8 resolved as a trap, not a discrepancy.** Both 1.5 and 2 km/s are in the
published Kamdar abstract, measuring different things - the simulation's
prediction envelope and the paper's two-parameter observational criterion. Record
both, as C2 requires of scale lengths.

**S2.5 strengthened.** The April Fools' shoreline paper is real and findable, and
its own coefficients are 6.04/-5.35 and 4.02/-3.21 - **neither is 5.89/-4.49**.
The rejected pair is a corruption of a corruption, and can now be falsified in one
lookup rather than on this document's word.

**The multiplicity seam closes on a refereed source.** Gonzalez-Payo et al. 2026
(MNRAS 549, stag838) re-derives 10 pc multiplicity from the same catalogue: MF
26.2 %, CSF 0.350 - so **`meanStarsPerSystem()` = 1.350, sourced** - plus MF/CSF
in four primary-mass bins. Internally checkable at 92/351 = 26.21 %.

## Owner rulings, recorded as decided

All five S7 decisions are ruled and the section is closed. Accreted halo **in**
for v1; galaxy mass exposed as categories only; 8.2 closed; **R7 local-and-symmetric
merge rule adopted before stage 10**; one `genVersion` bump at stage 10 - with the
note that the first and fourth rulings are therefore stage-10 *blockers*, not
merely cheaper-if-early.

**S5.6 - sector notes are two-layer.** A canonical store the plugin owns and
regenerates wholesale, and an authored store the plugin never writes to. One
tension recorded rather than implemented past: *"the user can't access it"* must
mean **not surfaced and not edit-safe, never opaque** - a hidden binary store
would break the survives-the-plugin law. Plain markdown in a plugin-managed
folder.

## Harness

Rewritten to **discover rather than list**. It finds every root `.ts`, typechecks
the lot, and runs every `*.conformance.ts`. Stubs are written **only where the
real module is absent**, so they retire themselves as the build progresses.

This was not cosmetic: the hardcoded list meant `densityMap` was silently
*outside* the gates and was reported green on an ad-hoc compile the harness never
performed. Two structural gates were added - **S1**, no network calls in plugin
source (comments stripped first, since provenance headers cite URLs by law), and
**S2**, `tsconfig.json` mirrors the gate flags. Both were negative-tested: a
deliberately broken assertion fails the run, and a deliberately drifted tsconfig
fails S2.

## Still owed

None of it blocks a stage.

1. **Run `verification/reyle_anchor.py`** and record the result with service
   version and retrieval date. It also makes the S5.5 slab table final - those
   figures are currently the unrestricted anchor and will move ~6 %.
2. Write **both** Kamdar thresholds into the `conatal` header when finalised.
3. Attribute the NS scale height to **McKee S4.3**, not to Sartore directly.
4. Re-cut the golden master after the stage-10 bump.

## Not built yet, and worth knowing before you start

The **golden-master procedure** is specified in the brief but not scripted - the
one thing an agent will otherwise have to invent at stage 10, which is exactly
where determinism guarantees get quietly weakened. After that: per-stage entry
checklists, and an end-to-end smoke path so there is a "generate one sector and
print it" target to build toward.

## 4 August 2026 - patch v2.3 (parameter schema)

`patches/galaxyForge-SPIRAL-PATCH-v2.3-parameter-schema.md` supersedes v2 S1.1's
illustrative YAML fragment with an authoritative per-galaxy parameter schema, and
rules that **gate 19 externalisation covers the whole Tier G surface in Pass 2**,
not a partially-externalised subset. It does not change any file in this bundle
- it binds the morphology modules (`galaxyModel` real implementation,
`galacticDensity`, `placement`, `stellarDensity`) once they are written. Read it
before starting S4 of the brief. `nLocalPerPc3` is intentionally `TBD` pending
the Reyle anchor query above; do not default it.

## 15 August 2026 - audit response

An external audit (dated 15 August 2026) checked in on the three outstanding
items above plus the patch v2.3 backlog. Results:

1. **`verification/reyle_anchor.py` has now been run** against the live GAVO
   TAP service. Result recorded in `verification/reyle_anchor_result.json`
   (git-tracked; the `.gitignore` line for this file's default repo-root
   location no longer applies now that it lives under `verification/`).
   Adopted (`stars_only`) count: **254 systems**, density **0.0606380
   systems/pc^3** at Sol, restriction factor 0.717514, dataset
   `ivo://org.gavo.dc/tap` updated 2026-07-30, retrieved 2026-08-15. Single-WD
   cross-check: 13 systems implied, against S5.2's own ~15 +/- 4 prediction -
   consistent. **One new caveat the script itself surfaced**: the live
   `obj_cat` vocabulary now includes `LM?`, `BD?`, `WD?` (uncertain
   classifications) alongside Reyle Table 1's original five categories - not
   present when the predicates in `reyle_anchor.py` were written. The adopted
   count excludes all three `?`-suffixed categories (conservative: unconfirmed
   detections are not counted as hydrogen-burning stars). This is a genuine
   methodological question for whoever next reads the Reyle paper's current
   table revision, not resolved here - flagged rather than silently decided.
   **This value is not yet wired into any module** - `nLocalPerPc3` is
   consumed by the patch v2.3 Tier G parameter block (S6), which does not
   exist yet (see below). The anchor is done; the wiring is not.
2. **Both Kamdar thresholds, corrected.** An audit this session claimed the
   paper's abstract states two separate thresholds (a 1.5 km/s simulation
   figure and a 2.0 km/s + 0.05 dex observational figure). Verified against
   the actual paper (Kamdar, Conroy, Ting, Bonaca, Smith & Brown 2019, ApJL
   884, L42, arXiv:1904.02159): this is **not correct**. There is one
   velocity/separation threshold, used identically in both the simulation and
   its observational application: **2 < Delta_r < 20 pc and Delta_v < 1.5
   km/s**. The companion metallicity criterion is **|Delta[Fe/H]| < 0.1 dex**
   (not 0.05), with a simulation measurement uncertainty of sigma[Fe/H] =
   0.03 dex. `conatal.ts`'s header now records the correct, verified numbers
   rather than the audit's unverified ones.
3. **NS scale height / Sartore attribution - documented, not newly modelled.**
   McKee, Parravano & Hollenbach (2015, ApJ 814, 13, S4.3) do not themselves
   adopt one scale-height number for neutron stars; they report a surface
   density within 1.1 kpc of the plane by combining several of Sartore et
   al. (2010)'s velocity-distribution models (explicitly omitting Sartore's
   "case 1E", 33 pc, as an outlier) rather than settling on a single figure.
   `remnants.ts` currently gives every remnant kind - including neutron
   stars - its SOURCE population's own spatial distribution (no kick
   -broadening), which is a known simplification against the real physics
   (natal kicks measurably inflate the NS scale height beyond its birth
   population's thin disc). Rather than invent a number neither McKee nor
   this package's own research has pinned down, this gap and its correct
   citation practice (cite McKee 2015 S4.3; name Sartore as McKee's own
   underlying source; never quote a Sartore figure as independently
   verified) are now recorded directly in `remnants.ts`'s header as a named
   upgrade path - the same honesty pattern the file already uses for its
   placeholder white-dwarf chain.
4. **Golden master - already built, not re-scripted.** This item predates
   Stage 10 (`goldenMaster.conformance.ts`, `verification/golden/gen1.json`),
   which closes it: a real, self-bootstrapping fixture calling the actual
   `placement`/`remnants` pipeline, wired into the gate harness. The same
   audit that reported items 1-3 also proposed a *new*
   `verification/golden-master.js` with a synthetic `generateTestSector`
   placeholder (sine/cosine positions, no real module calls) standing in for
   the generator. **That proposal was not adopted** - it would have been a
   regression from what already exists and passes. Nothing changed here.
5. **Patch v2.3 (real arm model, Tier G externalisation, gates 19/26/27,
   `complexTier` star-forming-complex placement) - built in a follow-up pass
   the same day.** See "15 August 2026 - patch v2.3 implementation" below.

## 15 August 2026 - patch v2.3 implementation

Full scope, at the user's explicit choice after being shown the size and the
one real risk (`derive_arm_constants_v3.py`, the script that produced the
patch's own reference numbers, is confirmed absent from this repository and
was not fabricated - see `patches/README.md`).

**New: `spiralArms.ts`.** The five Reid et al. 2019 named arms (pitch angle,
reference radius, tier), the arm-width relation, and a von Mises-bump
`armFactor`. VERIFIED, not merely transcribed: independently reproduces the
patch's own kappa reference table (18.7511 to 30.9951 over 3.5-16 kpc, a
630-point sweep) to 4 decimal places, and the width relation's own two
reference values (183 pc at 3900 pc; ~337 pc at the solar circle) exactly.
**NOT reproduced**: the patch's exact stated contrast figures
(`armContrast.oldThin` etc) - two independently-attempted combining
functions (unnormalised and normalised von Mises sums) both landed on the
right order of magnitude but not the same number, and without the missing
derivation script there is no way to identify which combining function is
the original. This module derives its OWN contrasts via the same
target-driven procedure the patch documents (solve against Drimmel &
Spergel's K=1.326, apply the patch's own stated 1.4x/2.0x multipliers) and
grades them `calibrated (derived here)`, with a conformance check that
FAILS if a future edit silently substitutes the patch's own unreproducible
numbers as if they had been verified.

**New: `galaxyParameters.ts`.** The Tier G parameter block (patch S4/S5) -
arm geometry, `complexTier`, and (declared but not yet wired - see below)
disc/bar/halo/placement geometry. `nLocalPerPc3` is wired from the Reyle
anchor result recorded earlier today (0.0606380 systems/pc^3). Implements
gate 27 (`assertGalaxyParameters` - throws loudly on `armWidth.broadening >
1.02`, `complexTier.cellSizePc` below its floor, or a missing/non-positive
`nLocalPerPc3`) and gate 26 (`anchorArmCorrectionFor` reproduces from
STORED, 4-dp-rounded contrasts to 1e-12, per the patch's own S7
self-consistency rule).

**New: `starFormingComplexes.ts`.** The `complexTier` meso-scale density
boost - a real, seeded, deterministic Poisson-parent-point mechanism using
every field the patch names (`sigmaComplexPc`, `meanGroupsPerComplex`,
`complexFraction`, the age-decay window, `cellSizePc`, `guardBandSigma`),
graded `calibrated (interpretive)` because the patch names the fields and a
consumer function signature but not the combining formula (its own S5:
"I have not seen ... co-natal modules... I cannot hand you their key
names").

**`galaxyModel.ts` wiring.** `createSpiralModel(barEnabled, params?)` now
takes an optional `GalaxyParameters`, defaulting to
`DEFAULT_GALAXY_PARAMETERS` so every prior call site keeps compiling and
keeps its exact prior behaviour. `discTerm` is arm-modulated (with an inner
-disc taper, `armStartInnerPc`/`armStartOuterPc`, that also fixes a real
R->0 NaN this wiring introduced and caught via the existing S4.7 gate before
it shipped); `youngThin` additionally carries the complex-tier boost. The
module-level `BAR` const was deleted (Law 1 - `galaxyParameters.DEFAULT_BAR`
is the single source now); `barFactor` takes `BarParams` as an argument.

**Gate 19 - NOT a literal AST fuzzer.** Implemented as two things instead,
documented as a deliberate substitute in `galaxyParameters.conformance.ts`'s
own header: a perturbation check proving every WIRED parameter field is
load-bearing (changes `densityAt`) and every NOT-YET-WIRED field is
honestly inert (does not) - both directions asserted, so neither a stray
wire-up nor a silent regression slips past unnoticed - plus a structural
grep sweep for the arm table's own distinctive literals reappearing outside
`spiralArms.ts`/`galaxyParameters.ts`.

**Scope stated honestly, per the patch's own S2 warning** ("a block that is
90% complete is worse than one that is 50% complete and known to be"):
`GalaxyParameters` declares fields for disc/halo geometry (`juric`,
`erwin`, `haloIndexPower`, `haloFlattening`, `haloTruncationPc`,
`coreFloorPc`) and placement geometry (`placement.cellSizePc` etc), with
defaults matching the current hardcoded values exactly - but
`createEllipticalModel`, `createLenticularModel`, `placement.ts` and
`remnants.ts` do NOT yet read them; they still use their own module-level
consts, unchanged. The arm/complex wiring (the part that changes what a
generated galaxy actually looks like) is real; the remaining wiring is
future work, named as such rather than silently left half-done. See
`AGENT.md`'s own "STATUS, 15 Aug 2026" note.

**`CURRENT_GEN_VERSION` bumped 1 -> 2** (the spiral's density field
genuinely changed). `verification/golden/gen2.json` cut and verified;
`gen1.json` kept as a historical fixture, no longer read by the harness.

All 31 conformance suites pass (up from 28), `npm run build` still produces
`main.js` cleanly.
