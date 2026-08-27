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
| P3 | Sign-convention hardening | not started — not blocked |
| P4 | Grade corrections + By-law S markers | not started — not blocked |
| P5 | Cross-section width-gate collision | not started — blocked on ruling 8 |
| P6 | Tip zero-closure contradiction | not started — ruling recommended-as-read in the erratum |
| P7 | Inner attachment | not started — blocked on ruling 5 |
| P8 | Interarm floor derived from A₂ | not started — do with P5 |
| P9 | `armFactor` signature amendment | not started — do before P5–P8 |
| P10 | Package 02 extent re-sourcing | not started — blocked on rulings 3, 9, 10 |
| P11 | Rebuild the gate set | not started — after P1–P10 |
| P12 | Literature verification | **in progress**, well beyond the original prompt's scope — see `galaxyForge-CITATION-VERIFICATION-2026-08-26.md`, the P13 follow-on chain, and `FOLLOW-UP-AUDIT-2026-08-27.md` for what's still open |

## Where the original bundle text lives

The user no longer had the original pasted documents. Recovered from this
session's own transcript and filed under `bundle-source/` in this folder —
read from there, not from memory, for anything this status file doesn't
already summarise.
