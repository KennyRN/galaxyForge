<!-- Superseded in part by galaxyForge-P13-ERRATUM-2-2026-08-27.md (same folder) - read
that first. It closes §6's version-of-record caveat (Sun 2024 Table 1 confirmed
unchanged at the published version - promotes §§1-4 below from provisional to
sourced) and §8's Contopoulos & Grosbøl item (both papers now read at source).
Filed unmodified below per the erratum's own "prepend, don't rewrite" instruction. -->

# galaxyForge — Ruling 10 research response: arm extent ordering (Stage D)

Response to the owner request of 2026-08-27. Cut date: 2026-08-27.

*Source read: Sun, Yang, Zhang, Yan, Su, Chen, Zhou, Xu, Wang, Wang, Jiang, Sun, Lu,
Ju, Zhang & Wang 2024, "A New View of the Spiral Structure of the Northern Outer
Milky Way in Carbon Monoxide", ApJL 977, L35, DOI 10.3847/2041-8213/ad9605*,
published 2024 December 11. Body and Table 1 read in full from the accepted
manuscript (arXiv:2411.11220, dated 19 November 2024, "Submitted to ApJL"),
cross-checked against the IOPscience published abstract and body text. Grade:
provisional, with the specific caveat in §6 — the accepted manuscript and the
published version agree on every value checked, but the tables have not been
seen at the version of record.

## Verdict up front

Sun et al. 2024 does give a genuine per-arm length table, and it is cleanly
Reid-anchored — but it covers three arms, not six, and its lengths are
survey-coverage measurements of exactly the kind already flagged in Reid's β
spans. It does not supply a replacement ordering. It does, separately and more
importantly, put real CO-traced gas roughly 8 kpc beyond the Stage-C shared
terminus.

| question | answer |
|---|---|
| 1 — per-arm lengths? | Yes, Table 1 col. 3. Three arms: Perseus, Outer, OSC. Reid 2019 names and loci used throughout. |
| 2 — the table | 16.2 / 32.9 / 43.4 kpc. No uncertainties are quoted on any length. |
| 3 — which arm reaches 22 kpc? | OSC, in the third quadrant, at ≈21.8 kpc. The Outer arm also clears 13.86 kpc, at ≈14.05. |
| 4 — coverage vs length? | Coverage. Demonstrable to within 3–17% from the paper's own numbers (§4). |
| 5 — clean six-arm mapping? | No. Do not force one. |

## 1 — Per-arm, and Reid-anchored

Table 1 is per-arm, not aggregate. The abstract's "16–43 kiloparsecs" is not a
spread over many segments — it is the three individual arm lengths, 16.2, 32.9
and 43.4 kpc.

The paper uses Reid's names and Reid's loci, and does so structurally rather
than in passing:

- Arm assignment is by matching to Reid 2019. Each cloud is assigned "by
  matching its Galactic longitude and LSR velocity to the nearest known spiral
  arm on the l–v_lsr map", with arm boundaries defined by equal velocity
  separations from adjacent arm centres. There is no independent CO
  segmentation scheme requiring translation.
- The frame is Reid 2019 fit A5 — the same rotation curve and Galactic
  parameters this project already uses. No frame conversion is needed, which
  is a real convenience and rare.
- The spiral model is Reid's, `ln(R/R_kink) = −(φ − φ_kink) tan ψ`, with the
  same kink formalism.

So the mapping problem is not one of nomenclature. It is one of coverage, and
of one structural mismatch:

**OSC is not a row in `ARMS`.** In Reid 2019 §3.2.2 the Outer–Scutum–Centaurus
arm is the far-side continuation of Scutum–Centaurus, not a separate arm.
Sun's "OSC" therefore maps onto the outer extension of the project's
Scutum-Centaurus row, not onto that row's tabulated Sct–Cen segment, which
lies at 3.6–5.4 kpc. Assigning Sun's 43.4 kpc to the Scutum-Centaurus row
would be a category error.

**Three of six arms are absent.** Sagittarius–Carina, Norma and Local have no
entry. Local is excluded explicitly and for stated reasons: its broad
Galactic-latitude distribution is not well covered by current MWISP data, and
its kinematic distances are too uncertain.

## 2 — The table

