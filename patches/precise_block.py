import numpy as np, itertools
from scipy.special import i0e
from scipy.optimize import brentq
exec(open('derive_arm_constants_v3.py').read().split('print("="*76)')[0])

def K_of(s,c,R=R_SUN,n=14401):
    th=np.linspace(0,2*np.pi,n,endpoint=False)
    v=np.array([armFactor(s,c,R,t) for t in th]); return v.max()/v.min()
KT=1.14/0.86
c_old=brentq(lambda c:K_of('major',c)-KT,1e-4,3.0,xtol=1e-14)
c_mid,c_yng=1.4*c_old,2.0*c_old
print("CONTRASTS (full precision, from derive_arm_constants_v3.py)")
print(f"  oldThin   {c_old:.10f}   -> store {round(c_old,4):.4f}")
print(f"  midThin   {c_mid:.10f}   -> store {round(c_mid,4):.4f}")
print(f"  youngThin {c_yng:.10f}   -> store {round(c_yng,4):.4f}")
print("\nANCHOR CORRECTION at (8200 pc, 0 deg), computed with the STORED 4-dp contrasts")
for s,c,lab in [('major',0.3096,'oldThin'),('majorMinor',0.4335,'midThin'),('all',0.6193,'youngThin')]:
    print(f"  {lab:9s} {armFactor(s,c,R_SUN,0.0):.12f}")
print("\nKAPPA RANGE over 3.5-16 kpc, all arms")
ks=[kappaOf(a,R) for a in ARMS for R in np.arange(3500,16001,25.)]
print(f"  {min(ks):.4f} to {max(ks):.4f}")
print("\nCELL SIZE FLOOR CHECK")
print(f"  8 * sigmaComplexPc = {8*150} pc ; cellSizePc = 1200 -> margin {1200-8*150} pc (AT THE FLOOR)")
print("\nSUB-GRID QUADRATURE (v2.1 sec 2): resolve sigma_perp/4 at the tightest radius in the gate band")
for R in (3900., 8200.):
    sp=armWidthPc(R); print(f"  R={R:.0f}: sigma_perp={sp:.0f} pc -> target {sp/4:.0f} pc -> "
                            f"n >= {int(np.ceil(1200/(sp/4)))} per 1200 pc cell axis")
