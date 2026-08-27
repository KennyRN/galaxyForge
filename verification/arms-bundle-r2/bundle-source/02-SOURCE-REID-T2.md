<!-- galaxyForge arms bundle R2 Â· current document Â· assembled 2026-08-26 Â· original preserved at archive/galaxyForge-REID-T2-ARM-EXTENTS.md -->

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

# galaxyForge â Reid et al. 2019 Table 2: verified transcription and arm-extent derivation

**Status: source transcription + derivation. Not yet a patch.** Raised from two observed defects: arms dissolve rather than terminating, and the cross-section ends at a hard edge. This document supplies the sourced half. **Cut date:** 2026-08-25.

**Source of record.** M. J. Reid, K. M. Menten, A. Brunthaler, X. W. Zheng et al., *Trigonometric Parallaxes of High-mass Star-forming Regions: Our View of the Milky Way*, ApJ **885**, 131 (2019 November 7). DOI `10.3847/1538-4357/ab4a11`. Table 2, "Spiral Arm Characteristics", read from the published article at IOPscience â **not** the arXiv preprint, not an aggregator. Models assume Râ = 8.15 kpc.

---

## 1 â Blocking architectural finding

`armFactor` is imported and called from `galaxyModel.ts:533`, inside the density field itself â not from the render path. Every population that sees an arm set sees it through this call, and `placement`/`starFormingComplexes` site systems from that field.

**Arm extent is therefore a field property, not a display envelope.** An arm that visually terminates but continues to seed star-forming complexes past its tip is exactly the two-sources-of-truth split Law 1 forbids. Consequences:

- This is a **shape break**, not a display change. `genVersion` bumps. Under **Amendment P** it produces a fork, not a mutation, with a computed diff of which systems move.
- It cannot ride along with the render work (which is A3-exempt and bump-free). The two must be sequenced separately.

This is a real change in scope from what the render discussion implied, and it needs an owner ruling before anything is written.

---

## 2 â Table 2, verbatim

Î² is Galactocentric azimuth, **0Â° toward the Sun, increasing in the direction of Galactic rotation**, which Reid's Figure 1 views as **clockwise** from the north Galactic pole. Widths are intrinsic Gaussian 1Ï at R<sub>kink</sub>.

| Arm | N | â tangency | Î² range | Î²<sub>kink</sub> | R<sub>kink</sub> (kpc) | Ï< (Â°) | Ï> (Â°) | width (kpc) |
|---|---|---|---|---|---|---|---|---|
| 3 kpc (N) | 3 | 337.0 | 15 â 18 | 15 | 3.52 Â± 0.26 | â4.2 Â± 3.8 | â4.2 Â± 3.8 | 0.18 Â± 0.05 |
| Norma | 11 | 327.5 | 5 â 54 | 18 Â± 4 | 4.46 Â± 0.19 | â1.0 Â± 3.3 | 19.5 Â± 5.1 | 0.14 Â± 0.10 |
| SctâCen | 36 | 306.1 | 0 â 104 | 23 | 4.91 Â± 0.09 | 14.1 Â± 1.7 | 12.1 Â± 2.4 | 0.23 Â± 0.05 |
| SgrâCar | 35 | 285.6 | 2 â 97 | 24 Â± 2 | 6.04 Â± 0.09 | 17.1 Â± 1.6 | 1.0 Â± 2.1 | 0.27 Â± 0.04 |
| Local | 28 | â | â8 â 34 | 9 | 8.26 Â± 0.05 | 11.4 Â± 1.9 | 11.4 Â± 1.9 | 0.31 Â± 0.05 |
| Perseus | 41 | â | â23 â 115 | 40 | 8.87 Â± 0.13 | 10.3 Â± 1.4 | 8.7 Â± 2.7 | 0.35 Â± 0.06 |
| Outer | 11 | â | â16 â 71 | 18 | 12.24 Â± 0.36 | 3.0 Â± 4.4 | 9.4 Â± 4.0 | 0.65 Â± 0.16 |

Notes carried from the source, because each constrains use:

- A Î²<sub>kink</sub> quoted **without** an uncertainty was not solved for â it was assigned, mostly from a visible gap in sources. Norma (18 Â± 4) and SgrâCar (24 Â± 2) are the only fitted ones.
- Where Ï< = Ï>, only a single pitch was solved for (3 kpc, Local).
- â tangency values are *posteriori* from fits constrained by Bronfman et al. (2000) priors at Â±2Â°, used only where quadrant-4 parallaxes are absent.
- **Column 4 is the range of Galactocentric azimuth for the parallax data.** It is observational coverage. It is not a claim about where an arm begins or ends.

**Sign-convention trap, second instance.** Reid's Î² runs clockwise. The literature quotes the arm equation as `ln(R/R_kink) = â(Î² â Î²_kink)Â·tan Ï`, which in a counter-clockwise Î¸ frame becomes `+(Î¸ â Î¸_kink)Â·tan Ï`. Transcribed literally into a counter-clockwise frame the sign inverts and the galaxy mirrors â the same failure mode the Denyshchenko audit already caught. A structural gate must pin the trailing sense mechanically.

---

## 3 â What the Î² ranges actually imply

Converting each arm's Î² range to a radial range in Reid's own parameterisation:

| Arm | traced arc | traced R range |
|---|---|---|
| 3 kpc (N) | 3Â° | 3.51 â 3.52 kpc |
| Norma | 49Â° | 4.48 â 5.57 kpc |
| SctâCen | 104Â° | 4.44 â 6.65 kpc |
| SgrâCar | 95Â° | 5.37 â 6.18 kpc |
| Local | 42Â° | 7.78 â 9.02 kpc |
| Perseus | 138Â° | 7.26 â 10.84 kpc |
| Outer | 87Â° | 11.87 â 14.27 kpc |

**Every arm is traced over a narrow radial band.** SctâCen's 104Â° of azimuth spans barely 2.2 kpc in radius. Taken literally as termini these would render as short arcs in a ring, not as arms. This settles the point: the Î² ranges cannot be used as arm ends.

What they *do* establish is relative extent, normalised to the longest:

| Perseus | SctâCen | SgrâCar | Outer | Norma | Local |
|---|---|---|---|---|---|
| 1.00 | 0.75 | 0.69 | 0.63 | 0.36 | 0.30 |

Local at 0.30 is consistent with Reid's own Â§3.3, which calls it an isolated segment rather than a true arm that wraps around the Galaxy. Norma + Outer combined reach 136Â°, essentially equal to Perseus â consistent with Â§3.2.1 treating them as one arm.

**A single global extent gain will not work.** The arc each arm needs in order to run 3.5 â 16 kpc, against the arc actually traced:

| Arm | traced | needed | implied gain |
|---|---|---|---|
| SgrâCar | 95Â° | 283Â° | Ã2.98 |
| SctâCen | 104Â° | 347Â° | Ã3.33 |
| Perseus | 138Â° | 479Â° | Ã3.47 |
| Norma | 49Â° | 246Â° | Ã5.02 |
| Outer | 87Â° | 526Â° | Ã6.05 |
| Local | 42Â° | 432Â° | Ã10.28 |

The spread from Ã2.98 to Ã10.28 is driven by pitch, not by arm length. The earlier proof render's single `EXTENT_GAIN = 2.6` is therefore wrong in kind, not just in value.

**NormaâOuter caveat.** The two segments are not contiguous in Î². The unobserved arc between R = 4.46 and 12.24 kpc is 163Â° at Ï = 19.5Â°, 349Â° at Ï = 9.4Â°, and 1104Â° at Ï = 3.0Â°. Which pitch applies is unresolved by the data. Treating "Norma-Outer" as one arm with a 136Â° span implies a continuity the source does not supply, and the provenance header must say so.

---

## 4 â Two cross-checks that came back clean

**The Îº anchors reproduce the published width fit.** Reid's Figure 4 line is 336 pc at 8.15 kpc with a slope of 36 pc kpcâ»Â¹, i.e. Ïâ¥(R) = 42.6 + 36Â·R pc. The shipped Îº anchors (18.7511 at 3.5 kpc, 30.9951 at 16 kpc) imply:

