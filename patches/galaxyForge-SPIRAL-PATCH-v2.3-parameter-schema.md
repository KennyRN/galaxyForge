# galaxyForge - Spiral Build Package **patch v2.3**: pinned-galaxy parameter schema

**Status: amendment.** Replaces v2 S1.1 in full. Patches v2 S10 gate 19 and patch v2.1 S2. **Cut date:** 2026-08-04.
Raised by the coding agent during Pass 2. The contradiction is real; v2 S1.1 was illustrative and read as normative. Values from `derive_arm_constants_v3.py`.

---

## 1 - Ruling on the contradiction

**v2 S1.1 was an illustrative fragment, not the schema.** It showed the *shape* of a parameter block and omitted most of its contents. Amendment P1's enumeration is the requirement; the YAML was not it. That was my error and it is exactly the failure mode the agent describes: an example that reads as a specification.

**v2 S1.1 is hereby superseded by S4 below.** Delete the YAML in v2 S1.1 and replace it with a pointer to this patch, so it cannot be transcribed again.

**`armKappa: 45` is confirmed removed.** It is a v2-era leftover. Patch v2.1 makes kappa a function of `(arm, R)` derived from the width relation, so a stored scalar kappa has no meaning and would be actively misleading - an implementer could reasonably read it as an override. The width-relation constants (`armWidth.*`) fully determine kappa and replace it. No galaxies exist, so there is nothing to migrate.

---

## 2 - Gate 19 scoping: **externalise everything in Pass 2. Do not defer.**

The agent's instinct to contain the change is sound engineering and wrong here, for one reason that outweighs it:

**A partially-externalised block creates galaxies that can never be retroactively protected.** The moment the first galaxy is written under `fieldShapeVersion: 1`, it is pinned to whatever the block contains. If the disc scale length is not in it, that galaxy is not protected against a disc scale-length change - not now, and not ever. Back-filling later requires knowing which value that galaxy was generated with, which means keeping a table of historical module defaults keyed by `parameterSetVersion` and having generators read it. That is a museum of default-sets, it makes `parameterSetVersion` load-bearing in contradiction of Amendment P, and it reintroduces precisely the versioned-code problem P2 was designed to eliminate.

Deferring also makes gate 19 vacuous. "Every module-level default perturbed" would have to mean "every default we happen to have externalised", which tests nothing and gives false assurance at the moment it matters most - before any user galaxy exists.

**The cost is smaller than it looks.** Externalising a constant is not the same as changing a module. The constant moves from a module-level `const` to a field on a parameter object that is threaded through; the module's logic is untouched. It is a wide, shallow, mechanical change, not a redesign of disc or bar. It should not pull any *design* work forward.

**Scope limit - the block is Tier G only.** Do not externalise Tier S constants (`stellarProperties`, `multiplicity`, `planets`, `habitability`, `belts`, `moons`, and modules 12-15). Those are pinned by the *sheet content on disk* plus its per-module stamps under Amendment R, not by the galaxy block. Tier D (display) is never pinned. If a constant only affects what a sheet says and not which systems exist or where they are, it does not belong here.

**If the enumeration turns out large, stop and report rather than half-doing it.** A block that is 90 % complete is worse than one that is 50 % complete and known to be, because gate 19 will pass on everything you remembered and silently miss what you didn't.

---

## 3 - Gate 19 is the enumeration procedure, not just a test

I have not seen the disc, bar or co-natal modules, so I cannot hand you their key names or defaults. Inventing them would be the same class of error as the v1 arm table - asserting values without a source. What I can give you is a procedure that derives the complete schema mechanically, which is better than a list I guessed:

> **Run gate 19 as a fuzzer over module-level constants.** For every numeric module-level `const` in every Tier G module, perturb it by a few percent, regenerate a fixed test region from a fixed galaxy file, and compare. **Any perturbation that changes the output identifies a constant that must be in the block.** Any perturbation that changes nothing is either dead or Tier D - check which, then delete it or leave it.
>
> Iterate until no perturbation changes the output. At that point the block is complete *by construction*, and gate 19 is testing something real.

Run this over `galaxyModel`, `spiralModel`, `stellarDensity` (after Pass 3), `placement`, and whatever module currently owns disc structure, bar geometry and co-natal groups. Report the enumeration back as the definitive Tier G constant inventory; it is worth recording in the brief in its own right.

Two things it will catch that a hand-written list would miss: constants buried in helper functions rather than at module top level, and constants that only bite in one morphology or at one radius.

---

## 4 - Authoritative schema

Complete for arm geometry, field, placement, anchor and stamps. S5 covers what you enumerate.

**Units.** Angles: **degrees in file**, radians in memory, converted only in `units` (Pass 0 canonical-units ruling). Distances: **pc** unless a key name says otherwise. Density: **systems per pc^3**. Age: **Gyr**. Everything else dimensionless.

