# Erratum 1 to `galaxyForge-P13-RESEARCH-2026-08-27.md`

**Prepend to the P13 report; do not rewrite it.** Three papers were supplied as versions of record after the report was cut: Reid et al. 2019 (ApJ 885, 131), Honig & Reid 2015 (ApJ 800, 53) and Font et al. 2014a (ApJS 210, 2). This erratum records what changed. **Cut date: 2026-08-27.**

Three items close. One headline number is struck. Four new traps are logged.

| item | was | now |
|---|---|---|
| 1 — Reid 2019 Table 2 | sourced structure, provisional cells | **sourced throughout** |
| 5 — Honig & Reid tables | not advanced | **closed; tables unchanged from preprint** |
| 8 — the 28-of-32 | unverified | **not in the source. Struck.** |
| 4 — Meidt reference | corrected on one authority | **corrected on three** |

---

## E1.1 — Reid 2019 Table 2 is identical in the published version

Compared cell by cell against arXiv:1910.03357. **Every value in all seven rows and nine columns is unchanged.** The report's §1 conclusion stands without amendment: there are no termination radii, for any arm, and the β range remains defined in the published table note as the range of Galactocentric azimuth *for the parallax data*.

The numeric cells promote from **provisional** to **sourced**. The derived data-extent radii in §1 promote correspondingly to **derived (from sourced inputs)**, including the 12.63 kpc figure carried by Erratum 3 §3.1 of the earlier audit.

Two arXiv rendering artefacts are resolved, and both confirm Table 2 rather than contradicting it. §3.2.1 reads 9°.4 for the Outer arm pitch angle, which the arXiv text had flattened to "94"; §3.2.3 reads ψ = 1°.0 ± 2°.1 for Sagittarius–Carina beyond the kink, which the arXiv had flattened to "10±21". Anything transcribed from the arXiv render should be re-checked for lost decimal points — the same degradation affects the plane-tilt values in §6.

**Erratum 11.2 of the report is confirmed and extended.** Column 3 is — tangency: 337.0, 327.5, 306.1, 285.6 for 3 kpc(N), Norma, Sct–Cen and Sgr–Car, blank for Local, Perseus and Outer. These are *posteriors*. The Bronfman et al. 2000 priors were 337°, 328°, 308° and 283° at ±2°, and prior and posterior differ for three of the four — most for Sgr–Car (283 ≈ 285.6). If any tangency is used downstream, use the posterior.

---

## E1.2 — Honig & Reid 2015: tables unchanged, and both project constants verify exactly

**Tables 2, 3 and 5 are identical to the rendered preprint.** The abstract change is confirmed — the published abstract names NGC 628, NGC 1232, NGC 3184 and NGC 5194 explicitly. The tables did not follow it. Item 5 closes.

**Both project constants reproduce exactly from the published tables.** §5.2 names four arms in which the width trend reverses at the tip: NGC 628 arm B, NGC 1232 arm E, and M51 arms A and B. Taking their terminal segments:

| galaxy | arm | terminal azimuth range | arc | w_term | w_prev | ratio |
|---|---|---|---|---|---|---|
| NGC 628 (M74) | B | 255 ≈ 290 | 35° | 0.59 | 0.87 | 0.678 |
| NGC 1232 | E | −65 — −40 | 25° | 0.14 | 0.24 | 0.583 |
| NGC 5194 (M51) | A | −15 — −40 | 25° | 0.23 | 0.31 | 0.742 |
| NGC 5194 (M51) | B | −305 — −345 | 40° | 0.22 | 0.46 | 0.478 |

Mean arc **31.25°**, range **25–40°**. Mean width ratio **0.6204**. The project's recorded 31° / 25–40° and 0.62 are both exact.

**But grade these as `derived`, not `sourced`.** The paper states neither 31° nor 0.62. They are the project's own reduction of four terminal segments the paper identifies qualitatively. The provisional flag lifts because the *inputs* are now at the version of record; the ledger entry must still read **derived (from sourced inputs)**, with the four-arm sample size recorded, because n = 4 is a thin basis for a distribution and a future reader needs to see that.

