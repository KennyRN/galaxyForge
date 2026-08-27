<!-- galaxyForge arms bundle R2 Â· current document Â· assembled 2026-08-26 Â· original preserved at archive/galaxyForge-HANDOFF-02-SOURCE-PACK.md -->

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

# galaxyForge â source pack for the resonance derivation

**Companion to `galaxyForge-HANDOFF-02-ERRATUM-1-RESONANCE.md`. Contains ERRATUM 2, which corrects it.** **Cut date:** 2026-08-26.

Every number in the erratum's observational sections, traced to a citation, with its verification status stated. **Nothing here has been read from an article of record.** All of it came from search results, journal landing pages, and secondary citations in later papers. The agent's first job is to promote these from *located* to *verified* before any of them enters a provenance header.

---

## 1 â The algebra needs no source

The resonance relation is standard galactic dynamics: ÎºÂ² = 2(1+Î²)Î©Â² for V â R^Î², and a resonance where m(Î© â Î©_p) = Â±Îº, giving

**R_res / R_CR = (1 Â± â(2(1+Î²)) / m)^(1/(1âÎ²))**

Derived and checked numerically in `resonance-derivation.py`. Cite **Binney & Tremaine, *Galactic Dynamics*, 2nd ed. (2008), Â§3.3 and Â§6.2** for the standard treatment â but the algebra stands on its own and the agent should re-derive rather than trust either me or a page reference I have not opened.

The independent check that it is right: for Î©_bar = 39 km sâ»Â¹ kpcâ»Â¹ the formula puts the bar's OLR at 10.24 kpc, and the literature independently quotes ~10.5 kpc for the same pattern speed. Agreement to 2.5%, from a completely separate calculation.

---

## 2 â Sources by quantity

| quantity | value | source | identifier | status |
|---|---|---|---|---|
| spiral Î©_p, corotation | 28.2 Â± 2.1 km sâ»Â¹ kpcâ»Â¹; R_c = 8.51 Â± 0.64 kpc | Dias, Monteiro, LÃ©pine & Barros 2019, MNRAS **486**, 5726 | `10.1093/mnras/stz1196` | abstract confirmed on OUP and ADS; **body not read** |
| spiral Î©_p, second method | 23.0 Â± 0.5 km sâ»Â¹ kpcâ»Â¹; R_c = 8.74 kpc | Junqueira et al. 2015, MNRAS **449**, 2336 | MNRAS 449/3/2336 | **secondary only** â quoted by Castro-Ginard et al. 2021 |
| per-arm pattern speeds differ | SgrâCar 16.5 & 29.8; Perseus 20.0; Orion 28.9 | Naoz & Shaviv 2007 | not located | **secondary only** |
| bar half-length | 5.0 Â± 0.2 kpc | Wegg, Gerhard & Portail 2015 | not located | **secondary only**, but quoted consistently across many papers |
| bar half-length, dissenting | ~3.5 kpc | Lucey et al. 2023 | not located | **secondary only** |
| bar Î©_p | 39.0 Â± 3.5 km sâ»Â¹ kpcâ»Â¹ | Portail, Gerhard, Wegg & Ness 2017, MNRAS **465**, 1621 | MNRAS 465/2/1621 | **secondary only** |
| bar Î©_p | 41 Â± 3 km sâ»Â¹ kpcâ»Â¹ | Sanders et al. 2019 | not located | **secondary only** |
| bar Î©_p | 37.5 km sâ»Â¹ kpcâ»Â¹ | Clarke et al. 2019 | not located | **secondary only** |
| bar Î©_p, recommended range | 43 Â± 9 km sâ»Â¹ kpcâ»Â¹ | Bland-Hawthorn & Gerhard 2016 | already in project sources | **secondary only for this figure** |
| fast-bar band | 1.0 â¤ â â¤ 1.4 | Debattista & Sellwood 1998, 2000 | not located | **secondary only**, quoted near-verbatim by many |
| â central value | 1.2 Â± 0.2 | Athanassoula 1992 | not located | **secondary only** |
| â, modern sample | 1.12 Â± 0.39 | PHANGS dynamical resonances, A&A 2024 | `aa50935-24` | landing page seen |
| bars cannot exceed corotation | orbits align parallel inside R_CR, perpendicular beyond | Contopoulos 1980 | not located | **secondary only** |
| arms end at 4:1 resonance | â | Contopoulos & GrosbÃ¸l | **not located at all** | cited from memory; must be found or the enum option dropped |
| waves propagate ILRâOLR | â | Adams et al. 1989; Bertin & Lin 1996 | not located | **secondary only** |
| solar radius, rotation amplitude | Râ, Vâ | Bland-Hawthorn & Gerhard 2016 | already in project sources | verified previously |

---