```yaml
# --- stamps ------------------------------------------------------------------
fieldShapeVersion: 1              # int. Read at LOAD ONLY, to detect a shape
                                  # mismatch. Never read by a generator.
placementShapeVersion: 1          # int. Same semantics, placement tier.
parameterSetVersion: "2026.08.2"  # string. PURELY INFORMATIONAL - records which
                                  # release's defaults filled this block. No
                                  # generator, loader or migration may read it.
                                  # Confirmed per Amendment P S4.

# --- identity ------------------------------------------------------------------
worldSeed: "..."                  # string
morphology: barredSpiral          # spiral | barredSpiral | lenticular | elliptical | irregular
scale: 1.000                      # dimensionless, self-similar scaling
armSource: observed-mw            # observed-mw | seeded

# --- arm geometry ----------------------------------------------------------------
# thetaRefDeg is 0 for every observed-mw arm because Denyshchenko's a0 is DEFINED
# at the Sun-Galactic-centre line. pitchDeg is a POSITIVE MAGNITUDE; the sign in
# the source is carried by the formula, not the value (patch v2.2 S2).
arms:
  - { name: Scutum-Centaurus,   tier: major, pitchDeg: 12.04, RrefPc:  5493, thetaRefDeg: 0, weight: 1.00 }
  - { name: Sagittarius-Carina, tier: minor, pitchDeg: 12.07, RrefPc:  6878, thetaRefDeg: 0, weight: 0.55 }
  - { name: Local,              tier: spur,  pitchDeg: 12.43, RrefPc:  8719, thetaRefDeg: 0, weight: 0.35 }
  - { name: Perseus,            tier: major, pitchDeg: 12.07, RrefPc: 10470, thetaRefDeg: 0, weight: 1.00 }
  - { name: Norma-Outer,        tier: minor, pitchDeg: 12.43, RrefPc: 12289, thetaRefDeg: 0, weight: 0.55 }
  # optional per arm, unused by this table, retained because Reid's kinks are real:
  #   RkinkPc: <pc>   pitchOuterDeg: <deg>

# --- arm width (patch v2.1) - replaces armKappa entirely -------------------------
armWidth:
  refPc:        336               # sourced   Reid et al. 2019
  slopePcPerKpc: 36               # sourced   Reid et al. 2019
  r0Kpc:        8.15              # sourced   Reid et al. 2019, fit reference radius
  broadening:   1.0               # calibrated. HARD CEILING 1.02 - assert at load.
                                  # Above it Perseus merges with Norma-Outer at the
                                  # inner disc edge and gate 4 fails.

# --- arm response and amplitude, per population -----------------------------------
armResponse:                      # which arms each cohort sees (By-law S3)
  youngThin:  all                 # 4 arms + Local spur
  midThin:    majorMinor          # 4 arms
  oldThin:    major               # 2 arms
  thick:      none
  halo:       none
armContrast:                      # dimensionless von Mises coefficients
  youngThin:  0.6193              # calibrated  2.0 x old
  midThin:    0.4335              # calibrated  1.4 x old
  oldThin:    0.3096              # DERIVED     solved so the field realises
                                  #             Drimmel & Spergel K = 1.326
  thick:      0.0
  halo:       0.0

# --- inner-disc taper (By-law S4) -------------------------------------------------
armStartInnerPc: 3500             # calibrated, on the Wegg 2015 bar half-length
armStartOuterPc: 5500             # calibrated

# --- density anchor and reference position -----------------------------------------
referenceRPc:      8200           # pc.   For observed-mw this is Sol.
referenceThetaDeg: 0              # deg.
nLocalPerPc3:      TBD            # systems/pc^3. SOURCED, value PENDING - see S6.
anchorArmCorrection:              # DERIVED. Divide each disc population's
  youngThin: 0.908223             #   normalisation by these so densityAt(reference)
  midThin:   0.894379             #   equals nLocal exactly rather than as a ring mean.
  oldThin:   0.951033             #   Computed from the STORED contrasts - see S7.
                                  #   thick/halo are 1.0 by construction (armResponse none).

# --- star-forming-complex placement tier ---------------------------------------------
complexTier:
  sigmaComplexPc:       150       # sourced    Efremov 1978, ~600 pc across = +/-2 sigma
  meanGroupsPerComplex: 6         # calibrated
  complexFraction:      0.6       # calibrated, reuses youngThin clusteredFraction
  ageDecayStartGyr:     0.1       # calibrated  NOT sourced - see v2 S8.1 ledger
  ageDecayEndGyr:       0.5       # calibrated  NOT sourced
  cellSizePc:           1200      # tunable. FLOOR = 8 * sigmaComplexPc = 1200.
                                  # AT THE FLOOR, zero margin - assert at load, and
                                  # raise this if sigmaComplexPc is ever raised.
  guardBandSigma:       4         # tunable. Cells within 4 sigma of the region are
                                  # generated and clipped (v2 S8.2).
  cellMeanSubGridN:     32        # tunable. Samples per cell axis for the
                                  # meanYoungSurface quadrature - see S8.
```

