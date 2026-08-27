# galaxyForge â pre-flight sheet for the arms bundle

**Attach to the agent query. These are the things that will be built wrong if they are not decided first.** Companion to `galaxyForge-AUDIT-2026-08-26-ARMS-BUNDLE.md`, which covers the science. This sheet covers only what blocks implementation. **Cut date: 2026-08-26.**

---

## 1 â The canonical units table has no angular entries

**This is a gap in the governing instruction, not in the bundle, and this package is the first to hit it.**

The canonical table covers distance, temperature, luminosity, mass, radius, age, metallicity and orbit. It does not cover:

| quantity the bundle needs | appears as | canonical unit |
|---|---|---|
| azimuth / arc | `tracedSpanDeg`, `armTipArcDeg`, `Î²kink` | **undecided** â degrees in the tables, radians in the maths |
| pitch angle | `pitchOuterDeg`, Ï | **undecided** |
| angular velocity | `spiralPatternSpeedKmSKpc`, `barPatternSpeedKmSKpc` | **undecided** |
| surface density | the entire package-01 band scale | **undecided** â systems pcâ»Â² |
| volume density | `8.02 Ã 10â»Â²` | **undecided** â systems pcâ»Â³ |

`spiralPatternSpeedKmSKpc` bakes a non-canonical length unit into the name of a stored quantity, which is the exact failure mode the units law exists to prevent. Under the law as written, either it is stored in a canonical unit and converted in `units`, or an angular section is added to the table and `km sâ»Â¹ kpcâ»Â¹` is declared canonical for angular frequency because it is what the literature uses â the same human-readability argument that chose AU over metres.

**Decide before any constant is named.** Renaming a stored constant later is a schema break.

Degrees-vs-radians deserves its own line. The bundle mixes them freely and the sign trap in Erratum A lived in exactly that seam.

---

## 2 â The two-component cross-section fails the width gate

**Verified numerically. Package 03 Â§5 and package 02 gate 4 cannot both be satisfied.**

Â§5 specifies a narrow core at Reid's sourced width plus a broad skirt at *"roughly 3Ã width and 0.55 amplitude"*. Package 02 gate 4 and REID-T2 gate 6 require Ïâ¥(R) to stay within **3%** of 42.6 + 36Â·R.

| reading of "0.55 amplitude" | Ï_eff | vs the Â±3% gate |
|---|---|---|
| peak-amplitude ratio | **2.45 Ã Ï_core** | +145% |
| area fraction | 1.96 Ã Ï_core | +96% |

Both readings blow the gate by an order of magnitude more than its tolerance. Note also that this is **1.7Ã wider than the `width_scale = 1.45` bodge it claims to retire** â the fudge factor was not too large; the principled replacement is much larger.

Three ways out, and the agent must be told which:

1. **Gate 4 measures the core component only.** Reid's Ï is the maser scatter, which is the core by construction, so this is defensible â but it must be stated, because the natural implementation measures the composite.
2. **The skirt is display-only.** It enters the render, not the field `placement` reads. Keeps the field Reid-faithful; costs the multi-tracer argument.
3. **Recalibrate the skirt** so the composite's Ï_eff reproduces the Reid line, which means the *core* narrows below Reid's value.

Also unspecified: whether "0.55 amplitude" is peak or area. They differ by the width ratio. Say which.

---

## 3 â Package 03 contradicts itself on whether the tip closes

Â§1: *"A tip requires amplitude and width reaching zero **together**."*

Gate 2: *"terminal width falls to 0.48â0.74 of the interior maximum. **A tip closing to zero fails**."*

An agent implementing Â§1 fails gate 2 and vice versa.

The source resolves it. Honig & Reid measure the width of the **last fitted segment** â where the *data* stops, not where the arm stops. So 0.62 is the width at the start of the terminal arc, not at the terminus. The spec should read: over the terminal 31Â° the width falls to ~0.62 of the interior maximum **and continues to zero at the terminus**. Then Â§1 and gate 2 measure different points and both hold.

Confirm this reading, or rule the other way explicitly â but it cannot ship ambiguous.

---

## 4 â The interarm floor is never given, and it is the arm contrast

