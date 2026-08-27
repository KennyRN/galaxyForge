<!-- galaxyForge arms bundle R2 Â· current document Â· assembled 2026-08-26 Â· original preserved at archive/galaxyForge-HANDOFF-01-ISOPHOTE-RENDERER.md -->

# ERRATUM 1 to package 01 â gate defects, a new gate, and a closed provenance obligation

**Prepend to `galaxyForge-HANDOFF-01-ISOPHOTE-RENDERER.md`. Does not replace it.** Raised by the independent audit of 2026-08-26. **Everything in package 01 stands except the four items below.** The package remains display-only, Amendment A3 exempt, and bump-free â see 1.5 for the one condition on that.

---

## 1.1 â Gate 3 is unfalsifiable as written

*"The smoothing radius is never smaller than one cell width."*

The reference implementation smooths at Ï = 1 cell by construction, so the condition cannot fail at any grid size. The gate that was supposed to have caught the 65 pc / 200Â² mismatch would not have caught it.

Â§4's physical argument fixes the **cell size**, not the smoothing. Restate the whole of Â§4 in that order:

- **Cell size is the primary constant: 65 pc.** Justified on physical grounds â below Reid's narrowest arm width (170 pc at 3.5 kpc) and far below the Efremov complex scale (~600 pc).
- **Grid dimension is derived: `ceil(frameExtent / cellSizePc)`.** For a 26 kpc frame that is 400. It is not itself a constant.
- **Smoothing Ï is specified in parsecs and converted to cells at use.** Not defined as "one cell".

**Gate 3 becomes:** changing the frame extent changes the grid dimension while leaving the cell size and the smoothing Ï in parsecs unchanged. A gate that alters the frame and asserts the grid dimension moves.

## 1.2 â Gate 1 is in tension with a fixed 400 Ã 400 grid

Gate 1 requires identical densities to render identical colours at different frame extents. With a fixed grid and a varying frame, the cell size varies, so the effective smoothing varies, so the field varies, so the colours vary. The gate and the stated grid cannot both hold.

Fixing 1.1 fixes this: with cell size pinned and grid dimension derived, gate 1 holds by construction. Â§4's heading â *"Smoothing radius 65 pc, on a 400Ã400 field"* â is the source of the confusion and should read *"65 pc cells; grid dimension follows the frame."*

## 1.3 â New gate 10: arm amplitude is measurable, and must match the model

The absolute scale makes something possible that a percentile scale never could. Because the plate is a hard quantisation into seventeen known colours, band index decodes exactly from the image, and on a Ã2 scale **band difference is logâ of arm/interarm contrast**.

Decoding `galaxyForge-plate-absolute-scale.png` (palette match exact, residual zero) gives:

| R (kpc) | band spread | contrast | implied Aâ |
|---|---|---|---|
| 7.0 | 3.0 | Ã8 | 0.78 |
| **8.15** | **2.0** | **Ã4** | **0.60** |
| 9.0 | 2.0 | Ã4 | 0.60 |
| 10.0 | 4.0 | Ã16 | 0.88 |

Against the model's own sourced amplitude: Drimmel & Spergel Aâ = 0.14 implies **0.41 bands, Ã1.33**. The plate is roughly ten times over, and above the Elmegreen et al. 2011 S4G ceiling (1.3 mag, Ã3.31) for the most extreme grand-design spirals.

**Gate 01-G10.** Azimuthal band spread at Râ, measured in the old cohort, reproduces the model's own Aâ to within 0.15 bands. Implement it by decoding the rendered plate, not by inspecting the field â the point is that the *displayed* map is quantitatively honest.

## 1.4 â Â§1's "isophote" framing conflates two quantities

Â§1 is correct and emphatic that the field is systems pcâ»Â². The framing *"log-spaced bands over a surface density field is an isophote map â the standard astronomical presentation"* then borrows a word that means a contour of constant surface **brightness**. This is a contour of constant **number** surface density. M dwarfs dominate number; giants and young stars dominate light. The two maps differ most in the arms.

