# Ruling 11 (proposed) — pattern-speed architecture for Package 02

## Erratum 2 (2026-08-27) — P13 research closes four Tier-1 items; model simplifies to one free parameter

Full findings: `galaxyForge-P13-PATTERN-SPEED-RESEARCH-2026-08-27.md`, same
folder. Net effect: **the design gets simpler, not more complex** — one
sourced constant plus one derived coupling, not two independent regimes.

**Resolved — Reid et al. 2019 has no per-arm termination radii, at all.**
Checked directly against Table 2's full nine-column structure (this
project's own record of it was missing column 3, ℓ tangency — corrected).
The β range column is explicitly the range of the *parallax data*, not
where the arm physically ends: the traced extent moved when Hyland et al.
2026 added new masers, Reid himself hand-extends several arms past it, and
§3 states plainly it is a statement about data coverage. **This removes
the open question from Erratum 1** — there is no better-sourced
alternative to resonance for the `ARMS` table's termination, because Reid
2019 contains no termination model at all. The `ARMS`/`grandDesign`
resonance regime stands as designed, unsuperseded.

**Resolved — the two-pattern model is one free parameter, not two.**
Lépine et al. 2011b's outer-pattern claim is not a measurement — it is an
N-body reconciliation conjecture between Lépine 2011a (single pattern,
corotation ≈8.4 kpc) and Quillen & Minchev 2005 (4:1 inner resonance at
the solar radius, independently measured from local stellar kinematics).
There is no "Lépine outer Ω_p" to import; the placeholder Ω_p ≈ 18–20
km/s/kpc from Erratum 1 was silently re-deriving the same number Lépine
2011b itself derives. But the reconciliation constraint itself is real and
useful: **R_4:1,outer = R_CR,main**, which on a flat curve gives
`Ω_p,outer = 0.6464 × Ω_p,main`. **Revise `PatternSpeedModel`: store one
sourced Ω_p,main (Dias et al. 2019, Ω_p = 28.2 km/s/kpc, recomputed in the
project's own V₀ per Erratum 1/item 2 of the citation report) and derive
Ω_p,outer as a fixed multiple of it, graded `derived`, never stored as an
independent constant.** This is the same class of error Erratum 1 fixed
for `armTipArcDeg` (measuring the analysis, not the galaxy) applied to a
constant instead of a statistic.

**New — resonance-member attachment trap.** Quillen & Minchev's "4:1 ILR"
means the 4:1 *inner resonance* (i.e. the same ultraharmonic resonance
`ultraharmonic_4_1` already names in the enum), not the m=2 ILR — confirmed
via Sellwood 2010's re-analysis of their own model. Whichever
`PatternSpeedModel`/resonance-enum wiring eventually implements this MUST
attach Quillen & Minchev's number to `ultraharmonic_4_1`, not a separate
ILR member. Getting this wrong silently pins the wrong resonance to the
whole `grandDesign` regime. Also carry the honest uncertainty: Quillen &
Minchev's 18.1 km/s/kpc is a minority value — Gerhard 2011's review range
is Ω_p ≈ 17–30 km/s/kpc, and open-cluster/APOGEE methods cluster near
23–24 against phase-space/hydro methods near 18–20. Register this spread,
not a single point value.

**New — barred-host scope caveat on `grandDesign`'s 4:1 termination.** The
4:1 ultraharmonic criterion is documented (Contopoulos & Grosbøl via a 2004
review of Grosbøl & Patsis 2001) as applying to *strong* spirals; *barred*
hosts are reported as better fit by corotation/OLR limiting instead. The
Milky Way is barred. Applying 4:1 termination unconditionally to
`grandDesign` — which is what `ARMS`/`'observed-mw'` represents — may be a
scope error independent of whether the 2–10% strong/weak threshold itself
is right. Needs a decision when Package 02 gets its numbered prompt:
either gate 4:1-vs-corotation/OLR on a barred flag, or accept the
simplification explicitly and document why.

**Correction — Meidt et al. 2008 citation and register wording.** Wrong
reference in Erratum 1 (`ApJ 683, 798` doesn't exist for this result;
correct is Meidt, Rand, Merrifield, Shetty & Vogel 2008, **ApJ 688, 224**,
*"Radial Dependence of the Pattern Speed of M51"*). Content confirmed at
abstract level: **two** pattern speeds (not three — that's a later
extension by other papers), confined to the **inner 4 kpc** at PA=170°,
both above the global value. The By-law S register entry must carry these
qualifiers, not a general "radial variation of pattern speed" claim.

**Correction — Lépine et al. 2011b's title was wrong in Erratum 1's own
prompt** (MNRAS 417, 698 is the right volume/page; the title is
*"Overlapping abundance gradients and azimuthal gradients related to the
spiral structure of the Galaxy"*).

**Do not use — the "28 of 32" barred-galaxy figure.** Could not be located
anywhere in the Font/Beckman corpus across three papers (2011, 2014a,
2014b) despite a direct search. It should not be the By-law S headline
number until located or replaced; the corpus does support a weaker but
locatable claim ("multiple corotations in virtually all cases" across
100+ galaxies), currently still secondary.

Still open, folded into `PROMPT-P13-pattern-speed-and-outstanding-
citations.md`'s own §12 priority list rather than repeated here: Honig &
Reid's published tables, the 28-of-32 relocation, Lépine 2011b and Quillen
& Minchev's bodies at the version of record, Contopoulos & Grosbøl's
originals, Font 2014a/Sun 2024/Dias 2019 bodies.

---

## Erratum 1 (2026-08-27) — owner rejects the single-regime simplification; primary driver reconsidered

Owner decision: do not keep a single-Ω_p simplification anywhere out of
convenience. Direction given: "something more robust and honest and
accurate and hopefully produces better and more random and better looking
results." That widens the scope below Option D materially, and surfaces a
finding the original draft under-weighted.

**The primary termination driver is not resonance at all.** Re-reading the
citation report's own quote of Honig & Reid 2015 §V.2: they attribute arm
narrowing *primarily* to massive star formation dying out at large
galactocentric radii, and raise the resonance/corotation reading only as a
secondary hypothesis — which they then immediately reject on the M51
evidence. A Package 02 built primarily on Ω_p-derived resonance radii would
be modelling the mechanism the source paper itself tested and rejected, not
the one it actually advances.

**Revised design, keyed on the `ArmClass` enum that already exists (no new
field, Law 1 intact):**

- **`grandDesign`** — keep Ω_p/resonance-based termination from Option D
  below, ONE shared pattern speed across the table. This is the one class
  where classical density-wave theory is the standard textbook explanation
  and where a shared global pattern is itself well-supported.
- **`multipleArm`** — primary driver switches to the sourced star-formation/
  gas-extent model: `armTipArcDeg`=31°, `armTipWidthRatio`=0.62,
  `armTipProbability`=4/10 (all promoted to sourced/calibrated by the
  citation report), rolled **independently per major arm** rather than once
  per galaxy — matches Font et al. 2014's per-galaxy multiplicity finding,
  and gives each arm its own termination length instead of one uniform cut
  across the table. This is the actual "more random, better looking" lever:
  independent per-arm extents read as organic; a shared resonance radius
  reads as a cookie-cutter ring.
- **`flocculent`** — no coherent global pattern at all, stated honestly:
  independent-per-arm stochastic extent, graded `tunable` outright, not
  dressed up as resonance math this class doesn't have real statistics for.
- **`ARMS`** (real MW) — retains Option D's two-regime Ω_p-vs-radius split
  below as a resonance cross-check/fallback. New residual obligation: check
  whether Reid et al. 2019 gives real per-arm tip radii directly — if so,
  that is better-sourced than deriving termination from resonance at all
  for this table, and should be preferred over both regimes below.

Per-arm independent rolls (multipleArm's narrowing chance, flocculent's
stochastic extent) need their own RNG channel — `CHANNELS.armTermination`,
keyed on `worldSeed` + arm identity, following the existing
`CHANNELS.armClass`/`CHANNELS.seededArms` isolation discipline — so results
stay deterministic per seed.

Applying Honig & Reid's real-galaxy tip statistics to `generateSeededArms`'s
procedural, non-MW population is itself a new extension beyond what the
paper measured, and should be graded `tunable (extended from sourced
statistics)`, not `sourced`, in whatever provenance header this lands in.

This erratum does not replace Option D below (the `ARMS`-table resonance
regimes) — it demotes resonance from the universal primary mechanism to a
`grandDesign`-only mechanism plus an `ARMS`-table fallback, and adds the
star-formation/stochastic mechanisms for the other two classes on top.

---

**Status: proposal, not a ruling yet.** Raised 2026-08-27 off the back of
`galaxyForge-CITATION-VERIFICATION-2026-08-26.md` item 1(d). No code exists
for this yet — `spiralPatternSpeedKmSKpc` was never implemented (confirmed
by grep: no `PatternSpeed`/`corotation`/`resonance` symbol exists anywhere
in the current `.ts` sources). This is a design decision for an unbuilt
package, not a refactor of shipped code.

## The contradiction

Package 02 as briefed stores one `spiralPatternSpeedKmSKpc` scalar per
galaxy and derives every arm's termination radius from it. Its own primary
source for the tip parameters, Honig & Reid 2015 §V.2, finds M51's arms A
and B corotate at ≈6 kpc and ≈9 kpc respectively and states this "would
argue against a single (global) pattern speed." Lépine et al. 2011b's own
two-pattern Milky Way model (inner spiral corotating ≈8.4 kpc, outer m=2
companion corotating ≈12 kpc, its 4:1 ILR at the solar radius) and Font et
al. 2014 (28 of 32 barred galaxies show multiple pattern speeds) point the
same way. A single Ω_p per galaxy is contradicted by the bundle's own
citation set, not by an external objection.

## Options considered

**A — status quo (one scalar per galaxy).** Rejected: directly contradicted
by the source supplying the tip parameters.

**B — free Ω_p per arm.** The most literal reading of Honig & Reid, but
rejected for this codebase: `ARMS` (real MW, sourced) could support two
regimes; `generateSeededArms` (procedural, non-MW galaxies) has no
calibration data at all for per-arm speeds — this would be `tunable`
fabrication dressed as science, exactly what By-law S exists to catch.

**C — key off the existing `ArmTier` field (`major`/`minor`/`spur`).**
Rejected: checked against `ARMS` directly — Scutum-Centaurus and Perseus
are both `major`, but Perseus (`RrefPc`=10470) is one of the Milky Way's
real outer arms while Scutum-Centaurus (`RrefPc`=5493) is inner. `tier`
encodes visual prominence, not dynamical family; reusing it here would
misclassify the one table it matters most for.

**D — model Ω_p as a function of radius, not a scalar. Recommended.**
`ARMS` already splits cleanly inner/outer by `RrefPc` around the existing
`R0_PC`/`R0_SEEDED_REF_PC` anchor (8178 pc), which is already this
codebase's solar-radius reference elsewhere. Two calibrated regimes:
primary ≈ Dias et al. 2019's Ω_p = 28.2 km/s/kpc (R ≲ R0), outer ≈ Lépine
2011b's companion pattern (R ≳ R0). `generateSeededArms` (no second
citation exists for procedural, non-MW galaxies) stays single-regime — the
degenerate case of the *same* function, not a second code path. One
concept, one owner (Law 1), no new per-arm field, no fabricated split for
galaxies with no data to support one.

## Design sketch (not implementation)

```ts
// Package 02 — NOT YET IMPLEMENTED, design sketch only, no numbered prompt issued
export interface PatternSpeedModel {
  readonly kind: 'single' | 'twoRegime';
  omegaAtRPc(RrefPc: number): number; // km/s/kpc
}
```

`ARMS` gets `kind: 'twoRegime'`; `generateSeededArms` gets `kind: 'single'`.
Termination-radius code calls `omegaAtRPc(arm.RrefPc)` and never needs to
know which regime it got.

## Consequences to expect, not be surprised by

- Once built, this changes Perseus/Norma-Outer's termination radii
  relative to Scutum-Centaurus/Sagittarius-Carina/Local on the real MW
  table. That is a shape-break under Amendment P — it needs the fork-diff
  mechanism, not a silent regenerate, the first time Package 02 actually
  ships.
- **New residual obligation, add to the P12 list.** The outer regime's
  Ω_p ≈ 18–20 km/s/kpc used above is *my* inference from a flat curve
  (V0/12 kpc) — Lépine et al. 2011b's own stated corotation radius/Ω_p was
  never read from source in the citation-verification report, only
  referenced as "near 12 kpc" secondhand. Needs a real read before it's
  graded better than `calibrated (inferred)`.
- Still sequenced behind P2 (canonical units) — `units.ts` has no
  angular-velocity section yet, confirmed 2026-08-26.

## Recommendation

Adopt Option D as Ruling 11 when Package 02 gets its numbered prompt:
`PatternSpeedModel` as a radius-dependent function, two sourced/calibrated
regimes for `ARMS`, one honestly-labelled single regime for
`generateSeededArms`. No code should be written against this until Package
02's own numbered prompt, per the bundle's standing P0 rule, and the
Lépine 2011b outer-regime number should be verified from source before
that prompt is drafted.
