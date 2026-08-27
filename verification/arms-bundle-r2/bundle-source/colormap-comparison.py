import numpy as np, importlib.util, sys
import matplotlib
from matplotlib import colormaps
from scipy.ndimage import gaussian_filter as gf
from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location("sb", "/home/claude/scale_bench.py")
sb = importlib.util.module_from_spec(spec); sys.modules["sb"] = sb; spec.loader.exec_module(sb)

N_SOL, H_THIN = 8.02e-2, 300.0
SIG_SOL = 2*N_SOL*H_THIN
SIG_MIN, NB = 0.25, 17
R_SOL = 8.15

n = 400
fg = sb.build_field(n)
x = np.linspace(-sb.HALF, sb.HALF, n); Xg, Yg = np.meshgrid(x, -x); Rg = np.hypot(Xg, Yg)
fg = fg * (SIG_SOL / fg[np.abs(Rg-R_SOL) < 0.25].mean())
ba = np.radians(27.0); xb, yb = Xg*np.cos(ba)+Yg*np.sin(ba), -Xg*np.sin(ba)+Yg*np.cos(ba)
core = np.exp(-(np.maximum(Rg,1e-3)/0.45)**1.1)
fg = fg + core*(3.0e4 - fg.max())/core.max()

ASTRO_DARK = ["#060a18","#0d1636","#162a56","#22406f","#33598a","#4d76a4","#6f93b8","#97aec6",
              "#bfc3bd","#dcc79a","#efc673","#f8b846","#fb9c2c","#f47320","#dd451d","#992018","#2b0409"]

def swatches(name):
    if name == "astro_dark":
        return np.array([[int(c[i:i+2],16) for i in (1,3,5)] for c in ASTRO_DARK], np.uint8)
    cm = colormaps[name]
    return (np.array([cm(i/(NB-1))[:3] for i in range(NB)])*255).astype(np.uint8)

OUT = 480
def plate(name):
    rgb = swatches(name)
    v = np.log2(np.maximum(gf(fg,1.0),1e-12)/SIG_MIN)
    big = np.array(Image.fromarray(v.astype(np.float32)).resize((OUT,OUT), Image.BICUBIC))
    idx = np.floor(big).astype(np.int32)
    out = np.empty((OUT,OUT,3), np.uint8); out[:] = rgb[0]
    m = idx >= 0
    out[m] = rgb[np.clip(idx[m],0,NB-1)]
    return out, rgb

PANELS = [("astro_dark","Kenny's astro dark-peak","non-monotonic luminance"),
          ("inferno",   "inferno",                "MPL, perceptually uniform"),
          ("viridis",   "viridis",                "MPL default since 2.0"),
          ("magma",     "magma",                  "MPL, perceptually uniform"),
          ("cubehelix", "cubehelix",              "Green 2011, built for astronomy"),
          ("gray",      "greyscale",              "the print convention")]

COLS, ROWS = 3, 2
PW, PH, GAP, TOP = OUT, OUT+70, 16, 34
W = COLS*PW + (COLS+1)*GAP
H = TOP + ROWS*PH + (ROWS+1)*GAP
im = Image.new("RGB", (W,H), (12,14,20)); d = ImageDraw.Draw(im)
FB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 19)
FS = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
FT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 21)
d.text((GAP, 8), "Same field, same 17 absolute bands \u2014 only the ramp differs",
       font=FT, fill=(226,232,240))

for k,(name,lab,note) in enumerate(PANELS):
    img, rgb = plate(name)
    cx = GAP + (k % COLS)*(PW+GAP)
    cy = TOP + GAP + (k // COLS)*(PH+GAP)
    im.paste(Image.fromarray(img), (cx, cy))
    # ramp strip
    bw = PW/NB
    for i in range(NB):
        d.rectangle([cx+i*bw, cy+OUT+6, cx+(i+1)*bw, cy+OUT+22], fill=tuple(int(c) for c in rgb[i]))
    d.text((cx, cy+OUT+28), lab, font=FB, fill=(235,240,248))
    d.text((cx, cy+OUT+50), note, font=FS, fill=(140,155,180))

im.save("/home/claude/colormaps.png")

# luminance check - the thing the literature actually cares about
print(f"{'map':22s} {'L start':>8s} {'L end':>7s} {'monotonic?':>11s} {'max dip':>8s}")
for name,lab,_ in PANELS:
    rgb = swatches(name).astype(float)/255
    lin = np.where(rgb<=0.04045, rgb/12.92, ((rgb+0.055)/1.055)**2.4)
    Y = 0.2126*lin[:,0] + 0.7152*lin[:,1] + 0.0722*lin[:,2]
    L = 116*np.where(Y>0.008856, Y**(1/3), 7.787*Y+16/116) - 16
    dif = np.diff(L)
    print(f"{lab:22s} {L[0]:8.1f} {L[-1]:7.1f} {str(bool((dif>0).all())):>11s} {min(dif.min(),0):8.1f}")
