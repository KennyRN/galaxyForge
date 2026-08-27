"""
Arms bundle R2 - prompt P12 citation verification arithmetic.

Companion to galaxyForge-CITATION-VERIFICATION-2026-08-26.md - reproduces the
transcription checks and frame-consistency arithmetic (Honig & Reid 2015
Tables 2/3/5, Dias et al. 2019 vs. Junqueira et al. 2015 corotation frames)
that back that report's per-item findings. Not part of the plugin build or
gate suite; run standalone with `python3 verify_06_citations.py`.
"""
import numpy as np

print("="*76)
print("A. HONIG & REID 2015 - bundle transcription vs the actual Tables 2, 3, 5")
print("="*76)
# (arm, table, interior: az_lo,az_hi,R,w | terminal: az_lo,az_hi,R,w) read from the paper
REAL = [
 ("NGC 628 B",  "T2", (195,255,10.38,0.87), (255,290,12.02,0.59)),
 ("NGC 1232 E", "T3", (-85,-65,11.38,0.24), (-65,-40,12.83,0.14)),
 ("NGC 5194 A", "T5", (30,-15,  6.45,0.31), (-15,-40, 6.08,0.23)),
 ("NGC 5194 B", "T5", (-250,-305,7.05,0.46),(-305,-345,9.72,0.22)),
]
BUNDLE = {"NGC 628 B":(10.38,0.87,12.02,0.59,35), "NGC 1232 E":(11.38,0.24,12.83,0.14,25),
          "NGC 5194 A":(6.45,0.31,6.08,0.23,25),  "NGC 5194 B":(7.05,0.46,9.72,0.22,40)}
ok = True
for nm, tab, (a0,a1,Ri,wi), (b0,b1,Rt,wt) in REAL:
    arc = abs(b1-b0); bi = BUNDLE[nm]
    match = np.allclose([Ri,wi,Rt,wt,arc], bi)
    ok &= match
    print(f"  {nm:11s} ({tab})  interior {Ri:5.2f}/{wi:.2f}  terminal {Rt:5.2f}/{wt:.2f}"
          f"  arc {arc:2.0f}  ratio {wt/wi:.4f}   {'MATCH' if match else 'DISCREPANT'}")
print(f"\n  All four entries reproduce the paper exactly: {ok}")

r = np.array([BUNDLE[k][3]/BUNDLE[k][1] for k in BUNDLE])
a = np.array([BUNDLE[k][4] for k in BUNDLE], float)
print(f"  width ratio mean {r.mean():.4f} (bundle 0.62)   arc mean {a.mean():.2f} (bundle 31)")

print("\n" + "="*76)
print("B. Is armTipArcDeg=31 physics, or the authors' segmentation choice?")
print("="*76)
print("  Paper S3: 'we re-fit each arm with spiral segments of length roughly 5 to 10 kpc'")
print("  Boundaries chosen on 3 subjective criteria (density breaks, pitch changes, sample size).")
print(f"\n  {'arm':11s} {'arc deg':>8s} {'R_term':>7s} {'arc length kpc':>15s}")
L=[]
for k in BUNDLE:
    Rt, arc = BUNDLE[k][2], BUNDLE[k][4]
    ln = Rt*np.radians(arc); L.append(ln)
    print(f"  {k:11s} {arc:8.0f} {Rt:7.2f} {ln:15.2f}")
L=np.array(L)
print(f"\n  arc length: mean {L.mean():.2f} kpc, sd {L.std(ddof=1):.2f}, CV {L.std(ddof=1)/L.mean():.3f}")
print(f"  arc degree: mean {a.mean():.2f} deg, sd {a.std(ddof=1):.2f}, CV {a.std(ddof=1)/a.mean():.3f}")
print("  3 of 4 terminal segments fall inside the authors' own chosen 5-10 kpc segment length.")
print("  -> the arc measures the ANALYSIS, not the galaxy. Degrees are the tighter of the two,")
print("     but neither is a physical tip scale.")

print("\n" + "="*76)
print("C. The 'three outliers' vs four arms - Fig.10 is width vs radius, lower-right = big R, small w")
print("="*76)
for k in BUNDLE:
    Rt, wt = BUNDLE[k][2], BUNDLE[k][3]
    print(f"  {k:11s} terminal point (R={Rt:5.2f}, w={wt:.2f})"
          f"{'   <- small R: not in the lower-right corner' if Rt<7 else ''}")
print("  -> 'three outliers' describes the plot; four arms narrow. NGC 5194 A narrows at only")
print("     6.08 kpc so it does not land in the lower-right. No contradiction. 4/10 stands.")

print("\n" + "="*76)
print("D. Denominator check: arms with >=2 fitted segments (Fig.10's plotted set)")
print("="*76)
SEG = {"NGC 628":{"A":3,"B":4}, "NGC 1232":{"A":3,"B":4,"C":2,"D":1,"E":2,"F":1},
       "NGC 3184":{"A":3,"B":3}, "NGC 5194":{"A":5,"B":6}}
tot=0
for g,arms in SEG.items():
    e=[k for k,v in arms.items() if v>=2]; tot+=len(e)
    print(f"  {g:9s} segments {arms}  -> eligible {e}")
print(f"\n  Total arms with >=2 segments = {tot}   -> armTipProbability = 4/{tot} = {4/tot:.2f}  CONFIRMED")

print("\n" + "="*76)
print("E. Frame arithmetic: Dias vs Junqueira")
print("="*76)
print(f"  Dias 2019 abstract: R0=8.3, V0=240, Om_p=28.2 -> R_c = 240/28.2 = {240/28.2:.4f} kpc")
print(f"     paper states R_c = 8.51 +/- 0.64 -> INTERNALLY CONSISTENT (flat curve, R_c = V0/Om_p)")
print(f"     R_c/R0 = {(240/28.2)/8.3:.3f}  vs stated 1.02 +/- 0.07 -> consistent")
print(f"\n  Junqueira (source pack): Om_p=23.0, R_c=8.74, frame said to be R0=8.0, V0=220")
print(f"     flat-curve R_c from that frame = 220/23.0 = {220/23.0:.4f} kpc  != 8.74")
print(f"     to get 8.74 you need either V0 = 23.0*8.74 = {23.0*8.74:.1f} km/s at that radius,")
print(f"                             or Om_p = 220/8.74 = {220/8.74:.2f} km/s/kpc")
print("     Neither matches the recorded pair. UNRESOLVED - and note I could not confirm")
print("     Om_p=23.0 or R_c=8.74 from the paper either, so BOTH numbers stay unverified.")
print(f"\n  For reference, the OLR each choice implies (x1.70711):")
for lab, Rc in (("R_c=8.51 (Dias)",8.51),("R_c=8.74 (as recorded)",8.74),
                ("R_c=9.57 (Junqueira frame, flat)",9.5652),("R_c=12 (radio branch)",12.0)):
    print(f"    {lab:34s} OLR = {1.70711*Rc:5.2f} kpc")
