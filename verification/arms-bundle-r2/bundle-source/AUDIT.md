# galaxyForge â independent audit of the 2026-08-26 arms bundle

**Status: audit. Archival.** Covers packages 01â03, the two supporting surveys, Errata 1 and 2, the source pack, and the three artefacts. Every number in the bundle was re-derived from scratch before being accepted or rejected; every citation that carries a number was chased to a version of record or explicitly marked as unresolved. **Cut date: 2026-08-26.**

**Corrections below are written as errata to be prepended, per the project's archival discipline. Nothing in the bundle should be rewritten.**

---

## 0 â Verdict

The architecture is sound and the discipline is working: the ledger grades, the By-law S scoping, the fork-not-mutate rule and the two-cohort arm structure all survive scrutiny, and in several places the bundle's own cautions are more conservative than they needed to be. The resonance algebra is exactly right. The width cross-check is exactly right. The density anchor is exactly right and I can now close its provenance obligation.

Three things are wrong, and one of them is load-bearing.

**The sign trap the bundle warns about three times was sprung inside the bundle.** `REID-T2 Â§3`'s radial conversion table is computed in the mirrored frame. It propagates into package 02 Â§3 and then into Erratum 1 Â§3, where it produces the 1.8% agreement that is the entire observational case for the resonance framework. Corrected, that agreement is â13.1%.

**The two corotation measurements presented as independent share a co-author and a school.** Dias et al. 2019 and Junqueira et al. 2015 both have LÃ©pine on the author list, both come out of the same SÃ£o Paulo programme, and both sit on the low branch of a bimodal literature. The source pack says "two agreeing methods is the whole strength of Â§3". There is one method.

**A paper published on 15 June 2026 supersedes the arm the whole of package 02 normalises against.** Hyland, Reid et al. (ApJ 1004, 209) move the Perseus arm 0.5â1.0 kpc outward and change its pre-kink pitch from 10.3Â° to 5.9Â°. Perseus is the denominator of every `tracedSpanDeg` ratio.

Separately, the plate can now be measured, and it shows arm contrast four to sixteen times the interarm level where the model's own sourced amplitude implies 1.33.

---

## 1 â ERRATUM A: the radial conversion is in the mirrored frame

**Prepend to `galaxyForge-REID-T2-ARM-EXTENTS.md`, `galaxyForge-HANDOFF-02-ARM-EXTENTS.md` and `galaxyForge-HANDOFF-02-ERRATUM-1-RESONANCE.md`.**

Reid's published equation, confirmed against the article of record and against four independent papers that restate it, is

```
ln(R / R_kink) = â(Î² â Î²_kink) Â· tan Ï
```

with Î² zero toward the Sun and **increasing** in the direction of Galactic rotation. For positive Ï, R therefore **decreases** as Î² increases. `REID-T2 Â§3` computed it with the opposite sign. Every arm in the table matches the mirrored form to within 0.02 kpc and none matches the published form.

The decisive check is physical, not algebraic. Evaluate Perseus at Î² = 0 â the point on the arm directly beyond the Sun:

| | R at Î² = 0 |
|---|---|
| Reid's published sign | **10.07 kpc** |
| the bundle's sign | 7.81 kpc |

The Perseus arm is roughly 2 kpc beyond the Sun toward the anticentre, so R â 10.1 kpc. The bundle's sign puts Perseus *inside* the solar circle.

**Corrected traced radii, Reid's own frame:**

| arm | traced arc | bundle's R range | **corrected R range** |
|---|---|---|---|
| 3 kpc (N) | 3Â° | 3.51 â 3.52 | 3.52 â 3.53 |
| Norma | 49Â° | 4.48 â 5.57 | **3.57 â 4.46** |
| SctâCen | 104Â° | 4.44 â 6.65 | **3.63 â 5.43** |
| SgrâCar | 95Â° | 5.37 â 6.18 | **5.91 â 6.80** |
| Local | 42Â° | 7.78 â 9.02 | **7.56 â 8.77** |
| Perseus | 138Â° | 7.26 â 10.84 | 7.26 â 10.83 |
| Outer | 87Â° | 11.87 â 14.27 | **10.50 â 12.63** |

Perseus is unchanged by coincidence â its two pitch branches happen to give near-equal |ln R| excursions, so the endpoints merely swap. Every other arm moves.

### What survives, and what does not

**Survives.** The conclusion that every arm is traced over a narrow radial band is unaffected â the max/min *ratio* is invariant under the sign flip, so the argument in Â§3 that these cannot be used as termini stands. So does the relative ordering, which depends only on the azimuth spans. So does the whole of Â§4's cross-check work, which never touches the conversion.

**Does not survive.** Erratum 1 Â§3 reads: *"Reid 2019's outermost traced arm point â the Outer arm at the top of its Î² range â is at 14.27 kpc. That is 1.8% from the Dias OLR."* The outermost traced radius of any arm in Table 2 is **12.63 kpc**, not 14.27.

