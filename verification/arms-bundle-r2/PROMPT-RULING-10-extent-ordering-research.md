# Research request: Ruling 10 (arm extent ordering — Stage D blocker)

For a research agent with real journal/ADS/arXiv access. Owner-requested
2026-08-27, needed before Package 02/03 build plan Stage D (the last
remaining stage — extent ordering) can be built for real rather than left
on its current interim footing.

## Where this sits in the build

Stage C (termination mechanism) is done and committed: every real
Milky-Way arm (`ARMS`) shares ONE identical resonance-based terminus
(`ARM_TERMINUS_SHARED_PC` ≈ 13.86 kpc) — a deliberate, stated
simplification, not a physical claim that every arm genuinely ends at the
same radius. Stage D's whole job is to layer genuine **per-arm** relative
extent on top of that shared value, and Ruling 10 (recorded 27 Aug 2026)
currently rests on an explicitly **interim** position: Reid et al. 2019's
own traced azimuth spans (β ranges), converted to a relative-length
ordering —

| arm | Perseus | Scutum-Centaurus | Sagittarius-Carina | Outer | Norma | Local |
|---|---|---|---|---|---|---|
| relative extent | 1.00 | 0.75 | 0.69 | 0.63 | 0.36 | 0.30 |

This ordering is honestly graded `calibrated` even in its own sourced
half: Reid's β spans measure the VLBI parallax survey's own azimuthal
*coverage*, not each arm's physical length — a predominantly
northern-hemisphere-array selection effect, not a length measurement
(`02-SOURCE-REID-T2.md` §3.5 / §5, this repo's `bundle-source/` copy).
The owner has asked this be revisited and, if it holds up, replaced with
a real arc-length measurement once available.

## The one question that actually unblocks Stage D

**Sun et al. 2024 (ApJL, DOI `10.3847/2041-8213/ad9605`)** — 32,162 MWISP
molecular-cloud CO detections, giving arm segments 16–43 kpc in length
reaching R ≈ 22 kpc. Currently read at **abstract/IOPscience-summary
level only** (confirmed in this repo's `bundle-source/AUDIT.md` §"Located
and identified but body not read") — the actual per-arm table has never
been seen. Read the full article (IOPscience or the accepted
manuscript — NOT a secondary summary) and answer:

1. **Does Sun et al. 2024 report a length (or radial extent) for EACH
   individually-named arm**, or only aggregate/summed statistics across
   all detected segments? If per-arm, which of Reid's six named arms
   (Scutum-Centaurus, Sagittarius-Carina, Local, Perseus, Norma, Outer)
   does each CO segment correspond to — **does the paper use Reid's own
   arm names/assignments at all**, or an independent CO-based
   segmentation scheme that needs its own mapping onto this project's
   `ARMS` table before any number can be used?
2. **What is the actual per-arm (or per-segment) length/extent table**,
   with uncertainties, not just the headline 16–43 kpc range and R ≈ 22
   kpc figure already known from the abstract?
3. **Which arm reaches R ≈ 22 kpc?** This project's own Stage-C terminus
   for the WHOLE table is ≈13.86 kpc (an OLR-based ceiling, itself
   acknowledged as a simplification) — if Sun 2024 traces a real,
   specific arm meaningfully beyond that, say which one and by how much,
   since that bears directly on whether the *shared* Stage-C terminus
   needs its own reconsideration, separately from Stage D's per-arm
   *relative* ordering.
4. **Sample/selection honesty**: what fraction of the Galactic disc does
   MWISP's own footprint actually cover (a molecular-cloud CO survey has
   its own selection function, exactly as Reid's VLBI array does) — does
   this paper's own extent ordering suffer from a comparable
   coverage-vs-length conflation to the one already flagged in Reid's own
   β spans, or does it genuinely measure arc length end-to-end?
5. If Sun 2024's own arm identification differs enough from Reid's
   maser-based six arms that a clean one-to-one relative-length mapping
   isn't possible, say so plainly rather than forcing an approximate one.

## Secondary sources, only if Sun 2024 doesn't give a clean answer

`02-SOURCE-REID-T2.md` §3.5 names two other candidate all-sky tracers,
neither yet checked at all: **Hou & Han 2014** (H II regions + GMCs +
masers combined) and **Drimmel et al. 2025** (~3000 WISE-calibrated
Cepheids). Both are named specifically because, like Sun 2024 and unlike
Reid's own VLBI parallax sample, they are not target-limited to one
hemisphere and cover the Galaxy's far side. Only worth pursuing if Sun
2024's own body turns out unusable for a per-arm mapping (question 5
above) — don't spend effort on these if Sun 2024 answers questions 1–4
cleanly.

## Two lower-priority items, bundle in only if convenient

Not load-bearing for Stage D specifically, but both still open on this
project's own standing follow-up list (`FOLLOW-UP-AUDIT-2026-08-27.md`)
and both bear on a limitation Stage C's own code comments already flag
honestly (`spiralArms.ts`, `ARM_TERMINUS_SHARED_PC`'s header: "4:1 for
`grandDesign` specifically remains open"):

- **Contopoulos & Grosbøl, A&A 155, 11 (1986) and A&A 197, 83 (1988)** —
  located (five independent citing papers agree on content) but the
  originals themselves are ADS-full-text-blocked; needs a human with a
  browser, not another automated pass. Would settle whether the
  2–10%-amplitude strong/weak spiral criterion this project's own
  resonance-type reasoning leans on is itself solidly sourced, and
  whether the 4:1-ultraharmonic-vs-OLR choice for a `grandDesign`-class
  arm specifically is supported at the version of record.
- **Quillen & Minchev 2005**, arXiv:astro-ph/0502205 v2 (public) —
  whether the 18.1 km/s/kpc pattern-speed figure this project's own
  Ruling 11 chain has discussed attaches to the `ultraharmonic_4_1`
  resonance specifically or a separate inner-Lindblad-resonance member.
  Only actually consequential if a future pass revisits wiring 4:1 for
  `grandDesign` — not used by anything currently built (Stage C uses OLR
  for both `grandDesign` and the real Milky Way table).

## What would NOT resolve this

Re-deriving or re-checking the ALREADY-VERIFIED relative-ordering
arithmetic (1.00/0.75/0.69/0.63/0.36/0.30) — that table is confirmed
correct and stable under the earlier sign-convention correction
(`02-SOURCE-REID-T2.md` §3.1, "the relative ordering... depends only on
the azimuth spans", unaffected by the β→R sign flip). The open question
is entirely whether a BETTER-sourced (arc-length rather than
survey-coverage) ordering exists in Sun et al. 2024, not whether the
current interim numbers were computed correctly.

## Report back as

Per this project's standing grading scale (`sourced` / `provisional` /
`secondary` / `unverified`), same as every prior P12/P13-style citation
response this session. If Sun et al. 2024 does NOT supply a clean
per-arm mapping, say so plainly and recommend which secondary tracer (Hou
& Han 2014 or Drimmel et al. 2025) looks most promising to try next,
rather than forcing an approximate reading.

## What this does NOT decide

Whether to actually REPLACE the interim Reid-β-span ordering with
whatever Sun 2024 supplies, and exactly how a per-arm relative length
gets wired into Stage D's own architecture (a multiplier on the shared
terminus? an independent per-arm terminus for the real table, breaking
`ARMS`'s current "one shared value" simplification?) remain owner
decisions once the research comes back — bring it back and the call gets
made from there, the same as every other ruling this session.
