# galaxyForge â coding agent prompt set, arms bundle R2

**One prompt per issue. Each is self-contained and carries its own ruling.** Paste one at a time. Do not merge P2 or later into P1 â P1 is bump-free and everything after it is not.

**Before anything: P0.** Prompts marked â **cannot start until the owner has recorded a ruling** â the ruling slot is in the prompt and must be filled before it is sent. Sending a â prompt with the slot empty is the handoff gap that produces a repeat identical response.

| # | prompt | class | blocked on |
|---|---|---|---|
| P0 | Orientation and reading order | â | â |
| P1 | Package 01: gate fixes and the arm-amplitude gate | bump-free | â rulings 1, 2, 6 |
| P2 | Extend the canonical units law | governance | â ruling 7 |
| P3 | Sign-convention hardening | gate only | â |
| P4 | Grade corrections and By-law S markers | ledger only | â |
| P5 | Cross-section: resolve the width-gate collision | shape break | â ruling 8 |
| P6 | Tip: resolve the zero-closure contradiction | shape break | â |
| P7 | Inner attachment: bar end or bar corotation | shape break | â ruling 5 |
| P8 | Interarm floor derived from Aâ | shape break | â |
| P9 | `armFactor` signature amendment, channel, diff scope | governance | â |
| P10 | Package 02: re-source the extent ordering | shape break | â rulings 3, 9, 10 |
| P11 | Rebuild the gate set | gates | after P1âP10 |
| P12 | Literature verification obligations | research | â |

---

## P0 â Orientation

> You are picking up the galaxyForge arms work. Read `00-READ-THIS-FIRST.md` before anything else; it is the supersession map and tells you which documents are current and which are archival.
>
> Read in this order: `00-READ-THIS-FIRST.md`, then `PREFLIGHT.md`, then the `current/` document for whichever package you are working on. Each `current/` document begins with its errata and then reproduces the original text unaltered below a marked separator. **The errata win wherever they conflict with the text below them.** Do not read anything in `archive/` â it exists only for the record.
>
> `AUDIT.md` is the reasoning behind the errata. Read it if you want to know why something changed; you do not need it to implement.
>
> The governing law is unchanged and is not up for negotiation: one module per scientific concern, thin stable interfaces, pure and seeded with isolated PRNG channels, provenance headers citing primary literature only, and canonical units stored once and converted only in `units`. Amendment P applies to every shape break: galaxies fork, they never silently regenerate.
>
> Three conventions you will need. Constants carry a ledger grade â `sourced`, `calibrated`, `tunable`, or `derived` â and the grade is load-bearing, not decoration. By-law S constants rest on a contested model and carry a machine-readable re-audit marker. Errors in documents are corrected by prepending errata, never by rewriting; if you find an error in a document, report it, do not edit it.
>
> Do not write code until you have been given a numbered prompt. Reply with a one-paragraph summary of what you understand the current state to be, and list any document you found ambiguous.

---

## P1 â Package 01: gate fixes and the arm-amplitude gate

â **Requires rulings 1, 2 and 6.**

> **RULING 1 â default palette:** `_______________` (`PAL_ASTRO_DARK` or `PAL_TOPO_DARK`; both ship either way)
> **RULING 2 â export plate:** `_______________` (clean, or carrying the sector marker; if the marker survives it must be cyan or magenta, since both ramps are dark at both ends)
> **RULING 6 â plate contrast:** `_______________` (demo artefact, or a real property of the generated field)

