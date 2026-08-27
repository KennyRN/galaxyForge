# Arms bundle R2 — rulings and prompt status

Running scoreboard against `bundle-source/PROMPTS-FOR-CODING-AGENT.md`'s
thirteen numbered prompts (P0–P12) and their ten numbered rulings. Update
this file whenever a ruling is recorded or a prompt is executed — it's the
single place to check "what's actually been decided/done" without re-
reading every erratum in this folder.

## Rulings

| # | question | status |
|---|---|---|
| 1 | default palette | open |
| 2 | export plate (clean vs. sector-marker) | open |
| 3 | termini scope (per-arm only, or per-arm and per-cohort) | open |
| 4 | *(not used — ten rulings are numbered 1–10, skipping none; see prompt text)* | — |
| 5 | inner attachment: bar end or bar corotation | open |
| 6 | plate contrast: demo artefact or real field property | **answered — demo artefact**, self-resolved from the codebase directly (`DRIMMEL_SPERGEL_K`, `ARM_CLASS_CONTRAST_TARGET_K`, `scale_bench.py` absent from repo). Not yet formally recorded against P1's blank. |
| 7 | canonical units for angle/density quantities | **answered 2026-08-27 — degrees for azimuth/arc/pitch angle (radians math-only); km/s/kpc declared canonical for angular velocity; systems/pc² for surface density; systems/pc³ for volume density (already canonical pre-ruling).** See `units.ts`'s own Ruling-7 doc comments. |
| 8 | cross-section width-gate collision + peak-vs-area reading | open |
| 9 | Norma–Outer: one arm or two | open |
| 10 | extent source (Sun 2024 / Hou & Han 2014 / Drimmel 2025 / Reid β spans) | open |

Separately, **Ruling 11** (not part of the original ten — raised this
session) covers Package 02's pattern-speed architecture; see
`RULING-11-PROPOSAL-pattern-speed-architecture.md`, currently at Erratum 3,
proposed but not yet formally adopted by the owner.

## Prompts

| # | prompt | status |
|---|---|---|
| P0 | Orientation | done — read, summarised, ambiguities flagged (earlier session) |
| P1 | Package 01 gate fixes + arm-amplitude gate | not started — blocked on rulings 1, 2 (6 is answered) |
| P2 | Extend the canonical units law | **done 2026-08-27.** Ruling 7 recorded; `units.ts` gained `degToRad`/`radToDeg`, `surfaceDensityPc2ToLy2`/`Ly2ToPc2`, gate 6 (structural, no other file hand-rolls a `Math.PI/180` conversion); fixed the one real violation gate 6 caught (`galaxyCreationModals.ts`'s angle slider); updated `StarForge-CONSOLIDATED-BUILD-BRIEF.md`'s canonical units table (new S4.6). 39/39 suites + 2 structural gates green, build clean, no genVersion bump (units.ts never participates; the slider fix is bit-for-bit identical math). Not yet deployed to the test vault — no user-visible behaviour changed. |
| P3 | Sign-convention hardening | **done 2026-08-27.** `spiralArms.ts` gained exported `assertArmFrameSanity()` (bisects `thetaArmRad` to find Perseus's own theta=0 crossing, throws unless it lands within 0.5 kpc of the real ~10.07 kpc, not the mirrored ~7.81 kpc), plus a module-header discipline note. `spiralArms.conformance.ts` gained gate 11 (theta strictly decreases as R increases, swept for every arm in `ARMS`) and gate 12 (runs the assertion itself). 39/39 green, build clean, no genVersion bump. |
| P4 | Grade corrections + By-law S markers | **reported, not edited, 2026-08-27 — see below.** All six regrades and both restorations P4 asks for turn out to already be present in the existing bundle-source errata; the one real defect (the "28 of 32" Font citation) was already caught and corrected by this session's own P13 research before P4 was even read. Per the bundle's own P0 rule ("if you find an error in a document, report it, do not edit it"), `bundle-source/*.md` was left untouched — see the P4 section below for the full accounting and exactly where each item already lives. |
| P5 | Cross-section width-gate collision | not started — blocked on ruling 8 |
| P6 | Tip zero-closure contradiction | not started — ruling recommended-as-read in the erratum |
| P7 | Inner attachment | not started — blocked on ruling 5 |
| P8 | Interarm floor derived from A₂ | not started — do with P5 |
| P9 | `armFactor` signature amendment | not started — do before P5–P8 |
| P10 | Package 02 extent re-sourcing | not started — blocked on rulings 3, 9, 10 |
| P11 | Rebuild the gate set | not started — after P1–P10 |
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