| | mirrored | **corrected** |
|---|---|---|
| vs Dias OLR (14.53 kpc) | â1.8% | **â13.1%** |
| vs Junqueira OLR (14.92 kpc) | â4.4% | **â15.4%** |

The striking coincidence is an artefact of the sign error. This does not make the resonance framework wrong â Erratum 2.2 had already, correctly, demoted the OLR from a prediction to a ceiling, and an arm sitting 13% inside its ceiling is exactly what density-wave theory expects. But the numerical agreement that motivated choosing `OLR_m2` as the default is gone, and the grade on `armTerminusResonance` should now read **calibrated, By-law S, no observational anchor** rather than "chosen because the Milky Way appears to sit near it".

Running the chain backwards, a terminus at 12.63 kpc implies Î©_p â 31â32 km sâ»Â¹ kpcâ»Â¹, above the entire range Erratum 1 Â§4 tabulates.

**This is the third instance of this failure mode in the project and the first in which the warning and the error appear in the same document.** Gate 02-G1 pins the trailing sense in code. Nothing pins it in the analysis. Recommend a standing rule: any Î² â R conversion in a document is checked by evaluating a named arm at a known azimuth against a known physical position before the table is written.

---

## 2 â ERRATUM B: the two corotation measurements are not independent

**Prepend to `galaxyForge-HANDOFF-02-SOURCE-PACK.md`.**

The source pack lists Dias et al. 2019 and Junqueira et al. 2015 as separate rows and step 2 of Â§3 instructs the agent to confirm the second "independently", noting that "two agreeing methods is the whole strength of Â§3".

- Dias, Monteiro, **LÃ©pine** & Barros 2019, MNRAS 486, 5726
- Junqueira, Chiappini, **LÃ©pine**, Minchev & Santiago 2015, MNRAS 449, 2336

Same co-author, same programme, and both are part of a long-running series from that group â Amaral & LÃ©pine 1997 (9.0 kpc), Dias & LÃ©pine 2005 (8.5 kpc), Junqueira 2015 (8.7 kpc), Dias 2019 (8.5 kpc) â which consistently places corotation at the solar circle. Dias et al. state R_c/Râ = 1.02 Â± 0.07 explicitly.

This is a minority position, and the literature is bimodal: optical open-cluster backward integration gives ~8.5 kpc, while radio tracers give corotation nearer 12 kpc or beyond. The bundle sampled one branch twice and read the internal agreement as corroboration.

A 12 kpc corotation implies an m = 2 OLR at 20.5 kpc and Î©_p â 19 km sâ»Â¹ kpcâ»Â¹ â and Sun et al. 2024 trace CO arms to R â 22 kpc (Â§4.3 below). The high branch is not a fringe option.

**Action.** Regrade the Â§3 check from "came back well" to "one measurement, from a group holding a minority position, at the low end of a bimodal literature". Record both branches in the provenance header. `spiralPatternSpeedKmSKpc = 24.0` sits between them and is defensible precisely because it is a compromise â say so.

---

## 3 â ERRATUM C: four rotation frames are in play, not two

**Extends Erratum 2.1, which understates the problem.**

| source | Râ (kpc) | Vâ (km sâ»Â¹) | what it supplies to the bundle |
|---|---|---|---|
| Reid et al. 2019 | 8.15 | 236 | the arm loci and all of Table 2 |
| Eilers et al. 2019 | 8.122 | 229 | the Vâ hard-coded in `resonance-derivation.py` |
| Dias et al. 2019 | 8.30 | 240 | the corotation radius Erratum 1 Â§3 leans on |
| Junqueira et al. 2015 | 8.0 | 220 | the second pattern speed |
| GRAVITY 2021 | 8.275 | â | the current best Râ, used nowhere |

Erratum 2.1 catches only the Dias/table clash. The Junqueira frame is a fourth, and it exposes an arithmetic problem the source pack inherited: at Vâ = 220 and Î©_p = 23.0, a flat-curve corotation is **9.57 kpc**, not the 8.74 kpc the source pack records. Either their rotation curve is materially non-flat there, or 8.74 is a recomputation in a third party's frame. The implied OLR ranges from 14.92 to 16.33 kpc depending on which is right. **This must be resolved before either number enters a header.**

Erratum 2.1's fix is correct and should be strengthened: Râ and Vâ single-sourced, declared once, with a gate failing if two modules disagree â and every *imported* radius reframed on entry, not just internally consistent quantities.

---

## 4 â Science that is missing

### 4.1 Hyland et al. 2026 supersedes the arm package 02 normalises against

**ApJ 1004, 209 (2026 June 15), DOI `10.3847/1538-4357/ae64f5`.** Four new VLBA parallaxes plus 3D kinematic distances, 47 candidate Perseus masers. Published ten weeks before the bundle's cut date.

