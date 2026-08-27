import numpy as np
from scipy import stats
import mpmath as mp

D2R = np.pi / 180.0
print("=" * 78); print("A. RESONANCE ALGEBRA - re-derived from scratch"); print("=" * 78)
# V = V0 (R/R0)^b  =>  Omega ~ R^(b-1);  kappa^2 = R dOmega^2/dR + 4 Omega^2
#   dOmega^2/dlnR = (2b-2) Omega^2  =>  kappa^2 = (2b-2+4) Omega^2 = 2(1+b) Omega^2
# resonance m(Omega - Omega_p) = -/+ kappa  =>  Omega_p = Omega (1 +/- sqrt(2(1+b))/m)
# Omega(R)/Omega(R_CR) = (R/R_CR)^(b-1) = 1/(1 +/- s)  =>  R/R_CR = (1 +/- s)^(1/(1-b))
mp.mp.dps = 30
def ratio_mp(m, b, outer=True):
    s = mp.sqrt(2 * (1 + mp.mpf(b))) / m
    return (1 + s if outer else 1 - s) ** (1 / (1 - mp.mpf(b)))
print(f"  OLR m=2, b=0 : {ratio_mp(2,0)}   (bundle: 1.7071)")
print(f"  ILR m=2, b=0 : {ratio_mp(2,0,False)}   (bundle: 0.293)")
print(f"  4:1  m=4, b=0 : {ratio_mp(4,0,False)}   (bundle: 0.646)")
print(f"  OLR m=4, b=0 : {ratio_mp(4,0)}   (bundle: 1.354)")
print("  -> algebra reproduces exactly. 1+1/sqrt(2) = %.6f" % (1 + 1/np.sqrt(2)))

print("\n  Sensitivity of the m=2 OLR ratio to rotation-curve slope b:")
for b in (-0.30, -0.20, -0.10, -0.06, 0.0, 0.10):
    r = float(ratio_mp(2, b))
    print(f"    b = {b:+.2f}  ->  R_OLR/R_CR = {r:.4f}   ({100*(r-1.70711)/1.70711:+6.1f}% vs flat)")
print("  bundle tested only b in [-0.10,+0.10]. Eilers+2019 measure b ~ -0.06 at R0;")
print("  Jiao+2023 / Ou+2024 find a much steeper outer decline where the OLR sits.")

print("\n" + "=" * 78); print("B. WIDTH RELATION vs Reid Fig.4 fit"); print("=" * 78)
fit = lambda R: 42.6 + 36.0 * R          # pc, R in kpc
print(f"  fit(8.15) = {fit(8.15):.1f} pc  (bundle says Fig.4 is 336 pc at 8.15 kpc) -> consistent")
kappa_sig = {3.5: 169.4, 16.0: 602.4}
for R, s in kappa_sig.items():
    print(f"  R={R:5.2f} kpc: kappa-implied {s:6.1f} pc vs fit {fit(R):6.1f} pc"
          f"  -> {100*(s-fit(R))/fit(R):+5.2f}%   (bundle: {'+0.5' if R<10 else '-2.6'}%)")
print("\n  per-arm widths vs the fit line (bundle quotes 'fit relative to quoted'):")
arms = [("3 kpc",3.52,0.18,11),("Norma",4.46,0.14,11),("Sct-Cen",4.91,0.23,36),
        ("Sgr-Car",6.04,0.27,35),("Local",8.26,0.31,28),("Perseus",8.87,0.35,41),
        ("Outer",12.24,0.65,11)]
for nm, R, w, N in arms:
    f = fit(R); q = w * 1000
    print(f"    {nm:8s} N={N:2d}  quoted {q:5.0f} pc  fit {f:5.0f} pc |"
          f"  data-vs-fit {100*(q-f)/f:+6.1f}%   fit-vs-data {100*(f-q)/q:+6.1f}%  <- bundle prints this")

print("\n" + "=" * 78); print("C. HONIG & REID 2015 TIP STATISTICS"); print("=" * 78)
tips = [("NGC 628 B",10.38,0.87,12.02,0.59,35),("NGC 1232 E",11.38,0.24,12.83,0.14,25),
        ("NGC 5194 A",6.45,0.31,6.08,0.23,25),("NGC 5194 B",7.05,0.46,9.72,0.22,40)]
ratios = np.array([t[4]/t[2] for t in tips]); arcs = np.array([t[5] for t in tips], float)
for t, r in zip(tips, ratios):
    print(f"  {t[0]:11s} interior {t[1]:5.2f} kpc / {t[2]:.2f} kpc  ->  terminal {t[3]:5.2f} / {t[4]:.2f}"
          f"   ratio {r:.3f}  arc {t[5]:.0f} deg")
