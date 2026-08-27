"""Package 03 S5 specifies core + skirt at ~3x width, 0.55 amplitude.
Package 02 gate 4 / REID-T2 gate 6 require sigma_perp within 3% of 42.6 + 36R.
Do these survive each other?"""
import numpy as np
from scipy.integrate import quad

S, W, A = 1.0, 3.0, 0.55     # core sigma, skirt width multiple, skirt amplitude

def composite(x, amp_is_peak=True):
    core = np.exp(-x**2/(2*S**2))
    sk   = A*np.exp(-x**2/(2*(W*S)**2))
    if not amp_is_peak:                      # A read as AREA fraction instead
        sk = (A/W)*np.exp(-x**2/(2*(W*S)**2))
    return core + sk

for lab, peak in (("0.55 = PEAK amplitude ratio", True), ("0.55 = AREA fraction", False)):
    m0 = quad(lambda x: composite(x, peak), -60, 60)[0]
    m2 = quad(lambda x: x**2*composite(x, peak), -60, 60)[0]
    sig = np.sqrt(m2/m0)
    # closed form cross-check: sigma_eff^2 = sum(w_i sigma_i^2)/sum(w_i), w by area
    wc, ws = 1.0*S, (A if peak else A/W)*W*S
    sig_cf = np.sqrt((wc*S**2 + ws*(W*S)**2)/(wc+ws))
    print(f"{lab:28s}  sigma_eff = {sig:.4f} sigma_core   (closed form {sig_cf:.4f})")
    print(f"{'':28s}  -> width gate tolerance is +/-3%; this is {100*(sig-1):+.0f}%")
    print(f"{'':28s}  -> vs the retired width_scale = 1.45 bodge: {sig/1.45:.2f}x larger\n")

print("Reid Fig.10 draws arms at 1.65 sigma (80% enclosed for a Gaussian).")
print("For the composite, the radius enclosing 80% of the profile:")
for lab, peak in (("peak-ratio reading", True), ("area-fraction reading", False)):
    tot = quad(lambda x: composite(x, peak), -60, 60)[0]
    lo, hi = 0.0, 40.0
    for _ in range(80):
        mid = 0.5*(lo+hi)
        if quad(lambda x: composite(x, peak), -mid, mid)[0]/tot < 0.80: lo = mid
        else: hi = mid
    print(f"  {lab:22s} 80% enclosed at {0.5*(lo+hi):.2f} sigma_core "
          f"(pure Gaussian: 1.28 sigma; Reid's drawn 1.65 sigma is a different convention)")
