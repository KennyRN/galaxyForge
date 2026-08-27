import numpy as np
from scipy.ndimage import gaussian_filter as gf
from PIL import Image, ImageDraw, ImageFont
import importlib.util, sys

spec = importlib.util.spec_from_file_location("sb", "/home/claude/scale_bench.py")
sb = importlib.util.module_from_spec(spec)
sys.modules["sb"] = spec.loader.exec_module and None
spec.loader.exec_module(sb)

# ---- the anchor, from galaxyForge's own field ------------------------------
N_SOL   = 8.02e-2          # systems pc^-3 at Sol (densityMap.ts S4.1)
H_THIN  = 300.0            # pc, thin-disc scale height (Juric et al.)
SIG_SOL = 2 * N_SOL * H_THIN                       # column through an exponential disc
R_SOL   = 8.15             # kpc (Reid19 model assumption)
print(f"Sol column density  {SIG_SOL:.1f} systems pc^-2   (2 x {N_SOL} x {H_THIN})")

# ---- absolute band scale: every band is a doubling -------------------------
DEX      = np.log10(2.0)                            # 0.30103 -> each band is x2
SIG_MIN  = 0.25                                     # systems pc^-2, floor of the scale
NBANDS   = 17
edges    = SIG_MIN * 2.0**np.arange(NBANDS+1)
print(f"scale spans {edges[0]:.2f} to {edges[-1]:.0f} systems pc^-2 "
      f"= {np.log10(edges[-1]/edges[0]):.2f} dex over {NBANDS} bands")
sol_band = int(np.floor(np.log2(SIG_SOL/SIG_MIN)))
print(f"Sol falls in band {sol_band} of {NBANDS}  ({edges[sol_band]:.1f}-{edges[sol_band+1]:.1f})")

PAL = ["#060a18","#0d1636","#162a56","#22406f","#33598a","#4d76a4","#6f93b8","#97aec6",
       "#bfc3bd","#dcc79a","#efc673","#f8b846","#fb9c2c","#f47320","#dd451d","#992018","#2b0409"]
RGB = np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in PAL], np.uint8)
BG  = (5, 7, 16)

# ---- build field, calibrate it to systems pc^-2 ----------------------------
n = 400
fg = sb.build_field(n)
x  = np.linspace(-sb.HALF, sb.HALF, n); Xg, Yg = np.meshgrid(x, -x)
Rg = np.hypot(Xg, Yg)
ring = (np.abs(Rg - R_SOL) < 0.25)
scale = SIG_SOL / fg[ring].mean()                   # azimuthal mean at R_Sol -> Sol column
sig_map = fg * scale
# demo bulge is under-normalised. MW bulge ~2e10 Msun inside 1 kpc -> ~5 Msun pc^-3 mean,
# ~0.6 Msun per system -> ~8 systems pc^-3, column through ~800 pc -> ~6.4e3 pc^-2 mean,
# with a central peak an order higher. Top the demo bulge up to that, transparently.
BULGE_PEAK = 3.0e4
ba = np.radians(27.0); xb, yb = Xg*np.cos(ba)+Yg*np.sin(ba), -Xg*np.sin(ba)+Yg*np.cos(ba)
core = np.exp(-(np.maximum(Rg,1e-3)/0.45)**1.1)

sig_map = sig_map + core*(BULGE_PEAK - sig_map.max())/core.max()
print(f"calibration factor {scale:.4g};  field now spans "
      f"{sig_map.min():.3g} to {sig_map.max():.4g} systems pc^-2")

def paint(fg_sigma, out_px, smooth_cells=1.0):
    f = gf(fg_sigma, smooth_cells)
    v = np.log2(np.maximum(f, 1e-12) / SIG_MIN)     # band index directly, no percentiles
    big = np.array(Image.fromarray(v.astype(np.float32)).resize((out_px,out_px), Image.BICUBIC))
    idx = np.floor(big).astype(np.int32)
    out = np.empty((out_px,out_px,3), np.uint8); out[:] = BG
    m = idx >= 0
    out[m] = RGB[np.clip(idx[m], 0, NBANDS-1)]
    return out

OUT = 1000
plate = paint(sig_map, OUT)

# ---- legend strip ----------------------------------------------------------
LH, PAD = 150, 34
im = Image.new("RGB", (OUT, OUT+LH), BG)
im.paste(Image.fromarray(plate), (0,0))
d  = ImageDraw.Draw(im)
FB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
FR = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
FS = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)

x0, x1, ytop, bh = PAD, OUT-PAD, OUT+52, 24
w = (x1-x0)/NBANDS
for i in range(NBANDS):
    d.rectangle([x0+i*w, ytop, x0+(i+1)*w, ytop+bh], fill=tuple(RGB[i]))
d.rectangle([x0, ytop, x1, ytop+bh], outline=(70,84,110))

def xof(sigma): return x0 + np.log2(sigma/SIG_MIN)*w
for lab, s in (("0.25",0.25), ("1",1), ("10",10), ("100",100), ("1k",1000), ("10k",10000)):
    xx = xof(s)
    if x0-1 <= xx <= x1+1:
        d.line([xx, ytop+bh, xx, ytop+bh+5], fill=(120,136,164))
        d.text((xx-d.textlength(lab,FS)/2, ytop+bh+7), lab, font=FS, fill=(150,165,190))

# Sol marker
xs = xof(SIG_SOL)
d.polygon([(xs, ytop-3), (xs-6, ytop-13), (xs+6, ytop-13)], fill=(255,255,255))
d.line([xs, ytop, xs, ytop+bh], fill=(255,255,255), width=2)
lab = f"Solar neighbourhood  \u2248 {SIG_SOL:.0f} systems pc\u207b\u00b2"
lw  = d.textlength(lab, FB)
d.text((min(max(xs-lw/2, PAD), OUT-PAD-lw), OUT+16), lab, font=FB, fill=(255,255,255))

d.text((PAD, OUT+LH-26), "System surface density  \u00b7  each band \u00d72  \u00b7  absolute scale, identical in every galaxy  \u00b7  65 pc smoothing  \u00b7  400\u00d7400 field",
       font=FS, fill=(126,142,170))


im.save("/home/claude/plate_absolute.png")
print("saved")