| model | Î²_k | R_k (kpc) | Ï< | Ï> | width (kpc) |
|---|---|---|---|---|---|
| Reid 2019 (in the bundle) | 40 | 8.87 Â± 0.13 | 10.3 Â± 1.4 | 8.7 Â± 2.7 | 0.35 Â± 0.06 |
| Hyland 2026, two-segment | 40 | **9.29 Â± 0.10** | **5.9 Â± 1.2** | **10.6 Â± 1.0** | 0.32 Â± 0.04 |
| Hyland 2026, one-segment | 40 | 9.08 Â± 0.08 | 8.76 Â± 0.72 | â | 0.36 Â± 0.06 |

The Perseus arm lies 0.5 kpc further out at Î² = 40Â° and 1.0 kpc further out at Î² = 180Â°. Because Perseus is the denominator of every `tracedSpanDeg` ratio, this moves the whole package-02 schema. It also changes the "implied gain" table: the arc Perseus needs to run 3.5 â 16 kpc goes from 479Â° on Reid's pitch to **843Â°** on the two-segment fit.

Note the paper's own internal inconsistency â Table 3 gives Ï< = 5.9 Â± 1.2 and Ï> = 10.6 Â± 1.0 while Â§5.1 quotes 5.8 Â± 0.7 and 10.3 Â± 0.8. Record which was used.

### 4.2 Perseus and SagittariusâCarina may be one arm

Xu et al. 2023 (ApJ 947, 54) propose that the two bifurcate from a single parent arm on the far side. Bian et al. 2024 (AJ 167, 267) support it from the Sagittarius side. Hyland et al. 2026 refine the crossing to Î² â 189â200Â°, R = 5.6 kpc and explicitly favour the bifurcation model.

This is a **topological** claim, not a parameter revision: two of the five arms in `ARMS` may be one arm that splits. `tracedSpanDeg` for both is then measuring segments of a single structure and the normalisation is not meaningful as constructed. It also bears on `armInnerAttachRadiusPc` â if the parent runs to Î² â 215Â°, it reaches the bar end with a pitch near 30Â°, nothing like the shipped 12Â°.

Xu et al. 2023 additionally give the headline morphology result the project should be building against: the Milky Way is a **multiple-arm** galaxy with **two-arm symmetry in the inner disc** breaking into four via two near-symmetric bifurcations. Only 2% of known multiple-arm galaxies have four inner arms; 83% have two. Sellwood & Masters make the same point from the other direction â Reid's four-arm model is anomalous, since Hart et al. 2016 find just 335 of 6683 spirals with four arms.

**This vindicates the existing two-tier cohort design and gives it a much stronger citation than it had.** It also means the four-arm pattern should be scoped to the young/gas cohort explicitly, which is already the design intent.

### 4.3 Sun et al. 2024: CO arms reach 22 kpc

**ApJL, DOI `10.3847/2041-8213/ad9605`.** 32,162 molecular clouds from MWISP, fitted with Reid's own log-periodic-plus-kink form. Three spiral segments **16â43 kpc in length**, pitch angles 4â12Â°, reaching **R â 22 kpc** â beyond previous CO studies and beyond the optical radius, comparable to the H I range. New models for Perseus, Outer, and the Outer ScutumâCentaurus arm.

Three consequences.

**`armExtentFillRadiusPc = 16000` was too small, not too large.** The observed gas disc runs to 22 kpc. The survey's remark that "gas may run further still" now has a number attached.

**Arc length is available and is the better parameterisation.** Sun gives physical arm lengths in kpc. `tracedSpanDeg` measures azimuth, and equal azimuths at different radii are wildly different physical lengths â Norma at 4 kpc and Outer at 12 kpc are not comparable on that axis at all. Arc length is the quantity the ordering was reaching for.

**The OSC arm exists and is missing from the model.** Dame & Thaddeus 2011, Sun et al. 2015, 2017, Armentrout et al. 2017. It is a real structure at R â 15â20 kpc.

### 4.4 `tracedSpanDeg` encodes a survey selection function

This is the sharpest criticism of package 02, and it is independent of the sign error.

The Î² ranges are the azimuthal coverage of **VLBI parallax measurements from a predominantly northern-hemisphere array**. Reid's own Table 2 notes that quadrant-4 tangency values rely on Bronfman priors because quadrant-4 parallaxes are absent. Arms with more of their length in Q4 are systematically under-traced.

Package 02 Â§3 says the Î² ranges "establish **relative** extent". They establish relative *observational coverage*. That Local comes out shortest and matches Reid's Â§3.3 description is a real consistency check, but one agreement does not license the general inference.

**Recommendation.** The *number* 104 is sourced. The *inference* "relative coverage = relative length" is an assumption and should be graded **calibrated** in its own right, with the selection function named in the header. Better: replace the proxy entirely with an all-sky tracer â Sun et al. 2024 (CO), Hou & Han 2014 (H II + GMC + maser), or Drimmel et al. 2025 (~3000 WISE-calibrated Cepheids, four arms). None is VLBI-target-limited and all cover the far side.

### 4.5 Sellwood & Masters 2022 is absent and is the natural By-law S anchor

**ARA&A 60, 73â120.** The current review of spiral structure, freely available as arXiv 2110.05615. Its absence is the largest single citation gap in the bundle, because By-law S rests on "the mechanism is contested" and this is the document that establishes exactly how and where.