**The §5.2 passage is confirmed verbatim in substance.** Honig & Reid attribute the terminal narrowing to arms reaching corotation, infer M51 arm A corotating at −6 kpc and arm B at −9 kpc, and state that two corotation radii in M51 argue against a single global pattern speed, citing Meidt et al. 2008. This is the passage blocking package 02's single-pattern-speed architecture, and it survives at the version of record. Note the section is **§5.2**, not §V.2 — the paper uses Arabic numerals throughout.

### Four traps logged

**The two "two corotations in M51" are not the same two.** Honig & Reid place theirs at −6 and −9 kpc from arm widths. Meidt 2008b places two pattern speeds *inside 4 kpc* from the radial Tremaine–Weinberg method. The radial ranges are disjoint. They agree that a single global pattern fails in M51; they do not agree on which resonances, and citing them as corroborating the same finding would be wrong. Taken together they imply more structure, not confirmation.

**The azimuth conventions are incompatible.** Honig & Reid define β as zero toward the north, increasing east of north. Reid 2019 defines β as zero toward the Sun, increasing in the direction of Galactic rotation. `armTipArcDeg` is safe because arc *lengths* are differences and convention-independent, but any code that mixes a Honig & Reid azimuth with a Reid 2019 azimuth is in the wrong frame.

**Pitch-angle sign encodes winding sense, not leading/trailing.** Tables 2, 3 and 4 carry negative pitch angles for the three counterclockwise-winding galaxies; Table 5 carries positive ones for M51, which winds clockwise. Figure 9 plots the negative of the measured values for the counterclockwise three to put them on a common axis. A sign convention already caused one defect in this project; this is a second instance to log.

**The "5–8 kpc" segment length is not in Honig & Reid.** The paper says –¼5 kpc (abstract), roughly 5–10 kpc as the *fitting choice* for segment length (§3), and –¼5 to 10 kpc for what Milky Way parallax data currently trace (§5.1). Reid 2019 §3 cites Honig & Reid for "5 to 8 kpc". That figure is untraceable to the source and should not be used; quote –¼5 kpc from the abstract, or the 5–10 kpc fitting range with the qualifier that it was a choice, not a measurement.

Two further notes. Honig & Reid's reference list gives Meidt et al. 2008 as **ApJ 688, 224** — a third independent confirmation of the report's §4 correction. And §5.1's Milky Way pitch angles (Scutum 19°.8 ± 3°.1, Sagittarius 7°.3 ± 1°.5, Local 10°.1 ± 2°.7, Perseus 9°.7 ± 1°.5, Outer 14°.9 ± 2°.7) are pre-2019 values from the individual parallax papers and are superseded by Reid 2019 Table 2. If anything in the project quotes them, replace.

---

## E1.3 — The 28-of-32 is not in Font et al. 2014a. Strike it.

The paper is *Interlocking Resonance Patterns in Galaxy Disks*, Font, Beckman, Querejeta, Epinat, James, Blasco-Herrera, Erroz-Ferrer & Pérez, ApJS 210, 2. Sample: 104 galaxies, 100 from GHASP plus four from GHαFaS.

No combination of its numbers yields 28 of 32. The only 32 in the paper is Table 7, the subsample with literature bar lengths, and the claim attached to that table is **32 of 32**, not 28: all values of R = r_CR/r_bar exceed 1 once uncertainties are taken into account. Central values exceed 1 in 29 of the 32. The nearest other tally is 24 of 32 below the conventional fast-bar threshold of 1.4. The 28-of-32 should be struck from the By-law S register rather than chased further; if it originates anywhere it is Font et al. 2014b (MNRAS 444, L85), which is a different paper and a separate obligation.

**The sourced replacement headline.** The interlocking pattern is: given two corotations CR:1 and CR:2 with pattern speeds Ω₁ and Ω₂, the OLR of Ω₁ falls on or close to CR:2 *while* the inner 4:1 resonance of Ω₂ falls on or close to CR:1. The paper notes that only the second half of that coincidence has been predicted, by Rautiainen & Salo 2002; the double coincidence is stated to be absent from the prior literature.