Table 1, columns 1–6. Mass and M/L are given twice, for constant X_CO ("model
1") and for varied X_CO with sensitivity clipping ("model 2"); length, φ range
and N are properties of the traced sample and are common to both.

| arm | φ range (°) | length (kpc) | mass, M1 (M☉) | M/L, M1 (M☉ kpc⁻¹) | N | mass, M2 | M/L, M2 |
|---|---|---|---|---|---|---|---|
| Perseus | −19.7 → −3.8, 1.5 → 77.4 | 16.2 | 2.4 × 10⁷ | 1.5 × 10⁶ | 21,420 | 4.0 × 10⁷ | 2.5 × 10⁶ |
| Outer | −26.8 → −4.7, 6.2 → 150.4 | 32.9 | 1.6 × 10⁷ | 4.9 × 10⁵ | 9,436 | 3.3 × 10⁷ | 1.0 × 10⁶ |
| OSC | −27.3 → −8.3, 9.6 → 155.8 | 43.4 | 1.7 × 10⁶ | 3.9 × 10⁴ | 1,306 | 4.8 × 10⁶ | 1.1 × 10⁵ |

Fitted geometry, model 2 case "b" — the paper's own preferred fit, which drops
low-mass clouds, Perseus clouds in the second quadrant, and clouds at φ > 72°:

| arm | φ_kink (°) | R_kink (kpc) | ψ< (°) | ψ> (°) | N |
|---|---|---|---|---|---|
| Perseus | 30.0 | 9.8 | 8.8 | 8.8 | 499 |
| Outer | 17.8 | 13.4 | 3.5 | 10.9 | 1,795 |
| OSC | 47.0 | 16.4 | 12.3 | 12.3 | 367 |

Four things to record about this table.

**No uncertainties are given** on any length, mass, M/L, pitch angle, R_kink
or φ_kink. Not one error bar appears in Table 1. Under the project's
three-way ledger a length with no stated uncertainty cannot carry a sourced
grade for anything that depends on its precision.

**The φ ranges are discontinuous.** Each arm is traced over two disjoint
intervals with a gap near φ ≈ 0 — the anticentre direction, where kinematic
distances degenerate. The quoted length is the sum over two traced pieces,
not a continuous arc.

**The table note double-assigns column 6.** It reads "Columns (3)-(6): total
length and total mass ... ratio between the total mass and total length",
then "Column (6): the number of MCs used to arm fitting." The first should be
(3)–(5). A source typo, harmless but worth recording so nobody re-derives a
column mapping from it.

**The abstract's pitch-angle range is rounded.** The abstract says 4° to 12°;
Table 1 spans 3.2° to 12.5°. Quote the table.

## 3 — OSC reaches ≈22 kpc, and the Outer arm also clears the Stage-C terminus

Propagating Table 1's model-2b parameters through the paper's own spiral
model across each traced φ range, in the Reid fit-A5 frame the project
already uses:

| arm | R at outer end | R at inner end | against ARM_TERMINUS_SHARED_PC = 13.86 kpc |
|---|---|---|---|
| Perseus | 11.21 | 8.62 | 2.65 kpc inside |
| Outer | 14.05 | 8.58 | 0.19 kpc beyond |
| OSC | 21.76 | 10.84 | 7.90 kpc beyond |

This matches the paper's own text, which places the CO structures "out to a
radius of ~22 kpc in the third Galactic quadrant" — the far end of the
newly-proposed OSC extension, traced by 1,306 distant clouds running from
(l, b, v) ≈ (195°, −1.2°, 36 km s⁻¹) to (230°, −3°, 83 km s⁻¹).

This bears on Stage C, not Stage D. The shared terminus is falsified as a
physical ceiling by CO-traced gas in at least one arm and marginally in a
second. Two honest qualifications before that is acted on. First, OSC is a
proposed extension — the paper says the third-quadrant feature "might be a
new extension of the OSC arm", and offers a constant 12.3° pitch angle
fitting the existing plus new clouds as support, not proof. Second, these are
kinematic distances: the paper states that a 5 km s⁻¹ LSR uncertainty gives
≈0.47 kpc distance uncertainty for Perseus and ≈0.95 kpc for Outer, and the
CO loci sit ≈0.5 kpc (Perseus) and ≈1 kpc (Outer) off Reid's HMSFR loci. The
Outer arm's 0.19 kpc excess over 13.86 is inside that error; OSC's 7.90 kpc
is not.

For context on scale: the paper argues that Scutum–Centaurus plus its OSC
continuation extends ~80 kpc, wrapping a full 360° around the Galaxy. If any
single number in this paper is a candidate for a physical arm length, it is
that one — and it is offered as an argument for symmetric density-wave arms,
not as a measurement.

## 4 — The coverage-versus-length conflation is present, and it is demonstrable

MWISP's footprint is l = [12°, 230°], b = [−5.25°, +5.25°] — 218° of 360° in
longitude, the northern Galactic plane only (PMO Delingha 13.7 m), and
±5.25° in latitude. The paper restricts further to the outer Galaxy, where
velocity crowding is alleviated and the near/far distance ambiguity
vanishes.

The paper is candid about this in four places, which is to its credit and is
also the answer to the question:

- Table 1's own note defines column 3 as the total length of the arm segment
  "traced by the MWISP data".
- Local is dropped for coverage reasons.
- The latitude limit truncates the warp: the scarcity of OSC clouds at
  70° < l < 100° "could be due to a large warp in the outskirts of our
  Galaxy that extends beyond our current coverage range", with MWISP phase
  II at b = ±10° named as the test.
- Mass completeness is explicitly unfinished: "the incompleteness in
  detecting low-mass clouds has not yet been accounted for."

The arithmetic settles it. For a log spiral, arc length ≈ Δφ · R̄ · sec ψ.
Taking each arm's own traced φ span and mean radius:

| arm | φ span | R̄ (kpc) | predicted L | stated L | ratio |
|---|---|---|---|---|---|
| Perseus | 91.8° | 10.27 | 16.7 | 16.2 | 0.97 |
| Outer | 166.3° | 12.46 | 36.4 | 32.9 | 0.90 |
| OSC | 165.2° | 17.75 | 52.4 | 43.4 | 0.83 |

The lengths are reproduced to within 3–17% by coverage times radius alone;
the residual is the variation of R along each arm, which the flat
approximation ignores. Outer and OSC have essentially identical azimuthal
coverage — 166.3° against 165.2° — yet lengths of 32.9 and 43.4 kpc. Their
length ratio, 1.32, tracks their mean-radius ratio, 1.43. The length
difference between those two arms is the radius difference. Nothing physical
about arm extent is being measured.

And the resulting ordering contradicts the interim one:

| arm | interim (Reid β spans) | Sun 2024 traced length |
|---|---|---|
| Perseus | 1.00 | 0.37 |
| Scutum–Centaurus | 0.75 | not covered |
| Sagittarius–Carina | 0.69 | not covered |
| Outer | 0.63 | 0.76 |
| Norma | 0.36 | not covered |
| Local | 0.30 | excluded by the authors |

Perseus goes from longest to shortest of the three. The two schemes disagree
on rank order, not merely on magnitude — and each is an artefact of a
different survey's footprint. Reid's is northern VLBI target selection;
Sun's is a northern single-dish longitude window times radius. Substituting
one for the other would trade a known bias for an unknown one and gain
nothing.

Note also that the paper's own qualitative reading points the other way from
its own length column: Perseus is described as the most prominent structure
along most of its length, quasi-continuous, with the largest linear mass —
1.5 × 10⁶ M☉ kpc⁻¹ against OSC's 3.9 × 10⁴, a factor of 38. OSC is the
longest number in the table and the faintest arm in the paper, fragmented in
CO, resting on 1,306 clouds against Perseus's 21,420. Ranking arms by that
length column inverts the paper's own account of which arm is real.

## 5 — No clean six-arm mapping. Do not force one

Stated plainly, as asked. Sun et al. 2024 cannot supply a relative-extent
ordering for the `ARMS` table, for four independent reasons, any one of
which would be sufficient: three of six arms absent; one of the three
present not being a row in `ARMS`; no uncertainties on any length; and the
lengths measuring survey coverage rather than arc extent.

> **Ruling box — owner decision**
>
> **Recommendation: retain the interim Reid-β-span ordering, and close the
> search rather than continue it.**
>
> The reasoning is not that Sun 2024 is a poor paper — it is a good one, and
> unusually honest about its own selection function. It is that no all-sky
> survey measures an arm's physical arc length, because no survey sees a
> whole arm. Every candidate tracer measures its own footprint. The interim
> ordering's flaw is therefore not a defect to be fixed by a better source;
> it is a property of the observational situation.
>
> If that is accepted, the useful action is not replacement but
> relabelling: rename the field so it states what it measures (a
> traced-coverage proxy, not a length), keep the grade at `calibrated`, and
> record in the provenance header that the search was conducted and closed,
> with Sun 2024 named as the strongest candidate examined and rejected. That
> converts an open obligation into a documented negative result, which is
> worth more than an open TODO.
>
> The alternative — proceed to Hou & Han 2014 — is set out below, but my
> expectation is that it returns the same answer.

## If the search does continue: Hou & Han 2014, not Drimmel

Hou & Han 2014 (A&A 569, A125) is the better of the two, for a reason that
emerged from this reading rather than from its own merits: Sun et al.
adopted Hou & Han's Gaussian face-on projection method (their Eq. 1 cites
Hou et al. 2009 and Hou & Han 2014), so the two are methodologically
commensurable, and Hou & Han combine H II regions, GMCs and masers rather
than relying on one tracer's selection function. Grade: unverified — not
examined.

