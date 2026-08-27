# galaxyForge — P13 research report: pattern-speed sourcing and outstanding P12 items

**Response to prompt P13.** Companion to `galaxyForge-CITATION-VERIFICATION-2026-08-26.md`; does not reproduce it and does not re-ask any of its eight items. **Cut date: 2026-08-27.**

**Scope note.** This response works from P13's own description of Ruling 11 — the grandDesign/`ARMS` resonance regime and the placeholder Ω_p ≈ 18–20 km s⁻¹ kpc⁻¹ back-derived from V₀/12 kpc on a flat curve. Check §2 and §4 below against the ruling text before acting (superseded by the erratum in `RULING-11-PROPOSAL-pattern-speed-architecture.md`, filed after this report).

| # | item | status |
|---|---|---|
| 1 | Reid 2019 Table 2 per-arm tip radii | **sourced — no such radii exist. Reject that part of the proposal.** |
| 2 | Lépine et al. 2011b | reference half-wrong; the claim is a conjecture, not a measurement |
| 3 | Quillen & Minchev 2005 | **provisional** — number confirmed; genuinely independent; one trap |
| 4 | Meidt et al. 2008 | reference wrong; content confirmed at abstract level and mischaracterised |
| 5 | Honig & Reid published tables | not advanced — IOPscience still refusing |
| 6 | Sun et al. 2024 body | not advanced |
| 7 | Contopoulos & Grosbøl content | still secondary; ADS scan robots-blocked; one useful promotion route found |
| 8 | Font 2014 / Sellwood & Sparke 1988 | references disambiguated; the 28-of-32 could not be located anywhere |
| 9 | Dias et al. 2019 body | not advanced |
| 10 | Junqueira et al. 2015 | not re-attempted — but its Table 4 surfaced incidentally (§10) |

Three corrections to the P12 report and to earlier working are recorded in §11.

---

## 1 — Reid et al. 2019 Table 2: no termination radii exist, for any arm

**Answer: no.** Read from the full table. Table 2's nine columns are: arm, N, ℓ tangency, β range, β_kink, R_kink, ψ<, ψ>, width. There is no termination, tip, or outer-radius column, and the surrounding text offers none.

The β range is explicitly defined in the table note as the range of Galactocentric azimuth **for the parallax data**. That is where the maser sample stops, not where the arm stops. Three independent confirmations, any one sufficient:

- **Adding data moves it.** Hyland et al. 2026 added four new VLBA parallaxes and 3D kinematic distances for 47 candidate Perseus masers, and Perseus's traced extent changed. A measured termination radius cannot move when you observe more sources.
- **Reid extends the arms past it deliberately.** For Sagittarius–Carina, beyond the fourth-quadrant tangency "where we currently have no parallax information", the paper lowers the pitch angle to 10° by hand to match the CO ℓ–v trace of Carina, then extends the arm inward to the bar near (−3, −3) kpc by invoking symmetry with Norma. Perseus is extrapolated inward into the fourth quadrant to an origin near (−3.5, −0.5) kpc. Fig. 10's grey spirals are stated to carry "small adjustments to allow arm segments to connect smoothly beyond the Galactic center." None of that is compatible with β range being physical.
- **The paper's own extent statement is about the data.** §3: "we currently have parallax measurements that trace arms over typically ≲ 12 kpc in length" — offered as the justification for allowing only one kink.

### What Table 2 does imply, if Ruling 11 wants a data-extent radius

Applying the paper's own model, `ln(R/R_kink) = −(β − β_kink) tan ψ`, across each fitted β range:

| arm | β range | R at β_low (kpc) | R at β_high (kpc) | R_kink (kpc) |
|---|---|---|---|---|
| 3-kpc(N) | 15 → 18 | 3.52 | 3.53 | 3.52 |
| Norma | 5 → 54 | 4.44 | 3.57 | 4.46 |
| Sct-Cen | 0 → 104 | 5.43 | 3.63 | 4.91 |
| Sgr-Car | 2 → 97 | 6.80 | 5.91 | 6.04 |
| Local | −8 → 34 | 8.77 | 7.56 | 8.26 |
| Perseus | −23 → 115 | 10.83 | 7.26 | 8.87 |
| Outer | −16 → 71 | 12.63 | 10.50 | 12.24 |