No code changes. Â§3's caption already says "system surface density", which is right; bring Â§1's prose into line, and do not judge the plate against a light-weighted reference image.

## 1.5 â The one condition on this package remaining bump-free

Â§9 asserts that package 01 touches no generated quantity. That holds only if the contrast measured in 1.3 is an artefact of the demo field in `scale_bench.py` and not a property of the field `placement` reads.

**Determine which before landing.** If the generated field genuinely carries Aâ â 0.6, a display-only package has surfaced a shape defect, and that defect is separate from anything in packages 02 and 03.

## 1.6 â The solar anchor: provenance obligation closed, with three caveats

The audit resolved the anchor exactly:

```
336 systems / (4/3 Â· Ï Â· 10Â³ pcÂ³) = 8.0214 Ã 10â»Â² systems pcâ»Â³
```

The source is **ReylÃ© et al. 2022, the first update to the 10 pc sample** (541 objects in 336 systems) â *not* the 2021 paper, which gives 339 systems and would yield 8.09 Ã 10â»Â². The header can be completed without the TAP query. `reyle_anchor.py` is no longer blocking.

Three caveats for the header. The count includes brown-dwarf and white-dwarf systems, so "system" must be defined in the module. The brown-dwarf census within 10 pc is incomplete, so the figure is a lower bound that will drift upward. Poisson error on 336 counts is Â±5.5% before local structure, so three significant figures overstate the precision.

**Related:** Â§1's column integral, 2 n H = 48.1 systems pcâ»Â², is thin-disc only. With a JuriÄ thick disc (f = 12%, H = 900 pc) the column is 58.4 â 21% higher. Â§1 already requires the anchor to be computed from the model's own vertical profile, which handles this correctly; but 48.1 should not be treated anywhere as a target, and the legend's marker will not read 48 if the model carries a thick disc. Sol stays in band 7 either way, so the scale is robust.


---

# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
# ORIGINAL DOCUMENT BELOW â REPRODUCED UNALTERED
#
# Nothing below this line has been edited. Where it conflicts
# with the errata above, THE ERRATA WIN. Corrections are
# prepended, never merged into the original text.
# âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

---

# galaxyForge â package 01: isophote renderer

**Class: display-only. Amendment A3 exempt. No `genVersion` bump.** Nothing in this package touches the generated field, so no system moves and no vault forks. **Cut date:** 2026-08-26.

**What it replaces.** `paintDensityField`'s current pipeline: `computeAgeWarmth` collapsing `surface.byPopulation` to a scalar, a two-endpoint RGB lerp, a `DUST_TINT_RGB` multiply, a single gamma, and 1 px `fillRect` sparkle. All of it goes. The isophote renderer is a different display convention, not a tuning of the old one.

**Why this convention.** Log-spaced bands over a surface density field is an isophote map â the standard astronomical presentation, where each band is a fixed step in surface brightness. It is roughly ten times cheaper to paint than the photographic alternative, it reads quantitatively, and quantisation makes small overdensities *more* visible rather than less, because a band edge is an edge detector. Spurs and clumps that vanish into a smooth gradient show up as lobes in a contour.

---

## 1 â Field units and the anchor

The field is **systems pcâ»Â², not stars, and not per pc**. `densityMap.ts:73` and `galaxyModel.ts:245` declare the 3D field as systems pcâ»Â³; `projectSlab` collapses z to give a column density in systems pcâ»Â². A system is not a star â with multiplicity applied a system averages more than one â and the map must say "systems" everywhere it labels anything.

The reference point is the solar neighbourhood, from the module's own anchor of **8.02 Ã 10â»Â² systems pcâ»Â³** (`densityMap.ts` S4.1). Its column through an exponential vertical profile is 2 n H. At H = 300 pc that is **48.1 systems pcâ»Â²**.