Drimmel should be deprioritised, on evidence from inside Sun 2024. Comparing
against Skowron et al. 2019's classical Cepheids, the paper's own verdict is
that the Cepheids "are still not numerous enough to well define the spiral
structure, particularly on the far side of the Milky Way". A ~3000-star
WISE-calibrated sample may improve on that, but the far-side sparsity is the
exact regime a length ordering needs, and a 2024 paper that looked has said
it is not there. Grade: unverified, with that adverse note attached.

## 6 — Version-of-record caveat

Everything above is read from the accepted manuscript. The abstract, the
three arm lengths, the 22 kpc figure, the pitch angles, the MWISP footprint
and the §3–§5 text all match the IOPscience published version where the
published text was visible. Table 1 itself has not been seen at the version
of record, and this project has now been bitten twice by preprint-to
-publication changes in an ApJ-family journal. If any number from Table 1
enters a provenance header, the published table should be checked first —
IOPscience, same access route as the Honig & Reid and Reid uploads.

Grade for everything in §§1–4: provisional. It would be sourced on sight of
the published Table 1.

## 7 — Bundled item: Quillen & Minchev 2005 closes

The citation attaches to `ultraharmonic_4_1`. Not to an inner-Lindblad
member. The trap flagged in the P13 report §3 is real and now has a
documented cause.

