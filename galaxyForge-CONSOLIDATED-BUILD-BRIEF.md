# galaxyForge - Consolidated Build Brief

**Assembled 1 August 2026. One document, for one coding agent, to build the plugin.**

> This supersedes the entire `galaxyForge` bundle and the `audited_builds1-3` bundle. It folds together: the governing law (Document A), the build sequence (Document B), the galaxy-morphology work (Document C, Parts 0-9), and the three adopted-improvement builds - `sky`/`remnants`, `conatal`/golden-master/worker, and the activity stamp. Everything in those files is either reproduced here or explicitly marked as superseded.
>
> **Two science-and-maths audits were run over the combined bundle while assembling this document.** Every computed constant was independently re-derived and the load-bearing citations were re-read against their published versions. The morning pass closed two of three outstanding obligations and landed nine corrections; **the afternoon pass closed both remaining source pins, resolved C8, and found a defect the morning pass had missed - the conformance harness could not start on a current machine.** Thirteen corrections in total, collected in S2.4 with a table of exactly where each one landed, and applied in place throughout.
>
> **Read S2.4 before writing any code.** Nine of the thirteen are already in the shipped files or in this document - including the `types.ts` comment defect and the harness - so the first thing to check is which are actually still owed. Four are.
>
> **The owner's rulings on all five open decisions are in S7.** That section is closed; nothing in it awaits a word.

---

## 0. How to read this

| S | contents | who needs it |
|---|---|---|
| 1 | The law - six rules, canonical units, the update procedure | everyone, first |
| 2 | Consolidation audit: what was re-derived, what was re-verified, what changed | everyone, second |
| 3 | **The unified build sequence** - stages 0-12 in dependency order, with morphology and all three builds folded into their stages | the spine; work from this |
| 4 | Galaxy morphology in full - the physics, reference implementations, ledgers | when you reach the morphology stages |
| 5 | The five added concerns - `sky`, `remnants`, `conatal`, the activity stamp, `densityMap`; plus the two-layer notes ruling | when you reach their stages |
| 6 | Verification - conformance gates, golden master, fuzz harness, worker | continuously |
| 7 | Owner decisions - **all five RULED, 1 August**; read the ruling, do not re-litigate | when you hit one |
| 8 | Consolidated source register with verification status | before writing any provenance header |
| 9 | What this document is not | when you are tempted to reorganise a seam |

**The source files ship alongside this document and remain runnable.** `types.ts`, `galaxyModel.ts` and `galacticDensity.ts` are the stage-0 source; `stage0.conformance.ts` holds 35 gates; `verification/run-gates.js` builds throwaway stubs in a disposable `.gate-tmp/` and typechecks under `--strict`. Run it before touching anything:

```bash
node verification/run-gates.js
```

It was run at every stage of this audit: **typecheck clean, 48/48 gates green** - 35 stage-0, 11 `densityMap`, 2 structural. Re-run after every edit to the shipped files, including the C1 comment fix.

### Grade vocabulary, used throughout

`sourced` - read out of a primary paper. `sourced (model)` / `sourced (simulation)` - from peer-reviewed primary literature, but model- or simulation-derived rather than measured. `sourced (form)` - the functional form is classical; the constant is not. `calibrated` - fitted by us against a sourced target. `derived` - computed from other quantities in the pipeline. `tunable` - ours, invented, no source, and the ledger says so.

---

## 1. The law

> **Status: sacrosanct.** This takes precedence over convenience. Any code, spec or table that violates it is wrong, however tidy it looks. If a future change makes this inconvenient, change the code - or amend this deliberately and record why.

**One self-contained module per scientific concern. Each module is the single source of truth for its concern. A change to the science lands in exactly one file.**

When knowledge improves - a new nearby-star catalogue supersedes CNS5, a fresh occurrence-rate paper lands, the habitable-zone model is refined - you replace **one** module and bump `genVersion`. You never hunt for scattered constants, because they only ever live in one place.

**1. Thin, stable interfaces.** The generator asks a module a question and never reaches inside it. `generateCore` calls `stellarPopulation.pickClass(rng, ctx)`; it does not know or care whether the fractions came from CNS5 or something newer. The interface is the contract. The science underneath may be rewritten freely **as long as the interface holds**.

**2. Pure and seeded.** Every module is a pure function: it takes an `rng` and inputs, returns data, holds no state. Each concern draws from its **own PRNG channel**. This is what makes independent versioning real - swapping `planets` cannot perturb the `stars` stream, because they never share a stream. Never `Math.random`; the project uses seeded mulberry32/xmur3.

**3. Provenance travels with the data.** Every module carries a header naming its source and the data's version or date. Replace a module and the citation is replaced with it, so the plugin can always show which science produced any given system - and the clean-room trail documents itself.

**4. Primary sources only.** Tables derive from primary scientific literature and public datasets - never a secondary worldbuilding book, never a wiki, never another author's compiled tables. Where the science runs out (moons, belts, clustering), the module implements *our own* physically-motivated model, which is therefore ours to licence. Convergence with a book on a real-world fact is fine; copying its synthesis is not. This is a copyright and database-rights requirement as much as a scientific one.

**5. Additive-only growth.** Existing interfaces are not broken; new fields are added, `genVersion` is bumped. Amendment A2 (`pickClass(rng, ctx)`) is the project's single sanctioned exception and is not to be extended.

**6. Honest soft-numbers ledgers.** Every constant graded `sourced` / `calibrated` / `tunable` / `derived`, with its basis stated. A number you invented must say so.

### Canonical units

**Every quantity is stored once, in one canonical unit - raw and lossless. Conversion happens only at display, and only inside `units`, which is the sole place a conversion may occur.**

The canonical units are **astronomical, not SI** - chosen for human-readability, which serves the survives-the-plugin rule: `1.0 AU` and `1.0 Rsun` read at a glance in a raw markdown file; `149597871 km` and `696340 km` do not.

| quantity | canonical (stored) | display options |
|---|---|---|
| coordinates x/y/z, R, height | pc (3 dp) | ly, kpc, km |
| distance between systems | pc | ly |
| stellar density (volume) | **systems/pc^3** (S4.1) | stars/pc^3 via `meanStarsPerSystem()` |
| surface (column) density | **systems/pc^2** (S4.6) | systems/ly^2 via `surfaceDensityPc2ToLy2()` |
| stellar temperature | K | degC, degF |
| stellar luminosity | Lsun | W |
| stellar radius | Rsun | km, Rearth |
| stellar mass | Msun | kg |
| galaxy stellar mass | Msun | - |
| apparent / absolute magnitude | mag (V band) | - |
| age | Gyr | Myr, yr |
| metallicity [Fe/H] | dex (log) | linear ratio |
| orbit / semi-major axis | AU | km, pc |
| habitable-zone bounds | AU | km |
| planet radius | Rearth | km, RJup |
| planet mass | Mearth | kg, MJup |
| moon orbital distance | Rp (Amendment A1) | km |
| moon / small-body radius | km | Rearth |
| azimuth / arc / pitch angle | **degrees** (S4.6) | radians, math-only via `degToRad()`, never stored |
| angular velocity (pattern speed) | **km/s/kpc** (S4.6) | - (declared canonical in its literature unit, same human-readability principle as AU over metres; `spiralPatternSpeedKmSKpc`/`barPatternSpeedKmSKpc` name the canonical unit correctly, not a violation) |

"Convert only at display" is not a discipline to remember - it is enforced by there being nowhere else to convert. Every toggle is a call into `units`; no other module holds a conversion factor. The one sanctioned exception is **audited table-definition transcription**: `units` is unavailable when a constant table is being defined, so a published kpc figure is converted by hand once, stored in pc, and **both values placed in the provenance comment** so the conversion is auditable (S4.2).

**S4.6 (Ruling 7, arms bundle R2 Prompt P2, 27 Aug 2026).** The arms work was the first thing in the project to need azimuth, pitch angle, angular velocity, and surface density - four quantities absent from the original table above. Surface density and the angle/radian split were genuine gaps, now closed by `surfaceDensityPc2ToLy2()`/`surfaceDensityLy2ToPc2()` and `degToRad()`/`radToDeg()` in `units.ts`. Angular velocity's canonical unit was a real choice, not a gap: `spiralPatternSpeedKmSKpc` bakes `km/s/kpc` into its own name, which is exactly what this law exists to flag - the ruling is that `km/s/kpc` **is** the canonical unit for angular velocity, on the same grounds already used for AU/Rsun, so the existing name is a correct statement of the canonical unit rather than a violation to fix. Volume density needed no new row - `systems/pc^3` was already canonical (S4.1); this ruling only cross-references the arms-bundle package-01 solar anchor to that existing decision. Gate 6 in `units.conformance.ts` structurally enforces the angle half of this (no other file may hand-roll a `Math.PI / 180` conversion); the density half is already covered by gate 4's existing literal-reuse check, since the new density functions are built from `pcToLy` rather than introducing a new literal.

### When the science improves - the only procedure

1. Rewrite the one module. Keep its interface identical.
2. Update its provenance header (new source, new date or version).
3. Bump `genVersion`.
4. Rows and sheets whose stamped version differs regenerate cleanly on next open.

No other file changes. If a science update ever seems to require touching more than one module plus `genVersion`, that is the signal that a seam is in the wrong place - fix the seam, don't spread the change.

### What "done" looks like

A ten-thousand-system sector regenerates from the values in `Sector.md`. Roughly a third of systems are multiple and none has a planet in a dynamically forbidden orbit. About one Sun-like star in three has a rocky planet in its habitable zone. Earth-analogues hold their atmospheres around G, K and early-M hosts and lose them around mid-to-late M - because two published constants say so, not because anyone tuned a boost factor. White dwarfs appear as primaries at the observed local rate. Clustered structure is uniformly young and chemically real. Every number a user sees is in a canonical unit with a plain-English gloss one hover away, and every number the project isn't sure about says so.

And a user can write three paragraphs about a lost ship in a system note, and no future science update will ever delete them.

---

## 2. Consolidation audit, 1 August 2026

### 2.1 Numbers independently re-derived

Every computed constant in the bundle was recalculated from scratch - not checked against the bundle's own working, but derived independently and then compared. All agree.

