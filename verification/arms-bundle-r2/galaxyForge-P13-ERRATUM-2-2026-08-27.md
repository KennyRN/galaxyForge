# Erratum 2 — Contopoulos & Grosbøl read at source; Sun 2024 verified

**Prepend to `galaxyForge-P13-PATTERN-SPEED-RESEARCH-2026-08-27.md` (§7) and
`galaxyForge-RULING-10-RESEARCH-2026-08-27.md` (§6, §8). Do not rewrite
either.** Cut date: 2026-08-27.

Sources read at the version of record:

- Contopoulos, G. & Grosbøl, P. 1986, A&A 155, 11–23, *Stellar dynamics of
  spiral galaxies: nonlinear effects at the 4/1 resonance.* Received 14
  February, accepted 29 July 1985. ADS scan, 13 pp, raster-only, read
  visually.
- Contopoulos, G. & Grosbøl, P. 1988, A&A 197, 83–90, *Stellar dynamics of
  spiral galaxies: self-consistent models.* Received 2 September, accepted
  18 November 1987. ADS scan, 8 pp, raster-only, read visually.
- Sun et al. 2024, ApJL 977, L35, published version including Table 1.

Both C&G items close. Sun 2024 promotes to sourced. The 2–10% figure does
not exist in either Contopoulos & Grosbøl paper and must be struck.

| item | was | now |
|---|---|---|
| 4:1 termination criterion | calibrated (secondary) | sourced |
| strong/weak scoping | secondary, suspected | sourced, and quantified |
| the "2–10%" amplitude range | calibrated (secondary) | not in the source. Struck. |
| Sun 2024 Table 1 | provisional | sourced |

## E2.1 — The 4:1 termination criterion is sourced, and the scoping is in the Summary

C&G 1986's Summary states it in four sentences, and they are the whole
answer to the scoping question. The main orbit families in a realistic
spiral-galaxy model enhance the arms up to the resonance
κ/(Ω − Ω_s) = 4/1; beyond it the response density is out of phase if the
density excess is strong enough; therefore strong spirals seem to terminate
near the 4/1 resonance; and if the amplitude is very small the response is
in phase up to corotation, recovering linear theory. The same result is
obtained for colliding gas clouds.

The §4 conclusion is unambiguous: both stars and gas support a strong
spiral only up to the 4/1 resonance. C&G 1988 §5 restates it and adds the
complement explicitly — beyond the 4/1 resonance a weak spiral can extend
all the way to corotation.

So the criterion is conditional at source, not universal. The project's
`grandDesign` reasoning is entitled to the 4:1 choice only for arms
classified strong. That was suspected from a 2004 review; it is now read
from the papers.

A stronger finding for the barred-host question. C&G 1986 §1 and §4 argue
that the mechanism limiting bars — stochasticity near and outside
corotation — is not applicable to relatively tight spirals, because the
dominant effect in spirals is the differential precession of the orbits'
major axes, which does not exist in bars. In their words, the extent of a
spiral is probably limited not by stochasticity but by the out-of-phase
response beyond the 4/1 resonance.

This does not support the corotation/OLR reading flagged in the P13 report
§7 from a 2004 review. That reading traces to Grosbøl & Patsis 2001's
observational fits of barred hosts, which is a later and separate result;
it is not in these papers, and these papers argue the opposite on
mechanism. Both readings should be carried, distinguished by what they
are: C&G 1986 is theory about mechanism, Grosbøl & Patsis 2001 is
photometric fitting. Stage C's OLR choice for the real Milky Way table is
not supported by C&G — but neither is it refuted by them, since the Milky
Way is barred and C&G modelled an unbarred Sc.

Grade both statements: sourced.

## E2.2 — The 2–10% range is not in either paper. Strike it

Every amplitude figure in both papers. There are six, and none of them is a
2–10% range.

| where | A (km² s⁻² kpc⁻¹) | value | quantity |
|---|---|---|---|
| 1986 §2, standard model | 200 | 5% | perturbation force, at 12 kpc |
| 1986 §2, standard model | 200 | 38% | density contrast, cylindrical geometry |
| 1986 §2 + Appendix, same model | 200 | 4% | surface density contrast, flat geometry |
| 1986 §2, NGC 5247 as observed | ~100–1000 | 20% | density contrast, estimated |
| 1988 §2, weak/strong threshold | < 100 | 2% | density contrast, completely flat model |
| 1988 §5, best NGC 5247 model | 500 | 12.5% | perturbation in the force |

Where the 2% comes from, and what it actually is. C&G 1988 §2 states that
the response in weak spirals can be in phase with the imposed spiral all
the way to corotation, and that this happens if A is less than about 100
km² s⁻² kpc⁻¹ — corresponding to a density contrast of 2% in a completely
flat model. So the 2% is real, it is sourced, and it is the strong/weak
boundary itself. That is a far more useful quantity than a vague range, and
it is the number the project actually needs.

There is no 10% anywhere. The upper figures are 12.5% and 5%, and both are
force perturbations, not density contrasts. Contopoulos's 2009 review
characterisation of normal spirals as "of order 2–10%" is his own later
generalisation across galaxies; it is not a C&G 1986 or 1988 result and
cannot be cited to them.

The trap, and it is worse than a wrong range. The 2% and the 12.5% are
different physical quantities. Quoting "2–10%" as one span silently merges
a density contrast with a force ratio. The same model, A = 200, is
simultaneously 5% (force), 38% (cylindrical density contrast) and 4% (flat
surface density contrast) — a spread of nearly an order of magnitude
depending only on which quantity and which disc geometry is meant.

