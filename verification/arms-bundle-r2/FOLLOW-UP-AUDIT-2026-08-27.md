# Follow-up audit note — arms bundle R2, pattern-speed citations

**Raised 2026-08-27. Largely closed 27 Aug 2026** by
`galaxyForge-RULING-10-RESEARCH-2026-08-27.md` and
`galaxyForge-P13-ERRATUM-2-2026-08-27.md` — items 2, 3 and 4 below are now
resolved (2 and 3 sourced/closed outright; 4 closed as a documented
negative result, see its own entry). Only items 1 and 5 remain, both
genuinely low-priority. Pick those up whenever a future audit pass has
spare capacity — nothing here needs an owner decision any more, only
optional further reading.

## Still open (low priority)

Carried forward from `galaxyForge-P13-ERRATUM-1-2026-08-27.md` §E1.4 and
Ruling 11's own Erratum 3 — read those two files first, they have the full
reasoning chain:

1. **Lépine et al. 2011b at the version of record** (MNRAS 417, 698,
   arXiv:1106.3137, public, no paywall). Won't change its `conjecture`
   grade, but the exact wording should be quoted correctly once read
   properly rather than reconstructed from a citing paper.
2. **Dias et al. 2019 body** (MNRAS 486, 5726) — lowest priority; the
   abstract already states the adopted frame explicitly and the arithmetic
   closes cleanly, so this is a confirmation pass, not a correction hunt.

## Closed 27 Aug 2026

3. **Quillen & Minchev 2005's resonance-identity question** — CLOSED.
   `galaxyForge-RULING-10-RESEARCH-2026-08-27.md` §7: the 18.1 km/s/kpc
   citation attaches to `ultraharmonic_4_1`, not a separate ILR member —
   confirmed from the published AJ 130, 576 abstract directly (the
   preprint's own "(ILR)" abbreviation was dropped between arXiv and
   publication, the actual source of the ambiguity). Not currently
   load-bearing for anything built (Stage C uses OLR for both
   `grandDesign` and `ARMS`, not 4:1), but settled for whenever that
   changes.
4. **Contopoulos & Grosbøl 1986/1988 originals** — CLOSED.
   `galaxyForge-P13-ERRATUM-2-2026-08-27.md`, both papers read from ADS
   scans at the version of record. The 4:1-strong/corotation-weak
   criterion is now `sourced` (C&G 1986's own Summary states it directly).
   The "2–10%" amplitude range this project cited **does not exist in
   either paper and has been struck** from `spiralArms.ts`'s own
   `ARM_TERMINUS_SHARED_PC` header — it traces to Contopoulos's own later
   (2009) review, not C&G 1986/1988. The actual sourced threshold is a
   single number: A < 100 km² s⁻² kpc⁻¹, equivalently a 2% density
   contrast in a completely flat disc model (C&G 1988 §2). The
   barred-host question is NOT settled by these papers either way — they
   modelled an unbarred Sc (NGC 5247) and argue the 4:1 mechanism doesn't
   apply to bars at all, which neither supports nor refutes this
   project's own OLR choice for the real (barred) Milky Way.
5. **Sun et al. 2024 body** (ApJL 977, L35, DOI
   `10.3847/2041-8213/ad9605`) — CLOSED as a documented negative result,
   not a correction hunt. `galaxyForge-RULING-10-RESEARCH-2026-08-27.md`
   (full response) + `galaxyForge-P13-ERRATUM-2-2026-08-27.md` §E2.4
   (Table 1 confirmed unchanged at the version of record, promoting the
   whole response to `sourced`). Verdict: Sun 2024 gives a genuine
   per-arm length table for three arms (Perseus, Outer, OSC), Reid
   -anchored — but it cannot supply a six-arm relative-extent ordering
   for `ARMS` (three of six arms absent; OSC isn't a row this table
   carries at all; no uncertainties on any length; and the lengths
   demonstrably measure MWISP's own survey coverage times radius, not
   arc length — reproduced to within 3–17% by that arithmetic alone).
   Ruling 10's own interim Reid-β-span ordering is recommended to stand
   **permanently, relabelled honestly** (a traced-coverage proxy, not a
   length) rather than replaced — see Ruling 10's own updated status.
   Separately: real CO-traced gas puts the Outer arm ~0.19kpc beyond
   `ARM_TERMINUS_SHARED_PC` (inside its own ~1kpc kinematic uncertainty,
   not actionable) and a proposed OSC extension ~7.9kpc beyond it (real,
   but OSC is Scutum-Centaurus's own far-side continuation, not a
   modelled arm) — recorded honestly in `spiralArms.ts`'s own header as
   an examined, unactioned limitation.

**Explicitly not on this list:** Font et al. 2014b, Honig & Reid's tables
at the version of record, Junqueira et al. 2015, and Reid et al. 2019's
termination question — all already closed or deliberately abandoned per
`galaxyForge-P13-ERRATUM-1-2026-08-27.md`. Don't re-open them without new
information.

## Where to resume

Items 1 and 2 only. Start from `RULING-11-PROPOSAL-pattern-speed
-architecture.md`'s Erratum 3 for the current state of the design. If a
future pass closes either, add a new dated erratum to the ruling file
(prepend, don't rewrite) rather than editing this note.
