<!-- galaxyForge arms bundle R2 Â· current document Â· assembled 2026-08-26 Â· original preserved at archive/galaxyForge-HANDOFF-03-ARM-TERMINATION.md -->

# ERRATUM 1 to package 03 â internal contradictions, a broken gate, and new literature

**Prepend to `galaxyForge-HANDOFF-03-ARM-TERMINATION.md` and `galaxyForge-ARM-TERMINATION-SURVEY.md`. Replaces neither.** Raised by the independent audit of 2026-08-26.

**The central rulings of package 03 stand:** per-arm and per-cohort termini, the tip as an absolute arc rather than a fraction, the deletion of the inner taper, the removal of subtract-and-clip, and By-law S scoping of the inner attachment. What follows are contradictions inside the package, one gate that cannot be satisfied alongside package 02, grade corrections, and literature that post-dates or outranks the survey.

---

## 1.1 â The package contradicts itself on whether the tip closes

Â§1: *"A tip requires amplitude and width reaching zero **together**."*

Gate 2: *"terminal width falls to 0.48â0.74 of the interior maximum. **A tip closing to zero fails**."*

An agent implementing Â§1 fails gate 2, and vice versa.

**The source resolves it.** Honig & Reid measure the width of the **last fitted segment** â where the *data* stops, not where the arm stops. 0.62 is therefore the width entering the terminal arc, not the width at the terminus.

**Ruling to adopt unless overridden:** over the terminal `armTipArcDeg` the width falls to ~0.62 of the interior maximum **and continues to zero at the terminus**. Â§1 and gate 2 then measure different points and both hold. Gate 2 is restated to measure at the *start* of the terminal arc.

## 1.2 â The two-component cross-section cannot satisfy package 02's width gate

Â§5 specifies a narrow core at Reid's sourced width plus a broad skirt at *"roughly 3Ã width and 0.55 amplitude"*. Package 02 gate 4 and REID-T2 gate 6 require Ïâ¥(R) within **3%** of 42.6 + 36Â·R.

| reading of "0.55 amplitude" | Ï_eff | vs the Â±3% gate |
|---|---|---|
| peak-amplitude ratio | **2.45 Ã Ï_core** | +145% |
| area fraction | 1.96 Ã Ï_core | +96% |

Both blow the gate by orders of magnitude more than its tolerance. Reproduce with `verification/verify_05_crosssection.py`.

Note also that this is **1.7Ã wider than the `width_scale = 1.45` bodge Â§5 claims to retire.** The fudge factor was not too large; the principled replacement is far larger.

**Three resolutions. One must be chosen; the agent must not pick.**

1. **Gate 4 measures the core component only.** Reid's Ï is maser scatter, which *is* the core, so this is defensible â but it must be written down, because the natural implementation measures the composite.
2. **The skirt is display-only.** It enters the render, not the field `placement` reads. Keeps the field Reid-faithful; costs the multi-tracer argument and splits arm width across two sources of truth, which Law 1 disfavours.
3. **Recalibrate the skirt** so the composite reproduces the Reid line â which narrows the *core* below Reid's measured value.

**Also unspecified:** whether 0.55 is peak or area. They differ by the width ratio. State which.

## 1.3 â The interarm floor is never given, and it is not a free parameter

Â§5 requires *"a multiplicative form on a nonzero interarm floor"* and never states the floor. An agent will invent one.

For Î£ = Î£â(1 + Aâ cos 2Ï), the interarm level **is** Î£â(1 â Aâ). Floor and amplitude are one quantity seen twice:

```
interarm floor = 1 â Aâ        arm peak = 1 + Aâ
```

**Derive the floor from the cohort's own sourced amplitude** â Drimmel & Spergel Aâ = 0.14 for the old cohort. This is the store-the-input rule Erratum 1 applied to arm extent, and it wires the cross-section directly to package 01's new arm-amplitude gate (01-G10) instead of letting the two drift. A tunable floor means the field's contrast is set by a number with no basis while a gate checks it against one that has.

## 1.4 â Gates 3 and 4 contradict each other

Gate 3: 40% of arms carry a tip. Gate 4: the young cohort terminates at a strictly smaller radius than the old, **for every arm**.

The evidence *for* per-cohort termini is the narrowing, and the narrowing occurs in 40% of arms. Either gate 4 weakens to a distributional statement, or the incidence applies only to the tip **shape** while the terminus offset is universal â a defensible ruling, but stated nowhere.

