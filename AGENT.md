# StarForge - read this first

You are building an Obsidian plugin (TypeScript) that procedurally generates
scientifically grounded galactic sectors. This file is the orientation. The
authority is `StarForge-CONSOLIDATED-BUILD-BRIEF.md` - 1700 lines, and you should
read the sections you need rather than all of it. This file tells you which.

## The loop

```
npm install        # once - pins the compiler exactly
npm run gates      # BEFORE you touch anything, and before every commit
npm run status     # what exists, what is stubbed, who owns which PRNG channel
```

`npm run gates` is the whole test suite. It discovers every `.ts` at the package
root, typechecks the lot under `--strict --noEmitOnError`, and runs every
`*.conformance.ts` it finds. **Add a module and it is gated automatically. Add
`<module>.conformance.ts` and it runs.** There is no list to update.

If the gates are red, stop. Do not build on a red gate and do not "fix" a gate to
make it pass - the gates encode rulings, and a gate that fails is telling you a
ruling has been broken.

## Six laws. Breaking one is a defect, however tidy the result looks.

**1 - One module per concern, and it is the single source of truth for it.**
Improving the science means rewriting *one* file and bumping `genVersion`. If a
change seems to need two modules, the seam is in the wrong place: fix the seam,
do not spread the change. Never re-derive another module's quantity because
calling it felt expensive.

**2 - Pure and seeded.** Every module is a pure function of `(rng, inputs)`.
No shared state, no I/O, no clock, no network. Each concern draws from **its own
PRNG channel** - see `CHANNELS` in `types.ts` and the ownership table in
`MODULE-STATUS.md`. Channel isolation is what makes independent versioning real:
swapping `planets` must not perturb the `stars` stream.

**3 - Canonical units, converted only in `units`, only at display.** pc, K, Lsun,
Rsun, Msun, AU, Rearth, Mearth, Gyr, dex; moon distance in Rp, moon radius in km;
column density in systems pc^-2. Astronomical rather than SI **on purpose**: `1.0 AU`
reads at a glance in a raw markdown file and `149597871 km` does not. That is the
survives-the-plugin rule, not an aesthetic.

**4 - Provenance travels with the data.** Every module carries a header naming
its sources with verified citations, and a three-way ledger separating **sourced**
from **calibrated** from **tunable** values. Never present a calibrated
placeholder as sourced. Cite the published version of record, never the preprint.

**5 - Nothing is discarded, and nothing is fetched at runtime.** Every generated
quantity is retained and human-readable. Constants are fetched **once, by a
person, at spec time** (see `verification/`), frozen into a module with a
retrieval date, and thereafter inert. Gate S1 enforces this and will fail your
build on a `fetch(`, a `requestUrl` or a URL literal in plugin source.

**6 - Determinism is the product.** Everything reforms exactly from
`(worldSeed, sysid, genVersion)`. Same seed, same version, same galaxy - for
everyone, forever. `sysid` derives from (cell, ordinal), never a running counter.

## Where things are

| you need | go to |
|---|---|
| what exists / what is stubbed / channel ownership | `MODULE-STATUS.md` (generated) |
| build order and stage dependencies | brief S3 |
| galaxy morphology, density field, the sector sampler | brief S4 |
| `sky`, `remnants`, `conatal`, activity, `densityMap`, notes | brief S5 |
| the gates, and what each asserts | brief S6 |
| owner rulings - **decided, do not re-litigate** | brief S7 |
| every source, with verification status | brief S8 |
| corrections C1-C13 and **exactly where each landed** | brief S2.4 |

**Check brief S2.4 before applying any correction.** Nine of the thirteen are
already in. Four are still owed and are listed there.

## Adding a module - the checklist

1. Read the brief section for the concern. Read S7 for any ruling that binds it.
2. Write the provenance header **first**: sources, verified citations, and the
   sourced / calibrated / tunable ledger. No code before that exists.
3. Declare a thin, stable interface. Callers ask questions; they never reach in.
4. Use only your own channel from `CHANNELS`. If you need a channel that is not
   there, that is a design decision, not a quick addition - raise it.
5. Write `<module>.conformance.ts` beside it. Gates must be **falsifiable**:
   assert a no-op or identity property that a plausible bug would break, and
   confirm the gate genuinely fails when you break it deliberately. A gate that
   cannot fail is worse than no gate, because it reads as coverage.
6. `npm run gates`. Then `npm run status --write` if module status changed.

## Things that will bite you

- **`thicknessPc` is in the cell key**, and so are `worldSeed`, the three cell
  indices, `galaxyConfigHash` and `genVersion` - seven components, **no sector
  identifier**. That is deliberate: cells are galaxy-global, so overlapping
  sectors share one canonical record. Slab thickness is therefore **galaxy-wide,
  fixed at creation**, typed as a union of 5 | 10 | 15 so an off-menu value
  cannot silently create an incompatible vault.
- **`galacticDensity.ts` is a PARTIAL file** - stage-0 declarations only. Add to
  it; do not treat it as complete.
- **Ten stub modules exist only inside `.gate-tmp/`.** They are not real and must
  never be copied from. They retire themselves when you land the real module.
- **Two numbers can be near-identical and mean different things.** The brief
  records several (2.6 kpc as number-density scale length vs light vs mass;
  Kamdar's 1.5 vs 2 km/s). When you meet a coincidence, record both meanings -
  do not pick one.
- **`densityMap` has no PRNG channel and must never acquire one.** A map reveals;
  it never rolls. If a feature there seems to want randomness it belongs in
  `placement`.

## Parameter externalisation (patch v2.3, Pass 2)

`patches/galaxyForge-SPIRAL-PATCH-v2.3-parameter-schema.md` amends the brief
for the morphology stages (S4 onward): every Tier G module-level constant
(disc, bar, arm, co-natal-placement, halo) must be externalised into a single
per-galaxy parameter file (`fieldShapeVersion: 1`) rather than left as a
module-level `const`, so that a galaxy pinned to a parameter set is provably
protected from a future default change. Read that patch in full before
starting any morphology module (`galaxyModel` real implementation,
`galacticDensity`, `placement`, `stellarDensity`) - it supersedes v2 S1.1 and
adds gates 19, 26 and 27. It also specifies gate 19 as a **procedure** (a
fuzzer over module-level constants), not a fixed list - run that procedure
yourself once the modules exist; do not transcribe a guessed schema.