print(f"\n  width ratio: mean {ratios.mean():.4f}  sd {ratios.std(ddof=1):.4f}  "
      f"sem {stats.sem(ratios):.4f}  range {ratios.min():.3f}-{ratios.max():.3f}")
print(f"  arc        : mean {arcs.mean():.2f}   sd {arcs.std(ddof=1):.2f}   "
      f"sem {stats.sem(arcs):.2f}   range {arcs.min():.0f}-{arcs.max():.0f}")
print(f"  95% CI on the mean arc (t, n=4): "
      f"{stats.t.interval(0.95, 3, arcs.mean(), stats.sem(arcs))[0]:.1f} - "
      f"{stats.t.interval(0.95, 3, arcs.mean(), stats.sem(arcs))[1]:.1f} deg")
print("\n  NGC 5194 A: terminal segment (6.08 kpc) lies INSIDE its interior segment (6.45 kpc).")
m = [t[0] != "NGC 5194 A" for t in tips]
print(f"  drop it -> arc mean {arcs[m].mean():.1f} deg, width ratio mean {ratios[m].mean():.3f}"
      f"  (vs 31 / 0.620)  -> the bundle's means are sensitive to one ambiguous arm")
lo, hi = stats.beta.ppf([0.025, 0.975], 4 + 0.5, 10 - 4 + 0.5)
print(f"\n  incidence 4 of 10: point 0.400, Jeffreys 95% CI {lo:.2f} - {hi:.2f}")
print(f"  binomial sem = {np.sqrt(0.4*0.6/10):.3f}  -> the gate's '40% +/- 8%' is TIGHTER than the source")

print("\n" + "=" * 78); print("D. BAND SCALE / SOLAR ANCHOR"); print("=" * 78)
N_SOL, H = 8.02e-2, 300.0
print(f"  thin disc only : Sigma = 2 n H = {2*N_SOL*H:.2f} systems/pc^2  (bundle: 48.1)")
f_thick, H_thick = 0.12, 900.0
n_thin = N_SOL / (1 + f_thick)
sig_2 = 2 * n_thin * (H + f_thick * H_thick)
print(f"  + Juric thick disc (f=12%, H=900 pc): Sigma = {sig_2:.1f}  -> {100*(sig_2/48.12-1):+.0f}% higher")
for lab, s in (("thin only", 48.12), ("thin+thick", sig_2)):
    print(f"    {lab:11s} Sigma={s:5.1f} -> band {int(np.floor(np.log2(s/0.25)))} "
          f"(log2 index {np.log2(s/0.25):.3f})")
print(f"  ceiling 0.25*2^17 = {0.25*2**17:.0f};  span {np.log10(0.25*2**17/0.25):.4f} dex (bundle 5.12)")

print("\n" + "=" * 78); print("E. PALETTE LUMINANCE (CIE L*)"); print("=" * 78)
PALS = {
 "PAL_ASTRO_DARK": "060a18 0d1636 162a56 22406f 33598a 4d76a4 6f93b8 97aec6 bfc3bd dcc79a efc673 f8b846 fb9c2c f47320 dd451d 992018 2b0409",
 "PAL_TOPO_DARK":  "0d3b3f 12565c 1b7f86 1fa0a0 22b5a0 2fc46e 5bd24a 9ade3c c8e63a eded3f f7d13a f5a93a ef7f3c e85a45 c9303c 75151f 0a0204",
}
def Lstar(hexes):
    rgb = np.array([[int(h[i:i+2],16) for i in (0,2,4)] for h in hexes.split()])/255
    lin = np.where(rgb<=0.04045, rgb/12.92, ((rgb+0.055)/1.055)**2.4)
    Y = lin @ np.array([0.2126,0.7152,0.0722])
    return 116*np.where(Y>0.008856, Y**(1/3), 7.787*Y+16/116) - 16
for nm, p in PALS.items():
    L = Lstar(p); d = np.diff(L)
    peak = int(np.argmax(L))
    print(f"  {nm}")
    print(f"    L* {L[0]:.1f} -> peak {L.max():.1f} at band {peak} -> {L[-1]:.1f}")
    print(f"    monotonic? {bool((d>0).all())}   steepest drop {d.min():+.1f} L* (band {int(np.argmin(d))}->{int(np.argmin(d))+1})")
    amb = [(i,j) for i in range(len(L)) for j in range(i+2,len(L)) if abs(L[i]-L[j])<2.0]
    print(f"    band pairs within 2 L* of each other (visually confusable): {len(amb)}"
          f"  e.g. {amb[:4]}")
    print(f"    min |dL*| between adjacent bands: {np.abs(d).min():.2f}")