**Recommended:** the terminus offset is universal (young < old for every arm, on the star-formation-threshold argument, which is about where massive stars stop forming and not about whether an arm narrows visibly); the *narrowing tip* is rolled at 40%. Write it down.

**Gate 4 may also have the far end wrong.** Survey Â§2 records that gas arms can run beyond the stellar OLR because short trailing waves are only partially absorbed in the gaseous component; Sun et al. 2024 now trace CO to 22 kpc. If a gas cohort exists the ordering is young-H II < old-stellar < gas, and a gate asserting only young < old will pass while the gas cohort is wrong. State the full ordering.

## 1.5 â Gate 5 tests CÂ¹ and calls it Câ°

Subtract-and-clip at zero produces a function that is continuous (Câ°) but has a discontinuous derivative. The gate's own text â *"no radius has a discontinuous azimuthal derivative"* â is the CÂ¹ condition. The label will be implemented as written. Correct it to **CÂ¹**.

## 1.6 â The inner attachment: two documents, two answers

Package 03 Â§4 says arms attach at the **bar end**. Erratum 1 Â§2 and gate 02-G9 say **bar corotation**, and that the two *"must not be conflated"*. Erratum 1 is prepended to package 02, not 03, so nothing bridged them. **This is the single item in the bundle most likely to be built wrong, because both answers are written down in documents the agent is told to read.**

**A better-supported model gives the bar-end answer without the contested mechanism.** Sellwood & Sparke 1988 showed that bar and spiral generally have *different* pattern speeds, and that an apparent connection between spiral and bar end nonetheless persists for a very large fraction of the beat period. The arms look attached to the bar most of the time whether or not they are dynamically launched from it.

This is more robust than manifold theory, and it dissolves Erratum 2.3's difficulty: that erratum correctly noticed the bar-length dispute makes the fast-bar classification insecure, then told the agent to attach at R_CR,bar and delete the coincidence argument. Under Sellwood & Sparke the coincidence *is* the mechanism.

**Recommendation: attach at the bar end, on Sellwood & Sparke 1988, retaining the By-law S marker.** Survives the bar-length dispute, needs no fast-bar assumption, rests on a result nobody contests. **Owner ruling required either way** â the contradiction cannot be left standing.

One correction to Erratum 2.3 while here: part of the Wegg/Lucey gap is definitional. Wegg, Gerhard & Portail 2015's 5.0 Â± 0.2 kpc is the **long bar** half-length; the boxy/peanut component is ~2.2 kpc; Lucey et al. 2023's ~3.5 kpc is the maximal extent of **trapped bar orbits**. Three quantities, treated as one measurement with a 30% spread.

## 1.7 â The tip parameters are graded above what four arms support

Re-derived from the survey's own table:

| | mean | s.d. | s.e.m. | 95% CI |
|---|---|---|---|---|
| terminal arc | 31.25Â° | 7.50 | 3.75 | **19.3 â 43.2Â°** |
| width ratio | 0.6204 | 0.115 | 0.058 | 0.44 â 0.80 |
| incidence | 0.400 | â | 0.155 | **0.15 â 0.70** (Jeffreys) |

The numbers reproduce exactly; the grading does not follow. Gate 3 requires 40% Â± 8% â **tighter than the source interval**.

Two sample problems. Two of the four narrowing arms are in **NGC 5194 â M 51, a tidally interacting grand design with a companion** â which imports the tidal case into the general one. And NGC 5194 A's "terminal" segment (6.08 kpc) lies *inside* its interior segment (6.45 kpc), the ambiguity the survey honourably flags in its own Â§1. Dropping it moves the arc mean to 33.3Â° and the width ratio to 0.580 â a 6% swing from one contested arm out of four.

**Regrade `armTipArcDeg`, `armTipWidthRatio` and `armTipProbability` to `calibrated (n = 4, one interacting host)`**, record the intervals beside the point values, and loosen gate 3 to the source interval or drop the incidence gate.

**Gate 3 also has no sample size.** "A large seed sample" is not a number and the gate is not runnable without one.

## 1.8 â The cohort split has no numerical boundary

Gate 4 compares young and old cohort termini. The two-tier structure exists; where it splits in age is stated nowhere in this bundle. The gate is not runnable without it.

## 1.9 â `armFactor` gains a cohort argument, which is a signature break

Per-cohort termini require `armFactor` to know the cohort, and it is called from `galaxyModel.ts:533` on the generation path.

**Amendment A2 established the precedent:** `pickClass(rng, ctx)` was ratified as a *deliberate* amendment with a strict test required for future exceptions. This is that exception and needs its own amendment recorded.