## ERRATUM 2 â four corrections to Erratum 1

### 2.1 Rotation amplitude inconsistency

**Erratum 1 Â§3 and Â§4 mix frames.** Dias et al. adopt **Râ = 8.3 kpc and Vâ = 240 km sâ»Â¹**. My "what pattern speed puts the OLR at a given radius" table used **Vâ = 229 km sâ»Â¹**, which is a different rotation amplitude, so those Î©_p figures are not comparable with Dias's.

The OLR figures themselves are unaffected â 1.707 Ã R_CR uses Dias's own corotation radius and never touches Vâ. But the Î©_p â radius conversions in Â§4's table are in a frame nobody else uses.

**Fix:** Râ and Vâ must be single-sourced for the whole model, declared once, and every derived radius computed in that frame. A gate should fail if two modules hold different rotation amplitudes.

### 2.2 The OLR is a ceiling, not a prediction

Density wave theory says waves **propagate between** the ILR and the OLR (Adams et al. 1989; Bertin & Lin 1996). The OLR is therefore the outer *bound* on where a wave can exist â an arm may terminate anywhere inside it, and the same literature notes arms can extend a significant distance **inside** corotation.

Erratum 1 Â§3 presented the 1.8% agreement between Reid's outermost traced point and the Dias OLR as though the OLR *predicts* the terminus. It does not. It caps it. The agreement remains striking and remains worth recording, but it is consistent with the arm reaching its ceiling, not evidence that it must.

This weakens the case for `armTerminusResonance = 'OLR_m2'` as a default from "derived" to "the ceiling, chosen because the Milky Way appears to sit near it". Grade stays **calibrated, By-law S**.

### 2.3 Bar half-length is itself disputed

Erratum 1 Â§2 treats ~5 kpc as settled. Wegg, Gerhard & Portail 2015 give 5.0 Â± 0.2 kpc, and that value is quoted almost universally â but Lucey et al. 2023, using the maximal extent of trapped bar orbits, find **~3.5 kpc**. That is a 30% difference and it propagates straight into â: at Î©_bar = 39 and R_CR = 5.9 kpc, a 5.0 kpc bar gives â = 1.18 (fast) while a 3.5 kpc bar gives â = 1.68 (**slow**).

The fast-bar classification the erratum leans on is therefore not secure. The attachment-at-corotation argument survives either way â manifold theory places L1/L2 at corotation regardless of â â but the claim that corotation *coincides with* the bar end does not.

**Fix:** attach at R_CR,bar and delete the coincidence argument. It was a nice story and it is not robust.

### 2.4 The bar pattern speed range was quoted too narrowly

Erratum 1 Â§2 says measurements converge on 33â41 km sâ»Â¹ kpcâ»Â¹. That is the recent cluster, but Bland-Hawthorn & Gerhard 2016 recommend **43 Â± 9**, and published values have spanned roughly 25 to 60. `barPatternSpeedKmSKpc = 37.5` should be graded **calibrated**, not **sourced**, with the recommended range recorded alongside it.

---

## 3 â What the agent must do before any of this ships

1. **Obtain Dias et al. 2019 (`10.1093/mnras/stz1196`) as the version of record** and confirm Î©_p, R_c, and the adopted Râ/Vâ from the body, not the abstract. This is the single load-bearing observational number in the erratum.
2. **Locate Junqueira et al. 2015** and confirm 23.0 Â± 0.5 and R_c = 8.74 independently. Two agreeing methods is the whole strength of Â§3; if one cannot be verified, the check is a single measurement.
3. **Find Contopoulos & GrosbÃ¸l, or drop `ultraharmonic_4_1` from the enum.** It is currently cited from my memory with no located reference. An unfindable citation in a provenance header is worse than no option.
4. **Resolve the bar length.** Wegg 2015 or Lucey 2023 â the choice determines whether the Milky Way's bar is fast or slow, and `fastBarRatio` is meaningless until it is settled.
5. **Re-derive the resonance algebra independently.** It is the one part with no external dependency, so it is the one part that can be made certain.
6. **Single-source Râ and Vâ** per Erratum 2.1, with a gate.

Anything that survives steps 1â4 as *secondary only* must be graded down accordingly. Under the project's standing rule, a number quoted by a later paper is not a verified number â it is a lead.

---

## 4 â What did not change

The resonance formula, its numerical evaluation, and the derivation chain from pattern speed to terminus all stand. So does the central architectural conclusion: **store the pattern speed, derive the radius.** Whatever the eventual sourced values, `armExtentFillRadiusPc` as a stored quantity is wrong, because it duplicates something the rotation curve and pattern speed already determine.

The observational agreement in Erratum 1 Â§3 also stands as recorded â it is simply weaker evidence than the erratum implied, for the reason in 2.2.
