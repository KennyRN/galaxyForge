# Follow-up audit note — arms bundle R2, pattern-speed citations

**Raised 2026-08-27. Not urgent — none of this blocks Ruling 11's design
being adopted.** It only sharpens numbers that are already reasonable
placeholders. Pick this up whenever a future audit pass has spare research
capacity; nothing here needs an owner decision, only more reading.

## What's still open

Carried forward from `galaxyForge-P13-ERRATUM-1-2026-08-27.md` §E1.4 and
Ruling 11's own Erratum 3 — read those two files first, they have the full
reasoning chain:

1. **Lépine et al. 2011b at the version of record** (MNRAS 417, 698,
   arXiv:1106.3137, public, no paywall). Won't change its `conjecture`
   grade, but the exact wording should be quoted correctly once read
   properly rather than reconstructed from a citing paper.
2. **Quillen & Minchev 2005's body**, specifically the resonance-identity
   question (arXiv:astro-ph/0502205 v2, public). Determines whether the
   18.1 km/s/kpc citation attaches to the existing `ultraharmonic_4_1` enum
   member or a separate ILR member — this is the most consequential of the
   remaining items, because getting it wrong at implementation time would
   silently mis-wire the `grandDesign` resonance regime.
3. **Contopoulos & Grosbøl 1986 (A&A 155, 11) and 1988 (A&A 197, 83)
   originals.** ADS full-text scans exist but are robots-blocked — this
   one needs an actual human with a browser, not another automated pass.
   Would promote the 2–10% strong/weak criterion out of `calibrated
   (secondary)` and settle whether the barred-host corotation/OLR
   alternative (vs. 4:1) applies to `grandDesign`/`ARMS`.
4. **Sun et al. 2024 body** (ApJL) — the R ≈ 22 kpc arm extent is
   load-bearing for whichever ruling ends up governing outer-disc arm
   extent (Ruling 10), currently abstract-level only.
5. **Dias et al. 2019 body** (MNRAS 486, 5726) — lowest priority; the
   abstract already states the adopted frame explicitly and the arithmetic
   closes cleanly, so this is a confirmation pass, not a correction hunt.

**Explicitly not on this list:** Font et al. 2014b, Honig & Reid's tables
at the version of record, Junqueira et al. 2015, and Reid et al. 2019's
termination question — all already closed or deliberately abandoned per
`galaxyForge-P13-ERRATUM-1-2026-08-27.md`. Don't re-open them without new
information.

## Where to resume

Start from `RULING-11-PROPOSAL-pattern-speed-architecture.md`'s Erratum 3
(the most recent one) for the current state of the design, then work down
this list. If a future pass closes any of items 1–5, add a new dated
erratum to the ruling file (prepend, don't rewrite) rather than editing
this note or the ruling's existing body.