It also supplies numbers the generator does not currently have:

| quantity | value | source within the review |
|---|---|---|
| arm multiplicity | 62% two-arm, 20% three, 6.5% four, ~6.5% five+ | Hart et al. 2016, N = 6683 |
| armâinterarm contrast | 0.3â1.3 mag (factors 2â3) | Elmegreen et al. 2011, S4G |
| mass vs light contrast | stellar **mass** contrast â half single-band photometric | Zibetti et al. 2009 |
| MW arm amplitude, kinematic | ~10%, pitch ~12Â° | Eilers et al. 2020, Gaia DR2 |
| multiple pattern speeds | identified in **28 of 32** barred galaxies | Font et al. 2014 |
| leading arms | 2 of 109, both tidally disturbed | Pasha 1985 |
| lopsidedness | ~â of spirals significantly lopsided | Jog & Combes 2009 |
| arm count vs disc mass | 1/f_d â² m â² 2/f_d for swing-amplified patterns | Sellwood & Carlberg 1984 |

Font et al.'s 28-of-32 is the number that should govern By-law S. The single-pattern-speed assumption is not merely contested in theory; it is contradicted in the large majority of observed barred galaxies.

### 4.6 Warp and flare

Beyond R â 10â12 kpc the Milky Way disc warps and flares strongly (Skowron et al. 2019; Chen et al. 2019; Poggio et al. 2018). The scale height grows from ~300 pc at Râ to over 1 kpc, and the midplane is displaced by up to ~1 kpc.

Package 01 Â§6 adds a Type II break and radial granularity but not the flare. For an isophote map built by collapsing z through `projectSlab`, the flare directly changes the column integral in the outer disc â arguably more than the break does, and in the opposite direction. Two structural terms in the outer disc, one modelled and one not.

### 4.7 The plotted quantity is not what the visual reference shows

Package 01 Â§1 is emphatic and correct that the field is **systems pcâ»Â²**. But Â§1's framing â "log-spaced bands over a surface density field is an isophote map â the standard astronomical presentation" â quietly conflates two different quantities. An isophote is a contour of constant surface **brightness**. This is a contour of constant **number** surface density. M dwarfs dominate number; giants and young massive stars dominate light. The two maps do not look alike, and the difference is largest exactly where it matters: in the arms.

This is not a defect in the renderer. It is a labelling and expectation-setting issue: the plate cannot be judged against a light-weighted reference image, and the caption should say "system surface density" rather than borrowing the word isophote â which Â§3's caption already does correctly. Bring Â§1's prose into line.

---

## 5 â Science that is outdated or questioned

### 5.1 The Toomre-Q star-formation threshold is a pre-GALEX picture

Package 03 Â§3 and survey Â§2 rest the per-cohort termination on Kennicutt 1989 and Martin & Kennicutt 2001 â HÎ± profile breaks at threshold radii matching Î£_crit = Î±_Q ÏÎº/ÏG.

That picture has been substantially revised. GALEX found extended-UV discs with star formation well beyond the HÎ± edge (Thilker et al. 2005; Gil de Paz et al. 2005), and Leroy et al. 2008 (THINGS) found Q a poor predictor of where star formation occurs, with efficiency per free-fall time roughly constant instead. The survey already carries the source's own caveat that the criterion fails for low-mass spirals such as M 33; the stronger point is that the HÎ± break is a threshold in *tracer brightness*, not a wall.

**This does not overturn the per-cohort ruling â it strengthens it while weakening the mechanism.** Young-tracer arms do end sooner than old-star arms; they just do not end at a sharp Q radius. Keep the ruling, replace the rationale, and do not wire Q as an actual radius. The survey's own Â§7 already says Martin & Kennicutt needs direct verification before that happens; the answer is that it should not happen.

### 5.2 Manifold theory has a better-supported alternative that gives the same answer

Package 03 Â§4 deletes `armInnerBluntFraction` on manifold grounds (Romero-GÃ³mez; Athanassoula) and correctly scopes it under By-law S as contested.

There is a mainstream, uncontested result that produces the same geometry without the contested mechanism. **Sellwood & Sparke 1988** showed that bar and spiral generally have *different* pattern speeds, and that an apparent connection between the spiral and the bar end nonetheless persists for a very large fraction of the beat period. The arms look attached to the bar most of the time whether or not they are dynamically launched from it. Sellwood & Masters put it directly: the arms starting at the bar end is not a coincidence, and does not require bar driving.

This matters because it is more robust than the argument it replaces, and because it dissolves Erratum 2.3's difficulty. That erratum correctly noticed that the bar-length dispute (Wegg 5.0 kpc vs Lucey 3.5 kpc) makes the fast-bar classification insecure, and correctly told the agent to "attach at R_CR,bar and delete the coincidence argument". Under Sellwood & Sparke the coincidence *is* the mechanism, and the attachment can simply be at the bar end.

