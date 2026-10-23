# Contact sheet of graphics-pass shots: python scripts/gpsheet.py <out.jpg> <glob> [cols]
import sys, glob, os
from PIL import Image, ImageDraw
out, pat = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
files = sorted(glob.glob(pat))
tw, th = 480, 270
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 18)), (20, 20, 24))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB'); im.thumbnail((tw, th))
    x, y = (i % cols) * tw, (i // cols) * (th + 18)
    sheet.paste(im, (x, y + 18)); d.text((x + 4, y + 3), os.path.basename(f)[:60], fill=(255, 220, 140))
sheet.save(out, quality=85)
print(out, len(files))
