# galaxyForge — citation verification report, arms bundle R2

**Response to prompt P12.** Per-item status against versions of record. **Cut date: 2026-08-26.**

Grading convention used below, matching the project's standing rule: **sourced** = read from the version of record; **provisional** = read from a preprint or an abstract only; **secondary** = known only as reported by a later paper; **unverified** = could not be confirmed at all.

| # | item | status |
|---|---|---|
| 1 | Honig & Reid 2015 | **confirmed** — tables reproduce exactly; ambiguity resolved; **one new blocking finding** |
| 2 | Dias et al. 2019 | **confirmed (abstract), provisional (body)** — and R_c is derived, not measured |
| 3 | Junqueira et al. 2015 | **unverified — worse than reported. Recommend dropping** |
| 4 | Contopoulos & Grosbøl | **references confirmed; content still secondary** |
| 5 | Sun et al. 2024 | **provisional** — not advanced |
| 6 | Xu et al. 2023 | **provisional; attribution error found and corrected** |
| 7 | Hyland et al. 2026 | **discrepancy resolved in favour of Table 3** (high confidence, one caveat) |
| 8 | review-sourced leads | not attempted; still secondary |

---

## 1 — Honig & Reid 2015, ApJ 800, 53 — CONFIRMED

Full text obtained (arXiv 1412.1012, rendered); published abstract read at IOPscience.

### (a) The four narrowing-arm entries reproduce the paper exactly

Checked against Table 2 (NGC 628), Table 3 (NGC 1232) and Table 5 (NGC 5194), segment by segment:

| arm | table | interior segment | terminal segment | arc | ratio |
|---|---|---|---|---|---|
| NGC 628 B | T2 | 195–255°, R = 10.38 ± 0.08, w = 0.87 ± 0.06 | 255–290°, R = 12.02 ± 0.05, w = 0.59 ± 0.04 | 35° | 0.678 |
| NGC 1232 E | T3 | −85–−65°, R = 11.38 ± 0.05, w = 0.24 ± 0.04 | −65–−40°, R = 12.83 ± 0.03, w = 0.14 ± 0.02 | 25° | 0.583 |
| NGC 5194 A | T5 | 30–−15°, R = 6.45 ± 0.04, w = 0.31 ± 0.03 | −15–−40°, R = 6.08 ± 0.04, w = 0.23 ± 0.03 | 25° | 0.742 |
| NGC 5194 B | T5 | −250–−305°, R = 7.05 ± 0.04, w = 0.46 ± 0.03 | −305–−345°, R = 9.72 ± 0.05, w = 0.22 ± 0.03 | 40° | 0.478 |

`armTipArcDeg` = 31.25 and `armTipWidthRatio` = 0.6204 both reproduce. **No transcription error anywhere.**

### (b) The denominator of 10 is confirmed and well-defined

Figure 10's caption: only arms with two or more fitted segments are plotted. Counting those — NGC 628 A, B; NGC 1232 A, B, C, E; NGC 3184 A, B; NGC 5194 A, B — gives exactly **10**. `armTipProbability` = 4/10 is therefore not an arbitrary denominator: it is four narrowing arms out of the ten in which narrowing was detectable.

### (c) The "three outliers" ambiguity — resolved

Â§V.2 first refers to *"the three outliers in the lower-right portion of the figure"*, then two paragraphs later names four arms. Figure 10 plots width against galactocentric radius, so the lower-right corner means large radius and small width. Of the four terminal points, **NGC 5194 A narrows at only 6.08 kpc** and therefore sits mid-plot, not in the lower-right corner. The other three (12.02, 12.83, 9.72 kpc) do.

**"Three outliers" describes the appearance of Figure 10; four arms narrow. There is no contradiction and 4/10 stands.**

The published version resolves this independently: its abstract **names all four arms explicitly** — *"in NGC 628 (M74) arm B, NGC 1232 arm E, and NGC 5194 (M51) arms A and B"* — where the preprint abstract names none and says only that "some arms" reverse the trend. That is a substantive preprint-to-publication change and it should be recorded.

### (d) BLOCKING — Â§V.2 contradicts the architecture the parameters are being used to build

This is the finding that matters most, and it comes from the bundle's own primary source.

Honig & Reid attribute the narrowing primarily to **massive star formation dying out at large galactocentric radii**. They then offer the resonance reading as a secondary possibility and immediately reject it:

> In classical spiral density-wave theory, this narrowing could be attributed to reaching the radius of co-rotation… If so, M 51's arm A co-rotates at a radius of ≈ 6 kpc while arm B co-rotates at a radius of ≈ 9 kpc. The existence of (at least) two co-rotation radii in M 51 would argue against a single (global) pattern speed, consistent with the findings of Meidt et al. 2008.

Two consequences.

**The per-cohort ruling is vindicated by the source.** The star-formation explanation is the one the authors actually advance, which is exactly what survey Â§3 and package 03 use. Good.

**The single-pattern-speed terminus architecture is contradicted by the source.** Package 02 stores one `spiralPatternSpeedKmSKpc` per galaxy and derives every terminus from it. The paper supplying the tip parameters says that in the one galaxy where two arms could be compared, that reading fails. This is a sharper objection than Font et al. 2014's 28-of-32, because it is about the very phenomenon being modelled and it comes from inside the bundle's own citation set.

**Action:** add to the By-law S register alongside Font et al. 2014, and record **Meidt et al. 2008** (radial variation of pattern speed in M 51) as a new citation the bundle does not have.

### (e) Grading caution — `armTipArcDeg` measures the analysis, not the galaxy

Â§III states that arms were re-fit *"with spiral segments of length roughly 5 to 10 kpc"*, with boundaries chosen on three subjective criteria: density or scatter breaks, apparent pitch changes, and keeping comparable sample sizes.

Converting the four terminal arcs to physical lengths: 7.34, 5.60, 2.65, 6.79 kpc — **three of four fall inside the authors' own chosen segment-length window.** The terminal arc is therefore substantially set by where the authors drew segment boundaries, not by where the arm ends.

Degrees are empirically the tighter measure (CV 0.24 against 0.37 for kpc), so choosing `armTipArcDeg` over a physical length was the better of the two options — but neither is a physical tip scale. **This is a stronger reason for the regrade to `calibrated` than the sample size alone.**

Two further riders on NGC 5194 A: its terminal segment has pitch −4.0 ± 4.7°, consistent with zero and the least well-determined pitch in the paper, and its sign has flipped relative to the rest of that arm. It is the weakest of the four entries.

### (f) A caution on an earlier recommendation

Â§V.1 reports **no evidence for a general change in pitch angle with galactocentric distance**, with pitch angles scattered between 10° and 30°. That is a direct caution on audit Â§6.3's suggestion to derive pitch angle from the local rotation-curve slope. The paper cites Grand, Kawata & Cropper 2013 for the shear-pitch relation, then notes that arm segments are short-lived (~0.1 Gyr) and change pitch by ~10° over that time, which would wash out any radial trend. **Keep the coupling as `calibrated` with large scatter; do not implement it as a trend.**

### (g) Residual obligation

The tables above are from the rendered preprint; the published abstract was read directly. The tables themselves have not been confirmed against the published article, IOPscience continuing to refuse automated access. Given that the abstract *did* change between preprint and publication, this is not a formality. **Grade `provisional (tables)` until someone with journal access checks them.**

---

## 2 — Dias et al. 2019, MNRAS 486, 5726 — CONFIRMED at abstract level

R₀ = 8.3 kpc, V₀ = 240 km s⁻¹, Ω_p = 28.2 ± 2.1 km s⁻¹ kpc⁻¹, R_c = 8.51 ± 0.64 kpc, R_c/R₀ = 1.02 ± 0.07 — all confirmed, and the abstract states the adopted frame explicitly.

**Body still not read.** But an arithmetic check makes that less urgent than it looked, and surfaces something the bundle should act on:

```
240 / 28.2 = 8.5106 kpc      the paper states 8.51
(240/28.2)/8.3 = 1.025       the paper states 1.02 ± 0.07
```

**R_c is not an independent measurement. It is Ω_p restated in the adopted frame under a flat rotation curve.** The measured quantity is Ω_p = 28.2 ± 2.1; everything else is derived.

This sharpens Erratum 3 Â§3.4. Importing `R_c = 8.51 kpc` into a model that uses a different V₀ imports a number computed in someone else's frame. **The quantity to import is Ω_p = 28.2, with R_c recomputed in the project's own frame:**