Two related items the bundle never specifies:

- **PRNG channel for the tip roll.** `armTipProbability` rolls per arm. No channel is named. Under Law 2 it needs its own, or it perturbs whatever stream it borrows.
- **Diff scope.** Adding a roll shifts every downstream draw on that channel. The Amendment P diff must report that **every system moves**, not only those near arm tips. Scoping it to the visible geometry change would understate it and mislead the vault refresh.

## 1.10 â Literature that post-dates or outranks the survey

**Sellwood & Masters 2022, ARA&A 60, 73** (arXiv 2110.05615). The current review of spiral structure, and the natural By-law S anchor â its absence is the largest citation gap in the bundle, because By-law S rests on "the mechanism is contested" and this is the document that establishes how. It also supplies: arm multiplicity demographics (Hart et al. 2016 â 62% two-arm, 20% three, 6.5% four); armâinterarm contrast (Elmegreen et al. 2011, S4G â 0.3â1.3 mag); the mass-vs-light correction (Zibetti et al. 2009 â stellar mass contrast â half single-band photometric); and **Font et al. 2014, multiple pattern speeds identified in 28 of 32 barred galaxies**, which is the number that should govern By-law S.

**Contopoulos & GrosbÃ¸l is located.** Source pack Â§3 step 3 lists it as *"not located at all"* and threatens to drop `ultraharmonic_4_1`. It is **A&A 155, 11 (1986)** and **A&A 197, 83 (1988)**, confirmed through five independent citing papers. Keep the enum option.

The content is better than the erratum's rendering: 4:1 termination applies to **strong, open** spirals (large pitch, Sb/Sc), where periodic orbits become rectangular and can no longer support the wave. For **weak** spirals the linear theory is recovered and arms reach corotation or the OLR. Contopoulos 2009 quantifies weak as perturbations of order 2â10%.

**The terminus resonance is therefore selected by arm strength, not chosen freely** â the coupling Erratum 1 Â§5 guessed at ("may hold for other `armClass` values") but could not source:

| arm amplitude | Elmegreen class | terminus |
|---|---|---|
| weak (Aâ â² 0.10) | flocculent / Sa-like | corotation or OLR |
| strong / open (Aâ â³ 0.3) | grand design | 4:1 ultraharmonic |

The Milky Way at Aâ â 0.14 sits on the weak branch, so Erratum 1 Â§5's dismissal of 4:1 for the MW is *predicted* by the criterion rather than an exception to it. Disputed by Zhang & Buta 2009, who argue modes generally reach the OLR â By-law S covers it.

**The Toomre-Q star-formation threshold is a pre-GALEX picture.** Â§3 and survey Â§2 rest per-cohort termination on Kennicutt 1989 and Martin & Kennicutt 2001. GALEX found extended-UV discs forming stars well beyond the HÎ± edge (Thilker et al. 2005; Gil de Paz et al. 2005), and Leroy et al. 2008 found Q a poor predictor, with efficiency per free-fall time roughly constant instead. **Keep the ruling, replace the rationale, and do not wire Q as an actual radius** â which survey Â§7 already warned would need direct verification. The answer is that it should not happen.

**D'Onghia et al. 2013 is cited as corroboration by a review that rejects it.** Reid 2019 does cite it for segmentation, so the citation is not wrong â but Sellwood & Carlberg 2021 Â§6 and Sellwood & Masters Â§5.2.2 reject the *mechanism* in detail. The observation of segmentation stands on Honig & Reid's own measurements; cite it there and stop importing an unscoped dispute.

**The rotation curve is not flat where the OLR sits.** `resonance-derivation.py` tests Î² â [â0.10, +0.10] and concludes the formula is not fragile. Within that window it is right. But Eilers et al. 2019 measure Î² â â0.06 at Râ, and Jiao et al. 2023 and Ou et al. 2024 find the decline steepening sharply beyond ~15â19 kpc â precisely where the OLR is placed.

| Î² | R_OLR / R_CR | vs flat |
|---|---|---|
| â0.30 | 1.430 | â16.2% |
| â0.20 | 1.504 | â11.9% |
| â0.10 | 1.595 | â6.6% |
| â0.06 | 1.637 | â4.1% |
| 0.00 | 1.707 | â |

Gate 02-G7 correctly pins `resonanceRatio(2, 0) = 1.7071` as pure maths. **Nothing on the generation path should call it with Î² = 0 by default** â evaluate on the model's own curve at the terminus radius.