> Implement package 01 as specified in `current/01-ISOPHOTE-RENDERER.md`, with the four corrections in its Erratum 1. This package is display-only, Amendment A3 exempt, and **must not bump `genVersion`**. If anything you touch would move a system, stop and report rather than proceeding.
>
> Four changes to the package as originally written:
>
> **Restructure Â§4's constants.** Cell size is the primary constant at 65 pc. Grid dimension is *derived* as `ceil(frameExtent / cellSizePc)` â for a 26 kpc frame that is 400, but 400 is a consequence, not a constant. Smoothing Ï is specified in parsecs and converted to cells at the point of use; it is never defined as "one cell". This ordering is what makes gate 1 (absolute levels invariant under frame extent) hold by construction rather than by accident.
>
> **Rewrite gate 3.** As written â "the smoothing radius is never smaller than one cell width" â it cannot fail, because Ï was defined as one cell. Replace with: altering the frame extent changes the grid dimension while leaving cell size and Ï-in-parsecs unchanged.
>
> **Add gate 01-G10, arm amplitude.** The plate is a hard quantisation into 17 known colours, so band index decodes exactly from the rendered image, and on a Ã2 scale band difference is logâ of arm/interarm contrast. The gate decodes the *rendered plate* â not the field â measures azimuthal band spread at Râ in the old cohort, and asserts it reproduces the model's own Aâ to within 0.15 bands. At the model's sourced Aâ = 0.14 that is 0.41 bands, Ã1.33. `verification/verify_04_plate_contrast.py` is a working reference implementation of the decode; port its approach.
>
> **Fix Â§1's wording.** The plate is a map of *system surface density*, not an isophote map â an isophote is a contour of constant surface brightness, and number density and light are different quantities that differ most in the arms. Â§3's caption is already correct; bring Â§1 into line. No code change.
>
> Also: the solar anchor's provenance obligation is closed. The value is `336 systems / (4/3Â·ÏÂ·10Â³ pcÂ³) = 8.0214 Ã 10â»Â²`, from **ReylÃ© et al. 2022, the first update to the 10 pc sample** â not the 2021 paper, which gives 339 systems. Write that into the header, with three caveats recorded: the count includes brown-dwarf and white-dwarf systems so "system" must be defined; the brown-dwarf census is incomplete so the figure is a lower bound; Poisson error on 336 is Â±5.5%, so three significant figures overstate the precision. `reyle_anchor.py` is no longer blocking.
>
> Deliver: the renderer, all ten gates green under `node verification/run-gates.js`, and a note confirming no generated quantity was touched.

---

## P2 â Extend the canonical units law

â **Requires ruling 7.** Governance change to a sacrosanct document. **Blocks P5âP10.**

> **RULING 7 â canonical units for the angular and density quantities below:** `_______________`

> The canonical units table in the governing instruction covers distance, temperature, luminosity, mass, radius, age, metallicity and orbit. The arms work is the first thing in the project to need quantities it does not cover, and one stored constant currently has a non-canonical unit baked into its own name.
>
> Add a section to the canonical units table for:
>
> | quantity | currently appears as |
> |---|---|
> | azimuth / arc | `tracedSpanDeg`, `armTipArcDeg`, `Î²kink` â degrees in tables, radians in the maths |
> | pitch angle | `pitchOuterDeg`, Ï |
> | angular velocity | `spiralPatternSpeedKmSKpc`, `barPatternSpeedKmSKpc` |
> | surface density | the whole package-01 band scale, systems pcâ»Â² |
> | volume density | the solar anchor, systems pcâ»Â³ |
>
> `spiralPatternSpeedKmSKpc` bakes a non-canonical length unit into the name of a stored quantity, which is exactly what the units law exists to prevent. Either it is stored in a canonical unit and converted in `units`, or `km sâ»Â¹ kpcâ»Â¹` is declared canonical for angular frequency on the same human-readability grounds that chose AU over metres â and the name then stops being a violation and starts being a statement of the canonical unit.
>
> Degrees versus radians needs its own line. The bundle mixes them freely and a sign-convention error has already lived in that seam once.
>
> Implement whatever the ruling says, add the conversions to `units` and nowhere else, and add a gate asserting no module outside `units` holds an angular or density conversion factor. **Do this before naming a single constant in packages 02 or 03** â renaming a stored constant later is a schema break.