Three consequences:

1. **The outer end is the low-β end, not the high-β end.** Pitch angles are positive and R decreases with increasing β, so the largest radius reached inside the fitted range is always at β_min. Anyone reading "the end of the β range" as the tip will take the wrong end on every arm.
2. **The Outer arm has no tip in this data at all.** Its fitted range runs 12.63 kpc down to 10.50 kpc. It is not monotonic in radius across the kink and terminates nowhere.
3. **Table 2 has seven rows, not five.** Norma and Outer are separate rows even though §3.2.1 argues they are one arm; 3-kpc(N) and Local are also present. P13's framing of "the five arms (Scutum-Centaurus, Sagittarius-Carina, Local, Perseus, Norma-Outer)" does not map onto the table's row structure, and any per-arm loop over Table 2 must decide explicitly what to do with the Norma/Outer split and the 3-kpc row.

**Ruling for Ruling 11.** These are data-extent radii, grade `derived` (from sourced inputs), and must be labelled as such. They are not termination radii and must not be stored in a field named as if they were. **Nothing in Reid 2019 supersedes a resonance-based termination model, because Reid 2019 contains no termination model to supersede it with.**

**Grade.** Table 2's column structure and note text: **sourced** — the published note quoted by IOPscience matches the manuscript note column-for-column. The numeric cell values: read from arXiv:1910.03357, so strictly **provisional**, but with the published column structure confirming the layout, confidence is high. The ApJ version of record is the only remaining step, and it is the same paywall as item 5.

---

## 2 — Lépine et al. 2011b: the reference is half-wrong and the claim is a conjecture

Two different Lépine 2011 papers are in play, and the literature really does call them 2011a and 2011b.

- **2011a** — Lépine, Roman-Lopes, Abraham, Junqueira & Mishurov 2011, MNRAS 414, 1607, *"The spiral structure of the Galaxy revealed by CS sources and evidence for the 4:1 resonance"*, DOI `10.1111/j.1365-2966.2011.18492.x`, arXiv:1010.1790.
- **2011b** — Lépine, Cruz, Scarano Jr., Barros, Dias, Pompéia, Andrievsky, Carraro & Famaey 2011, MNRAS 417, 698–708, *"Overlapping abundance gradients and azimuthal gradients related to the spiral structure of the Galaxy"*, DOI `10.1111/j.1365-2966.2011.19314.x`, arXiv:1106.3137.

P13's reference has the right volume and page and the wrong title. MNRAS 417, 698 is correct; "The spiral structure of the Galaxy revealed by CO/HI overdensities" is not a paper that exists. **Fix the title, keep the numbers.**

**I read 2011a in full, and the claim is not in it.** Its Fig. 6 caption states a single pattern speed of 24 km s⁻¹ kpc⁻¹, corotation at 8.4 kpc, ILR and OLR at 2.5 and 14 kpc, and the 4:1 resonance at 6.2 kpc — **interior to the Sun, not at the solar radius**. §4.1 separately adopts R_c = 8.3 kpc from Dias & Lépine 2005 (R_c = 1.06 ± 0.08 R₀) and the Amôres, Lépine & Mishurov 2009 H I ring gap. §4.6 puts the bar at the same speed, "about 25 km/s/kpc". **There is no outer pattern anywhere in the paper.**

Note two internal inconsistencies for the record: 8.3 kpc (§4.1) versus 8.4 kpc (Fig. 6 caption), and 24 versus 25 km s⁻¹ kpc⁻¹. Both are within the paper's own rounding but should not be quoted as if precise.

**The claim lives in 2011b, and it is a reconciliation conjecture.** Its structure, corroborated by how Martínez-Barbosa et al. (arXiv:1410.2238) reports it: Lépine 2011a placed corotation at the solar radius; Quillen & Minchev 2005 placed the 4:1 inner resonance at the solar radius, which implies corotation near 12 kpc; 2011b suggests multiple patterns to reconcile the two, with the outer m = 2 pattern's corotation "at about 12 kpc" and its 4:1 inner resonance at the Sun. **The support offered is N-body simulation, not observation.**

