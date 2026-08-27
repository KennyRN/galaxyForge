<!-- galaxyForge arms bundle R2 Â· current document Â· assembled 2026-08-26 Â· original preserved at archive/galaxyForge-HANDOFF-02-ERRATUM-1-RESONANCE.md -->

# ERRATUM 3 to package 02 â the mirrored frame, and what it costs

**Prepend to `galaxyForge-HANDOFF-02-ARM-EXTENTS.md`, `galaxyForge-REID-T2-ARM-EXTENTS.md`, `galaxyForge-HANDOFF-02-ERRATUM-1-RESONANCE.md` and `galaxyForge-HANDOFF-02-SOURCE-PACK.md`. Replaces none of them.** Raised by the independent audit of 2026-08-26. Continues the package-02 erratum series: Erratum 1 corrected package 02 Â§Â§4 and 8; Erratum 2 corrected Erratum 1; this corrects Erratum 1 Â§3 and REID-T2 Â§3.

**Superseded by this document:** REID-T2 Â§3's radial conversion table, package 02 Â§3's restatement of it, Erratum 1 Â§3 in full, and the independence claim in source pack Â§3 step 2. REID-T2 Â§Â§5 and 6 are separately superseded â see 3.6.

---

## 3.1 â The sign trap was sprung inside the documents that warn about it

Reid's published equation, confirmed against the article of record and four independent restatements, is

```
ln(R / R_kink) = â(Î² â Î²_kink) Â· tan Ï
```

with Î² zero toward the Sun and **increasing** in the direction of Galactic rotation. For positive Ï, **R decreases as Î² increases**. REID-T2 Â§3 computed it with the opposite sign. Every arm in that table matches the mirrored form to within 0.02 kpc; none matches the published form.

The decisive check is physical. Evaluate Perseus at Î² = 0, the point on the arm directly beyond the Sun:

| | R at Î² = 0 |
|---|---|
| Reid's published sign | **10.07 kpc** â correct; Perseus is ~2 kpc beyond the Sun |
| the sign used in REID-T2 Â§3 | 7.81 kpc â inside the solar circle |

**Corrected traced radii, Reid's own frame:**

| arm | traced arc | REID-T2 Â§3 printed | **correct** |
|---|---|---|---|
| 3 kpc (N) | 3Â° | 3.51 â 3.52 | 3.52 â 3.53 |
| Norma | 49Â° | 4.48 â 5.57 | **3.57 â 4.46** |
| SctâCen | 104Â° | 4.44 â 6.65 | **3.63 â 5.43** |
| SgrâCar | 95Â° | 5.37 â 6.18 | **5.91 â 6.80** |
| Local | 42Â° | 7.78 â 9.02 | **7.56 â 8.77** |
| Perseus | 138Â° | 7.26 â 10.84 | 7.26 â 10.83 |
| Outer | 87Â° | 11.87 â 14.27 | **10.50 â 12.63** |

Perseus is unchanged by coincidence: its two pitch branches give near-equal |ln R| excursions, so the endpoints merely swap. Reproduce with `verification/verify_01_reid_geometry.py`.

**What survives.** The max/min ratio is invariant under the flip, so Â§3's conclusion that no arm can be terminated at its Î² range stands, as does the relative ordering, which depends only on the azimuth spans. Â§4's two cross-checks never touch the conversion and are unaffected.

## 3.2 â Erratum 1 Â§3's observational check does not survive

Erratum 1 Â§3 reads: *"Reid 2019's outermost traced arm point â the Outer arm at the top of its Î² range â is at 14.27 kpc. That is 1.8% from the Dias OLR."* The outermost traced radius of any arm in Table 2 is **12.63 kpc**.

| | as printed | **corrected** |
|---|---|---|
| vs Dias OLR (14.53 kpc) | â1.8% | **â13.1%** |
| vs Junqueira OLR (14.92 kpc) | â4.4% | **â15.4%** |

The agreement was an artefact of the sign. This does not overturn the resonance framework â Erratum 2.2 had already, correctly, demoted the OLR from prediction to ceiling, and an arm 13% inside its ceiling is what density-wave theory expects. But the numerical anchor for choosing `OLR_m2` is gone.

**`armTerminusResonance` regrades to: calibrated, By-law S, no observational anchor.** Delete "chosen because the Milky Way appears to sit near it" from the justification.

Running the chain backwards, a terminus at 12.63 kpc implies Î©_p â 31â32 km sâ»Â¹ kpcâ»Â¹, above the entire range Erratum 1 Â§4 tabulates.

## 3.3 â Dias and Junqueira are not independent measurements

Source pack Â§3 step 2 instructs the agent to verify Junqueira "independently", noting *"two agreeing methods is the whole strength of Â§3"*.

