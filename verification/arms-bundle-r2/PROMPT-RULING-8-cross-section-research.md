# Research request: Ruling 8 (cross-section width-gate collision)

For a research agent with real journal/ADS/arXiv access. Owner-requested
2026-08-27, deferred until Package 01/07/10 landed, then handed off for
deeper research per this document.

## The two questions Ruling 8 needs answered

1. **How do the two-component cross-section (Package 03 §5) and the
   width gate (Package 02 gate 4 / REID-T2 gate 6) coexist?** Package 03
   specifies a narrow core at Reid et al. 2019's own sourced width plus a
   broad "skirt" at roughly 3× that width and 0.55 amplitude. The width
   gate requires σ_⊥(R) to stay within 3% of Reid's own linear fit
   (42.6 + 36·R). The composite (core+skirt) blows that gate by roughly
   96–145% depending on how "0.55 amplitude" is read (see question 2) —
   nowhere close to a 3% tolerance. Three resolutions are on the table:
   (a) the gate measures the core component only — the bundle's own
   recommended default; (b) the skirt is display-only, never entering the
   field `placement` reads; (c) recalibrate the skirt so the *composite*
   reproduces Reid's line, which narrows the core below Reid's own
   measured value.
2. **Is "0.55 amplitude" a peak-ratio or an area-fraction?** They differ
   by the width ratio (roughly ×3 apart in practice) and the bundle's own
   text states this was never specified.

## Why this is a research question, not just an architecture call

The two-component idea itself is not invented by this bundle — it traces
to a real citation: **Vallée's critique that arm width should encompass
dust and star-forming regions as well as aged stars and diffuse CO, and
should not be measured from a single tracer** (`03-ARM-TERMINATION.md`
line 222, this repo's `bundle-source/` copy). That is very likely **James
P. Vallée**, who has published extensively and repeatedly on Milky Way
spiral-arm structural parameters, width included, across several papers
and review articles (candidates to check, not yet confirmed against any
version of record: *"A Guided Map to the Spiral Arms in the Galactic Disk
of the Milky Way"*, Ap&SS or similar circa 2014–2017; his periodic
"consensus parameters of the Milky Way" review series). **Locate the
specific paper this bundle is drawing on**, and check directly:

1. Does Vallée (or whichever paper this actually is) give a specific
   width ratio and/or amplitude figure for a multi-tracer arm profile,
   or is "roughly 3× width and 0.55 amplitude" this bundle's own
   synthesis from a qualitative critique with no such number in the
   source? If the number exists in Vallée's own work, is it stated as a
   peak ratio or an area/flux fraction — this would resolve question 2
   directly rather than by architectural guess.
2. Does the source distinguish which tracers contribute the "core" versus
   the "skirt" (e.g., masers/young stars tracing the core, diffuse CO or
   dust tracing the skirt)? If so, that has a direct bearing on question
   1: distinct tracers measuring distinct physical structures is the
   strongest argument for resolution (a) — the width gate legitimately
   measures only the maser-scatter core Reid actually fit, because the
   skirt is a genuinely different observable, not a wider version of the
   same one.
3. Cross-check whether "diffuse CO" specifically is already covered by
   this project's own existing gas-cohort/ISM-extinction discussion
   elsewhere in the bundle (`02-ARM-EXTENTS.md`'s young/old/gas ordering,
   Sun et al. 2024's CO tracing) — if the skirt and the gas cohort are
   describing the same physical component from two different bundle
   documents, that is a Law-1 concern (one module, one scientific
   concern) worth flagging back, not silently merging.

## What would NOT resolve this

Re-deriving the 96–145% blow-out arithmetic — already confirmed correct
and reproducible via `verification/verify_05_crosssection.py` in this
repo's `bundle-source/`. The open items are sourcing questions about
Vallée's own paper, not arithmetic questions about the gate collision
itself.

## Report back as

Per this project's standing grading scale (`sourced` / `provisional` /
`secondary` / `unverified`), same as every other P12/P13-style citation
response this session. If Vallée's paper supplies neither a specific
number nor a tracer distinction, say so plainly — that itself is useful
information: it would mean "3× width, 0.55 amplitude" is this bundle's
own synthesis and should be graded `tunable`/`calibrated`, not implied to
be a sourced figure, regardless of which gate-collision resolution is
eventually chosen.

## What this does NOT decide

Resolution (a)/(b)/(c) above remains, in the end, an owner architecture
decision — the citation informs it but does not mechanically settle it
(Law 1's own "one concern, one module" preference is a project value
judgement, not something a paper can rule on). Bring the research back
and the owner will make the call from there.