---

## P3 â Sign-convention hardening

Not blocked. Bump-free â gates and tests only.

> A sign-convention error in the Reid arm equation has now occurred three times in this project, most recently inside the documents that warn about it. Gate 02-G1 pins the trailing sense in code; nothing pinned it in analysis.
>
> Add two things.
>
> **A structural gate.** For every arm in `ARMS`, R increases with Î¸ in the code's own frame. Reid's published equation is `ln(R/R_kink) = â(Î² â Î²_kink)Â·tan Ï` with Î² zero toward the Sun and **increasing** in the direction of Galactic rotation, so R *decreases* as Î² increases; any counter-clockwise Î¸ frame inverts this and mirrors the galaxy. The gate must fail on a literal transcription of Reid's sign into a counter-clockwise frame.
>
> **A named physical assertion, `assertArmFrameSanity()`.** Evaluate the Perseus arm at Î² = 0 â the point on the arm directly beyond the Sun â and assert it lands within 0.5 kpc of 10.07 kpc. Perseus is roughly 2 kpc beyond the Sun toward the anticentre; the mirrored frame puts it at 7.81 kpc, inside the solar circle. This is the one-line check that would have caught the error. Run it in the gate suite and expose it as a helper so any future Î² â R work can call it.
>
> `verification/verify_01_reid_geometry.py` demonstrates both. Reference values: with the correct sign the traced radii are 3 kpc 3.52â3.53, Norma 3.57â4.46, SctâCen 3.63â5.43, SgrâCar 5.91â6.80, Local 7.56â8.77, Perseus 7.26â10.83, Outer 10.50â12.63 kpc.
>
> Add a comment in the arm module recording that any Î² â R conversion â in code or in a document â is checked against a named arm at a known azimuth before it is trusted.

---

## P4 â Grade corrections and By-law S markers

Not blocked. Ledger and headers only; no behaviour change.

> Six constants are graded above what their sources support. Correct the ledger and the provenance headers. No behaviour changes; this is a truthfulness pass.
>
> | constant | from | to | reason |
> |---|---|---|---|
> | `armTipArcDeg` | sourced | **calibrated (n = 4, one interacting host)** | mean of four arms, 95% CI 19.3â43.2Â°; two of the four are in M 51, a tidally interacting grand design |
> | `armTipWidthRatio` | sourced | **calibrated (n = 4, one interacting host)** | 95% CI 0.44â0.80; sensitive at the 6% level to one contested arm |
> | `armTipProbability` | sourced | **calibrated** | 4 of 10; Jeffreys 95% CI 0.15â0.70 |
> | `armTerminusResonance` | calibrated, By-law S | **calibrated, By-law S, no observational anchor** | the agreement that motivated `OLR_m2` was an artefact of a sign error |
> | `barPatternSpeedKmSKpc` | sourced | **calibrated** | already ruled in Erratum 2.4; published values span ~25â60 |
> | `tracedSpanDeg` (the *inference*) | sourced | **the number is sourced; the inference "coverage = length" is calibrated** | the Î² ranges are northern-hemisphere VLBI coverage, not physical extent |
>
> Record the intervals beside every point value, not just the means.
>
> Then extend the By-law S register. It currently carries `armInnerAttachRadiusPc`, `spiralPatternSpeedKmSKpc` and `armTerminusResonance`. Add the citation that should govern it: **Sellwood & Masters 2022, ARA&A 60, 73** â the current review, and the document that establishes how the mechanism is contested. Record in particular **Font et al. 2014: multiple pattern speeds identified in 28 of 32 barred galaxies.** The single-pattern-speed assumption is not merely contested in theory; it is contradicted in the large majority of observed barred galaxies, and the re-audit obligation should say so.
>
> Also: `ultraharmonic_4_1` stays in the enum. The source pack listed Contopoulos & GrosbÃ¸l as unlocatable and threatened to drop it. It is **A&A 155, 11 (1986)** and **A&A 197, 83 (1988)**. Record both.