## 1.11 â Two structural items the survey flags and should now act on

**Wire the remaining four kinks.** Survey Â§9 open decision 3. The segmentation literature is the strongest single result in the survey, Reid Table 2 supplies values for four of five arms, and they are already sourced. The shipped 12.04â12.43Â° for every arm against an observed 10â30Â° spread is a fidelity gap the kinks partly close at no sourcing cost.

**Arm count is derivable, not rollable.** Swing amplification gives the rotational symmetry of the amplified pattern as **1/f_d â² m â² 2/f_d**, where f_d is the disc contribution to the central attraction â which galaxyForge already holds. This converts arm count from a rolled parameter into a derived one, the same store-the-input move Erratum 1 made for arm extent, and it explains the observed radial trend in multiplicity for free. Hart et al. 2016 gives the marginal distribution for cross-checking.


---

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ORIGINAL DOCUMENT BELOW â REPRODUCED UNALTERED
#
# Nothing below this line has been edited. Where it conflicts
# with the errata above, THE ERRATA WIN. Corrections are
# prepended, never merged into the original text.
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

---

# galaxyForge â package 03: arm termination

**Class: shape break. `genVersion` bumps. Depends on package 02 â land as one fork, not two.** **Cut date:** 2026-08-26.

**Full survey and derivation: `galaxyForge-ARM-TERMINATION-SURVEY.md`.** Source of record for this package. Read it first.

---

## 1 â The two defects

**Arms dissolve rather than closing to a point.** Package 02 gives each arm its own terminus; this package gives that terminus a shape. A tip requires amplitude and width reaching zero *together*. Under the Reid widening they currently diverge.

**The cross-section ends at a hard edge.** Subtracting an interarm floor from a von Mises ridge and clipping at zero plants a discontinuity at the level set where the ridge crosses the floor. That is the visible band edge. Remove the clip entirely.

## 2 â The outer tip is measured

Honig & Reid 2015 (ApJ 800, 53) fitted spirals to *segments* of arms in four face-on spirals, solving for a Gaussian 1Ï width from H II region scatter â the same width definition Reid 2019 uses, so directly comparable. Four arms reverse the widening trend in their final segment.

| constant | value | grade |
|---|---|---|
| `armTipArcDeg` | 31 | **sourced** â mean of four narrowing arms, range 25â40Â° |
| `armTipWidthRatio` | 0.62 | **sourced** â mean, range 0.478â0.742 |
| `armTipProbability` | 0.40 | **sourced** â 4 of 10 multi-segment arms narrow |

**The arc, not a fraction.** It is an absolute angle set by where star formation stops, not a proportion of arm length. Against Reid's traced spans the equivalent fraction would run 0.23 for Perseus to 0.74 for Local. Any parameterisation whose tip scales with arm length is wrong.

**Roll it.** Narrowing occurs in 40% of arms, not all. A tip that always closes is as wrong as one that never does.

## 3 â Termini are per cohort, not just per arm

This is the finding that outranks the tip parameters and it widens the scope. Confirm against ruling 3 in the index before implementing.

The narrowing is measured in **H II regions** â it is the *young* arm that closes, and Honig & Reid attribute it to massive star formation dying out at large radii. That connects to Kennicutt 1989 and Martin & Kennicutt 2001, who find HÎ± profile breaks across nearly all star-forming discs with threshold radii broadly matching the Toomre Q criterion. The old stellar arm need not end there. Gas may run further still, since short trailing waves are only partially absorbed at the OLR in the gaseous component.

So extent belongs at **arm Ã cohort** scope, not galaxy scope. This maps onto the existing two-tier cohort structure and needs no new machinery â only the window moved.

Honig & Reid decline to choose a mechanism. The alternative is corotation, and they note that if so, M 51's arm A corotates near 6 kpc and arm B near 9 kpc â two corotation radii in one galaxy, arguing against a single global pattern speed. Either reading gives the same requirement: per-arm and per-cohort termini.

## 4 â The inner end is an attachment, not a taper

Manifold theory (Romero-GÃ³mez et al. 2006, 2007; Athanassoula et al. 2009a,b, 2010) holds that arms are supported by invariant manifolds emanating from the unstable Lagrangian points L1 and L2 at the ends of the bar. Athanassoula et al. 2010: in barred galaxies without rings and with weak spiral structure, L1/L2 sit where the arm joins the bar.