- Dias, Monteiro, **LÃ©pine** & Barros 2019, MNRAS 486, 5726
- Junqueira, Chiappini, **LÃ©pine**, Minchev & Santiago 2015, MNRAS 449, 2336

Same co-author, same programme, and part of a long series from that group placing corotation at the solar circle: Amaral & LÃ©pine 1997 (9.0 kpc), Dias & LÃ©pine 2005 (8.5), Junqueira 2015 (8.7), Dias 2019 (8.5). Dias et al. state R_c/Râ = 1.02 Â± 0.07 explicitly.

The literature is bimodal. Optical open-cluster backward integration gives ~8.5 kpc; radio tracers give corotation nearer 12 kpc or beyond. The bundle sampled one branch twice.

A 12 kpc corotation implies an m = 2 OLR at 20.5 kpc and Î©_p â 19 km sâ»Â¹ kpcâ»Â¹ â and Sun et al. 2024 trace CO arms to R â 22 kpc. The high branch is not fringe.

**Record both branches in the provenance header.** `spiralPatternSpeedKmSKpc = 24.0` sits between them and is defensible *as a compromise* â say so, rather than implying it is supported from below.

## 3.4 â Four rotation frames are in play, not two

Erratum 2.1 catches only the Dias/table clash.

| source | Râ (kpc) | Vâ (km sâ»Â¹) | supplies |
|---|---|---|---|
| Reid et al. 2019 | 8.15 | 236 | the arm loci and all of Table 2 |
| Eilers et al. 2019 | 8.122 | 229 | the Vâ in `resonance-derivation.py` |
| Dias et al. 2019 | 8.30 | 240 | the corotation radius Erratum 1 Â§3 uses |
| **Junqueira et al. 2015** | **8.0** | **220** | the second pattern speed |
| GRAVITY 2021 | 8.275 | â | current best Râ, used nowhere |

The Junqueira frame exposes an arithmetic problem inherited from the source pack: at Vâ = 220 and Î©_p = 23.0, a flat-curve corotation is **9.57 kpc**, not the 8.74 kpc recorded. Either their rotation curve is materially non-flat there, or 8.74 is a recomputation in a third party's frame. The implied OLR ranges 14.92 to 16.33 kpc. **Resolve before either number enters a header.**

Erratum 2.1's fix stands and should be strengthened: every *imported* radius reframed on entry, not only internally consistent quantities.

## 3.5 â Two things that move the sourced half of package 02

**Hyland et al. 2026 supersedes Perseus.** ApJ 1004, 209, published 2026 June 15 â before this bundle's cut date. Perseus lies 0.5 kpc further out at Î² = 40Â° and 1.0 kpc further out at Î² = 180Â°; R_kink 8.87 â 9.29; Ï< 10.3Â° â 5.9Â°. **Perseus is the denominator of every `tracedSpanDeg` ratio.** The arc Perseus needs to run 3.5 â 16 kpc goes from 479Â° to 843Â°.

**`tracedSpanDeg` encodes a survey selection function.** The Î² ranges are the azimuthal coverage of a predominantly northern-hemisphere VLBI array; Reid's own Table 2 notes quadrant-4 tangencies rely on Bronfman priors because Q4 parallaxes are absent. Â§3's claim that they establish *relative extent* is too strong â they establish relative **observational coverage**. The number 104 is sourced; the inference "coverage = length" is an assumption and must be graded **calibrated** in its own right.

Azimuth is also the wrong axis. Equal azimuths at different radii are wildly different physical lengths â Norma at 4 kpc and Outer at 12 kpc are not comparable. Arc length is the quantity the ordering was reaching for, and it is now available: **Sun et al. 2024** (32,162 MWISP molecular clouds) give arm segments 16â43 kpc in length reaching R â 22 kpc.

**Recommendation: re-source the extent ordering from an all-sky tracer before writing code** â Sun et al. 2024 (CO), Hou & Han 2014 (H II + GMC + maser), or Drimmel et al. 2025 (~3000 WISE-calibrated Cepheids). None is VLBI-target-limited; all cover the far side.

Related and unresolved: **NormaâOuter, one arm or two.** Â§5 flags the non-contiguity as a header caution but never rules on the schema. Xu et al. 2023 treat Norma as an inner arm and Outer as separate. `tracedSpanDeg = 136` exists only if they are one arm.

Related and larger: **Perseus and SagittariusâCarina may be one arm.** Xu et al. 2023, supported by Bian et al. 2024 and refined by Hyland et al. 2026 (crossing at Î² â 189â200Â°, R = 5.6 kpc). That is a topological claim: two of five arms may be one that bifurcates.

