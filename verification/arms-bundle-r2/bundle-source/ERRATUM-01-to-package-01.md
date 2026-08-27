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
