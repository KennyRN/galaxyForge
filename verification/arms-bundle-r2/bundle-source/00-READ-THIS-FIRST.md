# galaxyForge â arms bundle R2

**This is the single entry point. Read it before anything else.** It replaces `galaxyForge-HANDOFF-00-INDEX.md`, which is preserved in `archive/`. **Cut date: 2026-08-26. Revision R2**, incorporating the independent audit of the same date.

---

## The one rule for this package

**Read only from `current/`. Everything in `archive/` is superseded, and is kept for the record only.**

Each document in `current/` opens with its errata and then reproduces the original text, **unaltered**, below a marked separator. Where an erratum and the text below it disagree, **the erratum wins**. This is the project's archival discipline: originals are never rewritten, corrections are prepended.

---

## Reading order

| order | file | what it is |
|---|---|---|
| 1 | `00-READ-THIS-FIRST.md` | this file |
| 2 | `PREFLIGHT.md` | what blocks implementation, and what must be ruled on first |
| 3 | `PROMPTS-FOR-CODING-AGENT.md` | thirteen numbered prompts, one per issue |
| 4 | `current/â¦` | the package you are working on |
| â | `AUDIT.md` | the reasoning behind every erratum. Read for *why*; not needed to implement |
| â | `verification/` | runnable re-derivations of every number that changed |
| â | `archive/` | **do not read** |

---

## The three packages

| # | package | class | `genVersion` | fork under Amendment P |
|---|---|---|---|---|
| 01 | Isophote renderer | display-only, Amendment A3 exempt | no bump | no |
| 02 | Arm extents | **shape break** | bump | yes, with diff |
| 03 | Arm termination | **shape break** | bump | yes, with diff |

Package 01 may land alone and immediately once rulings 1, 2 and 6 are recorded. Packages 02 and 03 land as **one** fork, not two â 03 refines termini that 02 introduces. Package 02 must not be coded on its current `tracedSpanDeg` schema; see prompt P10.

**Sequencing changed in R2.** The canonical units extension (P2) is now a hard prerequisite for 02 and 03, because constant names cannot be settled without it and renaming a stored constant later is a schema break.

---

## Supersession map

| document | status in R2 |
|---|---|
| `01-ISOPHOTE-RENDERER` | current, **Erratum 1 prepended** â Â§4 restructured, gates 1 and 3 fixed, gate 10 added, Â§1 wording |
| `02-ARM-EXTENTS` | current, **Errata 1, 2 and 3 apply** â Â§Â§4 and 8 superseded by Erratum 1; Â§3 superseded by Erratum 3 |
| `03-ARM-TERMINATION` | current, **Erratum 1 prepended** â Â§1/gate 2 contradiction, Â§5 cross-section, gates 3/4/5 |
| `REID-T2-ARM-EXTENTS` | current, **Erratum 3 prepended**. Â§3 superseded (mirrored frame). **Â§Â§5 and 6 superseded** by the survey and package 03. Â§Â§1, 2, 4 stand |
| `ARM-TERMINATION-SURVEY` | current, **Erratum 1 (package 03) prepended** â tip statistics regraded, Toomre-Q rationale replaced, new literature |
| `02-ERRATUM-1-RESONANCE` | current, **Erratum 3 prepended**. Â§3 superseded in full. Â§Â§1, 2, 4, 5 stand |
| `02-SOURCE-PACK` (contains Erratum 2) | current, **Erratum 3 prepended**. Â§3 steps 2 and 3 superseded. Erratum 2 stands in full |
| `00-INDEX` (original) | **superseded by this file** |

**Nothing has been deleted.** Every original is byte-identical in `archive/`.

---

## The three things R2 changes that you must not miss

**The Reid arm equation was transcribed in a mirrored frame** in REID-T2 Â§3, and it propagated into package 02 Â§3 and Erratum 1 Â§3. Corrected radii are in Erratum 3. The observational check that justified `armTerminusResonance = 'OLR_m2'` does not survive: 1.8% agreement becomes â13.1%. Prompt P3 adds the assertion that would have caught it.

**Package 03 Â§5's cross-section cannot satisfy package 02's width gate.** Ï_eff comes out 2.45 Ã Ï_core against a Â±3% tolerance. An owner ruling is required; prompt P5.

**Package 03 Â§4 and gate 02-G9 give different answers for where arms attach** â bar end versus bar corotation â and nothing bridged them. This is the item most likely to be built wrong. Prompt P7.

---

## Rulings required before work starts

Ten. Prompts marked â cannot be sent until their ruling is filled in. **A â prompt sent with an empty ruling slot is a handoff gap, not an agent failure.**

| # | ruling | blocks | recommendation |
|---|---|---|---|
| 1 | default palette: astro or topo | P1 | astro (as shipped) |
| 2 | export plate: clean, or with the sector marker | P1 | â owner call |
| 3 | termini: per-arm only, or per-arm **and** per-cohort | P10 | per-cohort; package 03 assumes it |
| 4 | `armTipProbability` rolled per galaxy, or pinned for the MW preset | P6 | â owner call |
| 5 | **arm attachment: bar end or bar corotation** | **P7** | **bar end, on Sellwood & Sparke 1988** |
| 6 | plate contrast: demo artefact or field defect | P1 | determine empirically before P1 lands |
| 7 | canonical units for angle, angular velocity and density | **P2** | declare `km sâ»Â¹ kpcâ»Â¹` canonical, on the AU-over-metres precedent |
| 8 | how the cross-section and the width gate coexist | **P5** | gate 4 measures the core only |
| 9 | NormaâOuter: one arm or two | P10 | â owner call; Xu 2023 says two |
| 10 | extent source: Reid Î² spans, or an all-sky tracer | P10 | Sun et al. 2024 arc lengths |

Rulings 5, 7 and 8 are the load-bearing three. Nothing in packages 02 or 03 should be coded without them.

---

## What did not change, and should not be re-litigated

The resonance algebra is exact â re-derived to 30 decimal places. The Îº anchors reproduce Reid's Figure 4 width fit to +0.5% and â2.6%, and the one-shared-width-relation decision is vindicated. The band scale arithmetic is exact. Erratum 1's central architectural conclusion stands: **store the pattern speed, derive the radius.** Erratum 2 is good work and all four of its corrections hold.

The solar anchor's provenance obligation is **closed**: `336 systems / (4/3Â·ÏÂ·10Â³ pcÂ³) = 8.0214 Ã 10â»Â²`, from ReylÃ© et al. 2022, the first update to the 10 pc sample. `reyle_anchor.py` is no longer blocking.

---

## Governing law, unchanged

One module per scientific concern. Thin stable interfaces. Pure and seeded, isolated PRNG channels per concern. Provenance headers citing primary literature only. Canonical units stored once, converted only in `units` â **now being extended, see P2**.

Amendment P: galaxies fork, they never silently regenerate. Amendment A2: interface widenings on the generation path are deliberate amendments with a strict test â **P9 records the next one**. Amendment A3: `render` and `vault` are provenance-exempt. By-law S: spiral arm dynamics is the one scoped exception permitted to rest on a contested model, and the re-audit obligation is now load-bearing rather than nominal.