## 3.6 â REID-T2 Â§Â§5 and 6 are superseded and were never marked

REID-T2 Â§5 still lists `armInnerBluntFraction = 0.10` and `armTipFraction = 0.34`. Â§6 gate 4 requires terminal width below 5% of mid-arm.

Package 03 deletes the first two, retires `armTipFraction` in favour of `armTipArcDeg`, and its gate 2 **explicitly fails** a tip that closes to zero. The index tells the agent REID-T2 is the source of record and to read it first. Under the project's own erratum discipline this needed a prepended note. It has one now: **REID-T2 Â§Â§5 and 6 are superseded by `galaxyForge-ARM-TERMINATION-SURVEY` Â§Â§6 and 8, and by package 03.** REID-T2 Â§Â§1â4 stand.

## 3.7 â A standing rule this should produce

Gate 02-G1 pins the trailing sense in code. Nothing pinned it in the analysis, and this is the third instance of the failure mode in the project â the first in which the warning and the error appear in the same document.

**Any Î² â R conversion written in a document is checked by evaluating a named arm at a known azimuth against a known physical position before the table is written.** Perseus at Î² = 0 must land near 10 kpc. One line, and it would have caught this.


---

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ORIGINAL DOCUMENT BELOW â REPRODUCED UNALTERED
#
# Nothing below this line has been edited. Where it conflicts
# with the errata above, THE ERRATA WIN. Corrections are
# prepended, never merged into the original text.
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

---

# ERRATUM 1 to package 02 â arm extent is derivable, not a free radius

**Prepend to `galaxyForge-HANDOFF-02-ARM-EXTENTS.md`. Does not replace it.** Raised on owner challenge to `armExtentFillRadiusPc = 16000` being graded tunable with no basis. The challenge was correct. **Cut date:** 2026-08-26.

**Â§4 and Â§8 of package 02 are superseded by this document.** Everything else in that package stands.

---

## 1 â There is closed-form maths

For an m-armed pattern in a power-law rotation curve V â R^Î², the epicyclic frequency is ÎºÂ² = 2(1+Î²)Î©Â², and a resonance sits where m(Î© â Î©_p) = Â±Îº. Solving for radius:

**R_res / R_CR = (1 Â± â(2(1+Î²)) / m)^(1/(1âÎ²))**

Independently re-derived and evaluated. For a flat curve (Î² = 0):

| resonance | R / R_CR |
|---|---|
| ILR, m=2 | 0.293 |
| 4:1 ultraharmonic | 0.646 |
| corotation | 1.000 |
| OLR, m=4 | 1.354 |
| **OLR, m=2** | **1.707** |

Sensitivity to the rotation curve is modest: over Î² = â0.10 to +0.10 the m=2 OLR ratio moves only from 1.595 to 1.852. The formula is not fragile.

## 2 â The chain, from quantities the model already holds

```
bar half-length  ââ(fast-bar ratio â)âââ¶  R_CR,bar  âââ¶  arm ATTACHMENT   (package 03 Â§4)
spiral Î©_p       ââ(Vâ / Î©_p)ââââââââââ¶  R_CR,spiral ââ(Ã1.707)âââ¶  arm TERMINUS
```

Both ends of an arm now come out of one formula applied to two pattern speeds. The bar half-length is already in the model from Wegg & Gerhard. The rotation amplitude is already in the model. Only Î©_p is new.

**This also improves package 03.** That document has arms attaching at the *bar end*. Manifold theory actually places L1/L2 at **bar corotation**, and the two coincide only because the Milky Way bar is fast. Measured bar pattern speeds of 33â41 km sâ»Â¹ kpcâ»Â¹ give R_CR,bar of 5.6â6.9 kpc against a ~5 kpc half-length, so â = 1.12â1.39 â inside the conventional fast-bar band of 1.0â1.4 (Debattista & Sellwood 2000). Attach at R_CR,bar, and the coincidence with the bar end becomes a *consequence* of the bar being fast rather than an assumption.

## 3 â The observational check, which came back well

Two independent Gaia-era corotation measurements for the *spiral* pattern:

| source | Î©_p (km sâ»Â¹ kpcâ»Â¹) | R_CR (kpc) | implied OLR (kpc) |
|---|---|---|---|
| Dias et al. 2019, Gaia DR2 open clusters | 28.2 | 8.51 Â± 0.64 | 14.53 Â± 1.09 |
| MNRAS open-cluster + red-giant method | 23.0 Â± 0.5 | 8.74 Â± 0.20 | 14.92 Â± 0.34 |

Reid 2019's outermost traced arm point â the Outer arm at the top of its Î² range â is at **14.27 kpc**. That is **1.8%** from the Dias OLR, and inside the quoted uncertainty of both.

