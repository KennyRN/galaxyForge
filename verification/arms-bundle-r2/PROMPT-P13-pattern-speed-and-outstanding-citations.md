# Prompt P13 — research request: pattern-speed sourcing + outstanding P12 items

**READ THIS FIRST — this is not a re-ask of Prompt P12.** The last time
this prompt was sent, the response that came back was the *previous* P12
answer (`galaxyForge-CITATION-VERIFICATION-2026-08-26.md`), returned
unchanged — same header, same "Cut date: 2026-08-26", same eight-row
table, byte-for-byte. That document already exists, is already filed, and
is already fully credited below in "Context the agent will need." **Do
not reproduce it.** None of its eight items are being asked again. Every
item below is either brand new (Tier 1, opened by a design decision made
*after* P12 landed) or an item P12 itself explicitly left open in its own
§10 and did not resolve (Tier 2). If the honest answer to any Tier 1 item
is "I don't have live access to check this," say exactly that for that
item — do not substitute an already-answered P12 item in its place.

Consolidated hand-off for a research agent with real journal/ADS/arXiv
access. Combines two new obligations opened by Ruling 11's erratum
(`RULING-11-PROPOSAL-pattern-speed-architecture.md`) with the six items
already left open in `galaxyForge-CITATION-VERIFICATION-2026-08-26.md`
§10, so this closes out in one pass rather than several. For each item,
report: (a) confirmed / discrepant / unlocatable, (b) the exact figure,
table, or section it comes from, (c) any discrepancy from what's recorded
here. Use the project's own grading scale: **sourced** (read from the
version of record) / **provisional** (preprint or abstract only) /
**secondary** (known only via a later paper's citation) / **unverified**.

---

## Tier 1 — blocking: these determine actual constants in Ruling 11

1. **Reid et al. 2019, ApJ 885, 131, Table 2 — check for per-arm tip/
   termination radii.** This project already sources `RkinkPc`/
   `pitchOuterDeg` from this table for Scutum-Centaurus. Check whether
   Table 2 (or the surrounding text) *also* gives a measured outer
   termination/tip radius for any of the five arms (Scutum-Centaurus,
   Sagittarius-Carina, Local, Perseus, Norma-Outer) — i.e., where the
   fitted maser sample for that arm actually stops, not just where its
   pitch angle changes. **This matters directly**: if real per-arm tip
   radii exist here, they are better-sourced for the `ARMS` table than
   anything derived from resonance, and should supersede a resonance-based
   termination model for this table specifically. Report per-arm whether a
   tip radius is given, and its value with uncertainty if so.

2. **Lépine et al. 2011b — verify the outer m=2 pattern's actual stated
   corotation radius / Ω_p.** Currently only known secondhand as "an outer
   m=2 pattern with corotation near 12 kpc, its 4:1 inner Lindblad
   resonance at the solar radius" — this number has never been read from
   source. Locate the paper (Lépine, J.R.D. et al. 2011, MNRAS 417, 698,
   "The spiral structure of the Galaxy revealed by CO/HI overdensities" —
   confirm this is the correct "2011b" reference distinct from any other
   2011 Lépine paper) and confirm: the corotation radius or Ω_p they
   actually state for the outer pattern, and the specific 4:1 ILR-at-
   solar-radius claim. This is the number Ruling 11's `grandDesign`/`ARMS`
   resonance regime currently uses as an inferred placeholder
   (Ω_p ≈ 18–20 km/s/kpc, back-derived from V0/12 kpc on a flat curve) —
   replace with the paper's own value.

3. **Quillen & Minchev 2005 — confirm their independent 4:1 ILR-at-solar-
   radius claim.** Cited in the citation report as independent corroboration
   of Lépine's outer-pattern picture, but never itself read from source.
   Locate (Quillen, A.C. & Minchev, I. 2005, AJ 130, 576) and confirm what
   they actually claim and on what basis (this determines whether it's
   real independent corroboration or another citation chain back to the
   same underlying data).

4. **Meidt et al. 2008 — confirm what it actually shows.** The citation
   report recommends adding this to the By-law S register on the strength
   of Honig & Reid's own citation of it (radial variation of pattern speed
   in M51), but its content has never been read directly. Locate (Meidt,
   S.E. et al. 2008, ApJ 683, 798) and confirm the actual finding before it
   goes into a formal register on secondhand authority.

## Tier 2 — already open from the P12 citation report, still worth closing

5. **Honig & Reid 2015 Tables 2, 3, 5 against the published article
   (not the arXiv preprint).** The abstract is confirmed to have changed
   between preprint and publication (the preprint names no specific arms;
   the published version names all four); the tables have only been
   checked against the rendered preprint. Confirm they didn't change too.
   Journal access to ApJ 800, 53 required (IOPscience has been refusing
   automated access).
6. **Sun et al. 2024, ApJL — read the body, not just the abstract.** The
   R ≈ 22 kpc arm extent is load-bearing for Ruling 10 (whichever ruling
   ends up governing outer-disc arm extent) and is currently provisional.
7. **Contopoulos & Grosbøl, A&A 155, 11 (1986) and A&A 197, 83 (1988) —
   read the actual content**, not just confirm the references exist (already
   done). Both are pre-1990 A&A, available as ADS full-text scans — cheap.
   Confirms the 4:1 ultraharmonic termination criterion and the 2–10%
   "weak spiral" quantification currently graded `calibrated (secondary)`.
8. **Font et al. 2014 and Sellwood & Sparke 1988 — promote out of review-
   quoted.** Both now directly underpin rulings (Font's 28-of-32 is the
   headline number for the By-law S multi-pattern-speed register; Sellwood
   & Sparke is the proposed basis for the bar-end attachment ruling) and
   are currently known only via Sellwood & Masters 2022's review, not read
   directly.
9. **Dias et al. 2019 — read the body.** Lower priority than before: the
   abstract already states the adopted frame explicitly and the arithmetic
   (R_c = V0/Ω_p) closes cleanly, so this is a confirmation pass, not a
   correction hunt.

## Tier 3 — only if time allows / only if overruled

10. **Junqueira et al. 2015** — the citation report recommends dropping
    this reference outright (neither of its two load-bearing numbers could
    be confirmed from source, and its own recorded arithmetic doesn't
    close). Only worth re-attempting if that recommendation gets overruled.

---

## Context the agent will need but shouldn't re-derive

- Grading scale and house style: match
  `galaxyForge-CITATION-VERIFICATION-2026-08-26.md` in this same folder —
  read it first, it has the full reasoning chain for why each of these
  items matters.
- Ruling 11's design (`RULING-11-PROPOSAL-pattern-speed-architecture.md`,
  same folder) depends on items 1–4 above to turn its placeholder numbers
  into sourced ones. Nothing in Ruling 11 is blocked on Tier 2/3 — those
  are independent, lower-stakes cleanup.
- No code exists yet for any of this (`spiralPatternSpeedKmSKpc`,
  `PatternSpeedModel`, `CHANNELS.armTermination` are all still just design
  text) — this is pure literature verification, not implementation review.
