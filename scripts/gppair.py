# Before/after pairs of graphics-pass shots, one row per scene, left before, right after:
#   python scripts/gppair.py <out.jpg> <before-prefix> <after-prefix> scene,scene,...   (run in shots/graphics-pass)
import sys, os
from PIL import Image, ImageDraw
out, pa, pb, scenes = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',')
tw, th = 640, 360
sheet = Image.new('RGB', (2 * tw, len(scenes) * (th + 18)), (20, 20, 24))
d = ImageDraw.Draw(sheet)
for r, s in enumerate(scenes):
    for c, p in enumerate((pa, pb)):
        f = f'{p}-{s}.jpg'
        x, y = c * tw, r * (th + 18)
        d.text((x + 4, y + 3), f, fill=(255, 220, 140))
        if not os.path.exists(f):
            d.text((x + 8, y + 40), 'missing', fill=(255, 90, 90))
            continue
        im = Image.open(f).convert('RGB'); im.thumbnail((tw, th))
        sheet.paste(im, (x, y + 18))
sheet.save(out, quality=86)
print(out, len(scenes))