Â§5 says to replace subtract-and-clip with *"a multiplicative form on a **nonzero interarm floor**"* and never states the floor.

The agent will invent one, and it is not a free parameter. For Î£ = Î£â(1 + Aâcos 2Ï), the interarm level **is** Î£â(1 â Aâ). Floor and amplitude are one quantity seen twice. Specify:

```
interarm floor = 1 â Aâ        arm peak = 1 + Aâ
```

with Aâ from the cohort's own sourced amplitude â Drimmel & Spergel 0.14 for the old cohort. That makes the floor derived rather than stored, which is the same store-the-input rule Erratum 1 applied to arm extent, and it wires the cross-section directly to the new arm-amplitude gate (audit Â§6.4) rather than letting the two drift.

The alternative â a tunable floor â means the field's arm contrast is set by a number with no basis while a gate checks it against one that has.

---

## 5 â `armFactor` gains a cohort argument, which is a signature break

Per-cohort termini require `armFactor` to know the cohort. It is called from `galaxyModel.ts:533` inside the density field, so this is a signature change on the generation path.

**Amendment A2 established the precedent:** `pickClass(rng, ctx)` was ratified as a *deliberate* amendment with a strict test required for future exceptions. This is the future exception. It needs its own amendment recorded, not a silent widening.

Two related things the agent needs:

**PRNG channel for the tip roll.** `armTipProbability` rolls per arm. No channel is named anywhere in the bundle. Under Law 2 it needs its own, or it perturbs whatever stream it borrows.

**Diff scope.** Adding a roll shifts every downstream draw on that channel. The Amendment P diff must therefore report that **every system moves**, not only those near arm tips. Scoping the diff to the visible geometry change would understate it and mislead the vault refresh.

---

## 6 â Four rulings still open, plus two the audit adds

The index says these are *"required before work starts"* and none has been recorded.

| # | ruling | blocks |
|---|---|---|
| 1 | `PAL_ASTRO_DARK` or `PAL_TOPO_DARK` as default | **package 01, today** |
| 2 | export plate clean, or with the sector marker | **package 01, today** |
| 3 | per-arm termini only, or per-arm **and** per-cohort | package 03 scope |
| 4 | `armTipProbability` rolled per galaxy, or pinned for the MW preset | determinism of the MW preset |
| 5 | **bar end or bar corotation** for `armInnerAttachRadiusPc` | package 03 Â§4 vs gate 02-G9 â *the two documents currently disagree* |
| 6 | is the plate's Ã4âÃ16 arm contrast a demo artefact or a field defect? | whether package 01 is still display-only |

Ruling 5 is the one most likely to be built wrong, because both answers are written down in documents the agent is told to read.

Ruling 6 matters for sequencing: if the contrast is in the generated field, a shape break has been discovered inside a bump-free package and package 01's "does not touch any generated quantity" claim no longer holds.

---

## 7 â Three smaller items that will otherwise be invented

**The cohort split has no numerical boundary.** Gate 4 compares young and old cohort termini. The two-tier structure exists; where it splits in age is stated nowhere in this bundle. The gate is not runnable without it.

**Gate 3 has no sample size.** *"Over a large seed sample, 40% Â± 8%"* â large is not a number. (And per audit Â§5.5 the Â±8% is tighter than the source interval of 0.15â0.70; loosen it at the same time.)

**NormaâOuter: one arm or two.** Package 02 Â§5 flags the non-contiguity as a header caution but never rules on the schema. The table ships it as one entry graded *derived*. Xu et al. 2023 treat Norma as an inner arm and Outer as a separate outer one, which would make the join wrong. Decide, because `tracedSpanDeg = 136` exists only if they are one arm.

---

## 8 â What the agent should do first

1. Take rulings 1 and 2. Land package 01 with the four gate fixes from audit Â§8 and the new arm-amplitude gate. It is genuinely independent of everything else here.
2. Extend the canonical units table (Â§1) before naming a single constant in 02 or 03.
3. Take rulings 3â6, and resolve Â§Â§2â4 of this sheet.
4. Re-source the extent ordering per audit Â§4.4 before writing package 02.

Nothing in 02 or 03 should be coded until 2 and 3 are done. Package 01 is not waiting on any of it.