**Delete `armInnerBluntFraction`.** It models a taper the literature says does not exist. The arm begins at the bar-end radius at full amplitude. That radius is already in the model from Wegg & Gerhard â use it rather than inventing a parameter.

| constant | value | grade |
|---|---|---|
| `armInnerAttachRadiusPc` | = bar end | **calibrated, By-law S** |
| `armInnerBluntFraction` | â | **delete** |

**By-law S applies.** The mechanism is contested and still under active debate â a 2026 A&A paper describes it as ongoing. Competing accounts place the inner boundary differently. This inherits the mandatory re-audit obligation on every future science audit.

## 5 â Cross-section

Replace subtract-and-clip with a multiplicative form on a **nonzero interarm floor**, so the Gaussian wings run smoothly into a dim interarm with no level set anywhere.

Then a **two-component profile**: a narrow core at Reid's sourced width plus a broad skirt at roughly 3Ã width and 0.55 amplitude. Reid's width is the intrinsic scatter in maser locations â one tracer. VallÃ©e's critique argues arm width should encompass dust and star-forming regions as well as aged stars and diffuse CO, and should not be measured from a single tracer.

This **retires the earlier `width_scale = 1.45` bodge**. Rather than widening Reid's arms by a fudge factor, each component now has its own basis: the core is sourced, the skirt is calibrated against the multi-tracer argument.

Reid's own Figure 10 draws arms at 1.65Ï, the width enclosing 80% of sources for a Gaussian perpendicular distribution â the published visualisation is a contour of a Gaussian, not a band.

## 6 â Segmentation: flagged, not implemented

Honig & Reid's headline result is that arms break into ~5 kpc segments joining at kinks with abrupt changes in both pitch angle and width, and that pitch varies 10â30Â° between arms and along them with no systematic trend with radius. Corroborated by D'Onghia et al. 2013, Kendall et al. 2011, DÃ­az-GarcÃ­a et al. 2019, Taylor & Cordes 1993, Hou & Han 2014.

Two consequences, neither in scope here:

- The deferred kink upgrade path (`RkinkPc`, `pitchOuterDeg`, wired for ScutumâCentaurus only) is better motivated than when deferred. Reid Table 2 supplies values for four of five arms.
- The shipped table runs 12.04â12.43Â° for every arm against an observed spread of 10â30Â°. Uniform pitch is a fidelity gap independent of termination.

Both belong in a later package. Recorded here so they are not lost.

## 7 â Verification status

**Honig & Reid 2015 was read from the arXiv preprint.** IOPscience refused automated access. Every number in Â§2 is therefore **provisional** and must be confirmed against the published article before it enters a provenance header. The abstract matches between preprint and the IOPscience landing page, which corroborates but does not verify Tables 2, 3 and 5.

Reid et al. 2019 was read from the published article, as required.

Romero-GÃ³mez 2006, Athanassoula et al. 2010, D'Onghia et al. 2013, Kennicutt 1989 and Martin & Kennicutt 2001 were seen only as cited by other papers. None contributes a number, so that is acceptable for a survey â but Martin & Kennicutt needs direct verification if the Toomre threshold is ever wired as an actual radius rather than a rationale.

**Convention trap.** Honig & Reid 2015 define azimuth as zero toward the north, increasing east of north. Reid et al. 2019 define it as zero toward the Sun, increasing with Galactic rotation, viewed clockwise. Same lead author, four years apart, two frames. Any number moved between them must be reframed, and the pitch sign flips with it.

## 8 â Gates

1. **Tip arc, not fraction.** Terminal narrowing spans 25â40Â° of azimuth regardless of total arm length. A tip whose arc scales with arm length fails.
2. **Tip width ratio.** Where a tip is rolled, terminal width falls to 0.48â0.74 of the interior maximum. A tip closing to zero fails; so does one that does not narrow.
3. **Tip incidence.** Over a large seed sample, 40% Â± 8% of arms carry a tip.
4. **Per-cohort termini.** The young cohort's arm terminates at a strictly smaller radius than the old cohort's, for every arm.
5. **No level set.** The cross-section is Câ° everywhere; no radius has a discontinuous azimuthal derivative.
6. **No inner taper.** Amplitude at the bar-end radius is full, not ramped.
7. **Grade separation.** Nothing on the generation path reads a constant graded `calibrated` without it being declared in the module ledger. This is the gate that keeps `armInnerAttachRadiusPc`'s By-law S status from decaying into assumed fact.
8. **Re-audit flag.** By-law S constants carry a machine-readable marker that the audit harness enumerates.
