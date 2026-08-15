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