**There is no Lépine measurement of Ω_p for an outer pattern.** Item 2 as posed has no answer, because the quantity does not exist. The 12 kpc is inherited from Quillen & Minchev via a flat-curve inference — precisely the calculation Ruling 11's placeholder already performs. Replacing the placeholder with "Lépine's value" would be replacing a derived number with the same derived number under a borrowed name.

**The part that is architecturally useful.** The specific claim is that the outer pattern's 4:1 inner resonance coincides with the main pattern's corotation. That is a constraint, and it collapses the model:

```
R_4:1,outer = R_CR,main
on a flat curve   R_4:1/R_CR = 0.6464
⇒ R_CR,outer = R_CR,main / 0.6464 = 1.547 × R_CR,main
⇒ Ω_p,outer  = 0.6464 × Ω_p,main
```

**The two-pattern picture is a one-parameter model, not a two-parameter one.** If Ruling 11 stores inner and outer pattern speeds as independent constants it is storing a derived quantity — the same error Erratum 1 fixed for arm extent. **Store Ω_p,main; derive the outer; mark the coupling constant `derived`.**

**Grade.** The negative result on 2011a: **sourced**. The 2011b content: **secondary** — not read from the version of record in this pass; arXiv:1106.3137 is the cheapest route to closing it. Under no reading can it grade better than conjecture, because there is no measurement inside it to promote.

---

## 3 — Quillen & Minchev 2005: confirmed, independent, and it is the origin rather than corroboration

Quillen, A. C. & Minchev, I. 2005, AJ 130, 576, DOI `10.1086/430885`, *"The Effect of Spiral Structure on the Stellar Velocity Distribution in the Solar Neighborhood"*, arXiv:astro-ph/0502205 (v2, 22 July 2005). Abstract confirmed identical at IOPscience and on arXiv v2.

**The number:** a pattern speed of about 0.66 ± 0.03 times the Sun's angular rotation rate, or 18.1 ± 0.8 km s⁻¹ kpc⁻¹.

**The basis, and it is genuinely independent of Lépine.** Test-particle integration in a disc perturbed by a two-armed spiral. A pattern speed placing the Sun near the 4:1 inner Lindblad resonance produces two families of nearly closed orbits: square-shaped orbits whose peaks lie on and support the two dominant stellar arms, matching Pleiades/Hyades; and a second family 45° out of phase, matching Coma Berenices. The data are the local stellar velocity distribution — Lépine 2011a's data are CS sources, Cepheids and open clusters. Different observable, different method — this is real independent corroboration, and chronologically it is the *origin* of the 12 kpc, with Lépine 2011b the paper reconciling to it.

**Use the ratio, not the absolute value.** 0.66 ± 0.03 is frame-independent; 18.1 ± 0.8 carries Quillen & Minchev's own implied Ω₀ ≈ 27.4 km s⁻¹ kpc⁻¹, which is not any of the frames this project has in play. Ruling 11 should store the ratio and multiply by whichever Ω₀ the adopted rotation frame gives. Under Reid 2019 (R₀ = 8.15, Θ₀ = 236) that is Ω₀ = 28.96 and Ω_p = 19.11 km s⁻¹ kpc⁻¹ — inside P13's stated placeholder band, which is reassuring but is not the same as sourcing it.

**The trap, and it is a real one.** Sellwood 2010 (MNRAS, arXiv:1001.5197 §5.1) reports that in Quillen & Minchev's own model the pattern speed low enough to place the classical ILR near the Sun did *not* reproduce the observed phase-space structure; it was the higher pattern speed placing the Sun near the ultraharmonic (4:1) resonance that created the Hyades-like feature. **"4:1 ILR" in Quillen & Minchev's phrasing means the 4:1 inner resonance, which is not the m = 2 ILR.** If `PatternSpeedModel` has separate enum members for these — and given `ultraharmonic_4_1` already exists in the enum, it does — **this citation attaches to the ultraharmonic member and not to an ILR member.** Getting that wrong silently changes which resonance the whole grandDesign regime is pinned to.

