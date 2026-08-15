# patches/

Amendments cut *after* the 1 August consolidated brief, kept separate from it
rather than merged in, because the brief documents itself as having a closed
S2.4 correction table and a settled S7 - folding a later, still-live patch
into that text would make it look ruled-on when it is not.

## galaxyForge-SPIRAL-PATCH-v2.3-parameter-schema.md

Cut 2026-08-04. Supersedes v2 S1.1's illustrative parameter YAML with an
authoritative schema, and rules that Pass 2 must externalise the **entire**
Tier G constant surface (not a partial subset) so that a galaxy pinned under
`fieldShapeVersion: 1` is provably protected from future default changes.
Read this before writing the real `galaxyModel` implementation, or
`galacticDensity`, `placement`, or `stellarDensity`.

Adds gates 19 (restated as a fuzzer procedure over module-level constants,
S3 of the patch), 26 (derived-field self-consistency) and 27 (load-time
assertions: `armWidth.broadening <= 1.02`, the cell-size floor, and
`nLocalPerPc3` must not be `TBD`).

**`nLocalPerPc3: TBD` is deliberate**, pending `verification/reyle_anchor.py`.
Do not default it; the patch requires a loud load-time failure instead.

## precise_block.py / precise_block.out.txt

The derivation script and its recorded output that produced the S4/S9
reference values in the patch (arm contrasts, anchor-arm corrections, the
kappa range, the cell-size floor check, the sub-grid quadrature minimum).

**`precise_block.py` cannot be run as shipped.** Its first line does
`exec(open('derive_arm_constants_v3.py').read()...)` - it depends on a
sibling script, `derive_arm_constants_v3.py`, that defines `armFactor`,
`kappaOf`, `armWidthPc`, `ARMS` and `R_SUN`. That script was **not** part of
the material handed off with this patch and is not in this repository. Do
not fabricate it: the patch's own S9 table records the values it produced as
the reference to diff against, which is sufficient to verify a from-scratch
reimplementation of the arm-contrast/kappa machinery once `galaxyModel`'s
real spiral arm code exists. If `derive_arm_constants_v3.py` surfaces later,
drop it in beside `precise_block.py` and it will run unmodified.