Read this as suggestive, not as proof. Reid's 14.27 kpc is where the *parallax data* stops, not a measured terminus, so the agreement may be partly where the observations run out. But two independent corotation measurements and an independent arm survey landing within 2% of each other through a formula none of them assumed is worth more than a guessed radius.

**And the guessed radius was not wrong.** 16 000 pc implies Î©_p â 24 km sâ»Â¹ kpcâ»Â¹, comfortably inside the measured range. It was unexplained, not incorrect.

## 4 â Where this does not settle the question

The bar's own OLR sits at ~10.2 kpc for R_CR,bar = 6 kpc. Reid traces arms to 14.27 kpc. **The arms are not on the bar pattern** â they require their own, slower one. That much is solid.

But the spiral pattern speed is genuinely unresolved:

| Î©_p | R_CR | OLR |
|---|---|---|
| 11 | 20.8 | 35.5 kpc |
| 15 | 15.3 | 26.1 kpc |
| 20 | 11.5 | 19.6 kpc |
| 23 | 10.0 | 17.0 kpc |
| 28 | 8.2 | 14.0 kpc |

A factor of 2.5 in arm extent across the published range. Two recent Gaia analyses using the same technique reach opposite conclusions. Several studies report *different pattern speeds for different arms* â SagittariusâCarina fitted with two superposed speeds at 16.5 and 29.8, Perseus at 20.0, Orion at 28.9. And the current direction of travel questions the premise: a growing body of work argues the Milky Way has no single fixed spiral pattern at all, but a multi-armed structure with arms continuously emerging and dissipating, which would mean the resonance framework does not apply cleanly in the first place.

Honig & Reid's M 51 result points the same way â two corotation radii in one galaxy, arguing against a single global pattern speed.

**By-law S covers this.** Spiral arm dynamics is already the designated scoped exception permitted to rest on a contested model, and it carries mandatory re-audit. No new by-law needed; this is squarely inside the existing one, and the re-audit obligation is now load-bearing rather than nominal.

## 5 â Revised schema

Delete `armExtentFillRadiusPc`. Replace with:

| constant | value | grade |
|---|---|---|
| `spiralPatternSpeedKmSKpc` | 24.0 | **calibrated, By-law S** â measured range 11â29, two Gaia analyses in direct conflict |
| `armTerminusResonance` | `'OLR_m2'` | **calibrated, By-law S** â enum: `OLR_m2 \| OLR_m4 \| corotation \| ultraharmonic_4_1` |
| `barPatternSpeedKmSKpc` | 37.5 | **sourced** â measurements converge on 33â41 |
| `fastBarRatio` â | 1.2 | **sourced** â Debattista & Sellwood 2000 band 1.0â1.4 |

`armExtentFillRadiusPc` is then **derived**, not stored: `R_CR = Vâ / Î©_p`, terminus = `resonanceRatio(m, Î²) Ã R_CR`. Store the inputs, derive the output â the single-source-of-truth rule, and it means the arm extent tracks the rotation curve automatically instead of having to be re-guessed per galaxy.

The 4:1 option is retained in the enum but is wrong for the Milky Way: at R_CR â 8.5 kpc it puts arms ending at 5.5 kpc, well inside the observed structure. It exists because Contopoulos & GrosbÃ¸l argue strong grand-design spirals terminate there, which may hold for other `armClass` values.

## 6 â Gates, replacing package 02 Â§7 items 2 and 3

- **02-G7.** `resonanceRatio(2, 0)` returns 1.7071 Â± 0.0001. Pure maths, pinned.
- **02-G8.** Changing the rotation-curve slope changes every arm terminus. Catches a derived value that has silently become a stored one.
- **02-G9.** Arm attachment radius equals R_CR,bar, not bar half-length. The two agree only for â = 1.0 and must not be conflated.
- **02-G10.** The bar's OLR is strictly inside the outermost arm terminus. If a generated galaxy violates this, the two pattern speeds have been crossed.
- **02-G11.** Both By-law S constants carry the re-audit marker the audit harness enumerates.

## 7 â Verification status

The resonance algebra is my own derivation, checked numerically, and needs no external source.

**Everything in Â§3 and Â§4 came from search results and secondary summaries, not from articles of record.** Dias et al. 2019, the 23.0 km sâ»Â¹ kpcâ»Â¹ open-cluster result, Debattista & Sellwood 2000, Contopoulos & GrosbÃ¸l, and the bar pattern speed convergence must all be verified against published versions before any of these numbers enters a provenance header. Treat Â§5 as a proposed schema with provisional values, not as a transcription.
