"""Decode the supplied plate back to band indices and measure arm/interarm contrast.

The plate is a hard quantisation into 17 known palette colours, so the band index at
every pixel is exactly recoverable. On an ABSOLUTE x2-per-band scale, band difference
IS log2(contrast) - which makes arm amplitude measurable off the image for the first time.
"""
import numpy as np
from PIL import Image

PAL = ["060a18","0d1636","162a56","22406f","33598a","4d76a4","6f93b8","97aec6",
       "bfc3bd","dcc79a","efc673","f8b846","fb9c2c","f47320","dd451d","992018","2b0409"]
RGB = np.array([[int(c[i:i+2],16) for i in (0,2,4)] for c in PAL], float)
BG  = np.array([5,7,16], float)

im = np.array(Image.open("/home/claude/audit/galaxyForge-plate-absolute-scale.png").convert("RGB"), float)
PLATE = 1000                      # map area; legend strip below
img = im[:PLATE, :PLATE]
print(f"plate {img.shape}")

# nearest-palette decode
d = ((img[:, :, None, :] - RGB[None, None, :, :])**2).sum(-1)
dbg = ((img - BG)**2).sum(-1)
band = np.argmin(d, axis=2).astype(float)
band[dbg < d.min(axis=2)] = np.nan      # background pixels
resid = np.sqrt(np.minimum(d.min(axis=2), dbg))
print(f"palette decode residual: median {np.nanmedian(resid):.2f}, "
      f"99th pct {np.nanpercentile(resid,99):.2f} (0 = exact) -> decode is {'exact' if np.nanpercentile(resid,99)<3 else 'approximate'}")

HALF = 13.0                       # kpc; 26 kpc frame per package 01 S4
x = np.linspace(-HALF, HALF, PLATE)
X, Y = np.meshgrid(x, -x)
Rg = np.hypot(X, Y); TH = np.arctan2(Y, X)

print("\nAzimuthal band profile in annuli (band diff = log2 of arm/interarm contrast):")
print(f"{'R (kpc)':>8s} {'bands p5':>9s} {'p95':>6s} {'delta':>6s} {'contrast':>9s} {'A2 equiv':>9s} {'mag':>6s}")
for Rc in (4.0, 5.0, 6.0, 7.0, 8.15, 9.0, 10.0, 11.0):
    m = (np.abs(Rg - Rc) < 0.20) & ~np.isnan(band)
    if m.sum() < 200: continue
    b = band[m]
    lo, hi = np.percentile(b, 5), np.percentile(b, 95)
    dlt = hi - lo; c = 2.0**dlt
    A2 = (c - 1)/(c + 1)
    print(f"{Rc:8.2f} {lo:9.2f} {hi:6.2f} {dlt:6.2f} {c:9.2f} {A2:9.3f} {2.5*np.log10(c):6.2f}")

print("\nFor comparison, what the model's own stated science implies:")
for lab, A2 in (("Drimmel & Spergel A2=0.14 (old cohort, K-band)", 0.14),
                ("Eilers+2020 Gaia kinematic, ~10%", 0.10),
                ("Elmegreen+2011 S4G ceiling, 1.3 mag", 0.536)):
    c = (1+A2)/(1-A2)
    print(f"  {lab:46s} -> {np.log2(c):.2f} bands (x{c:.2f})")

print("\nFraction of the plate in each band (top band = clamped nucleus):")
h = np.array([np.nansum(band == i) for i in range(17)], float); h /= np.nansum(h)
for i in range(17):
    if h[i] > 0.0005:
        print(f"  band {i:2d}  [{0.25*2**i:9.2f} - {0.25*2**(i+1):9.2f}] systems/pc^2   {100*h[i]:5.2f}%")
