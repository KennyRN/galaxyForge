import numpy as np
D2R = np.pi/180

print("="*78); print("A. CORRECTED Reid T2 traced radii (Reid sign) + what it does to Erratum 1"); print("="*78)
T2 = [("3 kpc",15,18,15,3.52,-4.2,-4.2),("Norma",5,54,18,4.46,-1.0,19.5),
      ("Sct-Cen",0,104,23,4.91,14.1,12.1),("Sgr-Car",2,97,24,6.04,17.1,1.0),
      ("Local",-8,34,9,8.26,11.4,11.4),("Perseus",-23,115,40,8.87,10.3,8.7),
      ("Outer",-16,71,18,12.24,3.0,9.4)]
def R(b,bk,Rk,pl,pg): return Rk*np.exp(-(b-bk)*D2R*np.tan((pl if b<bk else pg)*D2R))
rows=[]
for nm,blo,bhi,bk,Rk,pl,pg in T2:
    bs=np.linspace(blo,bhi,4001); r=np.array([R(b,bk,Rk,pl,pg) for b in bs])
    arc=(r.max()-r.min())/np.sin(np.radians(abs(pg if abs(pg)>1e-3 else pl)))
    rows.append((nm,bhi-blo,r.min(),r.max(),arc))
    print(f"  {nm:8s} span {bhi-blo:4d} deg   R {r.min():5.2f} - {r.max():5.2f} kpc"
          f"   (bundle printed the mirror of this)")
mx=max(r[3] for r in rows)
print(f"\n  outermost traced radius, ANY arm = {mx:.2f} kpc (Outer)   [bundle used 14.27]")
for lab,Rcr in (("Dias+2019 R_c=8.51",8.51),("Junqueira+2015 R_c=8.74",8.74)):
    print(f"    vs {lab:26s} OLR {1.70711*Rcr:5.2f} kpc -> {100*(mx-1.70711*Rcr)/(1.70711*Rcr):+6.1f}%")
print(f"\n  What Omega_p would put the m=2 OLR at {mx:.2f} kpc?")
for V0,lab in ((229.0,"Eilers+2019"),(236.0,"Reid+2019"),(240.0,"Dias+2019")):
    Rcr=mx/1.70711; print(f"    V0={V0:5.1f} ({lab:11s}) -> R_CR {Rcr:5.2f} kpc -> Omega_p {V0/Rcr:5.1f} km/s/kpc")

print("\n" + "="*78); print("B. R0/V0 frames in play across the bundle - Erratum 2.1 understates this"); print("="*78)
for lab,R0,V0 in (("Reid+2019 (arm loci, T2)",8.15,236.0),("Eilers+2019 (script V0)",8.122,229.0),
                  ("Dias+2019 (the R_c used)",8.30,240.0),("GRAVITY 2021 (current best R0)",8.275,None),
                  ("densityMap R_SOL (ref script)",8.15,None)):
    print(f"  {lab:32s} R0 = {R0:6.3f} kpc   V0 = {('%.1f'%V0) if V0 else '  -  '}")
print("  -> three different (R0,V0) pairs are mixed; Erratum 2.1 names only the Dias/table clash.")

print("\n" + "="*78); print("C. Hyland+2026 Perseus revision - impact on package 02's normaliser"); print("="*78)
print("  Perseus is the arm every tracedSpanDeg is normalised against.")
for lab,bk,Rk,pl,pg in (("Reid+2019       ",40,8.87,10.3,8.7),("Hyland+2026 2-seg",40,9.29,5.9,10.6),
                        ("Hyland+2026 1-seg",40,9.08,8.76,8.76)):
    bs=np.linspace(-23,115,4001); r=np.array([R(b,bk,Rk,pl,pg) for b in bs])
    need=np.degrees(np.log(16.0/3.5)/np.tan(pl*D2R))
    print(f"  {lab}  R over beta[-23,115] = {r.min():5.2f} - {r.max():5.2f} kpc"
          f"   arc needed for 3.5->16 kpc at psi< : {need:6.0f} deg")
print("  Reid's 479 deg becomes 843 deg on the two-segment fit: the 'implied gain' table moves a lot,")
print("  and Perseus sits 0.5-1.0 kpc further out than Table 2 places it.")

print("\n" + "="*78); print("D. Arm contrast: what an absolute-scale plate can now be tested against"); print("="*78)
print("  Sigma = Sigma0 (1 + A2 cos 2phi)  ->  arm/interarm = (1+A2)/(1-A2)")
for A2 in (0.10,0.14,0.20,0.333,0.50):
    c=(1+A2)/(1-A2); print(f"    A2 = {A2:5.3f} -> contrast x{c:5.3f} = {2.5*np.log10(c):5.3f} mag"
                           f" = {np.log2(c):5.3f} bands on the doubling scale")
print("\n  Elmegreen+2011 (S4G) observed range 0.3-1.3 mag:")
for m in (0.3,1.3):
    c=10**(m/2.5); print(f"    {m} mag -> contrast x{c:5.3f} -> A2 = {(c-1)/(c+1):5.3f}")
print("  Zibetti+2009: stellar MASS contrast ~ half the single-band photometric contrast.")
print("  Drimmel & Spergel A2 = 0.14 -> 0.30 mag -> exactly the FLOOR of the S4G range. Consistent.")
print("  => on a x2-per-band scale the MW's old-population arms should cross well UNDER one band.")

print("\n" + "="*78); print("E. Reyle anchor - resolving the open provenance obligation"); print("="*78)
V10 = 4/3*np.pi*10**3
for lab,n in (("Reyle+2021 (A&A 650, A201): 339 systems",339),("Reyle+2022 first update: 336 systems",336)):
    print(f"  {lab:44s} -> {n/V10:.5f} = {n/V10*1e2:.2f}e-2 systems/pc^3")
print(f"  bundle anchor 8.02e-2  ->  EXACT match to Reyle+2022 (336 systems / {V10:.1f} pc^3)")
print(f"  Poisson uncertainty on 336 counts: +/-{100/np.sqrt(336):.1f}%  -> 3 sig figs overstates precision")