| project V₀ | R_c = V₀/Ω_p | implied m = 2 OLR |
|---|---|---|
| 229 (Eilers) | 8.12 kpc | 13.87 kpc |
| 236 (Reid) | 8.37 kpc | 14.29 kpc |
| 240 (Dias's own) | 8.51 kpc | 14.53 kpc |

A 4.6% spread in V₀ moves the OLR by 0.66 kpc. Worth a line in the provenance header.

---

## 3 — Junqueira et al. 2015, MNRAS 449, 2336 — UNVERIFIED. Recommend dropping.

**Paper located:** Junqueira, Chiappini, Lépine, Minchev & Santiago 2015, MNRAS 449, Issue 3, 2336–2344, DOI `10.1093/mnras/stv464`, *"A new method for estimating the pattern speed of spiral structure in the Milky Way"*.

**Lépine co-authorship confirmed** — Erratum 3 Â§3.3's non-independence finding stands.

**Neither number could be confirmed.** I could not verify Ω_p = 23.0 ± 0.5 or R_c = 8.74 kpc from the paper. Both remain second-hand from Castro-Ginard et al. 2021. This is worse than the prompt assumed: the discrepancy is not between a confirmed pair of numbers, it is between two numbers of which neither has been read from source.

**The arithmetic still does not close.** At the frame recorded in the source pack:

```
220 / 23.0 = 9.5652 kpc      not 8.74
```

To reach 8.74 you would need V₀ = 201.0 km s⁻¹ at that radius, or Ω_p = 25.17 km s⁻¹ kpc⁻¹. Neither matches the recorded pair, so at least one of the three recorded values (Ω_p, R_c, frame) is wrong.

**New context that partly explains the bimodality — and is worth more than the number itself.** The Lépine group's own position is not that corotation is at 8.5 kpc *rather than* 12 kpc. Lépine et al. 2011b propose the Milky Way carries **two** patterns: a main grand-design spiral with corotation near 8.4 kpc, and an outer m = 2 pattern with corotation near 12 kpc whose 4:1 inner resonance falls at the solar radius. Quillen & Minchev 2005 independently place the 4:1 ILR at the Sun, which implies corotation near 12 kpc.

So the two branches may be two real patterns rather than two rival measurements — which is a citable multi-pattern model for the Milky Way, and converges with Honig & Reid's M 51 finding, with Font et al. 2014, and with Sellwood & Masters. Note also that the Junqueira paper itself flags multiple spiral patterns as a possible source of error when fitting a single pattern speed.

**Recommendation: remove Junqueira from the source pack.** It is not independent of Dias, none of its numbers can be confirmed, and its recorded arithmetic is inconsistent. Erratum 3 Â§3.3 already withdrew the "two agreeing methods" claim; this removes the second row entirely. Replace it with Lépine et al. 2011b and Quillen & Minchev 2005 as the **two-pattern** alternative, which is a more honest representation of the same literature.

---

## 4 — Contopoulos & Grosbøl — references confirmed, content still secondary

Both confirmed as real, findable, correctly cited:

- **Contopoulos, G. & Grosbøl, P. 1986, A&A 155, 11–23** — *Stellar dynamics of spiral galaxies: nonlinear effects at the 4/1 resonance*
- **Contopoulos, G. & Grosbøl, P. 1988, A&A 197, 83–90** — *Stellar dynamics of spiral galaxies: self-consistent models*

`ultraharmonic_4_1` stays in the enum. The source pack's threat to drop it is withdrawn.

**The content is not confirmed from the originals.** The strong/weak criterion and the 2–10% quantification are corroborated across five independent citing papers (Patsis et al. 1991, 1994, 1997; Lépine et al. 2011; Junqueira et al. 2013), which is good corroboration but is still secondary under the project's rule. Grade the criterion **calibrated (secondary)** until someone reads them. Both are pre-1990 A&A and available as ADS full-text scans, so this is a cheap obligation to close.

---

## 5 — Sun et al. 2024, ApJL — not advanced

32,162 MWISP clouds, arm segments 16–43 kpc, R ≈ 22 kpc, pitch angles 4–12°, models for Perseus, Outer and Outer Scutum–Centaurus — all still **abstract-level only**. Unchanged. Grade **provisional**; the R ≈ 22 kpc extent is load-bearing for ruling 10 and should be read before it is used.

---

## 6 — Xu et al. 2023, ApJ 947, 54 — attribution error found

The bifurcation claim and the two-inner-arms morphology are confirmed **at abstract level only**.

**The crossing point is misattributed in the bundle.** β ≈ 189–200°, R = 5.6 kpc is **Hyland et al. 2026's** measurement, not Xu's. Xu et al. 2023 propose that Perseus and Sagittarius–Carina originate as one arm; Hyland et al. measure where they cross. Erratum 3 Â§3.5 states this correctly as "refined by Hyland"; anywhere it is compressed to "Xu's crossing point" is wrong.

Note also that Hyland gives **two** crossing points, one per model — the published abstract quotes ≈ 200°, the preprint ≈ 189° (+31/−19). Record which model the figure came from.

---

## 7 — Hyland et al. 2026, ApJ 1004, 209 — DISCREPANCY RESOLVED

**Table 3 is authoritative. Use it.**

| parameter | Table 3 (two-segment) | preprint Â§5.1 |
|---|---|---|
| β_kink | 40° | 40° |
| R_kink | 9.29 ± 0.10 kpc | — |
| ψ< | 5.9 ± 1.2° | 5.8 ± 0.7° |
| ψ> | 10.6 ± 1.0° | 10.3 ± 0.8° |
| width | 0.32 ± 0.04 kpc | — |

The discrepancy is a **preprint artefact corrected at publication**. The published Â§5.1 at IOPscience gives ψ> = 10.6 ± 1.0, matching Table 3, where the arXiv preprint's Â§5.1 gives 10.3 ± 0.8. Prose and table agree in the version of record; they disagree only in the preprint.

**One caveat, stated plainly.** I read the published Â§5.1 through a search-result snippet in which the decimal points had been stripped by the indexer ("ψ> = 106 ± 10"), which reads unambiguously as 10.6 ± 1.0 but is not the same as reading the page. Confidence is high, not certain. Anyone with journal access should confirm in passing. The practical instruction is unaffected: **take Table 3 either way**, since it is the table in both versions.

---

## 8 — Review-sourced items — not attempted

Hart et al. 2016, Elmegreen et al. 2011, Zibetti et al. 2009, Font et al. 2014, Eilers et al. 2020, Sellwood & Sparke 1988 remain **secondary**, known only as reported in Sellwood & Masters 2022. Unchanged.

Two now matter more than they did. **Font et al. 2014** (28 of 32) is the headline number for the By-law S re-audit obligation and should be promoted. **Sellwood & Sparke 1988** is the recommended basis for ruling 5 (bar-end attachment) and is currently a review-quoted result underpinning an owner ruling — that should not stand.

---

## 9 — What this changes in the bundle

**Promote to sourced.** `armTipWidthRatio` and `armTipProbability` transcriptions and the 4/10 denominator are exact. The tables' provenance is confirmed to segment level.

**Keep calibrated, with a better reason.** `armTipArcDeg` is contaminated by the authors' segmentation choice, not merely small-n. Record that in the header.

**Restore.** `ultraharmonic_4_1` — the source pack's threat to drop it is withdrawn.

**Delete.** The Junqueira row. Replace with Lépine et al. 2011b and Quillen & Minchev 2005 as the two-pattern alternative.

**Change what is imported.** Take Ω_p = 28.2 ± 2.1 from Dias and compute R_c in the project's own frame. Do not import R_c = 8.51.

**Add to the By-law S register.** Honig & Reid Â§V.2 — two corotation radii in M 51 — and Meidt et al. 2008. The bundle's own tip source rejects the single-pattern-speed reading of the narrowing it measures.

**Correct.** The Perseus–Sagittarius crossing point is Hyland's, not Xu's.

**Use Table 3.** For the Perseus arm parameters, in both the preprint and the published version.

---

## 10 — Remaining obligations, in priority order

1. **Honig & Reid Tables 2, 3, 5 against the published article.** The abstract changed between preprint and publication, so the tables may have too. Journal access required.
2. **Sun et al. 2024 body** — the R ≈ 22 kpc extent is load-bearing for ruling 10.
3. **Contopoulos & Grosbøl 1986 and 1988** — ADS full-text scans; cheap.
4. **Font et al. 2014 and Sellwood & Sparke 1988** — both now underpin rulings and should not remain review-quoted.
5. **Dias et al. 2019 body** — lower priority than before; the abstract states the frame and the arithmetic closes.
6. **Junqueira et al. 2015** — only if the recommendation to drop it is overruled.
