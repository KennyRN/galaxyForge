# Ruling 11 (proposed) — pattern-speed architecture for Package 02

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