| R | Ïâ¥ from Îº anchors | Reid Fig. 4 fit | deviation |
|---|---|---|---|
| 3.5 kpc | 169.4 pc | 168.6 pc | +0.5% |
| 16.0 kpc | 602.4 pc | 618.6 pc | â2.6% |

Independently confirmed against the version of record. This was previously asserted rather than checked.

**One shared width relation is the right call.** Table 2's per-arm widths against the Figure 4 line: SctâCen â5%, SgrâCar â4%, Perseus +3%, Local +10%, 3 kpc â6%. The two outliers are Norma (+45%) and Outer (â26%) â the two arms with N = 11 and the largest quoted uncertainties (0.14 Â± 0.10 and 0.65 Â± 0.16). The existing decision to keep one shared width-vs-radius relation rather than per-arm widths is vindicated; per-arm widths would be fitting noise.

---

## 5 â Proposed schema and values

Extend `ArmDefinition` with the traced span and its provenance, keeping the locus untouched:

```ts
/** Reid19 Table 2 col.4 traced azimuth span, degrees. SOURCED, but it is
 *  the extent of the PARALLAX DATA, not a physical terminus - see
 *  REID-T2-ARM-EXTENTS S3. Used only for the RELATIVE ordering of arm
 *  lengths; the absolute length comes from `armExtentFillRadiusPc`. */
readonly tracedSpanDeg: number;
```

| arm | `tracedSpanDeg` | grade | note |
|---|---|---|---|
| Scutum-Centaurus | 104 | sourced | Reid19 T2, SctâCen |
| Sagittarius-Carina | 95 | sourced | Reid19 T2, SgrâCar |
| Local | 42 | sourced | Reid19 T2; isolated segment per Â§3.3 |
| Perseus | 138 | sourced | Reid19 T2, longest traced |
| Norma-Outer | 136 | **derived** | 49 + 87, two disjoint segments joined per Â§3.2.1 |

Then one galaxy-level constant, not a per-arm gain:

| constant | value | grade |
|---|---|---|
| `armExtentFillRadiusPc` | 16000 | **tunable** â the radius the longest arm reaches |
| `armInnerBluntFraction` | 0.10 | **calibrated** â arms leave the bar thick |
| `armTipFraction` | 0.34 | **calibrated** â arc over which amplitude and width close to a point |

Each arm's outer terminus follows from `tracedSpanDeg / max(tracedSpanDeg)` against `armExtentFillRadiusPc`, so the sourced content is the ordering and there is exactly one length tunable. The inner terminus is the bar end, shared.

`armInnerBluntFraction` and `armTipFraction` have **no source at all**. Reid measures nothing about how an arm terminates. They are display-motivated shape parameters that happen to live in the field because extent does, and the ledger and README must say exactly that.

---

## 6 â Gates

1. **Trailing sense.** For every arm, R increases with Î¸ in the code's own frame. Fails if the Reid Î² sign is transcribed literally.
2. **Distinct termini.** No two arms in `ARMS` terminate within 5% of the same radius.
3. **Relative ordering preserved.** Rendered arm arc lengths reproduce the `tracedSpanDeg` ratios to within 1%.
4. **Tip closes.** At the outer terminus, both amplitude and effective width fall below 5% of their mid-arm values â a fading arm of constant width fails this.
5. **No level set.** The arm cross-section is Câ° everywhere; no radius exists at which the azimuthal profile has a discontinuous derivative. Catches any reintroduction of subtract-and-clip.
6. **Width relation unchanged.** Ïâ¥(R) from the Îº anchors stays within 3% of 42.6 + 36Â·R pc over 3.5â16 kpc.
7. **Grade separation.** Nothing on the generation path reads a constant graded `calibrated` without it being declared in the module ledger.

---

## 7 â Open decisions

1. **Does arm extent land in the field (shape break, `genVersion` bump, fork under Amendment P) or is the arm model left alone and the tip faked in the renderer?** The second is cheap and bump-free but knowingly splits the source of truth. Recommendation: field.
2. **`armExtentFillRadiusPc` as an absolute constant, or as a fraction of R90?** The latter scales with galaxy size for free; the former is easier to reason about.
3. Still outstanding from the render thread: clean export plate, or plate with the sector marker.