**Do not hard-code 48.1.** Compute it at render time by evaluating the galaxy's own field at the model's solar radius and integrating its own vertical profile. If the scale height or the anchor ever changes, a hard-coded figure goes stale silently while still looking authoritative. This is the single-source-of-truth rule applied to a display constant.

## 2 â Absolute band scale

Levels are **absolute**, never percentiles of the current map. A percentile scale stretches whatever the field happens to be across the whole palette, so a colour means "high for this galaxy" rather than a number â different in every galaxy, and different between two overlapping sectors of the same galaxy, which the vault architecture cannot tolerate.

| | |
|---|---|
| band width | logââ2 = 0.30103 dex â **each band is a doubling** |
| floor `SIGMA_MIN` | 0.25 systems pcâ»Â² |
| bands | 17 |
| ceiling | 0.25 Ã 2Â¹â· = 32 768 systems pcâ»Â² |
| total span | 5.12 dex |

Band index is `floor(log2(sigma / SIGMA_MIN))`. Below zero renders as background; at or above 17 clamps to the top band, which is the intended behaviour â a dense nucleus saturating into the black eye is honest, not an artefact.

The solar neighbourhood lands in band 7 of 17, between 32 and 64 systems pcâ»Â². That places the disc where a reader lives near the middle of the scale, with the bulge above and the outskirts below, which is what makes the map legible.

All three constants are **tunable**. They are not sourced and must be labelled so. What *is* sourced is the anchor they are positioned against.

## 3 â Legend, in the modal

The modal carries a legend beneath the plate. It is not optional and not a debug affordance â an absolute scale that the reader cannot decode is no better than a percentile one.

The legend contains, in order: a strip of all 17 band colours at equal width; tick marks and labels at decade boundaries (0.25, 1, 10, 100, 1k, 10k); a **white marker through the strip at the solar-neighbourhood value**, captioned `Solar neighbourhood â N systems pcâ»Â²` with N taken from the computed anchor, not a literal; and a caption line reading `System surface density Â· each band Ã2 Â· absolute scale, identical in every galaxy`.

The solar marker is the part that makes the scale usable. Most readers have no intuition for systems pcâ»Â², but every reader can locate their own sky on the strip and read the rest relative to it. Position it by the same `log2` used for banding so the marker and the bands cannot drift apart.

The caption must also state the smoothing radius, for the same reason the side-on view states its vertical exaggeration: a display parameter that changes what the reader sees is never silent.

## 4 â Field resolution and smoothing

**Smoothing radius 65 pc, on a 400Ã400 field.**

Cell size is forced by the smoothing radius â a 65 pc blur cannot be served from 130 pc cells, because the grid, not the radius, would be setting the resolution. Over a 26 kpc frame, 65 pc cells means 400 across. Cost goes as cell count, so the field stage scales as the square of the ratio: measured Ã3.98 against a predicted Ã4.00.

The paint stage does not change with the grid. It is bound by output pixels: 0.32 s at 200Â² and 0.34 s at 400Â², both at 3000 px output. **Grid resolution is set by the smoothing radius; output resolution by the export size; the two are independent.** Cache the field and an angle-slider drag costs only the paint stage regardless of scale.

Smooth on the grid at Ï = 1 cell, *then* upsample, then quantise. Upsampling first and smoothing after double-blurs by the interpolation kernel.

65 pc is a defensible choice on physical grounds: Reid's arm widths run 170 pc at 3.5 kpc to 600 pc at 16 kpc and the Efremov complex scale is ~600 pc, so 65 pc sits below every structure the model contains. It removes sampling noise without touching signal. At 130 pc you are smoothing at the width of the narrowest arms.

## 5 â Palettes

Both ship. Default `PAL_ASTRO_DARK`, pending the ruling in the index.