- Found at least once in **74 of 104 galaxies (71.2%)** — once in 42, twice in 26, three times in five, four times in one.
- Excluding eight galaxies at inclination > 70° and four below 25°, where the in-plane residual velocities cannot be measured: **74 of 92 (80.4%)**.
- At least one corotation radius was found in **every galaxy measured**. Resonance peaks per galaxy run from one to seven, mode three, median four, mean 4.2.

Quote the two-thirds-to-four-fifths framing the paper itself uses in §6. Grade: **sourced**.

**One denominator trap.** §6 says the pattern occurs more than once "in over one third of those with the pattern" (32 of 74 = 43%); the Figure 10 caption says "more than once in almost one third of the galaxies in the sample" (32 of 104 = 31%). Both are correct against different denominators. Do not merge them.

**One arithmetic discrepancy, recorded not resolved.** §6 gives the mean of R over Table 7 as 1.35 ± 0.36. Recomputing from the 32 printed cells gives **1.325 ± 0.280**. The mean is within rounding; the scatter is not ≈ 0.28 against a stated 0.36. The paper may be quoting a weighted or otherwise adjusted dispersion. If R is ever used, quote the paper's 1.35 ± 0.36 and carry this note, or use the by-type values, which are given as early (Sa–Sab) 1.15 ± 0.28, intermediate (Sb–Sbc) 1.30 ± 0.30, late (Sc–Sd) 1.35 ± 0.28. The abstract's "mean value of 1.3" is a rounding of the §6 figure.

### Font's Meidt suffixes are crossed, and that is where the "three pattern speeds" comes from

Font's reference list is correct: 2008a = ApJ 676, 899, the method-validation paper; 2008b = ApJ 688, 224, the M51 application. **The body text reverses them.** §1 attributes the method development and simulation testing to 2008b and the M51 application to 2008a; §6 again treats 2008b as the method paper.

This matters because §1 is also where the widely repeated claim originates: Font states that Meidt found *three* pattern speeds associated with three corotation radii in M51. Meidt 2008b's own abstract says **two**, inside 4 kpc. Honig & Reid say two. The three appears to be Font's, asserted through a mislabelled citation, and it has since propagated.

**Ruling for the By-law S register: record two, on Meidt's own abstract, and note that citing papers give three.** The report's §4 warning against writing three into the register on secondhand authority is upheld and now has an identified origin.

### Sellwood & Sparke 1988 gains a second citing witness

Font §1 states that predictions of multiple pattern speeds appeared in the N-body simulations of Sellwood & Sparke 1988, who found bars and spirals in the same galaxies rotating at different pattern speeds — independently matching Sellwood & Masters 2022's characterisation. The reference list gives MNRAS 231, 25 (Font drops the letter-page P; the correct citation is 231, 25P). The 1988 date and the Sellwood-first author order are now confirmed against the Sparke & Sellwood 1987 confusable, which Font does not cite.

The content remains **secondary** — two citing papers agreeing is not the paper. But the reference is now safe to write down.

Font §1 also supplies By-law S context worth carrying: Rautiainen & Salo 1999 derived similar behaviour; Tagger et al. 1987, Sygnet et al. 1988, Patsis et al. 1994 and Masset & Tagger 1997 developed non-linear coupling between bar and spiral modes as an alternative to swing amplification beyond bar corotation.

---

## E1.4 — What remains open

Unchanged from the report's §12 minus the three items closed above, reordered by what is now cheapest:

1. **Lépine 2011b at the version of record** — arXiv:1106.3137, public, needs nothing from Kenny. The conjecture status will not change; the wording should be quoted correctly.
2. **Quillen & Minchev body** — determines whether the citation attaches to `ultraharmonic_4_1` or an ILR member. arXiv astro-ph/0502205 v2 is public.
3. **Contopoulos & Grosbøl 1986/1988 originals** — ADS scan robots-blocked; needs a browser. Would promote the 2–10% criterion and settle the strong/weak scope question against barred hosts.
4. **Sun et al. 2024 body**, **Dias et al. 2019 body** — independent, lower stakes.

Font et al. 2014b is *not* added to this list. The recommendation is to strike the 28-of-32 rather than hunt for it.