**Ledger grades summarised:** `sourced` - arm table, `armWidth.refPc/slopePcPerKpc/r0Kpc`, `sigmaComplexPc`, `nLocalPerPc3`. `derived` - `armContrast.oldThin`, `anchorArmCorrection.*`. `calibrated` - `armContrast.youngThin/midThin`, arm `weight`s, `armWidth.broadening`, `armStart*Pc`, `meanGroupsPerComplex`, `complexFraction`, `ageDecay*`. `tunable` - `cellSizePc`, `guardBandSigma`, `cellMeanSubGridN`.

---

## 5 - What you enumerate, and why I am not guessing it

The following are named by Amendment P1 and are **required in the block**, but I have never seen the modules that own them and will not invent key names or defaults:

- **Disc structure** - radial scale lengths and vertical scale heights per population, population fractions, `R0`, disc truncation. Canonical units pc and dimensionless. Owned by whichever module currently holds them; after Pass 3 the density normalisation belongs to `stellarDensity`.
- **Bar geometry** - half-length, axis ratios, taper radii, scale height, position angle (**degrees in file**), strength. Read only by `barredSpiral`; must still be pinned, because gate 6's bar-off bit-identity means the *unbarred* path must be provably independent of them.
- **Co-natal group parameters** - including `meanSystemsPerGroup`, which `complexIntensityAt` consumes. **Do not redeclare it under `complexTier`**; it belongs to the co-natal block, and duplicating it would break single-source-of-truth. Reference it.
- **Halo parameters** - if the halo profile has tunable constants, they are Tier G and belong here.

Derive all of these with the S3 procedure and send the inventory back with the pass. I will grade them for the ledger once I can see the actual constants.

---

## 6 - `nLocalPerPc3` is pending, and it is a real dependency

The Reyle anchor query has not been run, so the value does not exist yet. Define the key now with an explicit `TBD` and **fail loudly at load** rather than defaulting - a silently-defaulted density anchor is the worst possible failure, because everything downstream still runs and the whole galaxy is quietly wrong.

It lands with Pass 3, into `stellarDensity`'s provenance header, alongside the restriction factor. Pass 2 can complete without it provided the key, its unit and its load-time assertion are in place.

---

## 7 - Self-consistency rule for derived values *(new, and it bit me)*

**Derived values must be computed from the values as stored, not from full precision.**

Patch v2.1 S3 quotes the anchor corrections as 0.951027 / 0.894381 / 0.908227. Those were computed with full-precision contrasts (0.3096367574...). The block stores contrasts rounded to 4 dp, and recomputing from those gives **0.951033 / 0.894379 / 0.908223** - a sixth-decimal difference.

Small, but it breaks gate 19 as written: "regenerates bit-identically from its file alone" fails if a stored derived value disagrees with what the stored inputs produce. **The S4 block carries the recomputed values.** Patch v2.1 S3's figures are superseded.

The general rule, which applies to every derived field you add during enumeration:

> Round the inputs first, then derive. Add a gate asserting that every `derived` field in the block reproduces from the block's own stored inputs to 1e-12.

---

## 8 - Correction to patch v2.1 S2: sub-grid quadrature

v2.1 said "at least 16 x 16 samples per 1200 pc cell", computed from sigma_perp ~ 338 pc at the solar circle. That is wrong at the inner edge of the gate band, where the arm is narrower: at R = 3900 pc, sigma_perp = 183 pc, so resolving sigma/4 needs **27** samples per axis, not 16.

`cellMeanSubGridN: 32` (rounded up to a power of two) covers the whole disc. Gate 16's 1e-9 agreement will fail at 16.

---

## 9 - Reference values for your diff

From `derive_arm_constants_v3.py`, full precision before rounding:

| quantity | full precision | stored |
|---|---|---|
| `armContrast.oldThin` | 0.3096367574 | 0.3096 |
| `armContrast.midThin` | 0.4334914603 | 0.4335 |
| `armContrast.youngThin` | 0.6192735147 | 0.6193 |
| `anchorArmCorrection.oldThin` | 0.951032712016 (from stored contrasts) | 0.951033 |
| `anchorArmCorrection.midThin` | 0.894378924469 (from stored contrasts) | 0.894379 |
| `anchorArmCorrection.youngThin` | 0.908223499942 (from stored contrasts) | 0.908223 |
| kappa range, all arms, 3.5-16 kpc | 18.7511 - 30.9951 | not stored - derived per (arm, R) |

If your re-run disagrees with any of these, the script wins and I am wrong - raise it.

---

## 10 - Gate changes

| # | Gate |
|---|---|
| 19 | **Parameter sufficiency, restated.** Perturb *every* numeric module-level constant in every Tier G module; the galaxy must regenerate bit-identically from its file alone. Any perturbation that changes output is a missing block field. Scope is Tier G only - Tier S is pinned by sheet content, Tier D is never pinned. |
| 26 | **NEW - derived-field self-consistency.** Every `derived` field in the block reproduces from the block's own stored inputs to 1e-12. |
| 27 | **NEW - load-time assertions.** `armWidth.broadening <= 1.02`; `complexTier.cellSizePc >= 8 * complexTier.sigmaComplexPc`; `nLocalPerPc3` present and not `TBD`. Each fails loudly, never silently defaults. |
