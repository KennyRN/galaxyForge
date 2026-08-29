galaxyForge — P14 Ruling & Handoff: unbarred arm inner-taper attach radius, and arm count by class

Date: 28 August 2026
Status: owner-ruled (four decisions below), coding-agent-ready. **Implemented, gated, built - 28 Aug 2026, same day.**
Concern touched: the spiral density field's arm inner taper (galaxyModel.discTerm → armInnerTaper) and the seeded arm-count draw (spiralArms.generateSeededArms), fed by galaxyParameters and spiralArms.
Classification: shape break. armFactor is inside the density field, so this changes generated output. Requires a genVersion bump and an Amendment P fork. Blast radius is narrow (see §6).

## Implementation note (added post-ruling, not part of the original handoff)

Implemented exactly per this document's own change spec, with two owner
decisions resolved during coding (both via direct question, not guessed):

- **fieldShapeVersion**: bumped 1 → 2 (the owner's own recommendation,
  taken - the field's generation logic genuinely changed for two
  morphologies).
- **Exact unbarred value / flocculent range**: shipped exactly as this
  document's own change spec already specified (1500pc; flocculent [4,5]) -
  neither was actually left open at the code level, only flagged as
  discussable in §7.

Two things surfaced during implementation, not anticipated in the original
handoff, both fixed:

1. **G-P14-c's own naive design was wrong.** `measuredArmMagnitude` sums
   EVERY population via `densityAt` - with `barEnabled=true` that includes
   the boxy/peanut BAR itself, a genuinely theta-dependent (triaxial) term
   in its own right, independent of arm contrast entirely. A first version
   of this gate failed (correctly - it was measuring "is anything
   azimuthally asymmetric here", not "is the ARM tapered to zero here").
   Fixed by isolating a single arm-responsive, non-bulge population
   (`spiralOldThin`) for this specific check.

2. **Pre-existing gate 15w's own premise broke, correctly.** It compared
   `grandDesign` vs `multipleArm` arm tables for the same seed expecting
   identical whole-array geometry (pitchDeg/RrefPc/thetaRefDeg/weight/kink)
   - valid before this ruling, when arm count was class-independent. Ruling
   4 makes arm count class-dependent BY DESIGN, so a whole-array comparison
   (different lengths now) and a per-arm `thetaRefDeg` comparison at index
   ≥1 (its own `evenSpacingDeg = (360/armCount)*i` formula is itself
   armCount-dependent) no longer apply - not a channel-isolation
   regression, a correctly-changed premise. Narrowed to the two shared
   major-arm indices (0-1, present in every class) and to `thetaRefDeg` at
   index 0 only (`evenSpacingDeg` there is 0 regardless of armCount, so it
   still isolates the same channel-independence property this gate has
   always tested - reverified analytically that every draw consumed up to
   and including index 1's own kink roll is identical in count and outcome
   across classes).

**Golden master**: `verification/golden/gen15.json` cut. Checked directly
(not assumed): `goldenMaster.conformance.ts`'s own spiral/barredSpiral
fixtures build via `createSpiralModel(barEnabled)` with NO `params`
argument - i.e. `DEFAULT_GALAXY_PARAMETERS`, built with `barEnabled`
omitted (defaults `true`) and `armSource: 'observed-mw'` (never calls
`generateSeededArms`) - so that harness never exercises either P14 change
regardless of which morphology label it claims. Confirmed by diffing
`gen14.json` against `gen15.json` directly: `placementData`/`remnantData`
are byte-identical for all four tracked morphologies; only `systemCoreData`
differs, purely from the literal `genVersion` number stamped into every
record. Real seeded-arm regression coverage for this bump lives in the new
gates below instead, which exercise the changed code paths directly.

**Visually verified**, not merely gated (disposable diagnostic, this
session, per this project's own "verify, don't just reason" discipline):
rendered the exact reported seed (`5snridizo2s`, rolled `armClass:
'multipleArm'` - matches this document's own §1 finding) at scale 2.0,
unbarred - a genuinely spiral-looking plate, arms reaching close to
centre, matching plate C's own description ("an unmistakable... spiral")
far more literally than plate A's "circular blob". A barred sanity render
at the same scale correctly still shows the larger bar-end hole, confirmed
unchanged.

**Gates**: 40/40 suites green (up from the gates already in place before
this bump - `galaxyParameters.conformance.ts` gained the "P14: unbarred
inner attachment" block, G-P14-a through d; `spiralArms.conformance.ts`
gained gate 17, G-P14-e through h, and gate 15w was revised per above).
`npx tsc --noEmit` clean. `npm run build` clean.

---

[Original handoff document follows verbatim below]

---

## 1. Orientation — the complaint and the diagnosis

A user-created Spiral galaxy (seed 5snridizo2s, size 2) rendered as a smooth circular blob with no visible arms — "not what I expected from a spiral galaxy". The plate is faithful; the field itself carries almost no arm signal where the galaxy is bright.

The isophote renderer paints the raw sampled surface density with arm-contrast modulation deliberately removed (isophoteRenderer.computeDensityDisplayField, and the header at applyOuterBreak which already reported the axisymmetric-dominance symptom back to the owner). So the picture can only be as arm-defined as the field is. It isn't.

Measured, this model, real (scaled) radii:

| R (kpc) | arm contrast (mag) | max/min ratio |
|---|---|---|
| 2 – 8 | 0.000 | 1.000 |
| 10 | 1.06 | 2.6× |
| 12 | 1.33 | 3.4× |
| 15 | 0.82 | 2.1× |

Arm modulation is identically zero across 2–8 kpc and only switches on near 10 kpc, by which point the axisymmetric bulge+disc envelope has already fallen ~40× (4.05 mag) from its peak. Every bright pixel is pure axisymmetric term, so the plate can only read as circular.

Root cause. armInnerTaper gates arms to zero below ARM_INNER_ATTACH_RADIUS_PC = 5000 pc — the sourced Wegg/Gerhard/Portail 2015 bar-end half-length (Ruling 5 / By-law S; spiralArms.conformance gate 13i asserts === 5000). Two factors compound:

1. The user's galaxy is unbarred (spiral), yet arm-start is still pinned to the bar-end radius. There is no bar, so there is no physical reason to clear a 5 kpc hole. This is the dominant lever.
2. scaleSpiralModel is a uniform coordinate rescale, so at size 2 the 5 kpc radius becomes 10 kpc in real space, doubling the arm-free zone. This is a symptom of (1), not an independent defect.

A third, secondary factor — the axisymmetric envelope's ~4 mag radial dynamic range swamping the arm's ~1 mag azimuthal swing even where arms exist — governs how bold arms read, not whether they exist. It is addressed by ruling (3) below (defer).

Empirical proof of cause. Three plates were rendered from the identical seed (reproduction recipe in the appendix):

- A — as-is (size 2): circular blob, reproduces the screenshot.
- B — same seed at size 1 (arms attach 5 kpc real): faint arm arcs appear in the mid-disc.
- C — size 2, arm attach radius pulled to 1.5 kpc, contrast unchanged: an unmistakable two-arm spiral.

C establishes that the attach radius alone turns "elliptical blob" into "recognisable spiral". No contrast change was needed to recover the shape.

Adjacent finding (now fixed under ruling 4): the seed rolled armClass = multipleArm but armCount = 2 + floor(rng·3) landed on 2 — a definitional contradiction, since multiple-arm means three or more. The class did not constrain arm count. Folded into this shape break rather than deferred; see §2 ruling 4, §3.4, and gates G-P14-e/f/g.

## 2. The rulings (owner decisions, recorded)

1. The arm inner attach radius is morphology-dependent. Barred spirals keep the bar-end radius (5000 pc, unchanged, gate 13i preserved). Unbarred spirals attach much further in, on a geometry rationale, not a "smaller bar" one.
2. The attach radius continues to scale with galaxy size. No exemption from scaleSpiralModel. Once (1) sets the unbarred base radius small, scaling it is harmless, and exempting it would break the self-similarity invariant the module's correctness rests on.
3. The envelope-dominance / arm-boldness question is deferred. No change to armContrast, DRIMMEL_SPERGEL_K, ARM_CLASS_CONTRAST_TARGET_K, or any display path in this package. Fix (1), render it, revisit only if arms still read too faint for the Hurt-plate target — and then via the young-star overlay or a gated presentation render mode, never by inflating the stellar-density field past its sourced value.
4. Arm count is class-dependent, folded into this same shape break. generateSeededArms currently draws armCount = 2 + floor(rng·3) (2–4) with no reference to armClass, so a multipleArm galaxy can roll 2 arms — definitionally a grand design, not a multiple-arm. Since this package is already a field shape break with a genVersion bump, the count-by-class fix rides it rather than forcing a second fork later ("whilst we can"). Basis: Elmegreen & Elmegreen 1987 arm classes — grand design has two dominant arms, multiple-arm has three or more (inner two-arm symmetry branching outward), flocculent has many short fragments.

## 3. Change spec

(See the change spec sections 3.1-3.5 as implemented in `spiralArms.ts`, `galaxyParameters.ts`, and `galaxyCreationModals.ts` - reproduced in full in the original chat handoff; not re-transcribed here since the actual shipped code is the source of record. Every NON-change in §3.5 was honoured: `scaleSpiralModel`, `armContrast`/`DRIMMEL_SPERGEL_K`/`ARM_CLASS_CONTRAST_TARGET_K`/`ARM_CLASS_MODULATION`, `armInnerTaper`'s signature/body, and the `isMajor = i < 2` split / arm weights are all untouched.)

## 4-7. Interface impact, gates, versioning, open sub-decisions

See the implementation note at the top of this file for what was actually decided and shipped. Sections 4-7 of the original handoff (interface/contract impact, the conformance-gate list, the versioning matrix, and the open sub-decisions / adjacent observations) are preserved as owner-facing record but superseded where the implementation note above says so.

## Appendix — reproduction

Core science modules are Obsidian-free and bundle standalone. Recipe used for every figure above:

```
seed         = "5snridizo2s"
morphology   = spiral (unbarred), armClass rolled = multipleArm, nArms = 2
model        = scaleSpiralModel(createSpiralModel(false, params, upsilonFor), scale)
params       = makeDefaultGalaxyParameters(seed, generateSeededArms(seed, armClass),
                                            'seeded', armClass)   // barEnabled defaulted true today
contrast     = measuredArmMagnitude(model, R_pc)   // galaxyModel export, Elmegreen A(R)
plate        = computeDensityDisplayField(...) -> interpolatedBandColor per pixel
```

Constants of record at time of writing: ARM_INNER_ATTACH_RADIUS_PC = 5000; ARM_INNER_TAPER_SMOOTH_PC = 300; DRIMMEL_SPERGEL_K = 1.14/0.86 ≈ 1.326; ARM_CLASS_CONTRAST_TARGET_K = { flocculent 4.0, multipleArm 2.65, grandDesign 3.0 }; armCount = 2 + floor(rng·3) (class-independent, the thing ruling 4 replaces); CURRENT_GEN_VERSION = 14.

Citation for ruling 4. Elmegreen, D. M. & Elmegreen, B. G. 1987, "Arm classes for spiral galaxies", ApJ 314, 3 (scheme introduced 1982). Grade: provisional. Reference and its qualitative arm-count semantics — grand design = two dominant arms; multiple-arm = three or more with inner two-arm symmetry branching outward; flocculent = many short fragments — are consistently attested across multiple independent citing works (S⁴G morphology catalogues, Buta et al. 2015, and later arm-class studies) confirmed 28 Aug 2026, but the 1987 version of record has not itself been read in full. To be promoted to sourced only after full-text confirmation, per project citation discipline. The numeric ranges in ARM_CLASS_ARM_COUNT are calibrated regardless — no source states arm counts for a procedural generator; the grand-design 2 and multiple-arm ≥3 bounds are the sourced anchors the ranges are built around.
