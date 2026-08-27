import numpy as np
# Resonance radii for an m-armed pattern in a power-law rotation curve V ~ R^b.
# kappa^2 = 2(1+b) * Omega^2 ;  resonance: m(Omega - Omega_p) = +/- kappa
# => Omega_p = Omega * (1 +/- sqrt(2(1+b))/m).  With Omega ~ R^(b-1):
#    R_res / R_CR = (1 +/- sqrt(2(1+b))/m) ** (1/(1-b))
def ratio(m, b, outer=True):
    s = np.sqrt(2*(1+b))/m
    return (1 + s if outer else 1 - s) ** (1/(1-b))

print("R_res / R_CR, by rotation-curve slope b = dlnV/dlnR")
print(f"{'b':>6s} {'ILR(m=2)':>9s} {'4:1 inner':>10s} {'CR':>5s} {'OLR(m=2)':>9s} {'OLR(m=4)':>9s}")
for b in (-0.10, -0.05, 0.0, 0.05, 0.10):
    print(f"{b:6.2f} {ratio(2,b,False):9.3f} {ratio(4,b,False):10.3f} {1.0:5.2f} "
          f"{ratio(2,b):9.3f} {ratio(4,b):9.3f}")

print("\n--- flat curve, the case worth quoting ---")
print(f"  4:1 inner (Contopoulos & Grosbol)  R = {ratio(4,0,False):.4f} R_CR")
print(f"  OLR, two-armed                     R = {ratio(2,0):.4f} R_CR")

print("\n--- chain from bar length, which the model already has ---")
R_BAR = 5.0                       # kpc, MW long-bar half-length (Wegg, Gerhard & Portail 2015)
for Rr, lab in ((1.0,"fast, lower"), (1.2,"Athanassoula 1992 central"), (1.4,"fast, upper")):
    Rcr = Rr*R_BAR
    print(f"  R_CR/R_bar={Rr:.1f} ({lab:24s}) -> R_CR {Rcr:5.2f} kpc"
          f" | 4:1 {ratio(4,0,False)*Rcr:5.2f} | OLR {ratio(2,0)*Rcr:5.2f} kpc")

print("\n--- does the BAR's OLR contain the observed arms? ---")
print(f"  bar OLR at R_CR=6.0 kpc  -> {ratio(2,0)*6.0:.2f} kpc")
print(f"  Reid19 Outer arm traced out to 14.27 kpc, kink at 12.24 kpc")
print("  -> the bar pattern's OLR does NOT reach the observed arms.")

print("\n--- so: what spiral pattern speed would put OLR at a given arm extent? ---")
V0 = 229.0                        # km/s, flat rotation amplitude
for R_arm in (14.0, 16.0, 18.0):
    Rcr = R_arm/ratio(2,0)
    Om  = V0/Rcr
    print(f"  arms end at {R_arm:4.1f} kpc -> R_CR {Rcr:5.2f} kpc -> Omega_p {Om:5.1f} km/s/kpc")

print("\n=== the check that matters ===")
V0 = 229.0
CR = [("Dias et al. 2019 (Gaia DR2, OCs)", 8.51, 0.64, 28.2),
      ("MNRAS OC+red giant method",        8.74, 0.20, 23.0)]
for lab, Rcr, err, om in CR:
    olr = 1.7071*Rcr
    print(f"{lab:34s} Om_p {om:4.1f}  R_CR {Rcr:5.2f}+/-{err:.2f}  ->  OLR {olr:5.2f} "
          f"+/- {1.7071*err:.2f} kpc")
print(f"{'Reid19 Outer arm, outermost traced':34s} {'':16s} {'':20s}     14.27 kpc")
d = 100*(14.27 - 1.7071*8.51)/(1.7071*8.51)
print(f"\n  deviation of Reid's outermost traced point from the Dias OLR: {d:+.1f}%")

print("\n--- bar corotation, which is where arms should ATTACH (manifold L1/L2) ---")
for om in (33.0, 37.5, 41.0):
    print(f"  Om_bar {om:4.1f} km/s/kpc -> R_CR,bar {V0/om:4.2f} kpc  "
          f"(bar half-length ~5.0 -> Rratio {V0/om/5.0:.2f})")

print("\n--- spread in the literature spiral pattern speed, and what it costs ---")
for om in (11, 15, 17, 20, 23, 28, 29):
    Rcr = V0/om
    print(f"  Om_p {om:3d} -> R_CR {Rcr:5.2f} kpc -> OLR {1.7071*Rcr:6.2f} kpc")
