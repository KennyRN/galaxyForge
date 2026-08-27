"""
Independent re-derivation: Reid et al. 2019 Table 2 arm geometry.

The question under test: the bundle's REID-T2 S3 table converts each arm's
beta range to a radial range "in Reid's own parameterisation". Reproduce it
from scratch and check the sign.

Reid's log-periodic spiral (Reid+2014 S4, Reid+2019 S3):
    ln(R / R_kink) = -(beta - beta_kink) * tan(psi)
with beta = Galactocentric azimuth, 0 toward the Sun, INCREASING in the
direction of Galactic rotation. Positive psi = trailing.
"""
import numpy as np

D2R = np.pi / 180.0

# Table 2 as transcribed in the bundle.
# name, N, beta_lo, beta_hi, beta_kink, R_kink(kpc), psi_lt(deg), psi_gt(deg), width(kpc)
T2 = [
    ("3 kpc (N)",   3,  15,  18, 15, 3.52,  -4.2,  -4.2, 0.18),
    ("Norma",      11,   5,  54, 18, 4.46,  -1.0,  19.5, 0.14),
    ("Sct-Cen",    36,   0, 104, 23, 4.91,  14.1,  12.1, 0.23),
    ("Sgr-Car",    35,   2,  97, 24, 6.04,  17.1,   1.0, 0.27),
    ("Local",      28,  -8,  34,  9, 8.26,  11.4,  11.4, 0.31),
    ("Perseus",    41, -23, 115, 40, 8.87,  10.3,   8.7, 0.35),
    ("Outer",      11, -16,  71, 18, 12.24,  3.0,   9.4, 0.65),
]


def R_of_beta(beta, beta_kink, R_kink, psi_lt, psi_gt, sign=-1.0):
    """sign = -1 reproduces Reid's published equation; +1 is the mirrored frame."""
    psi = psi_lt if beta < beta_kink else psi_gt
    return R_kink * np.exp(sign * (beta - beta_kink) * D2R * np.tan(psi * D2R))


print("=" * 78)
print("1. beta-range -> radial range, BOTH signs")
print("=" * 78)
print(f"{'arm':11s} {'span':>5s} | {'REID SIGN (-)':>22s} | {'MIRRORED (+)':>22s} | "
      f"{'bundle S3':>16s}")
bundle = {  # what REID-T2 S3 prints
    "3 kpc (N)": (3.51, 3.52), "Norma": (4.48, 5.57), "Sct-Cen": (4.44, 6.65),
    "Sgr-Car": (5.37, 6.18), "Local": (7.78, 9.02), "Perseus": (7.26, 10.84),
    "Outer": (11.87, 14.27),
}
correct, mirrored = {}, {}
for nm, N, blo, bhi, bk, Rk, pl, pg in [(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]) for r in T2]:
    span = bhi - blo
    bs = np.linspace(blo, bhi, 4001)
    rc = np.array([R_of_beta(b, bk, Rk, pl, pg, -1.0) for b in bs])
    rm = np.array([R_of_beta(b, bk, Rk, pl, pg, +1.0) for b in bs])
    correct[nm] = (rc.min(), rc.max())
    mirrored[nm] = (rm.min(), rm.max())
    print(f"{nm:11s} {span:5d} | {rc.min():9.2f} - {rc.max():8.2f}  | "
          f"{rm.min():9.2f} - {rm.max():8.2f}  | {bundle[nm][0]:6.2f} -{bundle[nm][1]:7.2f}")

print("\nMatch test against the bundle's printed table:")
for nm in bundle:
    dc = max(abs(correct[nm][0] - bundle[nm][0]), abs(correct[nm][1] - bundle[nm][1]))
    dm = max(abs(mirrored[nm][0] - bundle[nm][0]), abs(mirrored[nm][1] - bundle[nm][1]))
    print(f"  {nm:11s} max|diff| vs Reid-sign {dc:6.3f} kpc   vs mirrored {dm:6.3f} kpc"
          f"   -> bundle used {'MIRRORED' if dm < dc else 'Reid sign'}")

print("\n" + "=" * 78)
print("2. Physical sanity check: where is each arm at beta = 0 (the Sun's azimuth)?")
print("=" * 78)
print("   The Sun sits at R0 = 8.15 kpc, beta = 0 by definition.")
print("   Perseus is OUTSIDE the solar circle (~2 kpc beyond the Sun toward l=180).")
for nm, N, blo, bhi, bk, Rk, pl, pg in [(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]) for r in T2]:
    if blo <= 0 <= bhi:
        rc = R_of_beta(0.0, bk, Rk, pl, pg, -1.0)
        rm = R_of_beta(0.0, bk, Rk, pl, pg, +1.0)
        print(f"  {nm:11s} Reid sign: R(0) = {rc:6.2f} kpc   mirrored: R(0) = {rm:6.2f} kpc")

print("\n" + "=" * 78)
print("3. The number Erratum 1 S3 leans on: outermost traced radius, any arm")
print("=" * 78)
mx_c = max(v[1] for v in correct.values())
mx_m = max(v[1] for v in mirrored.values())
arm_c = [k for k, v in correct.items() if v[1] == mx_c][0]
arm_m = [k for k, v in mirrored.items() if v[1] == mx_m][0]
print(f"  Reid sign : {mx_c:6.2f} kpc  ({arm_c})")
print(f"  mirrored  : {mx_m:6.2f} kpc  ({arm_m})    <- the 14.27 quoted in Erratum 1 S3")
for lab, Rcr, err in [("Dias+2019", 8.51, 0.64), ("Junqueira+2015", 8.74, 0.20)]:
    olr = 1.70711 * Rcr
    print(f"  vs {lab:16s} OLR = {olr:5.2f} +/- {1.70711*err:4.2f} kpc :"
          f"  mirrored {100*(mx_m-olr)/olr:+6.1f}%   CORRECTED {100*(mx_c-olr)/olr:+6.1f}%")