```
PAL_ASTRO_DARK = 060a18 0d1636 162a56 22406f 33598a 4d76a4 6f93b8 97aec6
                 bfc3bd dcc79a efc673 f8b846 fb9c2c f47320 dd451d 992018 2b0409
PAL_TOPO_DARK  = 0d3b3f 12565c 1b7f86 1fa0a0 22b5a0 2fc46e 5bd24a 9ade3c
                 c8e63a eded3f f7d13a f5a93a ef7f3c e85a45 c9303c 75151f 0a0204
```

Both turn over into near-black at the top so the nucleus reads as a dark eye rather than a white blowout. The turnover routes through deep red first; a direct jump from orange to black looks like a hole punched in the plate.

Two consequences to hold. The ramps are non-monotonic in brightness â dark at the empty end *and* the dense end â so a dark pixel is not unambiguously "nothing" without its surroundings. The legend is the mitigation, which is another reason it is not optional. And at 65 pc the topographic ramp gets busy in the outskirts, because its low-end transitions are high-contrast and there are now more of them; if it is selected it wants either fewer bands or a wider low end.

Background is `#050710`, used for everything below band 0.

## 6 â Field terms this package adds

Two terms, both physical, both currently missing.

**Type II broken exponential.** Without an outer break the disc never ends and the lowest bands run off the frame edge. Truncate the disc beyond a break radius with an outer scale length. Sourced in kind to van der Kruit 1979 and Pohlen & Trujillo 2006; the specific break radius for a generated galaxy is **tunable**.

**Radially growing granularity.** Relative Poisson fluctuation goes as 1/âN, so outer isophotes are genuinely patchier than inner ones. A multi-octave noise multiplier whose amplitude grows with radius, capped so it modulates rather than dominates. The noise octaves must be capped at the grid â a grid cannot carry structure below its own cell, and generating finer octaves only to resample them down wastes time and makes the field's cost look grid-independent when it is not.

Both are display-side under A3 because they enter the *display* field, not the generated one. If either is ever wired into the field that `placement` reads, it becomes a shape break and moves to its own package.

## 7 â Export

Export is a clean pass, not a screenshot of the preview. The in-app overlay â the amber sector polygon and centre marker in `paintDensityField`, the magenta angle line and distance ring in `drawPositionGuides` â is correct for the picker and wrong on an export plate. Suppression is a flag on the paint call, and whether the sector marker survives it is the ruling in the index.

If the marker does survive, it needs a colour appearing nowhere in the selected ramp â cyan or magenta â because both ramps are dark at both ends and a marker in red or navy will be lost.

Export resolution is independent of the field grid, per Â§4. The legend scales with the output; do not render it at a fixed pixel size and upscale.

## 8 â Gates

1. **Absolute levels.** Rendering the same field twice at different frame extents produces identical colours for identical densities. Any percentile in the band path fails this.
2. **Anchor computed, not literal.** Changing the vertical scale height changes the legend's solar marker. A test that alters H and asserts the marker moves.
3. **Grid serves the radius.** The smoothing radius is never smaller than one cell width. This is the check that would have caught the 65 pc / 200Â² mismatch before it shipped.
4. **Smooth before upsample.** Asserted structurally, not by eye.
5. **Units labelled.** Every user-visible density string says "systems", never "stars".
6. **Legend present.** The modal cannot render a plate without a legend carrying the solar marker.
7. **Noise octaves capped at the grid.** No octave is generated at a resolution finer than the field.
8. **Export suppression.** With the export flag set, no overlay pixel is written.
9. **Band monotonicity.** Band index is non-decreasing in density across the whole scale, including the clamps at both ends.

## 9 â What this package does not do

It does not touch arm geometry, extents, tips, or any generated quantity. The arms in any test render will still all terminate at the same radius and still dissolve rather than closing to a point â those are packages 02 and 03, and they are shape breaks. Do not fix them here, however tempting it looks while staring at a render.