That factor is not incidental. C&G 1988 flags it as a defect of the 1986
paper: §1 records that the two extreme cases of a cylindrical and a
completely flat spiral gave results differing by a factor 10, and that a
more elaborate study was necessary; §5 repeats it among the main effects
governing self-consistency. Any constant taken from these papers must
carry both its quantity and its assumed geometry, or it is meaningless.

> **Ruling box — owner decision**
>
> **Recommendation: replace the "2–10% amplitude" constant with the
> sourced weak/strong threshold.**
>
> Store A < 100 km² s⁻² kpc⁻¹, equivalently a 2% density contrast in a
> completely flat disc model (C&G 1988 §2, citing C&G 1986), as the
> boundary below which linear theory holds and arms extend to corotation.
> Grade sourced. Name the quantity and the geometry in the field name or
> the header comment — not just the number.
>
> The classification then reads: below the threshold → weak →
> corotation-limited; above → strong → 4/1-limited. That is exactly the
> conditional the Summary states, it is one number rather than a range,
> and it is defensible at the version of record.
>
> Record the 12.5% best-fit NGC 5247 force perturbation separately if an
> upper anchor is wanted, clearly labelled as a force ratio for one
> galaxy.

## E2.3 — What C&G 1988 actually adds, and what it assumes

1988 does not independently re-derive the 4/1 termination. It assumes it
from 1986 and builds a cutoff into the imposed density, fixed at r₂ = 12
kpc, close to the 4/1 resonance, with a weak residual extension of
amplitude A_r ≈ 50 beyond it. Its contribution is self-consistency under
three effects neglected in 1986: velocity dispersion, disc thickness, and
higher harmonics.

Recording this matters for the ledger. The two papers are not independent
confirmations of the termination result — 1988 inherits it. Citing both for
the 4/1 criterion is citing one result twice.

What 1988 does establish: including a velocity dispersion improves
self-consistency in amplitude and phase, especially in the inner parts
where 1986's discrepancies were largest; 4θ and sometimes 6θ components
matter and are observed in many spirals; the cutoff near the 4/1 resonance
should be rather abrupt; and weak spirals beyond the resonance are governed
by a linear theory in which the residual amplitude's absolute value is
unimportant.

Two limitations stated by the authors: significant discrepancies persist a
little outside the 4/1 resonance, since orbits starting inside extend
outward where non-linear effects are strong; and how self-consistent
models evolve over long timescales was not attacked at all. The second is
worth carrying into the By-law S register — it is an author-stated gap in
exactly the area By-law S exists to cover.

For the record, the 1986 standard model places the 4/1 resonance at 12 kpc
and corotation at 23 kpc; 1988's best NGC 5247 model puts corotation at
22.7 kpc with a 20 kpc disc scale length and central density 90 M☉ pc⁻².
The modelled galaxy is NGC 5247, Sc(s) I–II, inclination 19°, pitch angle
30°, drawn from Grosbøl 1985's sample of 605 spirals. It is a single-galaxy
unbarred model, not a survey — relevant when deciding how far the criterion
generalises.

## E2.4 — Sun 2024 Table 1 is unchanged. The Ruling 10 caveat lifts

Columns 1–10 are identical between the published paper and the accepted
manuscript across all six rows: the φ ranges, the three lengths of 16.2,
32.9 and 43.4 kpc, the masses, M/L, N, and the Model 1 kink geometry. The
Model 2 geometry columns are cut off at the right edge of the published
PDF's table, but the published §4 body text states model 2b directly —
Outer ψ> = 10.9 beyond φ = 17.8 with ψ< = 3.5, OSC constant at 12.3,
Perseus 8.8 — and all four match the manuscript exactly.

Re-running the radial extents on the published Model 1b parameters rather
than Model 2b moves nothing that matters: Perseus 11.13 against 11.21,
Outer 13.91 against 14.05, OSC 21.60 against 21.76. OSC clears the 13.86
kpc Stage-C terminus by roughly 8 kpc either way, and Outer sits within its
own kinematic-distance uncertainty of it on both models.

Two details resolved. The published note reads "those with M < 1.1 × 10³
M☉ are excluded from the Model 1 fit and those with M < 2.8 × 10³ M☉ are
excluded from the Model 2 fit", clearing a garbled threshold in the
manuscript. And the column-6 double assignment survives to the version of
record — the note still says "Columns (3)–(6)" for length/mass/M-L and then
"Column (6): the number of MCs used to arm fitting". It is the publisher's
typo, not the preprint's.

Everything in the Ruling 10 report §§1–4 promotes from provisional to
sourced. The §6 caveat is discharged. The paper is CC-BY 4.0, so it may be
quoted freely in provenance headers.

Nothing in the Ruling 10 recommendation changes: Sun 2024 still cannot
supply a six-arm relative ordering, and its lengths are still coverage
times radius.

## E2.5 — What remains open

The P13 report's §12 list is now down to three, none of which is blocking:

1. **Lépine 2011b at the version of record** — arXiv:1106.3137, public,
   needs nothing.
2. **Quillen & Minchev body** — the enum question was settled in the
   Ruling 10 report §7 from the published abstract; the body would only
   add confirmation.
3. **Font 2014b** (MNRAS 444, L85) — only if the 28-of-32 recommendation
   is overruled. The standing recommendation is to strike it.

The Contopoulos & Grosbøl obligation is discharged. It should be marked
closed in `FOLLOW-UP-AUDIT-2026-08-27.md` and the `spiralArms.ts` header
comment on `ARM_TERMINUS_SHARED_PC` — "4:1 for `grandDesign` specifically
remains open" — can now be answered: 4:1 is correct for strong spirals,
corotation for weak, with the boundary at a 2% flat-model density
contrast.