**Ruling required from the owner.** Package 03 Â§4 says attach at the **bar end**. Erratum 1 Â§2 and gate 02-G9 say attach at **bar corotation** and that the two "must not be conflated". Erratum 1 is prepended to package 02, not 03, so the two documents currently contradict each other with no erratum bridging them. A coding agent reading 03 will implement one thing and a coding agent reading the erratum will implement the other. **This is the most likely thing in the bundle to be built wrong.**

My recommendation is the bar end, on Sellwood & Sparke, with the By-law S marker retained. It survives the bar-length dispute, needs no fast-bar assumption, and rests on a result nobody contests.

One further note for Erratum 2.3: part of the Wegg/Lucey gap is definitional rather than a disagreement. Wegg, Gerhard & Portail 2015's 5.0 Â± 0.2 kpc is the **long bar** half-length; the boxy/peanut component is ~2.2 kpc; Lucey et al. 2023's ~3.5 kpc is the maximal extent of **trapped bar orbits**. Three different quantities. The erratum treats them as one measurement with a 30% spread.

### 5.3 The rotation curve is not flat where the OLR sits

`resonance-derivation.py` tests Î² from â0.10 to +0.10 and concludes "the formula is not fragile". Within that window it is right â the m = 2 OLR ratio moves only 1.595 to 1.852.

But the outer Milky Way rotation curve is not in that window. Eilers et al. 2019 measure a decline of â1.7 km sâ»Â¹ kpcâ»Â¹, i.e. Î² â â0.06 at Râ, and Jiao et al. 2023 and Ou et al. 2024 find the decline steepening sharply beyond ~15â19 kpc â precisely where the OLR is being placed.

| Î² | R_OLR / R_CR | vs flat |
|---|---|---|
| â0.30 | 1.430 | â16.2% |
| â0.20 | 1.504 | â11.9% |
| â0.10 | 1.595 | â6.6% |
| â0.06 (Eilers at Râ) | 1.637 | â4.1% |
| 0.00 | 1.707 | â |

The constant 1.7071 is a flat-curve number being applied at a radius where the curve is not flat. Gate 02-G8 already requires that changing the curve slope changes every terminus, which is the right structural gate â but the *value* should be evaluated on the model's own curve at the terminus radius, not pinned at the flat-curve constant. Gate 02-G7 should pin `resonanceRatio(2, 0) = 1.7071` as a pure-maths check, which is what it says, and nothing on the generation path should call it with Î² = 0 by default.

### 5.4 D'Onghia et al. 2013 is cited as corroboration by a paper that rejects it

Survey Â§3 and package 03 Â§6 cite D'Onghia, Vogelsberger & Hernquist 2013 as corroborating arm segmentation. Reid 2019 does cite it for exactly that, so the citation is not wrong. But Sellwood & Carlberg 2021 Â§6 and Sellwood & Masters 2022 Â§5.2.2 reject the D'Onghia *mechanism* in detail â their sub-maximum disc favours m â 6â12, producing multi-arm patterns that do not resemble the two- and three-arm spirals actually observed.

The *observation* of segmentation stands on Honig & Reid's own measurements and on Reid 2019's kink formalism. Cite it there. Carrying D'Onghia as mechanistic support imports a live dispute the bundle has not scoped.

### 5.5 The tip parameters claim more precision than four arms can carry

Package 03 grades `armTipArcDeg`, `armTipWidthRatio` and `armTipProbability` all as **sourced**. Re-derived from the survey's own table:

| | mean | s.d. | s.e.m. | 95% CI |
|---|---|---|---|---|
| terminal arc | 31.25Â° | 7.50 | 3.75 | **19.3 â 43.2Â°** |
| width ratio | 0.6204 | 0.115 | 0.058 | 0.44 â 0.80 |
| incidence | 4/10 = 0.400 | â | 0.155 | **0.15 â 0.70** (Jeffreys) |

The numbers themselves reproduce exactly. The grading does not follow. Gate 3 requires 40% Â± 8% over a large seed sample â **tighter than the source interval**, which spans 0.15 to 0.70. A generator pinned to Â±8% is asserting precision the four galaxies cannot supply.

Two further sample problems. Two of the four narrowing arms are in **NGC 5194 â M 51, a tidally interacting grand design with a companion**; using it to set a generic tip parameter imports the tidal case into the general one. And NGC 5194 A's "terminal" segment (6.08 kpc) lies *inside* its interior segment (6.45 kpc), which is the ambiguity the survey honourably flags in its own Â§1 source caution. Dropping it moves the arc mean to 33.3Â° and the width ratio to 0.580 â a 6% swing from one contested arm out of four.

**Action.** Regrade all three to **calibrated (n = 4, one interacting host)**, record the intervals alongside the point values, and loosen gate 3 to the source interval or drop the incidence gate entirely.

---

## 6 â Results that a different model would improve

### 6.1 `armTerminusResonance` â Contopoulos & GrosbÃ¸l is located, and says more than the enum allows

The source pack lists this as "**not located at all** â cited from my memory... must be found or the enum option dropped". It is:

- **Contopoulos, G. & GrosbÃ¸l, P. 1986, A&A 155, 11** â *Stellar dynamics of spiral galaxies: nonlinear effects at the 4/1 resonance*
- **Contopoulos, G. & GrosbÃ¸l, P. 1988, A&A 197, 83** â *Stellar dynamics of spiral galaxies: self-consistent models*

Confirmed independently by Patsis et al. 1991, 1994, 1997; LÃ©pine et al. 2011; Junqueira et al. 2013; Chaves-Velasquez et al.

The content is better than the erratum's rendering. The 4:1 termination applies to **strong, open** spirals â large pitch angles, Sb/Sc â where elliptical periodic orbits become rectangular and can no longer support the wave. For **weak** spirals ("as in Sa galaxies") the linear theory is recovered and arms reach corotation or the OLR. Contopoulos 2009 quantifies "weak" as perturbations of order 2â10%.

**The terminus resonance is therefore selected by arm strength, not chosen freely.** That is exactly the coupling the erratum guessed at when it wrote "may hold for other `armClass` values" but could not source:

| arm amplitude | Elmegreen class | terminus |
|---|---|---|
| weak (Aâ â² 0.10) | flocculent / Sa-like | corotation or OLR |
| strong / open (Aâ â³ 0.3, large pitch) | grand design | 4:1 ultraharmonic |

The Milky Way at Aâ â 0.14 sits on the weak branch â so Erratum 1 Â§5's dismissal ("the 4:1 option is wrong for the Milky Way") reaches the right answer, but by asserting it rather than deriving it. Under Contopoulos & GrosbÃ¸l's own criterion it is *predicted*.

Note the dispute: Zhang & Buta 2009 argue from potentialâdensity phase shifts that spiral modes generally extend to their OLR and that 4:1 termination "is not likely to be true in general". Consistent with Bertin et al. 1989. By-law S covers it.

### 6.2 Arm count from disc mass fraction

Swing amplification predicts the rotational symmetry of the amplified pattern as **1/f_d â² m â² 2/f_d**, where f_d is the disc contribution to the central attraction. Two- and three-arm patterns indicate a heavy, near-maximal disc; sub-maximal discs give higher multiplicity; and multiplicity rises in the outer disc where the halo dominates.

galaxyForge already holds a mass model. This converts arm count from a rolled parameter into a **derived** one â precisely the store-the-input, derive-the-output move Erratum 1 Â§5 made for arm extent, and the same architectural argument applies. It also explains the observed radial trend for free.

Where a roll is still wanted, Hart et al. 2016 gives the marginal distribution (62/20/6.5/6.5), and the two are cross-checkable: a generator whose f_d distribution reproduces Hart's arm-count histogram is calibrated in a falsifiable way.

### 6.3 Pitch angle from the rotation curve

The shipped table runs 12.04â12.43Â° for every arm against an observed spread of 10â30Â°, which survey Â§3 flags as a fidelity gap and leaves unaddressed.

Swing amplification supplies the missing physics: rising rotation curves give more open arms, declining curves more tightly wound, through Î â¡ â(R/Î©)dÎ©/dR. Kennicutt 1981 and Seigar et al. 2006 find the correlation observationally; Yu & Ho 2019 argue the central slope matters more than shear. The correlation is loose and Sellwood & Masters are explicit that no consensus exists on what pitch angle correlates with â so this is a **calibrated** coupling with scatter, not a deterministic law. But it is better motivated than a constant.

The uniform-pitch gap has a cheaper partial fix too: Reid Table 2 supplies kink values for four of five arms and they are already sourced. Survey Â§9 open decision 3 asks whether to wire them now. **Recommend yes** â the segmentation literature is the strongest single result in the survey, the values cost nothing, and they are the mechanism by which arms vary in pitch along their length.

### 6.4 Arm contrast â and a gate that only the absolute scale makes possible

This is the finding that most directly repays package 01.

Because the plate is a hard quantisation into seventeen known colours, band index is exactly recoverable from the image, and on an absolute Ã2 scale **band difference is logâ of contrast**. I decoded the supplied plate â the palette match is exact, residual zero â and measured the azimuthal band spread in thin annuli:

| R (kpc) | band spread | contrast | implied Aâ |
|---|---|---|---|
| 7.0 | 3.0 | Ã8 | 0.78 |
| **8.15** | **2.0** | **Ã4** | **0.60** |
| 9.0 | 2.0 | Ã4 | 0.60 |
| 10.0 | 4.0 | Ã16 | 0.88 |

Against what the model's own sourced science implies:

| | bands | contrast |
|---|---|---|
| Drimmel & Spergel Aâ = 0.14 (the project's own value) | **0.41** | Ã1.33 |
| Eilers et al. 2020, Gaia kinematic, ~10% | 0.29 | Ã1.22 |
| Elmegreen et al. 2011 S4G **ceiling**, 1.3 mag | 1.73 | Ã3.31 |

The plate's arms are roughly **ten times** the model's stated amplitude, and above the ceiling for the most extreme grand-design spirals in the S4G sample. At Aâ = 0.14 the old-population arms should span less than half a band â visible as a soft modulation, not as the multi-band ridges in the plate.

Two readings, and the bundle should determine which:

1. The demo field in `scale_bench.py` is not the shipping field and carries display emphasis. Likely, and harmless â but then the plate should not be read as a preview of the render.
2. The generated field genuinely carries this contrast, in which case a display-only package has revealed a **shape** defect, and the arm amplitude is a separate bug from anything in packages 02 and 03.

Either way, add a gate. **Gate 01-G10 â arm amplitude is measurable and matches the model.** Azimuthal band spread at Râ in the old cohort reproduces the model's own Aâ to within 0.15 bands. A percentile scale could never have supported this test; the absolute scale earns its keep here more than anywhere else in the package.

For generating galaxies other than the Milky Way, Aâ should be drawn from the Elmegreen S4G distribution correlated with `armClass`, then halved per Zibetti et al. 2009 to convert photometric contrast to **mass** contrast â which is what a systems-density field needs and what a light-weighted measurement over-reports.

### 6.5 Type II is the common case, not the only one

Package 01 Â§6 always applies a Type II broken exponential. Pohlen & Trujillo 2006 â the bundle's own citation â find roughly 60% Type II, ~30% Type III (antitruncated), ~10% Type I (pure exponential). A generator should roll the profile class, not hard-code the modal one. Same source, no new literature needed.

### 6.6 Lopsidedness

~â of spirals are significantly lopsided (Jog & Combes 2009). An m = 1 term is absent from galaxyForge entirely. Lower priority than the above, but it is one of the more common departures from the symmetric model and it is cheap.

---

## 7 â What came back clean

Recorded so it is not re-litigated.

**The resonance algebra is exact.** Re-derived from ÎºÂ² = R dÎ©Â²/dR + 4Î©Â² at 30 decimal places. R_res/R_CR = (1 Â± â(2(1+Î²))/m)^(1/(1âÎ²)) is correct, and the flat-curve values reproduce to every digit: OLR m=2 = 1.70710678â¦, ILR m=2 = 0.29289321â¦, 4:1 = 0.64644660â¦, OLR m=4 = 1.35355339â¦. The source pack's instruction to re-derive rather than trust was the right instruction and the derivation survives it.

**The width cross-check is exact.** Ïâ¥ from the Îº anchors against Reid's Figure 4 line 42.6 + 36Â·R: +0.47% at 3.5 kpc, â2.62% at 16 kpc. Matches the bundle's +0.5% and â2.6%. The internal consistency of 42.6 + 36 Ã 8.15 = 336.0 pc holds. The one-shared-width-relation decision is vindicated: five of seven arms within 10%, and the two misses are the two with N = 11 and the largest quoted uncertainties. Do not change it.

**The band scale arithmetic is exact.** 0.25 Ã 2Â¹â· = 32 768; 5.1175 dex; Sol at 48.12 lands in band 7 (logâ index 7.589). Palette length, clamp index and legend tick positions are mutually consistent in the reference implementation.

**The `armExtentFillRadiusPc` challenge was correct.** Erratum 1's central architectural conclusion â store the pattern speed, derive the radius â stands regardless of everything in Â§1 and Â§2 above. A stored extent duplicates something the rotation curve and pattern speed already determine.

**Erratum 2 is good work.** All four corrections are right, and 2.2 in particular (the OLR is a ceiling, not a prediction) anticipates the damage the sign error would otherwise have done.

**The density anchor is exact, and I can close its provenance obligation.**

```
336 systems / (4/3 Â· Ï Â· 10Â³ pcÂ³) = 8.0214 Ã 10â»Â² systems pcâ»Â³
```

That is `8.02 Ã 10â»Â²` to three figures, exactly. The source is **ReylÃ© et al. 2022, the first update to the 10 pc sample** (541 objects in 336 systems) â *not* the 2021 paper, which gives 339 systems and would yield 8.09 Ã 10â»Â². The header can now be completed without the TAP query.

Three caveats for that header. The count includes brown-dwarf and white-dwarf systems, so "system" must be defined. The brown-dwarf census within 10 pc is still incomplete, so the figure is a lower bound that will drift upward. And Poisson error on 336 counts is Â±5.5%, before local structure â three significant figures overstates the precision considerably.

---

## 8 â Defects in the gate sets

Six problems, all cheap to fix, all of a kind the coding agent will implement literally.

**Package 01 gate 3 is unfalsifiable as written.** *"The smoothing radius is never smaller than one cell width."* The reference implementation smooths at Ï = 1 cell by construction, so the condition cannot fail at any grid size. Â§4's physical argument (65 pc is below every structure the model contains) fixes the **cell size**; the smoothing then follows trivially. Restate as: cell size is fixed at 65 pc, grid dimension = frame / 65, and Ï is specified in parsecs and converted.

**Package 01 gate 1 is in tension with a fixed 400 Ã 400 grid.** If the grid is fixed and the frame varies, the cell size varies, so the effective smoothing varies, so identical densities render as different colours at different frame extents â which is what gate 1 forbids. Â§4's heading ("65 pc, on a 400Ã400 field") reads as pinning both. Pin the cell size; let the grid dimension follow.

**Package 03 gates 3 and 4 contradict each other.** Gate 3: 40% of arms carry a tip. Gate 4: the young cohort terminates at a strictly smaller radius than the old, **for every arm**. The evidence for per-cohort termini *is* the narrowing, and the narrowing occurs in 40% of arms. Either gate 4 weakens to a distributional statement, or gate 3's incidence applies only to the tip *shape* while the terminus offset is universal â which is a defensible ruling but is not currently stated anywhere.

**Package 03 gate 4 may have the ordering wrong at the far end.** Survey Â§2 records that gas arms can run *beyond* the stellar OLR because short trailing waves are only partially absorbed in the gaseous component; Sun et al. 2024 now trace CO to 22 kpc. If a gas cohort exists, the ordering is young-H II < old-stellar < gas, and a gate asserting young < old for every arm will pass while the gas cohort is wrong. State the full ordering.

**Package 03 gate 5 tests CÂ¹ and calls it Câ°.** Subtract-and-clip at zero produces a function that is continuous (Câ°) but has a discontinuous derivative. The gate's own text â "no radius has a discontinuous azimuthal derivative" â is the CÂ¹ condition. The prose will be implemented as written; fix the label.

**REID-T2 Â§5 and Â§6 are superseded with no erratum prepended.** Â§5 still lists `armInnerBluntFraction = 0.10` and `armTipFraction = 0.34`; Â§6 gate 4 requires the tip width to fall below 5% of mid-arm. Package 03 deletes the first two and its gate 2 explicitly **fails** a tip that closes to zero. The index tells the agent REID-T2 is the source of record and to read it first. Under the project's own erratum discipline this needs a prepended note, not a silent supersession â the same treatment package 02 correctly received.

---

## 9 â Recommended sequencing change

The index has 01 landing alone and immediately, 02 and 03 as one fork. That still holds, with one addition.

**Package 02 should not proceed on `tracedSpanDeg` as currently specified.** Between the sign correction, Hyland's revision of the normalising arm, the PerseusâSagittarius bifurcation, and the survey-selection objection, the sourced half of the package has moved under it. This is not a reason to abandon it â it is a reason to re-source the extent ordering from an all-sky tracer (Sun et al. 2024 or Hou & Han 2014) before writing code, which is the project's own strict-sequencing rule applied to a spec that has been overtaken.

Package 01 is unaffected by all of this and should still land immediately, with the four gate fixes and the new arm-amplitude gate.

---

## 10 â Verification status of this audit

**Re-derived independently, no external dependency:** the resonance algebra (mpmath, 30 dp); all Î² â R conversions; the width-fit deviations; the per-arm width comparison; the tip statistics and their intervals; the band scale; the palette luminance; the ReylÃ© system density; the plate contrast measurement.

**Read from the article of record or its full text:** Reid et al. 2019 arm equation and azimuth convention (confirmed at IOPscience and against four independent restatements); Hyland et al. 2026 (full arXiv text, Table 3); Sellwood & Masters 2022 (full arXiv text, Â§Â§1â7); Dias et al. 2019 (abstract, including the adopted Râ = 8.3 / Vâ = 240); Junqueira et al. 2015 (abstract and author list, including Vâ = 220 / Râ = 8.0); ReylÃ© et al. 2021/2022 (abstract and body, 339 and 336 systems).

**Located and identified but body not read:** Contopoulos & GrosbÃ¸l 1986 (A&A 155, 11) and 1988 (A&A 197, 83) â identified through five independent citing papers that agree on the content; Sun et al. 2024 (ApJL, `10.3847/2041-8213/ad9605`) â abstract and IOPscience summary only; Xu et al. 2023 (ApJ 947, 54) â abstract only; Hart et al. 2016, Elmegreen et al. 2011, Zibetti et al. 2009, Font et al. 2014, Eilers et al. 2020, Sellwood & Sparke 1988, Jog & Combes 2009 â all read **as reported in Sellwood & Masters 2022**, a review, which under the project's standing rule makes them leads rather than verified numbers.

**Not verified and still owed:** Honig & Reid 2015 against the published article (IOPscience continues to refuse automated access â the bundle's own Â§7 caution stands unchanged); the Junqueira R_c discrepancy in Â§3 above; Leroy et al. 2008 and the XUV-disc papers in Â§5.1; Pohlen & Trujillo's Type I/II/III fractions in Â§6.5.

**Could not be checked from this bundle:** the Îº â Ïâ¥ mapping, because `galaxyModel.ts` is not included. The two anchor values imply a consistent Ïâ¥ = R Ã 0.2096/âÎº at both radii, which is internally coherent and reproduces Reid's fit â but the constant 0.2096 cannot be traced without the source. Worth a look when the code is to hand.
