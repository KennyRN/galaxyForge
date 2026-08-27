# Arms bundle R2 — rulings and prompt status

Running scoreboard against `bundle-source/PROMPTS-FOR-CODING-AGENT.md`'s
thirteen numbered prompts (P0–P12) and their ten numbered rulings. Update
this file whenever a ruling is recorded or a prompt is executed — it's the
single place to check "what's actually been decided/done" without re-
reading every erratum in this folder.

## P5–P10: not directly executable — see the build plan instead

P5–P10 all assume an existing first-draft Package 02/03 implementation to
correct. None exists in this codebase (confirmed 27 Aug 2026: no
`armInnerBluntFraction`, `armInnerAttachRadiusPc` before this session,
`tracedSpanDeg`, `armTerminusResonance`, or pattern-speed/resonance
concept anywhere in `.ts` sources before this session). Building it is a
genuine shape-break needing its own scoped plan, not something these
individual prompts specify on their own. See
`/Users/kenny/.claude/plans/modular-tumbling-parnas.md` (owner-approved
27 Aug 2026) for the four-stage build this unblocks — **Stage A (pure
foundations, `resonanceRatio`, the pattern-speed constants, the bar
-attachment radius, the `armTermination` PRNG channel registration) is
done**, committed, gated, genVersion-BUMP-FREE (nothing wired into the
generation path yet). **Stage B (ARMS table schema change, Ruling 9) is
also done** — `Norma-Outer`'s single merged entry split into Table 2's
own two real rows, `Norma` and `Outer`; Norma's own near-Sun pitch branch
turned out to be near-degenerate (owner ruling: reuse Outer/Local's
already-verified pitch instead, see `spiralArms.ts`'s own header for the
full numeric verification) — a REAL generation-path shape break for
`spiral`/`barredSpiral`, confirmed by the golden master gate failing
against the pre-Stage-B fixture until re-cut. `genVersion` BUMP 13, own
narrative in `genVersion.ts`; `verification/golden/gen13.json` is the
fixture cut against it. **Stage C (the actual termination mechanism) is
also done** — `ArmDefinition` gains optional `terminusPc`/`tipStartRatio`
fields; `grandDesign`/`ARMS` share ONE resonance-based terminus
(`ARM_TERMINUS_SHARED_PC`, OLR off a new sourced `SOLAR_CIRCULAR_
VELOCITY_KM_S` + Stage A's own pattern speed); `multipleArm`/`flocculent`
roll independent per-arm termini on the now-WIRED `CHANNELS.armTermination`,
`multipleArm` also rolling a 40% chance of the sourced Honig & Reid tip
narrowing; per-cohort scaling (Ruling 3) layers on top (young < mid < old,
strictly ordered); the inner-attachment taper (Ruling 5) is narrowed to a
purely-numerical smoothing window anchored exactly on `ARM_INNER_ATTACH_
RADIUS_PC` (full amplitude AT the bar end, not ramped). `armFactor` did
NOT need a widened signature in the end (an earlier stage's own plan note
anticipated one - see `genVersion.ts`'s own bump-14 entry for why it
turned out unnecessary, recorded honestly rather than forced through).
`genVersion` BUMP 14; `verification/golden/gen14.json` is the fixture cut
against it. Visually verified via a disposable ASCII density-field
diagnostic before shipping (arms genuinely narrow to a visible end;
inner-attachment contrast measured 0% below 4700pc, ramping to ~4.8% by
5000pc). **Stage D (extent ordering, Ruling 10) is also done, 27 Aug
2026 — the whole four-stage plan is now complete.** Ruling 10's own
research came back and closed the search (Sun et al. 2024 cannot supply a
better ordering — see Ruling 10's own row below); owner ruling scoped
Stage D down to REFERENCE DATA ONLY, deliberately unwired: `ArmDefinition`
gains an optional `tracedCoverageRatio` field, set on all six `ARMS`
entries from Reid's own β spans (1.00/0.75/0.69/0.63/0.36/0.30,
Perseus-normalised), read by nothing on the generation path — gated
structurally (gate 16d, a source-grep for any `.tracedCoverageRatio`
property access) rather than merely documented as unwired. Genuinely
bump-free: no `genVersion` change, `gen14.json` unchanged and still
verifies. `armFactor`'s own mechanical scaling idea was considered and
rejected — it would have encoded a known survey-selection artefact into
the generation path as physical structure, and fails outright for the
inner arms regardless (Local's own `RrefPc` already sits past where a
naive 0.30x scaling of the shared terminus would place it).

## Rulings

| # | question | status |
|---|---|---|
| 1 | default palette | **answered 2026-08-27 — inferno (default), magma, viridis, greyscale.** Overrides the bundle's own PAL_ASTRO_DARK/PAL_TOPO_DARK proposal entirely. See `isophoteRenderer.ts`'s own doc comments for the anchor data and the "monotonic, not dark-bright-dark" consequence. |
| 2 | export plate (clean vs. sector-marker) | **answered 2026-08-27 — clean, no sector marker.** Matches the package doc's own framing. |
| 3 | termini scope (per-arm only, or per-arm and per-cohort) | **answered AND IMPLEMENTED 2026-08-27 — per-arm AND per-cohort** ("the most accurate method"). Built as Package 02/03 build plan Stage C: `ARM_COHORT_TERMINUS_FACTOR` (youngThin=0.82, midThin=0.91, oldThin=1.00, strictly ordered, gated) scales whichever per-arm-class terminus mechanism applies. `genVersion` BUMP 14. |
| 4 | *(not used — ten rulings are numbered 1–10, skipping none; see prompt text)* | — |
| 5 | inner attachment: bar end or bar corotation | **answered AND IMPLEMENTED 2026-08-27 — bar end.** Matches `AUDIT.md`'s own explicit recommendation. Built as Package 02/03 build plan Stage C: `armStartInnerPc`/`armStartOuterPc` narrowed from an ad hoc ~2kpc taper to a purely-numerical smoothing window anchored exactly on `ARM_INNER_ATTACH_RADIUS_PC` — full amplitude AT the bar end, not ramped. `genVersion` BUMP 14. |
| 6 | plate contrast: demo artefact or real field property | **answered — demo artefact**, self-resolved from the codebase directly (`DRIMMEL_SPERGEL_K`, `ARM_CLASS_CONTRAST_TARGET_K`, `scale_bench.py` absent from repo). **Sharpened by P1's own gate 10, 27 Aug 2026 — see the P1 status row below: the isolated arm constant is not the defect, but the real field's TOTAL contrast (all populations summed) is measurably lower than what reads as visible structure through 17 bands with no display boost.** |
| 7 | canonical units for angle/density quantities | **answered 2026-08-27 — degrees for azimuth/arc/pitch angle (radians math-only); km/s/kpc declared canonical for angular velocity; systems/pc² for surface density; systems/pc³ for volume density (already canonical pre-ruling).** See `units.ts`'s own Ruling-7 doc comments. |
| 8 | cross-section width-gate collision + peak-vs-area reading | open — **owner asked this be deferred until P1/P7/P10 land, then handed to another agent for deeper research.** See the P13-style prompt this session owes for it. |
| 9 | Norma–Outer: one arm or two | **answered AND IMPLEMENTED 2026-08-27 — two separate arms.** Matches Reid 2019 Table 2's own row structure (confirmed by this session's P13 research) and Xu et al. 2023. Built as Package 02/03 build plan Stage B: `ARMS` now carries `Norma`/`Outer` as separate entries, `genVersion` BUMP 13. Norma's own real Table-2 pitch branch turned out near-degenerate (kappa-collapsing); a further owner ruling settled it reuses Outer/Local's own already-verified pitch instead — see `spiralArms.ts`'s own header for the full numeric verification and grading. |
| 10 | extent source (Sun 2024 / Hou & Han 2014 / Drimmel 2025 / Reid β spans) | **FINAL, answered AND IMPLEMENTED 2026-08-27 — retain the Reid-β-span ordering PERMANENTLY, relabelled honestly as `tracedCoverageRatio` (a traced-coverage proxy, not a length), search closed.** Sun et al. 2024's full body was read (`galaxyForge-RULING-10-RESEARCH-2026-08-27.md` + `galaxyForge-P13-ERRATUM-2-2026-08-27.md`): a genuine per-arm length table exists, but for only 3 of 6 arms (one of which, OSC, isn't even a row `ARMS` carries), no uncertainties quoted, and the lengths demonstrably measure MWISP's own survey coverage times radius (reproduced to 3–17% by that arithmetic alone) — cannot supply a six-arm ordering, and no all-sky survey ever will (none sees a whole arm). Owner confirmed closing the search over continuing to Hou & Han 2014. Built as Package 02/03 build plan Stage D, scoped down to reference data only (owner ruling): `ArmDefinition.tracedCoverageRatio`, sourced values on all six `ARMS` entries, deliberately unwired — see the Stage D note above. Separately, the research confirms real CO-traced gas exceeds Stage C's shared terminus in the Outer arm (marginally, inside its own kinematic uncertainty) and via a proposed OSC extension (substantially, ~7.9kpc — but OSC isn't a modelled arm) — recorded as an examined limitation in `spiralArms.ts`'s own header, not actioned. |

Separately, **Ruling 11** (not part of the original ten — raised this
session) covers Package 02's pattern-speed architecture; see
`RULING-11-PROPOSAL-pattern-speed-architecture.md`, currently at Erratum 3,
proposed but not yet formally adopted by the owner.

## Prompts

| # | prompt | status |
|---|---|---|
| P0 | Orientation | done — read, summarised, ambiguities flagged (earlier session) |
| P1 | Package 01 gate fixes + arm-amplitude gate | **done 2026-08-27, full replacement adopted (owner-confirmed).** New `isophoteRenderer.ts` (extracted from `galaxyCreationModals.ts`, which imports `obsidian` at module scope and so could never be gate-tested itself) implements: cell size (65pc) primary, grid dimension DERIVED (`ceil(2×halfWidthPc / 65)`, confirmed 400×400 at the doc's own 26kpc worked example); 17-band absolute log2 scale (SIGMA_MIN=0.25); smooth-then-upsample-then-quantise ordering (5-tap Gaussian, sigma=1 cell); the two new "field terms" (Type II outer break, radially-growing granularity); the solar anchor computed from the model's own vertical profile via Simpson quadrature (not hardcoded — confirmed 55.78 systems/pc² for the real model, in the right ballpark against the doc's own thick-disc-corrected 58.4 reference); inferno/magma/viridis/greyscale palettes (Ruling 1); clean export, cyan overlay colour (Ruling 2, since amber now sits inside every new palette's own ramp); a legend function (`drawIsophoteLegend`) written but **not yet wired into any of the three modal screens' own canvas layout** — flagged open, not silently skipped. `isophoteRenderer.conformance.ts` (new, auto-discovered) covers gates 1/2/3/4/9 solidly and gate 10 (arm amplitude) directly, plus the two new field terms and palette validity; gates 5/6/7/8 are noted as by-inspection/not-yet-wired rather than faked. 40/40 suites green, build clean, no genVersion bump (display-only, Amendment A3). **Real finding from gate 10 and a visual check (not a bug — confirmed via a synthetic strong-contrast control render that the pipeline itself works correctly): the real generated field's TOTAL azimuthal contrast at R0, summed across all populations, is only ×1.39 (0.48 bands) — the isolated old-thin-disc tracer alone measures ×2.0 (1.0 bands, gated), but other populations dilute it in the sum. Rendered with zero artificial contrast boost (required for gate 10's "quantitatively honest" premise to mean anything), the isophote plate shows NO visibly distinguishable spiral structure at a whole-galaxy zoom for the shipped Milky-Way-analogue parameters.** **Explained, not an open question, on closer reading: `ARM_CLASS_CONTRAST_TARGET_K`'s own existing header in `spiralArms.ts` already documents this exact choice** — 'Milky Way Analogue' is deliberately kept on the raw, unrecalibrated `DRIMMEL_SPERGEL_K` "because it is pinned to the ACTUAL Milky Way, not [a] procedural system," while the three seeded `armClass` targets (4.0/2.65/3.0) *were* empirically recalibrated specifically to compensate for this same summed-field dilution, for procedural galaxies only. The isophote plate is behaving exactly as that prior, already-ratified decision implies for the real MW table specifically — a seeded 'grandDesign' galaxy would show visibly stronger structure on the same plate. Nothing here needs a new ruling. |
| P2 | Extend the canonical units law | **done 2026-08-27.** Ruling 7 recorded; `units.ts` gained `degToRad`/`radToDeg`, `surfaceDensityPc2ToLy2`/`Ly2ToPc2`, gate 6 (structural, no other file hand-rolls a `Math.PI/180` conversion); fixed the one real violation gate 6 caught (`galaxyCreationModals.ts`'s angle slider); updated `StarForge-CONSOLIDATED-BUILD-BRIEF.md`'s canonical units table (new S4.6). 39/39 suites + 2 structural gates green, build clean, no genVersion bump (units.ts never participates; the slider fix is bit-for-bit identical math). Not yet deployed to the test vault — no user-visible behaviour changed. |
| P3 | Sign-convention hardening | **done 2026-08-27.** `spiralArms.ts` gained exported `assertArmFrameSanity()` (bisects `thetaArmRad` to find Perseus's own theta=0 crossing, throws unless it lands within 0.5 kpc of the real ~10.07 kpc, not the mirrored ~7.81 kpc), plus a module-header discipline note. `spiralArms.conformance.ts` gained gate 11 (theta strictly decreases as R increases, swept for every arm in `ARMS`) and gate 12 (runs the assertion itself). 39/39 green, build clean, no genVersion bump. |
| P4 | Grade corrections + By-law S markers | **reported, not edited, 2026-08-27 — see below.** All six regrades and both restorations P4 asks for turn out to already be present in the existing bundle-source errata; the one real defect (the "28 of 32" Font citation) was already caught and corrected by this session's own P13 research before P4 was even read. Per the bundle's own P0 rule ("if you find an error in a document, report it, do not edit it"), `bundle-source/*.md` was left untouched — see the P4 section below for the full accounting and exactly where each item already lives. |
| P5 | Cross-section width-gate collision | not started — blocked on ruling 8 (the two-component core+skirt cross-section is explicitly out of scope for the Package 02/03 build plan, per that plan's own "explicitly not in this plan" section — ships core-width-only for now) |
| P6 | Tip zero-closure contradiction | **done, folded into Package 02/03 build plan Stage C, 2026-08-27.** Resolved exactly as the erratum's own recommended reading: over the terminal arc, width narrows toward the sourced ratio and amplitude fades to zero together, continuously — not a discontinuous cutoff at the ratio. `genVersion` BUMP 14. |
| P7 | Inner attachment | **done, folded into Package 02/03 build plan Stage C, 2026-08-27** — see Ruling 5's own updated row above. |
| P8 | Interarm floor derived from A₂ | not started — this is package 03's own cross-section §1.3, entangled with the same P5/ruling-8 two-component-width question, so deferred alongside it |
| P9 | `armFactor` signature amendment | **resolved WITHOUT a signature amendment, Package 02/03 build plan Stage C, 2026-08-27** — building it for real found `armFactor` already receives everything termination needs (`set`, already mapped to cohort; each arm's own new `terminusPc`/`tipStartRatio` fields) — see `genVersion.ts`'s own bump-14 entry, "a plan that didn't survive contact with implementation, stated honestly". The PRNG-channel half of this prompt's own concern (`CHANNELS.armTermination`) is real and done — registered Stage A, wired Stage C. |
| P10 | Package 02 extent re-sourcing | **done, 27 Aug 2026** — the resonance-based terminus half (Stage C) is built and wired; the `tracedSpanDeg`-style relative-ordering half (Ruling 10, Stage D) is built as reference data only, deliberately unwired (owner ruling, once Sun et al. 2024 closed the search for a better source). The Package 02/03 build plan's all four stages are now complete. |
| P11 | Rebuild the gate set | not started — the next open item |
| P12 | Literature verification | **in progress**, well beyond the original prompt's scope — see `galaxyForge-CITATION-VERIFICATION-2026-08-26.md`, the P13 follow-on chain, and `FOLLOW-UP-AUDIT-2026-08-27.md` for what's still open |

## P4 accounting (report, not edit — see P0's own rule)

No code exists yet for any of P4's six constants (`armTipArcDeg`,
`armTipWidthRatio`, `armTipProbability`, `armTerminusResonance`,
`barPatternSpeedKmSKpc`, `tracedSpanDeg`) — confirmed by grep, nothing in
this repo's `.ts` sources defines any of them. P4's "correct the ledger and
provenance headers" therefore has no code target; the actual ledger these
constants carry a grade in is the bundle-source documents themselves.

Checked each of P4's asks against `bundle-source/`:

| P4 asks for | already present at |
|---|---|
| `armTipArcDeg`/`armTipWidthRatio`/`armTipProbability` → `calibrated (n=4, one interacting host)`, intervals recorded | `03-ARM-TERMINATION.md` §1.7 — exact wording, exact intervals (19.3–43.2°, 0.44–0.80, 0.15–0.70) |
| `armTerminusResonance` → `calibrated, By-law S, no observational anchor` | `02-ARM-EXTENTS.md` line 55 (duplicated in `02-ERRATUM-1-RESONANCE.md`/`02-SOURCE-PACK-AND-ERRATUM-2.md`) |
| `barPatternSpeedKmSKpc` → `calibrated`, range recorded | `02-SOURCE-PACK-AND-ERRATUM-2.md` line 200 — 33–61, Bland-Hawthorn & Gerhard's 43±9 |
| `tracedSpanDeg`: number stays sourced, the "coverage=length" inference downgrades to `calibrated` | `02-ARM-EXTENTS.md` line 94 — exact split already made |
| Restore `ultraharmonic_4_1` (Contopoulos & Grosbøl located) | `03-ARM-TERMINATION.md` §1.10 — "Keep the enum option" |
| Sellwood & Masters 2022 as the By-law S anchor citation | `03-ARM-TERMINATION.md` §1.10 and `AUDIT.md` §4.5 |

**All six items are already done in the archival text.** P4 reads like it
was written by summarising these same errata into an action list — it
isn't wrong to execute, there's just nothing left to add.

**One item is wrong, in both places it appears.** Both `03-ARM-
TERMINATION.md` line 117 and `AUDIT.md` line 181 state "Font et al. 2014:
multiple pattern speeds identified in 28 of 32 barred galaxies" as **the
number that should govern By-law S** — this is exactly the figure
`galaxyForge-P13-ERRATUM-1-2026-08-27.md` §E1.3 checked directly against
the actual paper (Font et al. 2014a, ApJS 210, 2, the real 104-galaxy
GHASP/GHαFaS sample) and found **does not exist anywhere in it**. The only
"32" in the paper is a *32-of-32* result on a different subsample. Per P0's
own rule this is reported here, not edited into either document — the
already-derived, sourced replacement (at least one resonance found in
every galaxy measured; the interlocking pattern found in 74/104, 71.2%, or
74/92, 80.4%, excluding inclination outliers) is sitting in that same
erratum file, ready for whoever next revises `03-ARM-TERMINATION.md`/
`AUDIT.md` to fold in.

## Where the original bundle text lives

The user no longer had the original pasted documents. Recovered from this
session's own transcript and filed under `bundle-source/` in this folder —
read from there, not from memory, for anything this status file doesn't
already summarise.