Quillen & Minchev's own phrasing is "the 4:1 inner Lindblad resonance" —
they generalise "Lindblad resonance" to the m:1 family, so their 4:1 member
is the ultraharmonic, not the classical m = 2 ILR. The confusion is a
preprint artefact with a clean paper trail:

- arXiv v1 and v2 abstracts: "the 4:1 Inner Lindblad Resonance (ILR)" —
  capitalised, with the ILR abbreviation attached.
- AJ 130, 576, published abstract: "the 4:1 inner Lindblad resonance" —
  lowercase, and the "(ILR)" abbreviation is gone.

The abbreviation was removed between preprint and publication. Any
secondary source describing this as "the ILR" is quoting the preprint. The
version of record does not use that abbreviation for this resonance at all.

The pattern speed is confirmed as a ratio in both versions: approximately
0.66 ± 0.03 times the Sun's angular rotation rate. Two orbit families:
square-shaped orbits whose peaks lie on and support the two dominant
stellar arms (Pleiades/Hyades), and a second family 45° out of phase (Coma
Berenices).

Grade: provisional — published abstract read at IOPscience, body read only
in arXiv v2. That is sufficient to settle the enum question, which was the
consequential part.

## 8 — Bundled item: Contopoulos & Grosbøl, status unchanged

Still ADS-full-text robots-blocked. No automated route exists; this needs a
human with a browser, exactly as the request anticipated. Nothing to add
beyond what the P13 report §7 already records — including that a 2004
review reports weak spirals extending to corotation and barred hosts
fitting better as corotation/OLR-limited, which if it survives contact with
the originals would support Stage C's current OLR choice for the Milky Way
table rather than undermine it.