---

## P5 â Cross-section: resolve the width-gate collision

â **Requires ruling 8.** Shape break.

> **RULING 8 â how the two-component cross-section and the width gate coexist:** `_______________`
> (option 1: gate 4 measures the core component only â recommended; option 2: the skirt is display-only; option 3: recalibrate the skirt so the composite reproduces the Reid line, narrowing the core below Reid's measured value)
> **AND: is "0.55 amplitude" a peak ratio or an area fraction?** `_______________`

> Package 03 Â§5 specifies a narrow core at Reid's sourced width plus a broad skirt at roughly 3Ã width and 0.55 amplitude. Package 02 gate 4 and REID-T2 gate 6 require Ïâ¥(R) within 3% of 42.6 + 36Â·R. **These cannot both hold.** The composite has Ï_eff = 2.45 Ã Ï_core on the peak reading and 1.96 Ã on the area reading â 145% and 96% over a Â±3% tolerance. It is also 1.7Ã wider than the `width_scale = 1.45` bodge it claims to retire.
>
> `verification/verify_05_crosssection.py` reproduces this. Run it first and confirm you get the same numbers before implementing.
>
> Implement whichever resolution the ruling names, and make the choice explicit in the module header â if gate 4 measures the core only, the header must say that Reid's Ï is the maser-scatter core by construction and that the composite's total width is deliberately larger. Whatever is chosen, remove `width_scale` entirely; it does not survive in any branch.
>
> Also implement the rest of Â§5 as written: multiplicative form on a nonzero floor (see P8 for the floor), no subtract-and-clip anywhere, no level set at any radius.

---

## P6 â Tip: resolve the zero-closure contradiction

Not blocked â the ruling is recommended in the erratum and can be taken as read unless the owner overrides. Shape break.

> Package 03 contradicts itself. Â§1 says a tip requires amplitude and width reaching zero **together**. Gate 2 says a tip closing to zero **fails**. An agent implementing one fails the other.
>
> The source resolves it: Honig & Reid measure the width of the **last fitted segment** â where the data stops, not where the arm stops. So 0.62 is the width *entering* the terminal arc, not the width at the terminus.
>
> Implement: over the terminal `armTipArcDeg` (31Â°, absolute arc, never a fraction of arm length), width falls to ~0.62 of the interior maximum at the start of the arc **and continues to zero at the terminus**, with amplitude reaching zero at the same point. Restate gate 2 to measure at the start of the terminal arc, not at the terminus. Â§1 and gate 2 then measure different points and both hold.
>
> Roll the tip per arm at `armTipProbability`, on its own PRNG channel (see P9). A tip that always closes is as wrong as one that never does.
>
> Loosen gate 3: the source interval on the incidence is 0.15â0.70, so a gate demanding 40% Â± 8% is tighter than the evidence. Use the source interval, and **give the gate a sample size** â "a large seed sample" is not runnable.

---

## P7 â Inner attachment: bar end or bar corotation

â **Requires ruling 5. This is the item most likely to be built wrong, because both answers are written down in documents you are told to read.** Shape break.

> **RULING 5 â arms attach at:** `_______________` (bar end â recommended; or bar corotation R_CR,bar)

> Package 03 Â§4 says arms attach at the **bar end**. Erratum 1 Â§2 and gate 02-G9 say **bar corotation**, and that the two must not be conflated. Nothing bridges them, so whichever document you read first decides what you build. Do not proceed without the ruling.
>
> Context for whichever way it goes. The bar-end answer now has a better-supported basis than the manifold theory package 03 originally invoked: **Sellwood & Sparke 1988** showed that bar and spiral generally have different pattern speeds, and that an apparent connection between spiral and bar end nonetheless persists for a very large fraction of the beat period. The arms look attached whether or not they are dynamically launched from the bar. This survives the Wegg/Lucey bar-length dispute and needs no fast-bar assumption.
>
> Note also that the bar-length dispute is partly definitional and should be recorded as such: Wegg, Gerhard & Portail 2015's 5.0 Â± 0.2 kpc is the **long bar** half-length; the boxy/peanut component is ~2.2 kpc; Lucey et al. 2023's ~3.5 kpc is the maximal extent of **trapped bar orbits**. Three quantities, not one measurement with a 30% spread.
>
> Whatever is chosen: `armInnerBluntFraction` is deleted â it models a taper the literature says does not exist. The arm begins at the attachment radius at **full amplitude**, and gate 6 asserts no ramp there. `armInnerAttachRadiusPc` keeps its By-law S marker in either branch.

---

## P8 â Interarm floor derived from Aâ

Not blocked. Shape break. Do with P5.

> Package 03 Â§5 requires "a multiplicative form on a nonzero interarm floor" and never states the floor. Do not invent one â it is not a free parameter.
>
> For `Î£ = Î£â(1 + Aâ cos 2Ï)`, the interarm level *is* `Î£â(1 â Aâ)`. Floor and amplitude are one quantity seen twice:
>
> ```
> interarmFloor = 1 â Aâ        armPeak = 1 + Aâ
> ```
>
> Implement the floor as **derived** from the cohort's own sourced amplitude â Drimmel & Spergel Aâ = 0.14 for the old cohort â not as a stored constant. This is the same store-the-input, derive-the-output rule Erratum 1 applied to arm extent, and it wires the cross-section directly into package 01's gate 01-G10 instead of letting the two drift. A tunable floor would mean the field's arm contrast is set by a number with no basis while a gate checks it against one that has.
>
> When the generator makes galaxies other than the Milky Way, Aâ should be drawn from the Elmegreen et al. 2011 S4G distribution (0.3â1.3 mag, correlated with `armClass` â grand design higher than flocculent) and then **halved** per Zibetti et al. 2009 to convert photometric contrast to stellar **mass** contrast, which is what a systems-density field needs. Aâ = 0.14 is 0.30 mag, exactly the floor of the S4G range â the Milky Way is a low-contrast spiral in the old population, and that is correct, not a bug.

---

## P9 â `armFactor` signature amendment, PRNG channel, diff scope

Not blocked. Governance plus implementation. Do before P5âP8 land.

> Per-cohort termini require `armFactor` to know the cohort, and it is called from `galaxyModel.ts:533` on the generation path. Amendment A2 ratified the `pickClass(rng, ctx)` signature break as a *deliberate* amendment and required a strict test for future exceptions. This is that exception.
>
> Three things.
>
> **Record a new amendment** â next free letter in the A-series â covering the `armFactor` signature widening. Follow the A2 precedent: state what changed, why the interface could not absorb it, and add the strict test that fails if any *other* interface on the generation path widens without its own amendment.
>
> **Give the tip roll its own PRNG channel.** `armTipProbability` rolls per arm and no channel is named anywhere in the bundle. Under Law 2 it needs an isolated named channel, or it perturbs whatever stream it borrows. Name it consistently with the existing convention.
>
> **Widen the Amendment P diff scope.** Adding a roll shifts every downstream draw on that channel, so the diff must report that **every system moves**, not only those near arm tips. Scoping it to the visible geometry change would understate the fork and mislead the vault refresh. Make the diff say so explicitly in its summary line.

---

## P10 â Package 02: re-source the extent ordering

â **Requires rulings 3, 9 and 10.** Shape break. **Do not code the current `tracedSpanDeg` schema.**

> **RULING 3 â termini scope:** `_______________` (per-arm only, or per-arm **and** per-cohort â package 03 assumes per-cohort)
> **RULING 9 â NormaâOuter:** `_______________` (one arm with `tracedSpanDeg = 136`, or two separate arms)
> **RULING 10 â extent source:** `_______________` (Sun et al. 2024 CO arc lengths, Hou & Han 2014, Drimmel et al. 2025 Cepheids, or retain Reid Î² spans with the selection function documented)

> The sourced half of package 02 has moved under it and the schema should not be built as written. Four things changed:
>
> The radial conversion in REID-T2 Â§3 was in a **mirrored frame** (see P3 and Erratum 3). The relative ordering survives, but nothing that depended on absolute radii does.
>
> **`tracedSpanDeg` encodes a survey selection function.** The Î² ranges are the azimuthal coverage of a predominantly northern-hemisphere VLBI array; Reid's own Table 2 notes quadrant-4 tangencies rely on Bronfman priors because Q4 parallaxes are absent. Arms with more length in Q4 are systematically under-traced. The number is sourced; the inference "coverage = length" is an assumption.
>
> **Azimuth is the wrong axis anyway.** Equal azimuths at different radii are wildly different physical lengths â Norma at 4 kpc and Outer at 12 kpc are not comparable. Arc length is what the ordering was reaching for, and Sun et al. 2024 supply it: 32,162 MWISP molecular clouds, arm segments 16â43 kpc in length, reaching R â 22 kpc.
>
> **Hyland et al. 2026 (ApJ 1004, 209) supersedes the normalising arm.** Perseus lies 0.5â1.0 kpc further out; R_kink 8.87 â 9.29 kpc; Ï< 10.3Â° â 5.9Â°. Perseus is the denominator of every ratio in the schema. The paper's Table 3 and its Â§5.1 disagree slightly on the pitch angles â record which you used.
>
> Larger and unresolved: Xu et al. 2023, supported by Bian et al. 2024 and refined by Hyland et al. 2026, propose that **Perseus and SagittariusâCarina are one arm that bifurcates** on the far side, crossing at Î² â 189â200Â°, R = 5.6 kpc. That is a topological claim, not a parameter revision. Flag it; do not implement it in this pass.
>
> Implement per the rulings. Retain everything from package 02 Â§6 unchanged â the Îº anchors reproduce Reid's Figure 4 fit to +0.5% and â2.6%, and the one-shared-width-relation decision is vindicated. Do not touch it.
>
> Erratum 1's central architectural conclusion also stands regardless of all the above: **store the pattern speed, derive the radius.** `armExtentFillRadiusPc` as a stored quantity is wrong because it duplicates something the rotation curve and pattern speed already determine.
>
> One correction to that chain: `resonanceRatio(2, 0) = 1.7071` is a **flat-curve** number. Eilers et al. 2019 measure Î² â â0.06 at Râ and the decline steepens sharply beyond ~15â19 kpc, precisely where the OLR sits â at Î² = â0.20 the ratio is 1.504, 12% low. Gate 02-G7 correctly pins 1.7071 as pure maths; **nothing on the generation path may call it with Î² = 0 by default.** Evaluate on the model's own curve at the terminus radius.

---

## P11 â Rebuild the gate set

After P1âP10. Gates only.

> The gate sets in packages 01, 02, 03, REID-T2 and the survey overlap, supersede each other, and in four places contradict each other or cannot fail. Consolidate into one numbered set with a single source of truth, runnable by `node verification/run-gates.js` against throwaway stubs that never contaminate the source tree.
>
> Fix these specifically:
>
> - **01-G3** cannot fail as written. Rewrite per P1.
> - **01-G1** is in tension with a fixed 400 Ã 400 grid. Fixed by P1's restructuring; assert it explicitly.
> - **01-G10** is new. Arm amplitude, per P1.
> - **03-G3 and 03-G4 contradict each other.** Gate 3 says 40% of arms carry a tip; gate 4 says the young cohort terminates inside the old *for every arm*. Ruling to implement: the terminus offset is universal, the narrowing tip is rolled at 40%. They then measure different things.
> - **03-G4 may have the far end wrong.** If a gas cohort exists the ordering is young-H II < old-stellar < gas â gas arms run beyond the stellar OLR because short trailing waves are only partially absorbed in the gaseous component, and Sun et al. 2024 trace CO to 22 kpc. Assert the full ordering, not just young < old.
> - **03-G5 tests CÂ¹ and calls it Câ°.** Subtract-and-clip is continuous but has a discontinuous derivative. The gate text is the CÂ¹ condition. Fix the label.
> - **03-G4 needs a cohort boundary.** The two-tier structure exists but where it splits in age is stated nowhere in this bundle. The gate is not runnable without it. Report what the code currently uses.
> - **03-G3 needs a sample size.**
> - **REID-T2 Â§6 gate 4** (terminal width below 5% of mid-arm) is superseded by 03-G2 and must not be carried forward.
> - Add the frame-sanity assertion from P3.
> - Add the units gate from P2.
> - Add the By-law S marker enumeration â the harness must be able to list every constant resting on a contested model.

---

## P12 â Literature verification obligations

Research task, no code. Can run in parallel with anything.

> These are numbers currently in provenance headers or about to enter them that have not been read from a version of record. Under the project's standing rule a number quoted by a later paper is a lead, not a verified number. Promote or downgrade each.
>
> **Blocking â a number depends on it:**
>
> 1. **Honig & Reid 2015, ApJ 800, 53.** Every tip parameter comes from the arXiv preprint; IOPscience refuses automated access. Confirm Tables 2, 3 and 5 against the published article. Note the paper's own internal ambiguity: Â§5.2 refers to "three outliers" and then names four arms.
> 2. **The Junqueira R_c discrepancy.** Junqueira et al. 2015 adopt Vâ = 220 km sâ»Â¹ and Râ = 8.0 kpc, which give a flat-curve corotation of **9.57 kpc**, not the 8.74 kpc the source pack records. Either their rotation curve is materially non-flat there, or 8.74 is a recomputation in a third party's frame. The implied OLR ranges 14.92â16.33 kpc. Read the body.
> 3. **Dias et al. 2019, MNRAS 486, 5726.** Abstract confirmed: Î©_p = 28.2 Â± 2.1, R_c = 8.51 Â± 0.64, adopting Râ = 8.3 and Vâ = 240. Confirm from the body and record the frame.
>
> **Located but not read â confirm before the numbers enter headers:**
>
> 4. Contopoulos & GrosbÃ¸l 1986 (A&A 155, 11) and 1988 (A&A 197, 83) â for the arm-strength criterion that selects the terminus resonance.
> 5. Sun et al. 2024 (ApJL, `10.3847/2041-8213/ad9605`) â arm arc lengths and the 22 kpc extent.
> 6. Xu et al. 2023 (ApJ 947, 54) â the bifurcation and the multiple-arm morphology.
> 7. Hyland et al. 2026 (ApJ 1004, 209) â Table 3; resolve its Table 3 / Â§5.1 discrepancy.
>
> **Read only as reported in a review (Sellwood & Masters 2022) and therefore leads, not sources:** Hart et al. 2016 (arm multiplicity), Elmegreen et al. 2011 (S4G arm contrast), Zibetti et al. 2009 (mass vs light contrast), Font et al. 2014 (28 of 32), Eilers et al. 2020 (kinematic arm amplitude), Sellwood & Sparke 1988 (barâspiral beat period), Jog & Combes 2009 (lopsidedness).
>
> **Do not verify â do not wire:** Kennicutt 1989 and Martin & Kennicutt 2001. The Toomre-Q star-formation threshold is a pre-GALEX picture, overtaken by extended-UV discs (Thilker et al. 2005; Gil de Paz et al. 2005) and by Leroy et al. 2008. Keep the per-cohort ruling, replace the rationale, and do not wire Q as an actual radius.