| quantity | bundle | re-derived | verdict |
|---|---|---|---|
| Hernquist `k` = R_e/a | 1.815271 | **1.815270960** | agrees to 4e-8 |
| k by a third method (closed-form Sigma(R), Hernquist eq. 32) | - | **1.815270960** | independent confirmation |
| M_proj(k) | 0.500000 | 0.500000000 | exact |
| Hernquist M(<a) | M/4 | 0.250000000 | exact |
| 3D half-mass radius | 2.4142 a | 2.414214 a | exact |
| Juric exp term | 0.4174 | 0.4174 | exact |
| Juric (L_thick/L_thin)^2 | 1.9172 | 1.9172 | exact |
| N_thick/N_thin | 0.2881 | 0.2881 | exact |
| thin : thick number split | 0.7764 : 0.2236 | 0.7764 : 0.2236 | exact |
| ratio with `exp` term dropped | 0.690 -> 40.8 % | 0.6902 -> 40.8 % | exact - the trap is real |
| frame-mixed ratio (R0 = 8178 with Juric's unrescaled L) | 0.2936 | 0.2936 | exact - 1.9 % error |
| 5.77 x log10(11.186) | 6.0509 | 6.0509 | exact - the km/s arithmetic tell holds |
| lambda + 10*sqrt(lambda) at lambda = 500 | 723.6 -> ceil **724** | 723.6068 -> 724 | A3 correct; `floor` would give 723 |
| `exp(-746)` | underflows to 0 | 0.000e+00 (4.941e-324 at 745) | exact |
| `poissonInvCdf(760, 0.5)`, ceiling 1000 | returns 1000 | returns 1000 | the failure mode is real |
| `truncGaussQuantile` reference set (5 values) | see S6.2 | all match | max deviation 3e-10 |
| jitter case, mu=0 sigma=1.5 [-4.5,4.5] u=0.25 | -1.008551 | -1.008551 | agrees to 6e-8 |
| lenticular fractions with halo | 0.4688 / 0.1351 / 0.3267 / 0.0594 / 0.0100 | identical | sum = 1.000000 |
| halo truncation 20-30/50/100 kpc | x1.08 / 1.20 / 1.38 | 1.0845 / 1.2011 / 1.3797 | exact |
| Reyle 336 systems in 10 pc | 8.02e-2 /pc^3 | 8.0214e-2 | exact - and the CNS5 near-coincidence at 7.99e-2 is real |
| Reyle multiplicity from 246/69/19/3/2 | 27.4 +/- 2.3 % of 339 | 27.43 % of 339 | internally checkable, as claimed |
| Reyle companion frequency | 36.5 +/- 3.2 % | 36.6 % | consistent |
| Holberg single-WD density | ~3.6e-3 /pc^3 | 3.552e-3 | exact |
| single WDs in a 10 pc sphere | ~15 +/- 4 | 14.9 | exact |
| McKee / Holberg WD discrepancy | ~1.8x | 1.77x | exact |
| sector radius at 5/10/15 pc thickness | 89 / 63 / 51 pc | 89.1 / 63.0 / 51.4 | exact, and the inversion is real |
| expansion-quarantine chain length | "43-plus" hops | 44-45 | consistent (lower bound) |
| sky gates: Sun at 10 pc / 1 AU, Sirius at 2.64 pc | 4.83 / -26.7 / -1.46 | 4.83 / -26.74 / -1.46 | exact |

**`poissonInvCdf` was also tested as a distribution**, not merely as arithmetic. At lambda = 0.5, 24.4, 120 and 499 over 200 000 draws the realised mean and variance both track lambda to within 0.2 %, and the maximum draw stays far inside `K_MAX`. The guard at `LAMBDA_MAX = 500` sits well clear of the underflow cliff: `exp(-500)` is 7.1e-218, comfortably normal.

### 2.2 Citations re-verified against the published version of record

| source | claim tested | verdict |
|---|---|---|
| **Meni-Gallardo & Palle 2026**, MNRAS 550(1), stag1163 | slope 5.77, zero point -4.35 | **confirmed verbatim.** Equation 1 reads `log10(I_XUV) ~ 5.77 log10(v_esc) - 4.35`; equation 3 builds the ARM on the same pair. Received 3 Mar, accepted 15 Jun, published 22 Jun 2026, CC BY - all as the bundle states |
| - same | five anchors | **confirmed:** Mars, GJ 9827 d, L 98-59 d, GJ 3090 b, Pi Mensae c |
| - same | 55 Cnc e excluded yet on the line | **confirmed**, including the statement that the relation does not change whether it is used or not |
| - same | Solar-System gate incl. Pluto's failure | **confirmed:** Titan and Eris on the line; Europa, Callisto, Ganymede, Haumea, Triton in the non-retention region; Pluto explicitly irreconcilable with Mars-as-boundary under any simple shoreline |
| - same | origin of the rogue 5.89 | **confirmed:** the paper itself cites Berta-Thompson, Wachiraphan & Murray 2025 for a slope of 5.9 (+0.61/-0.43) from a probabilistic 3D framework - a real but non-competing construction with no -4.49 zero point |
| **Lian et al. 2025**, ApJL 990, L37 | 31.563 +/- 2.813(syst.) +/- 0.024(stoch.) Msun/pc^2; 25.074 living / 6.489 remnants; APOGEE 43.218 | **confirmed.** Audit amendment A4 is correct: the +/-0.024 belongs to the surface density |
| **Bovy 2016**, ApJ 817, 49 | element-banded [Fe/H] limits | **confirmed and obligation closed** - see S2.3 |
| **Kamdar et al. 2019**, ApJL 884, L42 | "high-mass" retracted between preprint and published | **confirmed** - see S2.3 |
| **Holberg et al. 2016**, MNRAS 462, 2295 | 4.8 +/- 0.5e-3 pc^-3; 74 % single | **confirmed verbatim**, along with 232 stars in the 25 pc sample and the 68 % / 86 % completeness figures the ledger quotes |
| **Reyle et al. 2021**, A&A 650, A201 | reference form | **confirmed** - appears in Meni-Gallardo's own reference list in exactly the form the bundle pins |

**Second pass, 1 August afternoon - the two remaining pins, and one rejection strengthened.**

| source | claim tested | verdict |
|---|---|---|
| **Terzic & Graham 2005**, MNRAS 362, 197 | Hernquist inadequate at low Sersic index | **PIN CLOSED.** Abstract confirms the framing verbatim. The finer n >~ 4 / low-n / Prugniel-Simien statements S4.5 quotes appear word-for-word in **Terzic & Sprague 2007**, MNRAS 377, 855 S4.1 - the same author restating his own result. **Sample is eight ellipticals** (NGC 1379 at n = 2.0 as the low-n case); record that scope beside the mass-floor ruling |
| **MacArthur, Courteau & Holtzman 2003**, ApJ 582, 689 | <r_e/h> = 0.22 +/- 0.09 | **PIN CLOSED - and the number does not check what it was being used to check.** Confirmed in the abstract, but the sample is 121 **late-type spirals** and the ratio *rises* to ~0.24 for earlier types. See C12 |
| **Kamdar et al. 2019**, ApJL 884, L42 | delta-v threshold: 1.5 or 2 km/s | **RESOLVED - both, in the same abstract, measuring different things.** See C8. Also confirms the "high-mass" retraction: the published text says clusters following the overall cluster mass function |
| **Gonzalez-Payo et al. 2026**, MNRAS 549, 1, stag838 | 10 pc multiplicity | **confirmed and adopted.** 215 objects in 92 systems (68/19/3/2) from 424 stars and brown dwarfs; MF 26.2 %, CSF 0.350; internally checkable at 92/351 = 26.21 %. Closes the C10 edition seam |
| the *Acta Prima Aprilia* shoreline paper | does it contain 5.89 / -4.49? | **no - its own coefficients are 6.04 / -5.35 and 4.02 / -3.21.** The rejected pair is not even the joke paper's numbers. See S2.5 |

### 2.3 Outstanding obligations - two of three closed, the third now runnable

**CLOSED - Bovy's per-element table.** The bundle recorded that the checking agent read Bovy's element-banded limits from the arXiv v2 abstract rather than the version of record, and required confirmation before `conatal`'s header was finalised. The published ApJ abstract (doi:10.3847/0004-637X/817/1/49) carries the bands explicitly: **< 0.01 (0.02) dex for C and Fe**, ~0.015 (0.03) for N, O, Mg, Si, Ni, ~0.02 (0.03) for Al, Ca, Mn, and ~0.03 (0.05) for Na, S, K, Ti, V, at 68 % and 95 % confidence. Iron's 95 % bound is therefore **0.02 dex**, exactly where C.0.1 sets sigma_intra, and the 0.03 that misled the earlier draft is the loosest band's 68 % figure. The abstract of the version of record is sufficient; no table lookup is needed. Also confirmed: 49 giants across M67, NGC 6819 and NGC 2420, and the ~6 Myr formation window inferred from C and O.

**CLOSED, with a location correction - Lian's 3.55e10 alternative.** Audit note A4 asked for "a one-line Table 2 check" before this figure entered a ledger. It is in the paper, but **not in Table 2** - it sits in the S3.2 discussion, phrased as the total the inconsistency implies if the higher APOGEE local density is adopted. Table 2 holds something different and more useful - the half-mass radius and integral mass per object type. Correct the pointer; the figure may now be recorded as a caveat, and it carries no error bars.

**STILL OPEN, but now runnable - the restricted Reyle anchor query.** It remains the one genuinely unexecuted item; it needs a browser or a VO client and could not be run from any audit environment so far. **It does not block any stage** - it refines a normalisation constant - but it must be run, and **recorded with the service version and retrieval date beside the result**, before the spiral's anchor is called final.

**The query as previously written would not have run** (correction C13). It named the table `tenpc` and pointed at the *cone-search* resource; the count needs ADQL against the **TAP** endpoint, where the table is `tenpc.main`. Corrected:

```sql
SELECT COUNT(DISTINCT nb_sys) AS nsys
FROM tenpc.main WHERE obj_cat IN ('*', 'LM')
```

against `https://dc.g-vo.org/tap` (TOPCAT -> TAP, or `pyvo.dal.TAPService`). Run the unrestricted `COUNT(DISTINCT nb_sys)` in the same session and record both: the ratio of the two is the hydrogen-burning restriction factor, and it is the number a future re-anchor actually needs.

### 2.4 Corrections that must land

Thirteen. C1-C9 are from the 1 August morning pass; **C10-C13 were added by the second pass that afternoon**, which closed the two remaining source pins and found one defect the morning pass had missed entirely. C1 and C11 were live defects and are now applied in the shipped files; C2 and C10 are traps of the same class; the rest are ledger-accuracy items.

**C1 - APPLIED.** `types.ts`'s `conatalGroupId` doc comment described the design the owner rejected (a chance-alignment branch the Build 2 realism ruling deleted). Replaced with the realism-ruling text, verbatim, in the shipped `types.ts`. Gates re-run green after the edit.

**C2 - the 2.6 kpc coincidence.** Three disc scale lengths sit at 2.1-2.6 kpc and two are numerically identical while measuring different quantities: **2600 pc** is Juric's **number**-density scale length (correct for galaxyForge, which stores systems); **2.6 kpc** is Bland-Hawthorn & Gerhard's **luminosity** scale length; **2.1 kpc** is Lian's **mass** scale length. Nothing is currently wrong in the code, but write the quantity beside the number in every scale-length ledger row - number, light or mass - and never substitute one for another because the figures agree.

**C3 - Lian's total-mass stochastic error is internally inconsistent in the paper itself:** abstract 0.085e10, S3.2/summary 0.148e10, Table 2 0.11e10 Msun. Nothing consumes the total mass. Record the three-way disagreement.

**C4 - Pointer fix:** the 3.55e10 figure is in Lian S3.2, not Table 2.

**C5 - APPLIED.** Lian supplies a second sourced remnant decomposition, now in the `remnants` ledger (S5.2): local WD 4.31, NS 0.66, BH 1.51 Msun/pc^2; galaxy-wide 0.412/0.056/0.13e10 Msun; half-mass radii 3.62/3.97/3.96 kpc.

**C6 - the Upsilon tolerance spread is 13-20 %, not "roughly 17 per cent"** (ReylE density over McKee's 0.043 aggregate gives ~1.865; over the visible-star band 0.036-0.038 gives 2.11-2.23). The whole range exceeds the gate's +/-10 % tolerance either way.

**C7 - the 3D-half-mass trap needs a direction.** Substituting 2.4142a for 1.8153a makes every derived scale radius **24.8 % too small** (reciprocal framing +33 %). Write the direction, not just the magnitude, into the ledger row.

**C8 - RESOLVED, a trap not a discrepancy.** Kamdar's published abstract carries both: the *simulation* prediction envelope is dv < 1.5 km/s, the *observational* criterion is dv < 2 km/s AND d[Fe/H] < 0.05 dex. Write both into the `conatal` header with the quantity beside each. galaxyForge consumes neither directly; it consumes the < 1 Gyr coherence window.

**C9 - trivial.** Pass, Charbonneau & Vanderburg 2025 is ApJL 986, L3, not ApJ.

**C10 - the two consumers of the 10 pc catalogue were reading DIFFERENT EDITIONS, and the register merged them into one row.** Density anchor: 336 systems (Reyle 2022, a Cool Stars 21 proceeding). Multiplicity: 246/69/19/3/2 = 339 systems (Reyle 2021, refereed A&A). Full resolution in S4.1: multiplicity now comes from Gonzalez-Payo et al. 2026, a refereed re-derivation from the same living catalogue, so both consumers sit on one edition.

**C11 - APPLIED.** The conformance harness could not start on a clean machine (`--moduleResolution node10 --ignoreDeprecations 6.0` is valid in exactly one TypeScript major), and its root-finding assumed a nested layout the bundle shipped flat. Both fixed in the shipped `verification/run-gates.js`: no fragile flags, root found by looking for the files, local `typescript` preferred with an exact pinned network fallback, compiler version printed with results. Verified green under TypeScript 5.9.3, 6.0.3 and 7.0.2.

**C12 - MacArthur is not measuring the population it is being used to check.** Its 0.22 +/- 0.09 sample is 121 late-type spirals, whose ratio *rises* toward earlier types (extrapolated to an S0 it would sit at >~0.24, not 0.22). The agreement with Laurikainen's S0 median 0.20 is where the trend happens to pass, not two methods converging. Keep the row, scope it.

**C13 - the S2.3 anchor query would not have run** (wrong table name, wrong endpoint kind). Corrected in S2.3 and S4.1.

#### Where every correction landed

| # | subject | status | lands in |
|---|---|---|---|
| C1 | `conatalGroupId` doc comment | **applied** | shipped `types.ts`; gates re-run green |
| C2 | 2.6 kpc - number vs light vs mass | applied | S2.4, S4.9 call-out, S8 register rows |
| C3 | Lian total-mass stochastic error, three-way | applied | S2.4; caveat-level, nothing consumes it |
| C4 | Lian 3.55e10 is S3.2, not Table 2 | applied | S2.3, S8 register |
| C5 | Lian WD/NS/BH decomposition | **applied** | S5.2 source table, call-out **and** ledger row |
| C6 | Upsilon tolerance is a 13-20 % range | applied | S4.3 call-out |
| C7 | 3D-half-mass trap needs a direction | applied | S4.2 gate note; -24.8 % in `a` is the framing that matters |
| C8 | Kamdar velocity threshold | **resolved** | S2.4; both figures, both meanings, into the `conatal` header |
| C9 | Pass et al. is ApJL | applied | S8 register |
| C10 | 10 pc catalogue-edition seam | **applied** | S4.1 rewritten; S8 register split into three rows |
| C11 | gate harness toolchain + layout | **applied** | shipped `verification/run-gates.js`, `package.json`; S6.1 |
| C12 | MacArthur scoping | applied | S4.6 ledger row, S8 register |
| C13 | anchor query table name and endpoint | applied | S2.3, S4.1 |

**Still owed, and none of it blocks a stage:** run the restricted anchor query (S2.3) and record it with service version and retrieval date; write both Kamdar thresholds into the `conatal` header when it is finalised (C8); attribute the NS scale height to McKee S4.3 rather than quoting Sartore directly; and re-cut the golden master after the stage-10 bump.

### 2.5 Rejections that stand, and why they are recorded rather than deleted

**The 5.89 / -4.49 shoreline pair. Rejected, and now located.** Source is an April Fools' submission (*Acta Prima Aprilia*) whose extragalactic sample is drawn from Wookieepedia and whose anchor planet is Kamino. Its own coefficients are 6.04 / -5.35 and 4.02 / -3.21 - **neither is 5.89 / -4.49.** The rejected pair is a corruption of a corruption. The likely seed of the slope is Berta-Thompson et al. 2025's genuine 5.9 (+0.61/-0.43), cited approvingly by the real Meni-Gallardo paper, carrying no zero point and not competing with equation 1.

**Reyle's "28 per cent".** Preprint abstract says "around 28 %"; published A&A abstract says "around 27 %" (27.4 +/- 2.3 in text). The reviewer was reading the preprint.

**The alleged fused quotation in the elliptical gradient section.** Both the -0.54 to +0.2 spread and the no-mass-correlation finding are Koleva's, from the same abstract; the attribution was sound. The real defect was presenting one side of a live disagreement (vs Spolaor 2009) as settled - fixed by scoping.

**The pattern across all: read the published version.** Preprint and published abstracts differ on Reyle's multiplicity, Kamdar's cluster-mass claim, and Meni-Gallardo's anchor set. Cite the version of record, always.

---

## 3. The unified build sequence

**The whole programme is one `genVersion` bump.** Every science change below alters output, so bumping per stage would force ten regenerations of a sector for no benefit. Bump once, at stage 10, after the pipeline is coherent. `genVersion` has not been bumped yet; nothing generates, so there is nothing to invalidate - but the first stage that produces output must set it.

### 3.0 Read this before stage 0

**`types.ts` supersedes every earlier contract.** Where any prior spec disagrees with the canonical file, the canonical file wins - including where it disagrees with the `planets` v2 spec, which placed the planet taxonomies in `types.ts` before the closed-taxonomy ruling moved them into `planets.ts`.

**Two dead shapes to ignore.** The terraforming handover's `Planet.atmosphere` / `Planet.biosphere` decorations are superseded by index-aligned arrays on `SystemCore`. Its `agent` field is superseded by `agentRef`.

**The index-alignment invariant is load-bearing and silent when broken.** Every per-planet array on `SystemCore` has exactly `planets.length` entries. `null` at position i means "evaluated for planets[i], does not apply" - never "skipped". Write the assertion at stage 1 and let it run in every test thereafter.

**The galaxy-morphology hand-off prompt describing three traps, a `starFormationHistory()` addition and four stub morphologies is entirely superseded.** Do not work from it.

### 3.1 Dependency graph

```
0 -- 1 -- 2 -- 3          strict chain (morphology Part 0 lands WITH stages 0/2/3)
     |
     +-- 4  (stellarHistory + activity stamp)
     |    +-- 5  (multiplicity + rollGeometry + promotion)
     |         +-- 6  (planets v2)
     |              +-- 7  (belts, moons)          } parallel
     |              +-- 8  (atmosphere, surfaceT)  }
     |                   +-- 9  (biosphere, terraforming, habitability, humanHabitability)
     |
     +-- sky            any time after 1; view wired at 11
     |
     +-- morphology Parts 1-3, 8-9   need 1 (msLifetimeGyr) and 5 (meanStarsPerSystem)
              +-- sampler (8.3/8.4/8.5)
                   +-- remnants        needs sampler + 5
                   +-- conatal         needs sampler + age/metallicity machinery
                                             |
                                            10  -- genVersion bump, golden-master fixture cut
                                             +-- 11 (render, vault)   } parallel
                                             +-- 12 (glossary)        }
```

The elliptical and lenticular normalisation gates **cannot close until stage 5 lands**, because Upsilon consumes `meanStarsPerSystem()`. Plan for that rather than discovering it.

### Stage 0 - Types and shared infrastructure

No behaviour. Everything else compiles against this.

Land `types.ts`. Declare each taxonomy **in its owning module** and re-export through `types.ts` per the closed-taxonomies ruling - `CloudClass` in `atmosphere.ts`, `PlanetClass` in `planets.ts`, `ActivityClass` in `stellarHistory.ts`, `SkySource` in `sky.ts`, and so on. Add `assertNever`. Confirm `mathStats.ts` and `formationRank.ts` are untouched.

**`export type` alone is not enough.** It re-exports a name without bringing it into scope, so `SystemContext.population: PopulationKey` still fails to resolve (verified: `tsc --strict` reports TS2304 with the re-export line alone). Both lines are required:

```ts
export type { GalaxyModelName, Population, PopulationKey } from './galaxyModel';
import type { GalaxyModelName, PopulationKey } from './galaxyModel';
```

**Gate:** the project compiles with every module stubbed. No stage advances past a red build.

### Stage 1 - `stellarProperties`

First, because three later stages import from it and it has no dependencies of its own.

Add `msLifetimeGyr(massSol, feh)` interpolating the MIST grid (Choi et al. 2016, ApJ 823:102) and `representativeMass(class)`. Delete the Hansen & Kawaler power law and its citation. Pin the grid version in the header. Confirm `colourBV` is exposed on `Star`.

**Additionally, from Build 1:** add `absMagV(class)` - one new accessor onto the Mamajek sequence already in this module, no new provenance - and widen `StarKind` with `'neutron-star' | 'black-hole'` (`'white-dwarf'` already exists for promoted companions).

**Gates:** tau_MS for a metal-poor 0.8 Msun star is shorter than for a solar-metallicity one of the same mass. `absMagV` returns 4.83 for the Sun's class.

### Stage 2 - `age`

Delete the `msLifetimeGyr` cap from `rollAge`, and delete `cohortConflict` with it.

**`age` becomes morphology-blind.** It keeps all sampling machinery - inverse-CDF, `truncGaussQuantile`, the `formationRank` coupling at `AMR_RHO`, deterministic per-system draw counts - and stops owning a cohort table entirely. It reads `ageMeanGyr`, `ageSigmaGyr` and `ageGyr` from whichever `Population` was selected. **The earlier instruction to export `COHORTS` for stage 3 to import is VOID.** The table migrates into the spiral model as its population list, and Xiang & Rix 2022 migrates with it.

**Do not use a uniform draw.** `ageGyr` is a truncation interval, not a range to sample flat.

**Gate:** the age histogram has no spikes. A sharp peak at 1.77, 5.19 or 10.0 Gyr means the cap survived somewhere.

### Stage 3 - `stellarPopulation`

Import `msLifetimeGyr` from `stellarProperties`. Compute birth fractions once at module load by dividing survivorship out of the CNS5 observed fractions; draw class conditional on `ctx.age`.

`pickClass(rng)` becomes `pickClass(rng, ctx)`. **This is Amendment A2, the only sanctioned break of Law 5 in the project.** Copy the comment block onto the function verbatim.

**Do not import a cohort table from `age`.** The de-convolution baseline is a property of the *catalogue* (CNS5), not of the generated galaxy: recovering birth fractions requires the **local** star-formation history, frozen as a private constant inside `stellarPopulation` with its own citation. Generating an elliptical does not change what the Milky Way's solar neighbourhood looks like.

**Gates:** integrating P(class | age) over the age distribution recovers CNS5 within 3 % for M, K and G. Errors of 12-25 % for O, B and A are expected and documented. The halo cohort produces K and M primaries only.

### Stage 4 - `stellarHistory`, including the activity stamp

New module, channel `rotation:{starIndex}`. Ship the analytic model; the Johnstone 2021 track table is the named upgrade path.

**The activity stamp (Build 3) is part of this stage, not a module of its own** - the Rossby number it classifies is already this module's output, and Law 1 says a concern is not split across files. Classify once, at the source:

```
Ro = presentPeriodDays / tauConvectiveDays

activityClass = 'flare-active'  if Ro < RO_SAT    (0.13 - sourced, Wright et al. 2011)
                'moderate'      if Ro < RO_QUIET  (0.45 - tunable)
                'quiet'         otherwise
```

`'flare-active'` is the physically meaningful boundary: the saturated regime, log L_X/L_bol ~ -3, frequent flaring. The `moderate`/`quiet` boundary is consumer convenience with no sharp physics underneath - `tunable`. Remnants (`luminositySol <= 0`) classify `'quiet'` by definition.

The classification consumes **no draws** and adds **no channel**. Consumers read the one field: `biosphere`, `render`, and `atmosphere` for flavour only - its physics stays on `xuvFluenceRel`.

**Gates:** solar rotation at 4.6 Gyr near 25 d; tau_c near 14.5 d for the Sun and 87 d for an M5; `xuvFluenceRel` exactly 1.0 for the Sun at 1 AU at 4.6 Gyr. The Sun classifies `'quiet'`; a young (< 1 Gyr) M5 classifies `'flare-active'`. **Consistency invariant:** any star with `ctx.age < saturatedUntilGyr` is `'flare-active'`.

### Stage 5 - `multiplicity`

Purely additive: `rollStarCount`, `multipleFraction` and `meanStarsPerSystem` are untouched. Add `rollGeometry` on the new `'companions'` channel, the Holman & Wiegert polynomials, and birth-mass promotion so a dead original primary leaves a white-dwarf companion.

**Then fix the deconvolution.** The primary-class deconvolution has a flat mass ratio baked in. Point it at `multiplicity`'s actual companion distribution instead. If `meanStarsPerSystem()` no longer lands near 1.407 (now 1.350, per S4.1's C10 resolution), **that is a real finding, not a rounding error - stop and report it rather than tuning it back.**

**Gates:** `stars.length === 1 + geometry.orbits.length` always. `StellarOrbit` carries no mass, class or luminosity.

**This stage unblocks Upsilon.** The elliptical and lenticular normalisation gates can now close.

### Stage 6 - `planets` v2

The largest single piece. Radial-zone architecture, Muller 2024 mass-radius with scatter, physics-first envelope, class and subclass stamped at draw time, mutual-Hill merging, `formationIndex`, `formationAu`. Apply the `multiplicity` amendment in the same pass, not afterwards.

**Gates:** eta-earth for G primaries 0.30-0.40; Zone A occurrence ~1.07 for FGK, ~2.5 for M; giant-hosting ~7 % at solar [Fe/H] rising to ~21 % at +0.4 dex; bimodal radius histogram with a valley near 1.7-1.8 Rearth; **no planet between `aStypeMaxAu` and `aPtypeMinAu`**; circumbinary innermost median a/a_crit ~1.25.

### Stage 7 - `belts` and `moons`

`belts`: broken SFD (Bottke 2005); `zone === 'C'`; composition from testing mid-radius against `snowLineAu`; use `formationAu` for swept-belt tests. Late Heavy Bombardment lives here as a stored flag and depletion factor - not in `planets`.

`moons`: prograde 0.40 R_H (Rosario-Franco 2020), retrograde 0.70 (Quarles 2021), Domingos eccentricity terms restored. Composition from `formationAu`.

**Gates:** N(>100 km) ~220 and N(>200 km) ~26 for a main-belt-mass belt; integrated belt mass within a factor of two of 2.4e21 kg.

### Stage 8 - `atmosphere` and `surfaceTemperature`

Delete `xuvBoost(class)`, `ageFactor(age)` and `SHORE_C`. Implement the Meni-Gallardo & Palle ARM.

> **VERIFIED TWICE AGAINST THE PUBLISHED PAPER. The constants stand.**
> **Meni-Gallardo & Palle 2026, MNRAS 550(1), stag1163, doi:10.1093/mnras/stag1163.** Equation 1: `log10(I_XUV) ~ 5.77 log10(v_esc) - 4.35`, and equation 3 builds the ARM on the same pair:
>
> `ARM = 5.77 log10(v_esc) - log10(I_XUV) - 4.35`
>
> Anchor set: Mars plus GJ 9827 d, L 98-59 d, GJ 3090 b and Pi Mensae c. 55 Cnc e deliberately excluded, falls on the line anyway. **Cite the published article, never the arXiv preprint** - the preprint describes a superseded anchor set.
>
> **Do not use 5.89 / -4.49 from any source** - an April Fools' paper (see S2.5).

**The one trap in the whole programme:** `v_esc` must be in **km/s**: `11.186 * sqrt(Msun/Rsun)`. The dimensionless form shifts every verdict by 6.05 dex. Arithmetic tell: `5.77 * log10(11.186) = 6.0509`.

**Gate - run the Solar System.** Eleven of twelve bodies classify correctly, Mars and Titan within +/-0.15 dex of zero, **Pluto failing**. A model that gets Pluto right has been fitted and is wrong.

**Seams note:** `ctx.age` semantics originate in the galaxy model (S4.2), and for a conatal member the age originates in the group draw (S5.3). Record both.

### Stage 9 - `biosphere`, `terraforming`, `habitability`, `humanHabitability`

`biosphere`: replace the private M-dwarf flare penalty with **`activityClass`** - one field. Leave the seam: `realisedComposition` is not final, because `terraforming` will read and further modify it.

`terraforming`: procedural placement gated on `terraformability`, own channel, `agentRef` unset on procedural placements. **The provenance header must open by declaring the module authored fiction, not science.**

`habitability`: **delete `isHumanHabitable`.** GHZ becomes a deterministic stored score, purely geometric.

`humanHabitability`: sole owner of the term. The sector-centring habitability dropdown (S4.8) is generated from **this module's tier taxonomy**, never a parallel list.

**Gates:** grep for `isHumanHabitable` - one definition, or the stage isn't done. Grep for Rossby-number computation - exactly one, in `stellarHistory`.

### Stage 10 - `genVersion` bump

One bump, here, for the whole programme. **Cut the first golden-master fixture here** (S6.3) - a fixture cut earlier would enshrine pre-bump behaviour nobody intends to keep.

### Stage 11 - `render` and `vault`

Amendment A3 exempts these from provenance headers and ledgers, but not from thin interfaces or single-source. `render` is the only module that emits markdown; `units` the only one that converts.

`render` owns the two views (S4.8) and must draw arms and bar from the same geometry functions the density field uses. **Every displayed distance is true 3D from stored coordinates, never map distance.** The sky view must be labelled the **sector** sky (S5.1).

**Gate - the one that protects users.** Write a system note, hand-edit inside the fence, regenerate. The edit must survive and the block must be marked `EDITED`.

### Stage 12 - Glossary build

Each science module exports `glossary: GlossaryEntry[]` beside its provenance header. `status` is not optional - the honesty callout is the thing no other worldbuilding tool does.

---

## 4. Galaxy morphology

Four morphologies ship in v1: `spiral`, `barredSpiral`, `elliptical`, `lenticular`. **`irregular` is not authorised** - it is not in the morphology union. If you think it worth proposing, put a paragraph in your hand-back note and leave it to the owner.

Land S4.1-4.3 entire and get a green build before starting S4.4.

### 4.1 The canonical density unit is systems, not stars

`densityAt` and `densityByPopulation` return **stellar systems per cubic parsec**. Not stars. The generator places systems; `multiplicity` decides how many stars each holds. A systems count is stable under the dominant source of ongoing revision in nearby-star astronomy: a new spectroscopic companion increments the star count and leaves the system count untouched.

**No stars-per-cubic-parsec constant is stored anywhere, ever.** If a gate or display needs one, it is systems * `multiplicity.meanStarsPerSystem()`, computed live.

**Consequence for the anchor.** CNS5's local stellar density cannot be converted cleanly to systems: completeness is assessed at component level; ~5 % of the total are white dwarfs/giants `stellarPopulation` can never draw as a primary; and only visual companions are counted, with spectroscopic ones deferred. Dividing CNS5's stellar density by `meanStarsPerSystem()` double-discounts and generates a systematically too-sparse sector.

**Re-anchor on the 10 pc sample.** Three things carry that name:

| edition | content | status |
|---|---|---|
| **Reyle et al. 2021**, A&A 650, A201 | 540 objects in **339** systems; multiplicity ~27 % | **refereed A&A - the citable anchor** |
| **Reyle et al. 2022** (arXiv:2302.02810) | 541 objects in **336** systems | a Cool Stars 21 proceeding, NOT refereed |
| the **living list** at `gruze.org/10pc` / VizieR / GAVO | revised continuously | a dataset, needs a retrieval date |

> **THE EDITION IS PART OF THE NUMBER (C10).** The density anchor previously took 336, multiplicity took 339, from two different editions in adjacent ledger rows. **Write the edition beside every number taken from this catalogue.**

**Multiplicity now comes from a refereed 2026 analysis of this same catalogue, closing the seam.** **Gonzalez-Payo, Caballero, Cifuentes, Cortes-Contreras & Rica 2026**, MNRAS 549, 1, stag838 (arXiv:2605.04094): from 424 stars and brown dwarfs, 215 in 92 systems (68 double, 19 triple, 3 quadruple, 2 quintuple), 259 single - 351 systems total.

| quantity | value | note |
|---|---|---|
| multiplicity fraction, all primaries | **MF = 26.2 (+4.8/-4.3) %** | 92/351 = 26.21 %, internally checkable |
| companion star fraction, all | **CSF = 0.350 (+0.051/-0.048)** | **`meanStarsPerSystem()` = 1 + CSF = 1.350** |
| M-dwarf primaries only | MF = 29.2 (+6.6/-5.8) %, CSF = 0.371 (+0.068/-0.064) | WD-component systems excluded |

| M_initial [Msun] | MF [%] | CSF |
|---|---|---|
| 3.6 - 0.50 | 41 (+11/-10) | 0.63 (+0.10/-0.11) |
| 0.50 - 0.25 | 31.8 (+10.5/-8.9) | 0.41 (+0.11/-0.10) |
| 0.25 - 0.10 | 25.3 (+10.0/-8.0) | 0.310 (+0.104/-0.088) |
| 0.10 - 0.010 | 9.3 (+7.4/-4.3) | 0.093 (+0.074/-0.043) |

**Three consequences.** First, the old 27.4 +/- 2.3 % is superseded for `multiplicity` but kept in the ledger with its edition stamped. Second, the ReylE companion frequency 36.5 +/- 3.2 % and CSF 0.350 are the same kind of quantity and must not both be carried - CSF wins. Third, Gaia DR4 caveats travel with the numbers. Grade `sourced`, note the completeness assumption, treat as **living**.

**Restrict the count to systems containing at least one hydrogen-burning star.** Derive the exclusion from the catalogue; do not estimate it. `obj_cat` maps exactly onto "hydrogen-burning": `*` and `LM` burn hydrogen; `WD`, `BD`, `Planet` do not.

```sql
-- ADQL, against the TAP endpoint https://dc.g-vo.org/tap
-- C13: the table is tenpc.main, not tenpc.
SELECT COUNT(DISTINCT nb_sys) AS nsys
FROM tenpc.main WHERE obj_cat IN ('*', 'LM')
```

**This query is still unexecuted** (S2.3). It blocks no stage.

> **THE NEAR-COINCIDENCE WARNING, and it must reach the code.** 336 systems in a 10 pc sphere is **8.02e-2 systems pc^-3**, almost identical to CNS5's **7.99e-2 *stars* pc^-3**. This is coincidence. **Do not let 8.02e-2 reach the code as a working value**; it exists solely to document the trap. The working anchor is strictly *below* 336 after the hydrogen-burning restriction.

**CNS5 keeps two jobs and loses one.** It remains the source for observed class fractions (a *shape*, unaffected by normalisation), and becomes an independent cross-check on the total, where disagreement is information rather than error.

### 4.2 The seam work

`Population` gains nine fields (S4.2 of the seam list below); `nLocal` is redocumented, not renamed (a rename is an unsanctioned Law 5 break). `GalaxyModel` gains nothing - no `starFormationHistory()`.

**Two separate splits.** `stellarPopulation` freezes the local de-convolution weighting as a private constant. `metallicity` keeps its sampling machinery and reads `fehMeanDex` / `fehSigmaDex` / `fehGradient` / `fehGradientForm` from the selected population. The galaxy model owns the *parameters*; the science modules own the *machinery*.

**The two gradient forms are genuinely different, not two coefficients.** Disc (Willett/APOGEE) is linear in radius, dex/kpc. Early-type spheroid is logarithmic, dex/decade:

```
linear:      feh(r) = fehMeanDex + fehGradient * (r - fehGradientRefPc)
logarithmic: feh(r) = fehMeanDex + fehGradient * log10(r / fehGradientRefPc)
```

**The logarithmic form needs an inner clamp**, the exact mirror of `CORE_FLOOR_PC`: as r -> 0, log10(r/ref) -> -inf, so with a negative coefficient [Fe/H] diverges to +inf. Clamp at the innermost radius Kuntschner's maps calibrate; grade `tunable`.

**Population keys: five frozen, the rest prefixed.**

```
spiral / barredSpiral:  youngThin, midThin, oldThin, thick, halo     [FROZEN]
elliptical:             ellipticalInSitu, ellipticalAccreted
lenticular:             lenticularThinDisc, lenticularThickDisc,
                        lenticularPseudoBulge, lenticularClassicalBulge,
                        lenticularHalo
```

New keys are morphology-prefixed camelCase, never a colon. `DensityByPopulation` is partial by contract; keys present are exactly `populations.map(p => p.key)`.

**`CHANNELS` gains one placement entry, not two:** `placement: 'placement'` covers spatial placement and population assignment together, per cell. There is no `population` channel anywhere in the project.

**Galaxy configuration joins the reproducibility tuple.** `SectorRecipe.galaxyConfigHash` covers `model`, `galaxyMassSol`, `barEnabled`, `lenticularBulgeType`, and `thicknessPc` (cells span the full slab, so lambda scales with thickness). `radiusPc` and `footprintShape` are NOT hashed - widening the footprint only admits more systems, never moves an existing one. The hash is a **staleness stamp only**, never a PRNG seed input.

**The `theta` convention: galactocentric azimuth, zero at the Sun's azimuth, increasing with the direction of galactic rotation.** Wegg & Gerhard's 27deg is the bar's angle *to the line of sight*, not a galactocentric azimuth - pin the sign against Wegg's own figure convention.

**The halo/bar bug - fix before implementing the bar.** The naive `densityAt` multiplies the WHOLE sum (halo included) by `barFactor`. Apply the bar to disc and bulge terms only; a bar is a disc instability, not a halo feature.

**`mathStats.ts` stays frozen.** No `lnGamma` / incomplete gamma for v1 - Hernquist is analytic and closed-form. Prugniel-Simien is the named upgrade path for when a general Sersic index is needed.

### 4.3 Upsilon - the mass-to-systems conversion

`elliptical` and the lenticular bulge normalise by total stellar mass, converting mass to a countable systems density via **Upsilon** (systems per Msun), composed from three existing modules: the Kroupa IMF (`stellarPopulation`), `msLifetimeGyr` (`stellarProperties`, to determine which classes survive at the population's age), and `meanStarsPerSystem()` (`multiplicity`).

`N = M / <m>_Kroupa` is wrong by a large factor - the IMF mean is not the present-day mean; a 12 Gyr population has substantial mass in remnants and returned ISM.

**Owner: `galacticDensity`**, deriving Upsilon rather than defining it, keeping the three source modules unaware of it.

**Upsilon is evaluated per population, not once per galaxy.** Expose `upsilonFor(population)`, evaluated at that population's `ageMeanGyr` and `fehMeanDex`. Essential for the lenticular's differently-aged components and the accreted halo.

**The remnants convention is defined here, not inherited, because Shen doesn't say.** Shimizu & Inoue 2014 find the three current stellar-mass definitions (living; living+remnants; living+remnants+returned gas) spread by a factor of two, mostly unstated in the literature. **Ruling: Upsilon is systems per solar mass of *living* stars**, derived against McKee's visible stars and Lian's living stars.

**The magnitude was understated where it matters most.** "10-20 %" (McKee 15.4 %, Lian 20.6 %) is fine for the solar neighbourhood but too small for an old spheroid: Shimizu & Inoue find **30-40 %** for a 10 Gyr population (Chabrier-like), ~30 % as the z=0 average. Left unconverted at 30 %, Upsilon is wrong by **+43 %**; at 40 %, by **+67 %**. The correction belongs in `upsilonFor(pop)`, evaluated at the population's age alongside everything else.

**The gate that proves Upsilon is real.** Compute Upsilon for the solar-neighbourhood SFH and check it reproduces the Reyle systems density from the local stellar mass density.

**McKee, Parravano & Hollenbach 2015**, ApJ 814, 13: visible stars 27.0 +/- 2.7 Msun/pc^2; white dwarfs 4.9 +/- 0.6; brown dwarfs ~1.2; stars+remnants 33.4 +/- 3. **Corroborated by Lian, Wang, Feng, Huang & Guo 2025**, ApJL 990, L37: 31.563 +/- 2.813(syst.) +/- 0.024(stoch.) Msun/pc^2, of which 25.074 living, 6.489 remnants. Component by component: 25.074 vs 27.0 +/- 2.7; 6.489 vs 4.9 +/- 0.6; 31.563 vs 33.4 +/- 3.

**These two fix the living-star fraction:** McKee 27.0/(27.0+4.9) = **0.846**; Lian 25.074/31.563 = **0.794**. Take **0.79-0.85** as the `sourced` local value.

> **THE GATE'S DIVISOR IS THE VISIBLE-STAR MIDPLANE ENTRY, NEVER THE 0.043 AGGREGATE (C6).** ReylE over 0.043 gives Upsilon ~1.87; over the visible-star component gives ~2.1-2.2 - a spread of **13-20 %** against a stated tolerance of ten.

Sanity check: Upsilon should land near 2 systems per solar mass. Agreement within ~10 % means the chain is sound; a factor-level disagreement means a unit error somewhere.

### 4.4 `spiral` and `barredSpiral`

One implementation, one flag. **Setting the flag off must reproduce `spiral` bit-identically.**

| source | governs |
|---|---|
| Juric et al. 2008, ApJ 673, 864 | disc scale lengths/heights, halo power law |
| Bovy et al. 2012 | disc structure cross-check |
| Reyle et al. 2021, 2022 | local systems density anchor |
| Golovin et al. 2023 (CNS5), A&A 670, A19 | independent total cross-check only |
| GRAVITY Collaboration 2019, A&A 625, L10 | R0 = 8178 +/- 13 stat. +/- 22 sys. pc |
| Xiang & Rix 2022 | disc cohort age structure |
| Wegg & Gerhard 2013, MNRAS 435, 1874 | bar density shape |
| Wegg, Gerhard & Portail 2015, MNRAS 450, 4050 | bar half-length, position angle, scale heights |
| Portail et al. 2017 | pattern speed - **deliberately not used** (static field cannot consume it) |

**The bar is a single structure** - Wegg 2015: the long bar is the extension of the boxy/peanut bulge, one unified structure, not two misaligned components.

Density shape (Wegg & Gerhard 2013): axis ratios 10 : 6.3 : 2.6, exponential scalelengths 0.70 : 0.44 : 0.18 kpc. Half-length (Wegg 2015): 5.0 +/- 0.2 kpc (4.6 +/- 0.3 thin component), angle to line of sight 28-33deg.

```ts
// Wegg & Gerhard 2013: scalelengths 0.70 : 0.44 : 0.18 kpc
const BAR_SCALE_PC = { x: 700, y: 440, z: 180 };   // = 0.70, 0.44, 0.18 kpc
// Wegg, Gerhard & Portail 2015: half-length 5.0 +/- 0.2 kpc (two-component)
const BAR_HALF_LENGTH_PC = 5000;                    // = 5.0 kpc
```

**What the model ignores.** Wegg & Gerhard's map covers only the inner 2.2 x 1.4 x 1.1 kpc; return `Confidence: 'extrapolated'` beyond it. The X-structure above the plane is not represented. **The superthin component is deliberately omitted from v1** - it is a young-population feature (scaleheight 45 pc) that would need attaching to the young thin population only; model the 180 pc thin bar component and record the superthin as a known omission.

```ts
function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const BAR = {
  enabled: false,
  phaseRad: (27 * Math.PI) / 180,
  scalePc: { x: 700, y: 440, z: 180 },
  halfLengthPc: 5000,
  taperInnerPc: 4200,
  taperOuterPc: 5800,
  strength: 1.0,
};

function barFactor(R: number, theta: number, z: number): number {
  if (!BAR.enabled || BAR.strength === 0) return 1;
  const dth = theta - BAR.phaseRad;
  const x = R * Math.cos(dth), y = R * Math.sin(dth);
  const s = Math.abs(x) / BAR.scalePc.x + Math.abs(y) / BAR.scalePc.y + Math.abs(z) / BAR.scalePc.z;
  const window = 1 - smootherstep(BAR.taperInnerPc, BAR.taperOuterPc, R);
  return 1 + BAR.strength * Math.exp(-s) * window;
}

densityAt(R: number, theta: number, z: number): number {
  const bar = barFactor(R, theta, z);
  let d = haloTerm(R, z);                       // AXISYMMETRIC - never barred
  for (const disc of DISCS) d += discTerm(disc, R, theta, z) * bar;
  return d;
}
```

The excess term decays to exactly zero at `taperOuterPc`, reaching exactly 1.000 with no discontinuity. Set `morphology` to `'barredSpiral'` when `BAR.enabled`, `'spiral'` otherwise.

**Ledger:** R0 8178 pc (sourced, GRAVITY 2019); bar scale lengths 700/440/180 pc (sourced, Wegg & Gerhard 2013); bar axis ratios 10:6.3:2.6 (sourced); bar half-length 5000 pc (sourced, Wegg 2015); bar position angle 27deg (sourced); `taperInnerPc`/`taperOuterPc` 4200/5800 pc (**tunable**); `BAR.strength` 1.0 (**tunable**); superthin component omitted (derived, out of v1 scope); disc scale lengths Juric, **number-density fit** (sourced, see C2).

> **On the member count, settled here so it stops being re-raised.** `GalaxyModel` has **four** members. `densityAt`, `densityByPopulation`, `populations` are what the conductor calls; `morphology` is a self-identifying label. **Do not add a fifth.**

### 4.5 `elliptical`

A pressure-supported spheroid. Use the **Hernquist 1990** profile, `rho(r) = M a / (2 pi r (r + a)^3)`: analytic in 3D, integrates to exactly M, projects close to de Vaucouleurs.

Scale radius from **Shen et al. 2003**, MNRAS 343, 978, early types: `log R_e(kpc) = log b + a log(M*/Msun)`, a = 0.56, b = 2.88e-6. Then `a = R_e / k`. **Compute k, do not quote it - assert it equals 1.815271.** This audit computed it a third way and got 1.815270960, agreeing to 4e-8 with M_proj(k) = 0.500000000.

Two integration traps, both hit the hard way: Sigma(R) diverges logarithmically as R->0 (guard: Sigma*R -> 0, since fixed-panel rules including Simpson return NaN at the endpoint); the projected integrand ~R ln(1/R) has infinite derivative at 0 (substitute R = u^2, reaches 3e-8 with 120 panels).

**Do not substitute the 3D half-mass radius**, a/(sqrt2-1) = 2.4142a, for the projected R_e (1.8153a) - makes every spheroid scale radius **24.8 % too small** (C7).

**Free test assertion:** mass enclosed within scale radius `a` is exactly M/4.

`CORE_FLOOR_PC` guards the 1/r divergence at the origin; `tunable`, a numerical guard not physics.

**Age structure:** McDermid et al. 2015, MNRAS 448, 3484 - non-parametric SFHs, mass-weighted ages/metallicities. **The gate, as physics:** at the drawn age, compute MS turnoff mass via `msLifetimeGyr` and assert the drawn primary's mass lies below it. ~12 Gyr population -> turnoff near 0.9 Msun, no A-type primaries, almost no F.

**Metallicity gradient:** -0.2 dex/decade, logarithmic form, **Kuntschner et al. 2010**, MNRAS 408, 97 (SAURON XVII), attested across three unrelated samples. **McDermid sets the zero point (mass-metallicity relation); Kuntschner sets the slope.** Kuntschner's maps reach ~1 R_e; beyond that, return the reduced-confidence flag.

**Mass-independence of the gradient is contested below ~3.5e10 Msun** (Spolaor, Proctor, Forbes & Couch 2009, ApJ 691, L138: sharp transition at ~3.5e10 Msun, below which gradients form a mass-dependent relation and turn positive at the dwarf end). Koleva et al. 2011 (no correlation) and Spolaor disagree and it is **not resolved**; grade the mass-independence `sourced (massive-ETG regime only; contested below ~3.5e10 Msun)`.

**Ruling: floor the elliptical mass categories at 3.5e10 Msun.** Three independent failures coincide there: the gradient is contested below it; Terzic & Graham find Hernquist inadequate for low Sersic indices including dwarf ellipticals; and Shen's faint ellipticals are exponential-profiled and were excluded from the fitted sample by the concentration criterion.

**The accreted metal-poor halo is in v1 scope (S7 ruling 1a).** Ex-situ fraction rises from ~0 at the centre toward unity beyond ~5 R_e (Rodriguez-Gomez 2016/Illustris, Remus & Forbes 2021/Magneticum, OyarzE1n 2019/MaNGA observational check with large scatter beyond 2 R_e). Magneticum: mean ex-situ fraction exceeds 50 % around 8e10 Msun. **Implement as a smooth radial blend, never a hard switch.** Grade `sourced (simulation)`.

**The scale radius must live on the population, not be shared.** Two Hernquist components sharing one `a` have a radially CONSTANT mass ratio (checked numerically at a 70/30 split: ex-situ fraction 0.300000 at 10 pc, 1 kpc and 20 kpc - flat). So the in-situ component keeps `a = R_e/k` from Shen; the accreted component takes a larger, **calibrated** scale radius so the ex-situ fraction crosses 0.5 at the Remus & Forbes transition radius. One honest limitation: the blend asymptotes to ~0.01-0.84 at a representative 60/40 split with a_ex/a_in = 8, not literally 0 to 1.

```ts
function hernquistMassDensity(rPc: number, totalMassSol: number, aPc: number): number {
  if (rPc <= 0) return Number.POSITIVE_INFINITY; // guarded by the caller
  return (totalMassSol * aPc) / (2 * Math.PI * rPc * Math.pow(rPc + aPc, 3));
}

densityAt(R: number, theta: number, z: number): number {
  const r = Math.max(Math.hypot(R, z), CORE_FLOOR_PC);
  let n = 0;
  for (const pop of POPULATIONS) {
    const m = this.galaxyMassSol * pop.massFractionGalaxy;
    n += hernquistMassDensity(r, m, pop.scaleRadiusPc) * this.upsilonFor(pop);
  }
  return n;
}
```

**Ledger:** profile Hernquist (sourced); a=0.56, b=2.88e-6 (sourced, Shen 2003); k computed, assert 1.815271 (derived); M(<a)=M/4 (derived, exact); 3D half-mass radius 2.4142a is **NOT** R_e, -24.8% if substituted (derived); Upsilon composed per population (derived); age params (sourced, McDermid 2015); fehGradient -0.2 dex/decade (sourced, Kuntschner 2010); gradient mass-independence above 3.5e10 Msun only (sourced, scoped, contested below - Spolaor 2009); Shen validity floor Mr ~ -19 i.e. ~1-2e10 Msun (sourced in luminosity/derived in mass); elliptical category floor 3.5e10 Msun (tunable, set to the Spolaor transition); accreted-halo scaleRadiusPc (calibrated); CORE_FLOOR_PC (tunable); metallicity inner clamp (tunable).

### 4.6 `lenticular`

A quenched disc galaxy: keep the exponential disc, drop the young cohort and arms, add a two-component bulge. The stub currently returns zero - remove that bug.

**The bulge is two components, not one.** A **classical bulge** is genuinely spheroidal. A **discy pseudo-bulge** is structurally a small inner disc (Erwin et al.: exponential, scalelengths 125-870 pc, mean 440 pc, carrying nuclear rings/bars/spiral arms). Boxy/peanut bulges are a third thing (vertically thickened bar) and not modelled separately here. Reuse the elliptical's `hernquistMassDensity` **function**, not its scale radius or parameters - S0 bulges differ from ellipticals (Laurikainen).

**Erwin et al. 2015 mass fractions (composite S0s):** discy pseudo-bulge 11-59 %, mean 33 %; classical bulge SEersic n 0.89-2.18 (mean 1.52), R_e 23-426 pc (mean 143 pc), mean 5.9 % of total mass. So composite lenticular ~ 61 % disc, 33 % pseudo-bulge, 6 % classical bulge by mass - vs a conventional photometric B/T of ~0.37, because most of what "bulge" conventionally means is disc-like material.

**A live disagreement (Gao et al. 2018)** finds no bimodality by Sersic index alone, because their B/T folds nuclear rings/bars into the bulge - exactly what Erwin's *kinematic* split excludes. **Erwin's kinematic split drives `composite`; Gao's B/T is exactly right for `classical`.**

**The disc is TWO populations, ruled** - Juric gives exactly two disc components; the spiral's midThin/oldThin is an *age-cohort* subdivision (Xiang & Rix) that does not apply to a quenched galaxy with no ongoing formation.

```
N_thick / N_thin = f * exp(R0/L_thick - R0/L_thin) * (L_thick/L_thin)^2 * (H_thick/H_thin)
                 = 0.12 * 0.4174 * 1.9172 * 3
                 = 0.2881          -> thin 0.7764, thick 0.2236
```

> **THIS IS A NUMBER RATIO, NOT A MASS RATIO.** Three conversions sit between Juric and `massFractionGalaxy`: stars->systems (multiplicity varies with age), systems->mass (`upsilonFor(pop)`), living mass->catalogue mass. Derive `massFractionGalaxy` as `N_ratio / Upsilon(pop)` so Upsilon cancels correctly; do not transcribe 0.7764/0.2236 into the mass field. Correction moves the thick disc's mass share to ~0.20-0.22 rather than exactly 0.2236.

**The `exp` term is load-bearing.** Omitting it gives ratio 0.690 -> a thick-disc fraction of 40.8 %, implausible and undetected by a fractions-sum-to-one test alone.

**Frame consistency: only R0/L is physical.** R0 and any fitted scale length must come from the same frame - galaxyForge's R0 (8178 pc) with Juric's unrescaled L is a ~1.9 % error (0.2936 vs 0.2881); the rule generalises to every future imported disc fit.

**The lenticular gains a halo (S0 category error, not omission).** Erwin's 0.61/0.33/0.06 sum to 1.00 because they are fractions of *decomposed light*; a stellar halo at 28-30 mag/arcsec^2 is invisible to that decomposition, so carrying the three raw asserts a **zero-mass halo**, not an omitted one. Without a halo, the lenticular is the only morphology of four with no pressure-supported old metal-poor component, and the outskirts (Hernquist ~r^-4 bulges, exponential discs) generate an empty sky where a halo (~r^-2.8) would dominate.

**Ruling: add `lenticularHalo`, renormalise Erwin's three to (1 - f_halo).**

| population | mass fraction | basis |
|---|---|---|
| `lenticularThinDisc` | 0.4688 | 0.61 * 0.99 * 0.7764 (number share, convert via Upsilon) |
| `lenticularThickDisc` | 0.1351 | 0.61 * 0.99 * 0.2236 (number share, convert via Upsilon) |
| `lenticularPseudoBulge` | 0.3267 | 0.33 * 0.99 |
| `lenticularClassicalBulge` | 0.0594 | 0.06 * 0.99 |
| `lenticularHalo` | 0.0100 | see below |

**f_halo = 0.01, graded `tunable`** - the Milky Way is a low outlier; external stellar-halo mass fractions scatter by a factor of ~7-16 across the GHOSTS sample. Anchor on the MW figure but flag it as an outlier import.

**Profile:** Juric's oblate power law, index 2.8, c/a = 0.64, exactly as the spiral's halo. **A truncation radius is mandatory here** (unlike the spiral) - the mass-normalised integral of r^-2.8 diverges as R^0.2. Truncate at 20 kpc (Juric's calibration edge); extending to 30/50/100 kpc scales halo mass by 1.08/1.20/1.38.

**`classical` configuration:** Gao, Ho, Barth & Li 2018, ApJ 862, 100 - unbarred S0 B/T = 0.38 +/- 0.18 (our lenticular is unbarred); grade `calibrated`.

**Default to `composite`.** Normalisation is mass-based throughout, like the elliptical - no solar-neighbourhood anchor applies. `armAmplitude: 0` on every population, structurally.

**Ledger** (selected): pseudo-bulge mass fraction 0.33 (sourced*, composite config only); pseudo-bulge scale length 440 pc (sourced); classical bulge mass fraction 0.06 (sourced*); classical bulge R_e 143 pc (sourced); classical bulge Sersic n 1.52 (sourced, not what Hernquist provides); classical config B/T 0.38 unbarred (calibrated); r_eff/h_r cross-check 0.20 S0 / 0.22+/-0.09 late-type spirals (sourced, loosely corroborating - **C12**, do not promote to independent confirmation); armAmplitude 0 (derived, structural); disc structure as spiral, two components (sourced, Juric 2008 - **number-density**, C2); thin:thick number split 0.7764:0.2236 (derived); thin:thick mass split via `upsilonFor(pop)` (derived, ~0.78:0.22); R0/L frame consistency (rule, not a number); Hernquist k 1.815271 (derived, test target); lenticular halo present, f=0.01 (tunable, MW is a low outlier); Erwin fractions renormalised x(1-f_halo) (derived); lenticular halo profile as spiral (sourced); lenticular halo truncation 20 kpc (tunable, mandatory - diverges otherwise).

### 4.7 Morphology validation gates

Write these as tests, not one-off checks. **Report measured numbers, not assertions that it works.**

**All morphologies.** Density finite, non-negative, continuous everywhere including R->0 and large |z|. No NaN. `densityAt` equals the sum over `densityByPopulation` to floating-point tolerance. Purity: same inputs, same output, always. Axisymmetric models ignore `theta` - **bit-identical**.

**`spiral`.** The local anchor at (R0, theta, 0) matches the Reyle systems density after re-anchoring. Record the CNS5 stellar-density cross-check separately - report the gap size, don't reconcile it.

**`barredSpiral`.** Bar factor exactly 1.000 outside `taperOuterPc`, continuous first derivative. Half-length and position angle match Wegg 2015. The stellar halo is unaffected by the bar (test directly). Toggling the bar off reproduces `spiral` **bit-identically**.

**`elliptical`.** Integrating density over volume recovers the specified total stellar mass to within a few per cent. Metallicity declines outward. No A-type primaries and almost no F-type (turnoff-mass assertion). Upsilon reproduces the Reyle anchor. Ex-situ fraction reaches 0.5 at the calibration target. M(<a) = M/4.

**`lenticular`.** Returns non-zero. B/T matches the chosen value. No population has armAmplitude > 0. R_e/scale-length ~ 0.20. The five mass fractions sum to 1.

### 4.8 Placement, sampling, sector geometry and the two views

The morphology models answer "what is the density and population mix here". This turns that into system positions. **The sampler is morphology-blind and must stay that way.**

**The creator view** is galaxy-scale: a top-down (x,y) plan plus a side slice, driven by theta/R/z sliders - a direct control surface over `densityAt`. It is **schematic, not rendered from the field**, but draws arms and the bar from the same `armPhase(R)` and position angle the density field uses, so the picker never lies about where an arm is.

**The sector map** is the atlas: generated systems in (x,y), z stored and dropped only at render. Pin the axis names: plan view is (x,y), edge-on slice is (y,z).

**Sector geometry.** Slab thickness is fixed, chosen from {5, 10, 15} pc, and does not scale with footprint size. Footprint shape is circle, square or hexagon. **The sector is a right prism - footprint by fixed thickness - never a sphere** (a sphere's projection falls as sqrt(A^2-r^2), a false central-concentration artefact; a prism projects flat, leaving only a hard, honest edge). `radiusPc` is the **circumradius** for every shape.

At ~8e-2 systems pc^-3, ten thousand systems needs ~1.25e5 pc^3: circular footprint radius ~**89 pc at 5 pc thickness, 63 pc at 10 pc, 51 pc at 15 pc** (re-derived: 89.1, 63.0, 51.4). Note the inversion: the thinnest slab is the widest footprint.

**Density is evaluated per cell, not once at the sector centre.** Evaluate `densityByPopulation` at each cell's own midpoint; place uniformly within the cell. A single central evaluation makes positions a function of *(space, centre)* - re-centring would then silently move or delete systems, including the one the search found. Per-cell evaluation fixes this **and** recovers the 6-7 % radial gradient for free, with no rejection sampler.

**Quantise the slab in z too.** `cellIz = floor(z / thicknessPc)`; cell identity is `(worldSeed, cellIx, cellIy, cellIz)`, content a function of that, `thicknessPc` and `galaxyConfig` and nothing else. `centrePc.z` selects which layer, never what is in it.

**Clustering - a Thomas process, made deterministic.** Partition space into fixed-size square columns spanning the full slab; each cell seeded from `(worldSeed, cellIx, cellIy, cellIz)` on `CHANNELS.placement`. Generate cells overlapping the footprint plus a one-cell margin (a full ring, diagonals included). **Cell size must exceed three times the cluster jitter.**

**Truncate the jitter at +/-3 sigma per axis, deterministically**, via `truncGaussQuantile` (frozen in `mathStats.ts`) so a child cannot escape the one-cell margin. At sigma=1.5 pc the bound is 4.5 pc per axis.

```ts
function poissonInvCdf(lambda: number, u: number): number {
  if (!(lambda < LAMBDA_MAX)) throw new Error(`poissonInvCdf: lambda ${lambda} >= ${LAMBDA_MAX}`);
  const kMax = Math.ceil(lambda + 10 * Math.sqrt(lambda));
  let p = Math.exp(-lambda), cum = p, k = 0;
  while (u > cum && k < kMax) { k += 1; p *= lambda / k; cum += p; }
  return k;
}
```

`Math.exp(-lambda)` underflows to exactly zero at lambda >= 746; without the guard the loop silently returns the ceiling for every call (`poissonInvCdf(760, 0.5)` returns 1000 with a fixed 1000 ceiling). `LAMBDA_MAX = 500`, `K_MAX = lambda + 10*sqrt(lambda)` (723.6 at lambda=500, `ceil` gives **724** - `floor` would wrongly give 723). A 4.5 pc cell through a 15 pc slab gives lambda ~ 24 at the local anchor density; even a 10 pc cell reaches only ~120, so 500 is a wide margin.

**`sysid` derives from cell index and ordinal within cell.** Never a running counter - a counter renumbers every system when the footprint changes, orphaning notes.

**Minimum separation as a deterministic post-pass, not rejection.** Generate every candidate with fixed draw counts, sort by (cell, ordinal), walk with a spatial hash keyed on the exclusion radius, drop any point within radius of an earlier kept point. Exclusion radius ~0.1 pc, `calibrated` from CNS5's bound-pair separation statistics (median 185 AU, no pairs above 0.85 pc). **Do not convert a merged point into a companion** - `multiplicity` already sets companion counts; note where the dropped point conceptually went.

**Three load-bearing conditions for the expansion gate:** the exclusion pass runs over all candidates (footprint plus margin) before the footprint filter; the margin is at least one full cell; cell size exceeds twice the exclusion radius by a wide factor (here, >20x). Under those, expanding the footprint can disturb only the old outermost margin ring, never an interior point - **no system inside the old footprint moves or is removed by expansion.**

**One caveat: the quarantine is probabilistic, not geometric** - greedy sequential exclusion has no strict locality bound. Reaching a 4.5 pc margin needs 44-45 consecutive points spaced under 0.1 pc; expected occupancy of such a tube is well under one system, so it will not happen, but it is bounded by a probability, not a proof. **S7 ruling 2 adopts the exact fix** (local-and-symmetric: drop a candidate iff an earlier-keyed candidate lies within radius, never testing against the kept set) before stage 10 - it is a `genVersion` bump.

**The clustering constants migrate to `Population`** (`clusteredFraction?`, `meanGroupSize?`), set only where the age interval reaches below the co-natal coherence window; see S5.3. Jitter sigma and its truncation stay sampler mechanics.

| constant | value | status |
|---|---|---|
| clustered fraction | 0.6 | tunable, migrated to `Population` |
| mean group size | 12 | tunable, migrated to `Population` |
| cluster jitter sigma | 1.5 pc | tunable |
| cluster jitter truncation | 3 sigma per axis | derived (determinism requirement) |
| exclusion radius | 0.1 pc | calibrated (CNS5 bound-pair separations) |
| `LAMBDA_MAX` / `K_MAX` | 500 / lambda + 10*sqrt(lambda) | derived (underflow guard) |
| radial / vertical gradient | 6-7 % / ~5 % | **represented**, not omitted |
| expansion quarantine | probabilistic | derived |

**Placement defaults.** Spiral/barred default to R0=8178 pc, theta=0, z=0 (the Sun). Lenticular: a defensible multiple of its disc scale length. Elliptical: minimum-radius guard (Hernquist diverges at the origin); ~1 R_e is sensible, and the UI refuses the core.

**Polar-to-Cartesian belongs to `galacticDensity`** - it already computes R=hypot(x,y) internally.

**`SystemContext.galactocentricRadiusPc` is spherical r, not cylindrical R** - pinned in the field comment; the two barely differ for a disc near the midplane but r is what the spheroid metallicity gradient depends on.

**Every distance the plugin displays must be true 3D from stored coordinates, never map distance.**

**Centring the sector on a chosen system.** Move the sector, not the system: resolve `centrePc` *to* the qualifying system's position, so nothing is duplicated or holed. This is a **recipe resolution**: walk candidates outward from the user's point (cheapest-first test order: multiplicity, class, planets, habitability), stop at the first match, store the position. **Failure is loud, and retry is spatial** - never a silent seed re-roll:

> No match within 60 pc - extending search to 120 pc...
> Found: G2 primary, solo, habitable tier 2 - 148 pc from your chosen point. Accept, or relax criteria?

A fresh galaxy (re-rolled seed) is offered only when criteria are physically impossible at that location, never as a hidden fallback for a near-miss.

**Criteria are provenance, stored in `SectorRecipe` outside the hash** - `SectorCentreCriteria` (`multiplicity`, `minHabTier`, `requestedCentrePc`), so a user may revise criteria later without invalidating a note. `requestedCentrePc` is what lets the sheet explain "148 pc from your chosen point"; the distance itself is derived at display, never stored.

**Placement gates.** Determinism (byte-identical positions and ids on regeneration). Expansion (widened footprint: every previous system keeps its exact position and id; only additions occur - **write this gate early**). Cell independence (one pass equals two overlapping partial passes, exactly, given 3-sigma jitter truncation). Counts (realised count matches the field integrated over cells, within Poisson expectation - not a single central density times volume). Merge rate (report the exclusion-pass drop fraction; investigate if it exceeds a few per cent). Clustering (nearest-neighbour distribution is more clustered than uniform Poisson, less than the parent process alone).

### 4.9 Galaxy size categories

Expose `galaxyMassSol` as **named categories, never a raw number** (S7 ruling 1b, confirmed). **Roll the concrete mass once at galaxy creation and store it in `SectorRecipe`** - re-rolling on regeneration would destroy the recipe's sufficiency. It is a **destructive control**: lock the category after first generation, or warn hard, because it feeds the config hash.

**Spiral and barred scale from the Milky Way.** Every spiral number in this brief is a Milky Way measurement, so categories scale from **Licquia & Newman 2015**: total stellar mass 6.08 +/- 1.14e10 Msun (bulge 0.91 +/- 0.07e10, disc 5.17 +/- 1.11e10), with disc scale lengths scaled via Shen's late-type relation (gamma=0.1, alpha=0.14, beta=0.39, M0=3.98e10).

**Two caveats.** The Milky Way is atypical (compact) for its mass - siblings generally span 3.2-5.7 kpc scale length against BH&G's 2.6 +/- 0.5 kpc; scaling from a compact anchor makes every generated spiral inherit that compactness. **And see C2**: 2.6 kpc is a *luminosity* scale length, not the number-density one galaxyForge actually uses (Juric's 2600 pc). **The Milky Way's own stellar mass is contested**: Lian et al. 2025 finds roughly half the previous estimates (2.607 +/- 0.353e10 Msun from the Gaia local density, or 3.55e10 with the higher APOGEE density) because previous work assumed a single-exponential disc - **which is what our spiral model also is**, so the assumption under challenge is our own. Use Licquia & Newman as the anchor and record the dispute.

**Elliptical and lenticular normalise by mass** directly, via Shen's early-type relation and Upsilon - no Milky Way anchor. **Warning: the bar ADDS mass** (`barFactor` is never below 1) - harmless for the locally-anchored spiral (taper closes well inside R0), but would silently inflate a hypothetical mass-normalised `barredSpiral` unless compensated; grade `derived`, flag before anyone builds one.

**Category boundaries are ours, `tunable`.** The Milky Way category must contain 6.08e10 Msun; elliptical categories should straddle 8e10 Msun (the accretion-transition mass) so it is reachable from the UI. **The lightest elliptical category must not go below 3.5e10 Msun** - the same floor as S4.5, for the same three reasons. Hide/grey the mass control for pure-Milky-Way-analogue spiral/barred implementations, and the angle slider for the elliptical creator view, rather than shipping a dead control.

---

## 5. The five added concerns

All are **additive** and fold into the stage-10 bump, except `sky`, which needs no bump - it is a pure reduction of stored data.

### 5.1 `sky` - apparent-sky photometry

The night sky as seen from any generated system, computed from data already stored: positions in pc, `absMagV(class)` on the Mamajek sequence. Apparent magnitude is one distance-modulus evaluation per source. **No new science - photometric arithmetic, not photometric data.**

**Ownership:** a small science module, not a `render` helper - three consumers (render, atlas, "can A see B") share one definition.

**Scope, stated honestly:** the sky IS "as contributed by sector systems" - it does NOT model the galactic background (naked-eye giants/OB stars far outside any sector). `render` must label it the **sector sky**. Upgrade path: statistical background + Lallement et al. 2019 3D dust maps (verify before use). Extinction within a sector is negligible (Local Bubble, <=100 pc, below 0.1 mag display quantisation).

```
m_V = M_V + 5 log10(d_pc / 10)
m_combined = -2.5 log10( sum_i 10^(-0.4 m_i) )      // fluxes add, over the system's stars
```

A remnant (`luminositySol <= 0`) contributes zero flux, never `-Infinity`. A multiple's reported colour is its brightest component's colour - no flux-weighted blend until something asks for one. Direction is a unit vector in the canonical galactic frame; sky-coordinate conversion is `render`'s job.

```ts
export interface SkySource {
  sysid: string;
  apparentMagV: number;
  colourBV: number;
  distancePc: number;                              // true 3D
  direction: { x: number; y: number; z: number };  // unit vector, galactic frame
}
```

**No PRNG channel** - a pure reduction; grep for `rng` in this module as a gate.

**Gates:** Sun at 10 pc -> exactly 4.83; Sun at 1 AU -> -26.7; Sirius stand-in (M_V=1.43 at 2.64 pc) -> -1.46. Remnant-only companion contributes no flux, no `-Infinity`. Output order deterministic under input permutation (sort by magnitude then sysid).

### 5.2 `remnants` - single white dwarfs, neutron stars, black holes

`stellarPopulation` draws class conditional on age with survivorship divided out - it **cannot produce a lone white dwarf.** But ~74 % of real single white dwarfs are single (Holberg 2016), and a 10k-system sector with zero white-dwarf primaries is a visible wrongness. `remnants` closes this as an **additive placement layer** on its own channels, never touching the stellar anchor.

**Anchor - observed, never model-derived.** Holberg, Oswalt, Sion & McCook 2016, MNRAS 462, 2295: local WD space density 4.8 +/- 0.5e-3 pc^-3, 74 % single. Working single-WD density ~3.6e-3 pc^-3 (re-derived 3.552e-3). McKee's SFH-derived figure (~8.5e-3 pc^-3, 1.8x the observed) is a cross-check, not the anchor - the gap is completeness/SFH information, not error to tune away. Cross-check against a 10 pc sphere: ~15 +/- 4 single WDs (re-derived 14.9), directly testable with the same GAVO query as S4.1.

**Lian et al. 2025 supplies the only independent constraint on NS/BH rates:** WD/NS/BH surface densities 4.31/0.66/1.51 Msun/pc^2 (C5), galaxy-wide 0.412/0.056/0.13e10 Msun, half-mass radii 3.62/3.97/3.96 kpc.

**Placement** - same cells/slab/footprint filter as the stellar sampler, own channels (`remnantPlacement`, `remnantStar`) so remnant science can never perturb stellar positions. **No clustering** - remnants are dynamically mixed. `n_remnant(x) = sum_pop density_pop(x) * rho_rem(pop)`, `rho_rem(pop)` composed from the same Upsilon machinery (S4.3), calibrated so the spiral's local total reproduces the Holberg anchor. `sysid` from (cell, ordinal) with a layer tag. **Exclusion ordering: stellar layer wins** - a dropped remnant is the companion `multiplicity` already models; never inject it as a new one.

**The drawn object.** `StarKind` widens to include `'white-dwarf' | 'neutron-star' | 'black-hole'`. NS/BH rates from McKee S4.3 (Sigma_NS = (0.3 +/- 0.1)*N0, N0~0.25, mean mass 1.4 Msun) - attribute the scale height to McKee S4.3, name Sartore as McKee's underlying source, do not quote Sartore directly (pin him only if needed later). Expect a handful of NS and at most one BH in a 10k-system sector - **that scarcity is the feature**. White-dwarf chain: progenitor mass from the IMF (turnoff to 8 Msun) -> IFMR (Cummings 2018, upgrade path; two-segment linear placeholder `calibrated` until verified) -> cooling age = `ctx.age` -> Mestel cooling law (`calibrated` constant fit to Holberg's T_eff distribution) -> mass-radius relation R ~ M^(-1/3) (`calibrated`). **No planets around placed remnants in v1** - engulfment; WD 1856+534 b named so the scoping is a visible choice.

**Ledger** (selected): local WD density 4.8+/-0.5e-3 pc^-3 (sourced, Holberg 2016); WD single fraction 0.74 (sourced); working single-WD density ~3.6e-3 (derived); McKee figures (sourced (model), cross-check only); Lian WD/NS/BH densities (sourced); rho_rem(pop) shape (derived); spiral calibration constant (calibrated); NS rate (sourced (model), McKee/Sartore); BH rate (sourced (model), no direct estimate); WD cooling (sourced (form)/calibrated); IFMR (upgrade path); clustering none (derived).

**Gates:** WD-primary count matches expectation within Poisson bounds - **zero is a failing value**. Synthetic 10 pc sphere yields ~15+/-4 WDs. Elliptical's placed WDs are systematically cooler than the spiral's. NS/BH appear at trace rates, never exceed WDs. No remnant within the exclusion radius of a kept stellar system.

### 5.3 `conatal` - co-natal remnant groups

**Five reconciliation corrections, kept written down so nobody re-introduces them:**

1. **Sigma_intra was wrong by 3x, permissive direction.** Bovy 2016's limits are upper bounds on intrinsic spread, element-banded: [Fe/H] < 0.01 dex (68 %), < 0.02 (95 %) for C and Fe - the earlier 0.03 dex applied the *loosest* band (Na/S/K/Ti/V) to the *tightest*-constrained element. **Ruling: sigma_intra = 0.02 dex**, graded `derived (from upper limit)`, and this grade must never drift to `sourced`.
2. **Kamdar's 0.03 is a different quantity** - a mock *observational uncertainty* applied to their simulation, not an intrinsic scatter. Never cite Kamdar for sigma_intra.
3. **"High-mass" is retracted.** Preprint said "high-mass and relatively young clusters"; published ApJL says clusters following the overall cluster mass function. Cite the published version; keep "< 1 Gyr".
4. **Lada & Lada's 70-90 % is a birth statistic about GMCs**, not a survival statistic - it grades nothing here.
5. **Lamers et al. 2005 removed from this header** - `conatal` assigns no group mass, so t_dis = t0*(M/1e4)^gamma cannot be evaluated here; it parks in the deferred `clusters` spec.

**The concern:** which spatially co-placed systems share a birth. Primary source: **Kamdar, Conroy, Ting, Bonaca, Smith & Brown 2019**, ApJL 884, L42 - comoving pairs ~80 % conatal in simulation, conatal pairs born in **< 1 Gyr** clusters following the overall cluster mass function.

> **OWNER RULING - THE REALISM VARIANT IS ADOPTED.** Placement itself is gated on coherence: **co-natal remnants are the only clustered structure the sampler places**; old populations come out near-Poisson. The chance-alignment branch of the earlier draft is deleted, not deferred. `clusteredFraction?`/`meanGroupSize?` migrate to `Population`, settable only where the age interval reaches below the coherence window (structurally, `youngThin` alone among shipped placeholders). Effective group rate = `clusteredFraction * P(age < window | population)`. Rides the stage-10 bump; not a user toggle without joining `galaxyConfigHash`.

**Honesty clause for the header:** Kamdar validates position-AND-velocity comovers at ~80 % conatal; galaxyForge has no velocity dimension, so it places groups conatal by construction and implicitly comoving - it does not claim "nearby systems are conatal" from proximity alone (Kamdar's own simulations underestimate clustering below 5 pc, exactly where the 1.5 pc jitter puts the median pair). Jitter stays `tunable`, never `sourced`.

**Physical model, per group, on `CHANNELS.conatalGroup` seeded from (worldSeed, cell, parentOrdinal):** population drawn per cell's clustering-weighted weights; group age via `truncGaussQuantile` truncated at the coherence window (no rejection); group [Fe/H] drawn once with the AMR coupling applied **at group level** (not suppressed the way it is at member level); members inherit age exactly, [Fe/H] = groupFeh + N(0, 0.02 dex) on each member's own `metallicity` channel, `formationRank` and `population` from the group, `ctx.conatalGroupId` stamped. Members' own age-channel draws go deliberately unconsumed (harmless - channels are private).

**"Exactly" is a consequence, not a shortcut** - Bovy's C/O limits imply formation within ~6 Myr = 0.006 Gyr, below the project's 2-dp Gyr storage precision.

**Ledger:** coherence window 1.0 Gyr (sourced (rounded), Kamdar 2019); sigma_intra 0.02 dex (**derived (from upper limit)**, never `sourced`); conatal fraction per population (derived, Phi-ratio); exact age sharing (derived, formation window << storage precision); conatal-by-construction (derived, ruling); clusteredFraction/meanGroupSize base values (tunable, migrated); effective group rate (derived); jitter sigma 1.5 pc (tunable, never `sourced`); group size as birth size **disclaimed** (derived - a remnant multiplicity, not LL03's birth figure).

**Gates:** members of one group share population/age (bit-identical)/formationRank, [Fe/H] scatter consistent with 0.02 and inconsistent with the population's own fehSigmaDex (7-12x contrast). Every placed group's age sits below the coherence window. Realised group rate matches `clusteredFraction * conatalProbability(pop)` within binomial expectation; zero for elliptical/halo/quenched-S0-disc, and that zero is asserted, not merely unwritten.

### 5.4 The activity stamp

Fully specified at stage 4 (S3) as an amendment to `stellarHistory`, not its own module - the Rossby number it classifies is already that module's output.

| constant | value | status | basis |
|---|---|---|---|
| `RO_SAT` | 0.13 | sourced | Wright, Drake, Mamajek & Henry 2011, ApJ 743, 48 |
| `RO_QUIET` | 0.45 | tunable | no sharp physical boundary exists |
| classification cost | 0 draws, 0 channels | derived | pure function of stage-4 output |

Pass, Charbonneau & Vanderburg 2025 (ApJL 986, L3 - C9) matters here most: mid-to-late M dwarfs stay saturated far longer than assumed, which is the same dependency Meni-Gallardo & Palle consume from the other direction for hosts below 0.35 Msun.

### 5.5 `densityMap` - the field, sampled for display and region choice

**A VIEW CONCERN, NOT A SCIENCE ONE.** Owns no source, no PRNG channel, does not participate in `genVersion`. Every number traces to `GalaxyModel.densityAt`/`densityByPopulation`. Fully specified and shipped at stage 0 - see `densityMap.ts` and its 11 gates in `densityMap.conformance.ts`; this section records why, for when it needs extending.

**3D is the primitive; the slab map is its reduction** - `projectSlab` is defined as the z-integral of `sampleVolume`, so the volumetric path is exercised on every 2D render, not speculative v2 work.

`systems pc^-2` (the slab's column density) is a new canonical quantity, added to the S1 units table; converts only in `units`.

**z-quadrature: 5 Simpson samples**, chosen because a naive one-sample-times-thickness shortcut under-counts an exp(-|z|/h) disc by 1.26 % at 15 pc (the cusp at z=0 sits exactly on the midpoint rule's sample) - systematic, invisible, and lands in the pre-generation count estimate a user reads before committing to a sector.

**The three slab thicknesses (5/10/15 pc)** are confirmed against the S4.1 anchor: ~40/80/120 systems per 100 one-pc hexes. All three stay a thin slice against the ~300 pc thin-disc scale height (face/mid density ratio 0.975-0.992 even at 15 pc).

> **PROVISIONAL FIGURES.** These use the *unrestricted* 8.02e-2 anchor; S4.1's hydrogen-burning restriction (S2.3, still unrun) will move every number down by ~6 %. Re-derive when the query lands.

`SLAB_THICKNESSES_PC` is a typed union, not a bare number, because `thicknessPc` sits in the cell key (S8.5).

**Gates (11, shipped):** purity (bit-identical); projection identity (uniform field = density*thickness exactly); quadrature sufficiency (vs a 513-sample reference, both exp and sech^2 profiles, all three thicknesses, to 1e-9); thin-slice enforcement (the same gate genuinely fails at 400+ pc); count consistency (analytic, uniform field); population-surface sum; no PRNG channel; resolution independence (16x16 vs 256x256, <0.5 %); slab-thickness type guard; display normalisation leaves the raw array untouched; the 3D `sampleVolume` primitive is exercised directly.

### 5.6 Sector notes are two-layer - OWNER RULING

> **RULED.** A sector carries **two stores**. The **canonical layer** - plugin-owned, regenerated wholesale on a `genVersion` bump, never user-edited. The **authored layer** - user-owned, the plugin never writes to it.

**The cell key has no sector identifier** - `(worldSeed, cellIx, cellIy, cellIz, thicknessPc, galaxyConfigHash, genVersion)`, seven components. Cells are galaxy-global, so overlapping sectors sharing those seven draw bit-identical systems and identical `sysid`s - one canonical record referenced by two sectors, never two records to diverge. **Four conditions for cross-sector consistency**, and the fourth is the one that bites: same worldSeed, genVersion, galaxyConfigHash, AND same `thicknessPc` (galaxy-wide, fixed at creation, because the slab filter is part of what a cell's contents mean).

**One tension, recorded rather than solved silently:** "the user can't access it" must mean *not surfaced, not edit-safe* - **never opaque or binary**. The survives-the-plugin law requires every generated quantity to be human-readable markdown/YAML even if the plugin vanishes. Implement as plain markdown/YAML in a plugin-managed folder, findable but not presented for editing, with the authored note linking to it.

---

## 6. Verification

Four independent mechanisms, each catching a different class of failure. Run the conformance gates on every save, the golden master on every commit, the fuzz harness before every bump.

### 6.1 The stage-0 conformance gates

`verification/run-gates.js` compiles the real files under `tsc --strict --noEmitOnError` against throwaway stubs and runs **48 assertions** (35 stage-0, 11 densityMap, 2 structural). **Verified in this repository: 48/48 green, typecheck clean, TypeScript 6.0.3.**

**The harness discovers rather than lists** - every root `.ts` typechecked, every `*.conformance.ts` run; stubs written only where the real file is absent, so they retire themselves as modules land.

**Gate S1 - no network calls in plugin source.** Comments stripped first (provenance headers cite DOIs/URLs by law); `verification/` excluded (its tools query TAP services deliberately, at spec time, by a human). Bans `fetch(`, `requestUrl`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `node-fetch`, `axios`, the `http`/`https`/`net`/`dns`/`tls`/`dgram` module family, and any bare URL literal.

**Gate S2 - `tsconfig.json` mirrors the gate flags.** So an editor reports the same diagnostics as the gates.

**The toolchain is pinned and printed with the result.** Local `typescript` preferred (proven with a `--version` probe before trusting it - TypeScript 7 ships its compiler as a platform sub-package, and a partial install otherwise throws a stack trace that reads like a bug in this project); exact-pinned npx fallback otherwise. Verified green under 5.9.3, 6.0.3 and 7.0.2 in the original audit; this repository uses 6.0.3 exactly as pinned in `package.json`.

**Nine of the 35 stage-0 gates encode a trap that was live at some point:** Hernquist's k computed not quoted; the 3D half-mass radius not substituted for R_e; the Juric exponential term present; the lenticular disc split rederived not transcribed; axisymmetric models ignore theta bit-identically; and more. Read them as a list of mistakes already made once.

As each stage lands, extend `run-gates.js`'s discovery (automatic) and add `<module>.conformance.ts` beside the module.

### 6.2 The `truncGaussQuantile` argument-order gate

`mathStats.ts` is frozen by contract. Its most dangerous failure is silent: `truncGaussQuantile(u, mu, sigma, lo, hi)` - transposing mu/sigma or lo/hi produces plausible, wrong numbers. Three modules call it (`age`, `conatal`, placement jitter), so the argument order gets its own gate:

| call | expected | catches |
|---|---|---|
| u=0.5, mu=0, sigma=1, lo=-3, hi=3 | **exactly 0** | any asymmetry |
| u=0.25 (same) | **-0.672367295** | sigma scaling |
| u=0.75 (same) | **+0.672367295** | sign convention |
| u=0.025 (same) | **-1.938479034** | truncation actually applied (untruncated value is -1.959964) |
| u=0.975 (same) | **+1.938479034** | as above, other tail |
| jitter case: u=0.25, mu=0, sigma=1.5, lo=-4.5, hi=4.5 | **-1.008551** | mu/sigma transposition |

**Any edit to `mathStats.ts` that changes output requires a coordinated `genVersion` bump across every consuming module.** Inline copies of `erf`/`Phi`/`probit` outside `mathStats.ts` are forbidden - grep for them in review.

### 6.3 The golden master

Cut at **stage 10**, after the whole programme lands and the single `genVersion` bump has happened - a fixture cut earlier would enshrine pre-bump behaviour nobody intends to keep. Fixed `(worldSeed, galaxyConfig, sector)` per morphology; canonical JSON (sorted keys, fixed numeric formatting) plus a **per-stage xmur3 hash**, so a break tells you *which concern* moved, not merely that something did.

Two assertions alongside the hashes: regenerating from `(worldSeed, sysid, genVersion)` reproduces every row byte-identically, and expansion keeps every previously generated system unchanged.

When a science update lands: bump `genVersion`, regenerate as `gen{N+1}.json`, **keep the old file**, record which stages moved and why.

### 6.4 The fuzz harness

Default N=25 seeds across all four morphologies, before any bump. Asserts what must hold for *every* seed: mass fractions sum to one; densityAt equals the sum over densityByPopulation; density finite/non-negative everywhere including R->0; no system within the exclusion radius of another; draw counts fixed regardless of drawn values; every population key classifies without falling through; **no stream is advanced by a module that does not own it**; **no output changes when an unrelated module's `genVersion` is perturbed** (Law 4, stated as a test - the only mechanical check that channel isolation holds).

25 seeds catches structural breakage, not distribution shape - where a distribution IS the claim (WD temperature match, group-rate binomial, Poisson cell counts), state the tolerance before fitting and use a larger, separately recorded run.

### 6.5 The worker and the per-cell cache

Sector generation moves to a worker so the UI never blocks. Cache key, **exactly**:

```
(worldSeed, cellIx, cellIy, cellIz, thicknessPc, galaxyConfigHash, genVersion)
```

Seven components. **View state, camera, zoom, selected system and display units must never enter the key.**

**The transparency gate: worker output and main-thread output must be byte-identical for the same key.** Not statistically similar - identical. Divergence means something in the pipeline is reading ambient state; the fuzz harness's stream-isolation property is where that failure usually surfaces.

Cache eviction is LRU on cell count; by construction it can only cost time, never correctness.

---

## 7. Owner decisions - RULED, 1 August 2026

**All five are decided. Nothing in this section is open.**

**1 - the three reserved from Part 6.**
*(a)* **The elliptical's accreted metal-poor halo IS in v1 scope. Populate it.** The seam is already built and gated (per-population `scaleRadiusPc` makes the radial ex-situ trend expressible at all).
*(b)* **Galaxy stellar mass is NOT exposed as a number.** Categories only, confirmed.
*(c)* **The S8.2 sector-geometry question is closed as resolved** - if something remains unresolved it will resurface concretely.

**2 - the R7 merge rule: ADOPT the local-and-symmetric rule, before stage 10.** The greedy exclusion pass makes expansion stability *overwhelmingly likely*; local-and-symmetric makes it **provable** (a candidate's verdict depends only on its own r-neighbourhood). It changes output, so it is a `genVersion` bump - free now, expensive after users exist. Land it before stage 10.

**3 - correction C1: APPLIED.** `conatalGroupId`'s doc comment now carries the realism-ruling text; gates re-run green. Applied immediately, not deferred, because a comment changes nothing at runtime and the hazard was purely "the first thing a contributor reads".

**4 - correction C8: RESOLVED.** Both 1.5 and 2 km/s are in the published Kamdar abstract, measuring different things. Write both into the `conatal` header with the quantity beside each. The module consumes neither directly - only the < 1 Gyr coherence window.

**5 - `genVersion`: one bump, at stage 10. CONFIRMED.** Ruling 1(a) and ruling 2 both change output, so both are stage-10 blockers in practice, not merely cheaper-if-early.

**Still owed, none of it blocks a stage:** the restricted Reyle anchor query (S2.3), recorded with service version and retrieval date; both Kamdar thresholds into the `conatal` header; the Sartore attribution rewritten to McKee S4.3; the golden master cut after the bump.

---

## 8. Consolidated source register

**Verified** = quoted numbers confirmed present in the version of record. **Form only** = supplies a functional form, needs no numerical check. **Upgrade path** = named for the future, verify before first *use*, not before shipping.

### Galactic structure and the Milky Way anchor

| source | reference | governs |
|---|---|---|
| Juric et al. 2008 | ApJ 673, 864 | disc scale lengths/heights, halo power law - **NUMBER density (C2)** |
| GRAVITY Collaboration 2019 | A&A 625, L10 | R0 = 8178 +/- 13 +/- 22 pc |
| Bland-Hawthorn & Gerhard 2016 | ARA&A 54, 529 | disc scale length review, h_d=2.6+/-0.5 kpc - **LUMINOSITY scale length (C2)** |
| Licquia & Newman 2015 | ApJ 806, 96 | Milky Way stellar mass, 6.08+/-1.14e10 Msun |
| Wegg & Gerhard 2013 | MNRAS 435, 1874 | bar density shape, axis ratios, scale lengths, 27deg |
| Wegg, Gerhard & Portail 2015 | MNRAS 450, 4050 | bar half-length, position angle, scale heights |
| Portail et al. 2017 | MNRAS 465, 1621 | pattern speed - deliberately unused |
| Xiang & Rix 2022 | Nature 603, 599 | disc cohort age structure; thin/thick seam at 8 Gyr |

### The local census

| source | reference | governs |
|---|---|---|
| Golovin et al. 2023 (CNS5) | A&A 670, A19 | observed class fractions; total cross-check |
| Reyle et al. 2021 | A&A 650, A201 | **the refereed anchor**, 339 systems; superseded for multiplicity |
| Reyle et al. 2022 | Cool Stars 21 proceedings, arXiv:2302.02810 | 336 systems - a proceeding, not refereed (C10) |
| the living 10 pc list | gruze.org/10pc / VizieR / GAVO TAP tenpc.main | the anchor dataset - needs a retrieval date; query still to be run (S2.3, C13) |
| Gonzalez-Payo, Caballero, Cifuentes, Cortes-Contreras & Rica 2026 | MNRAS 549, 1, stag838, arXiv:2605.04094 | multiplicity: MF 26.2 %, CSF 0.350 (C10) |
| Holberg, Oswalt, Sion & McCook 2016 | MNRAS 462, 2295 | WD space density 4.8+/-0.5e-3 pc^-3, 74 % single |
| McKee, Parravano & Hollenbach 2015 | ApJ 814, 13 | local stellar mass density; remnant/visible split; NS/BH treatment |
| Lian et al. 2025 | ApJL 990, L37, arXiv:2508.13665 | second independent surface density (25.074); WD/NS/BH decomposition (C5); C3/C4 caveats |
| Sartore et al. 2010 | A&A 510, A23 | NS velocity/height distribution - attribute to McKee S4.3, do not quote directly |

### Stars, planets and habitability

| source | reference | governs |
|---|---|---|
| Mamajek & Pecaut sequence | living table | class -> T_eff, colour, luminosity, mass, radius, M_V |
| Kroupa IMF | MNRAS 322, 231 | mass function underlying Upsilon |
| Kopparapu et al. 2014 | ApJ 787, L29 | habitable-zone bounds |
| Kepler DR25 | NASA Exoplanet Archive | planet occurrence by class |
| Fischer & Valenti 2005 | ApJ 622, 1102 | giant-planet occurrence vs metallicity |
| Wright, Drake, Mamajek & Henry 2011 | ApJ 743, 48 | Ro_sat ~ 0.13 |
| Pass, Charbonneau & Vanderburg 2025 | ApJL 986, L3 (C9) | mid-to-late M dwarfs stay saturated longer than assumed |
| Meni-Gallardo & Palle 2026 | MNRAS 550, 1, stag1163 | EECS cosmic shoreline: slope 5.77, zero point -4.35 |
| Dohnanyi 1969 | JGR 74, 2531 | belt size-frequency distribution (form) |
| Canup & Ward 2006; Domingos et al. 2006; Bierson 2023; Marley 2007; Charnoz 2010-2011 | as recorded in `moons` | moon formation, stability, composition |

### Co-natal groups and cluster demographics

| source | reference | governs |
|---|---|---|
| Kamdar, Conroy, Ting, Bonaca, Smith & Brown 2019 | ApJL 884, L42 | ~80 % conatal fraction; < 1 Gyr window; C8 |
| Bovy 2016 | ApJ 817, 49 | sigma_intra upper limits, element-banded |
| Lada & Lada 2003 | ARA&A 41, 57 | context only - a birth statistic, grades nothing |
| Boutloukos & Lamers 2003; Lamers et al. 2005 | MNRAS 338, 717; A&A 441, 117 | cluster dissolution - parked to the deferred `clusters` spec |
| Hunt & Reffert (Gaia census) | A&A | local open-cluster frequency - deferred with the above |

### Morphology beyond the Milky Way

| source | reference | governs |
|---|---|---|
| Hernquist 1990 | ApJ 356, 359 | spheroid density profile; M(a)=M/4 |
| Terzic & Graham 2005 | MNRAS 362, 197 | Hernquist inadequate at low Sersic index - pillar under the elliptical mass floor |
| Shen et al. 2003 | MNRAS 343, 978 | size-mass relations, early and late type |
| Kauffmann et al. 2003a | MNRAS 341, 33 | origin of Shen's stellar masses |
| Shimizu & Inoue 2014 | arXiv:1310.0879 | remnant-mass definitions differ by up to 2x |
| McDermid et al. 2015 | MNRAS 448, 3484 | early-type SFH, ages, central metallicity zero point |
| Kuntschner et al. 2010 | MNRAS 408, 97 | resolved metallicity gradient, -0.2 dex/decade |
| Koleva et al. 2011 | MNRAS 417, 1643 | dwarf-to-giant gradients, no mass correlation |
| Spolaor et al. 2009 | ApJ 691, L138 | mass-gradient relation and ~3.5e10 Msun transition |
| Erwin et al. 2015 | MNRAS 446, 4039 | composite bulge split; pseudo/classical mass fractions |
| Gao, Ho, Barth & Li 2018 | ApJ 862, 100 | S0 B/T and Sersic index for `classical` |
| Laurikainen et al. 2010 | MNRAS 405, 1089 | S0 bulge r_eff/h_r = 0.20 |
| MacArthur, Courteau & Holtzman 2003 | ApJ 582, 689 | 0.22+/-0.09, late-type spiral cross-check only (C12) |
| Rodriguez-Gomez et al. 2016 (Illustris) | MNRAS 458, 2371 | accreted fraction vs radius (simulation) |
| Remus & Forbes 2021 (Magneticum) | arXiv:2101.12216 | ex-situ fraction vs mass, transition radius (simulation) |
| Oyarzun et al. 2019 (MaNGA) | ApJ 880, 111 | observational ex-situ check, large scatter |

### Cited for form only

Sersic 1963, de Vaucouleurs 1948, Ferrers 1877, Mestel 1952, Pogson's magnitude definition, Prugniel & Simien 1997 (named upgrade path). **Cummings et al. 2018** (IFMR), **Vanderburg et al. 2020** (WD 1856+534 b) and **Lallement et al. 2019** (3D dust maps) are named upgrade paths - verify before first *use*.

---

## 9. What this document is not

Not a replacement for module specs already written and good - where one exists, this brief consolidates its rulings, corrections and seams and points at the spec for the rest. Not a licence to reorganise: the seams are where the law in S1 put them, and a seam that seems inconveniently placed is worth arguing about explicitly rather than quietly moving.

Above all, not finished science. Every `tunable` in every ledger is an invitation, every `upgrade path` is a promise to somebody, and the whole architecture exists so that redeeming any of them costs **one file and one version bump**. If that ever stops being true, the seam moved - fix the seam.