**Context Ruling 11 should carry.** Quillen & Minchev's 18.1 is a minority value. Junqueira et al. 2015 §4.2 notes that Quillen & Minchev 2005 and Siebert et al. 2012 fall below 20 km s⁻¹ kpc⁻¹ and disagree with open-cluster and APOGEE determinations near 23–24 even at ~3 km s⁻¹ kpc⁻¹ error bars, and observes the systematic split: open-cluster birthplaces prefer faster patterns, phase-space substructure and hydrodynamics prefer slower ones. Gerhard's 2011 review is quoted there as giving a range of **Ω_p ≈ 17–30 km s⁻¹ kpc⁻¹**. That spread is the honest uncertainty on this constant and belongs in the By-law S register verbatim.

**Grade.** **Provisional** — abstract read at the version of record, body read only in the arXiv v2. The quantity is in the abstract, so this is close to sourced, but the ILR/ultraharmonic distinction above lives in the body and should be confirmed before the enum member is chosen.

---

## 4 — Meidt et al. 2008: reference wrong, content confirmed, characterisation wrong

**P13's reference is wrong.** The M51 radial-pattern-speed paper is Meidt, Rand, Merrifield, Shetty & Vogel 2008, ApJ 688, 224, DOI `10.1086/591516`, *"Radial Dependence of the Pattern Speed of M51"*, arXiv:0807.1902. **Not ApJ 683, 798.**

There are two Meidt 2008 papers and the literature distinguishes them. 2008a is *"Tests of the Radial Tremaine-Weinberg Method"* (arXiv:0711.4104), a simulation-validation paper; 2008b is the M51 application, ApJ 688, 224. The one Honig & Reid cite, and the one the By-law S register wants, is **2008b**.

**Content, confirmed at abstract level** across IOPscience, ADS and arXiv: the radial Tremaine–Weinberg (TWR) method applied to CO observations, with regularisation to smooth intrinsically noisy solutions, indicates **two distinct pattern speeds inside 4 kpc** at a derived major-axis P.A. of 170°, both ending at corotation and both significantly higher than the conventionally adopted global value. The rotation curve suggests the pattern interior to 2 kpc lacks an ILR, consistent with leading structure seen in HST near-IR imaging.

**The mischaracterisation.** Two things must not go into the register as written.

1. **It is two patterns, not three.** Later papers say three — a 2025 M51 kinematics paper states Meidt "confirmed the prediction of multiplicity, finding three pattern speeds within the disk", and the PAWS paper expects three (bar, main spiral, outer spiral) in the central 9 kpc. **The 2008b abstract says two, inside 4 kpc.** The third is a later extension. If the register says three on Meidt's authority it is wrong.
2. **It is not general radial variation.** The measurement is confined to the inner 4 kpc of one galaxy at one assumed position angle, and is method-dependent — regularisation is doing work, and the paper says so. Recording it as "radial variation of pattern speed in M51" without the inner-4-kpc, two-pattern, both-above-global qualifiers overstates it.

It also carries no Milky Way number. M51 is external. This belongs in the By-law S register as evidence that single-pattern models are inadequate in at least one grand-design galaxy — no more.

**Grade.** **Provisional** — abstract at the version of record via IOPscience and ADS, body unread. Adequate for a register entry provided the entry is worded as above.

---

## 5 — Honig & Reid 2015 published tables: not advanced

IOPscience continues to refuse automated access to ApJ 800, 53. Tables 2, 3 and 5 remain checked only against the rendered preprint. The abstract is still confirmed to have changed between preprint and publication, which is exactly why this obligation is open and why the tables cannot be assumed stable by analogy. Unchanged: **provisional**.

This is now the single highest-value unclosed item in the bundle: it also gates the clean confirmation of item 1's numeric cells (same publisher, same paywall), and Honig & Reid §V.2 is load-bearing against Package 02's single-pattern-speed architecture. Manual retrieval or an institutional login is the only route visible.

---

## 6 — Sun et al. 2024, ApJL: not advanced

32,162 MWISP clouds, arm segments 16–43 kpc, R ≈ 22 kpc, pitch angles 4–12°, models for Perseus, Outer and Outer Scutum–Centaurus — all still abstract-level only. Grade **provisional**. The R ≈ 22 kpc extent is load-bearing for Ruling 10 and should be read before it is used.

---

## 7 — Contopoulos & Grosbøl: references sourced, content still secondary, but the promotion route is now clear

Both references confirmed real, findable and correctly cited:

- **Contopoulos, G. & Grosbøl, P. 1986, A&A 155, 11–23** — *Stellar dynamics of spiral galaxies: nonlinear effects at the 4/1 resonance*
- **Contopoulos, G. & Grosbøl, P. 1988, A&A 197, 83–90** — *Stellar dynamics of spiral galaxies: self-consistent models*

`ultraharmonic_4_1` stays in the enum.

The ADS full-text scan is robots-blocked, so "cheap" turned out to be wrong. `adsabs.harvard.edu/full/1986A&A...155...11C` exists and is indexed but refuses automated retrieval. This one needs a human with a browser.

Two things did improve.

- **The 2–10% figure is restated by Contopoulos himself.** His 2009 review in *Celestial Mechanics and Dynamical Astronomy* (*"Order and chaos in spiral galaxies"*, DOI `10.1007/s10569-008-9181-2`) states that in normal spirals the perturbations are weak, of order 2–10%, and that nonlinear effects in the outer parts of open Sb/Sc spirals produce termination of these spirals near the 4/1 resonance. Same author, restating his own criterion, in a peer-reviewed review — materially better than a third party's citation, though under the project's own rule it is still not the 1986 paper itself.
- **The termination claim has an earlier and blunter statement.** Contopoulos, G. 1985, *Comments on Astrophysics* 11, 1, titled *"Spiral Galaxies End at the 4/1 Resonance"*, predates the 1986 paper and states the result in its title. Worth recording in the source pack even if unread — it establishes priority and it is the citation several later papers actually mean.

**A useful independent restatement of scope.** A 2004 review (arXiv:astro-ph/0402086) reports that Contopoulos & Grosbøl 1986 and 1988 showed the central family of periodic orbits does not support a spiral pattern beyond the 4:1 resonance, which thus determines the pattern's extent, and — the part the project should note — that **weak spirals can extend to corotation on linear theory**. It further reports Grosbøl & Patsis 2001, from deep K-band photometry of 12 galaxies, finding the radial extent of two-armed patterns consistent with the major resonances (ILR, 4:1, corotation, OLR), and that **for barred perturbations the main spiral was better fitted as limited by corotation and the OLR.**

**That last point is a live scope constraint on Ruling 11.** The 4:1 criterion is not universal: it applies to strong spirals, and the strong/weak boundary is what the 2–10% quantification is for. **A barred galaxy — which the Milky Way is — is reported as better fitted by corotation/OLR limiting.** If Ruling 11 applies 4:1 termination unconditionally to `grandDesign`, that is a scope error independent of whether the 2–10% number is right.

**Grade.** References: **sourced**. The strong/weak criterion and the 2–10% quantification: **calibrated (secondary)**, upgraded in confidence by the author's own 2009 review but not promoted. The corotation/OLR alternative for barred hosts: **secondary**, and newly flagged.

---

## 8 — Font and Sellwood & Sparke: references disambiguated, headline number not found

"Font et al. 2014" is ambiguous — there are two, plus an earlier method paper:

- Font, J., Beckman, J. E., Epinat, B., Fathi, K., Gutiérrez, L. & Hernandez, O. 2011, ApJL 741, L14, DOI `10.1088/2041-8205/741/1/L14`, arXiv:1109.5574 — *"Resonant Structure in the Disks of Spiral Galaxies, Using Phase Reversals in Streaming Motions from Two-dimensional Hα Fabry-Pérot Spectroscopy"*. This is the method paper; the technique is now called Font–Beckman.
- Font et al. 2014a, ApJS 210, 2 (Font, Beckman, Querejeta et al.)
- Font et al. 2014b, MNRAS 444, L85 (Font, Beckman, Zaragoza-Cardiel et al.)

A citation to "Font et al. 2014" without a suffix is not resolvable. Ruling 11 must pick one.

**The 28-of-32 could not be located.** Not found in Font 2011, in either 2014 paper's description, or in any citing summary. What the corpus does report instead:

- Font & Beckman across 2011, 2014a and 2014b analysed over 100 galaxies in Hα, and found corotation radii associated with more than one structural component in virtually all cases.
- A separate tally in the Beckman et al. 2018 / Font lineage reads: the pattern found once in 42 galaxies, twice in a further 26, three times in five, four times in at least one.

