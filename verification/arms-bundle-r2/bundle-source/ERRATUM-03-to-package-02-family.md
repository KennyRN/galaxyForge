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