Neither is 28 of 32. **The 28-of-32 is currently unverified and should not be used as a headline number for the By-law S register until someone locates it.** It may be Sellwood & Masters 2022's compression of one of the above, in which case it is secondary at best and possibly a misreading. **Grade: unverified.**

The defensible headline from this lineage, if one is wanted now, is the "over 100 galaxies, multiple corotations in virtually all cases" claim — but that too is currently secondary and needs Font 2014a read directly.

**Sellwood & Sparke: check the author order and year.** Two adjacent papers exist and are easy to conflate:

- Sparke, L. S. & Sellwood, J. A. 1987, MNRAS 225, 653
- Sellwood, J. A. & Sparke, L. S. 1988, MNRAS 231, 25P

The bar-and-spiral-at-different-pattern-speeds result is the 1988 one, so P13's reference is right, but citing papers in this area frequently cite the 1987 Sparke & Sellwood instead, including in the phase-reversal literature above. If the bar-end attachment ruling rests on this, pin the exact one and record the distinction. **Grade: secondary** — reference structure now clear, content still known only via Sellwood & Masters 2022.

---

## 9 — Dias et al. 2019: not advanced

Unchanged from P12. The abstract states the adopted frame explicitly and R_c = V₀/Ω_p closes cleanly, so this stays a confirmation pass rather than a correction hunt. **Provisional.**

---

## 10 — Junqueira et al. 2015: not re-attempted, but its numbers surfaced

Per the standing P12 recommendation this was not re-attempted. However, its preprint (arXiv:1503.00926, *"A new method for estimating the pattern speed of spiral structure in the Milky Way"*) surfaced while chasing item 3, and its Table 4 reads:

| Ω_p (km s⁻¹ kpc⁻¹) | sample |
|---|---|
| 24.0 ± 1.0 | open clusters |
| 23.3 ± 0.6 | APOGEE |
| 23.0 ± 0.5 | APOGEE + open clusters |

Recorded for completeness only. This does not overturn the P12 recommendation to drop the reference: these are preprint values, the paper is not independent of Dias, and the arithmetic problem P12 identified is unaddressed. But if the recommendation is ever overruled, these are the numbers to check against the version of record (MNRAS 449, 2336), and §4.2 of the same paper is the source of the useful Gerhard 2011 range quoted in §3 above.

---

## 11 — Corrections to prior working

**11.1 — P13's Lépine reference is not wholly wrong.** MNRAS 417, 698 is the correct volume and page for Lépine et al. 2011b. Only the title is wrong. Correct the title, keep the numbers.

**11.2 — The project's record of Reid Table 2's columns is missing one.** The columns have been recorded as arm, N, β range, β_kink, R_kink, ψ<, ψ>, width — eight. The published table has nine; the omitted one is **ℓ tangency** (column 3), which carries the fourth-quadrant tangency posteriors used to constrain the fits where parallaxes are scarce (3-kpc(N) 337.0, Norma 327.5, Sct-Cen 306.1, Sgr-Car 285.6; blank for Local, Perseus and Outer). The priors came from Bronfman et al. 2000 at ±2°. If anything downstream indexes Table 2 by column number, it is off by one from column 3 onward.

**11.3 — Table 2 has seven rows, not five.** See §1. Any per-arm iteration needs an explicit decision on the Norma/Outer split, the 3-kpc row, and Local.

---

## 12 — What is still open, in priority order

1. **Honig & Reid 2015 Tables 2, 3, 5 at the version of record (§5).** Highest value; blocks two things; needs human access.
2. **The 28-of-32 (§8).** Currently unverified and load-bearing for By-law S. Either locate it or replace the headline.
3. **Lépine 2011b at the version of record (§2).** arXiv:1106.3137 is the cheap route; the conjecture status will not change, but the exact wording should be quoted correctly in the register.
4. **Quillen & Minchev body, on resonance identity (§3).** Determines which enum member the citation attaches to.
5. **Contopoulos & Grosbøl 1986/1988 originals (§7).** Robots-blocked; needs a browser. Would promote the 2–10% criterion and settle the strong/weak scope question.
6. **Font 2014a body (§8), Sun et al. 2024 body (§6), Dias et al. 2019 body (§9).** Independent, lower stakes.
