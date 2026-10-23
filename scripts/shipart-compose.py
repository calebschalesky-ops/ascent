"""Side-by-side proof for the ship art pass: the accepted Gemini sheet on the left, the in-game model on the right
(hero view large, top / side / front / rear small), from the raw views scripts/shipart.js posts.

  python scripts/shipart-compose.py <nation> <kind> [<sheet-name>] [<out-name>]

Sheets are read from the main checkout's art-refit/refs/ships/ (untracked there). Writes shots/ship-art/<out>.jpg.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(HERE, 'shots', 'ship-art', 'raw')
REFS = r'<repo>\art-refit\refs\ships'

nation, kind = sys.argv[1], sys.argv[2]
sheet_name = sys.argv[3] if len(sys.argv) > 3 else None
out_name = sys.argv[4] if len(sys.argv) > 4 else f'{nation}-{kind}'

sheet = Image.open(os.path.join(REFS, f'{nation}-{sheet_name}.webp')).convert('RGB') if sheet_name else None
H = 720
def crop(im):
    # Trim the empty backdrop round the ship: anything that differs from the frame's corner colour is ship (a dark
    # Saturn hull included, which a brightness test would lose).
    from PIL import ImageChops
    bg = Image.new('RGB', im.size, im.getpixel((2, 2)))
    g = ImageChops.difference(im, bg).convert('L').point(lambda p: 255 if p > 10 else 0)
    b = g.getbbox()
    if not b:
        return im
    pad = 24
    x0, y0, x1, y1 = max(0, b[0] - pad), max(0, b[1] - pad), min(im.width, b[2] + pad), min(im.height, b[3] + pad)
    return im.crop((x0, y0, x1, y1))

def fit(im, w, h):
    im = crop(im)
    k = min(w / im.width, h / im.height)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    tile = Image.new('RGB', (w, h), (8, 10, 22))
    tile.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
    return tile

views = {v: os.path.join(RAW, f'{nation}-{kind}-{v}.jpg') for v in ['hero', 'top', 'side', 'front', 'rear']}
views = {v: Image.open(p).convert('RGB') for v, p in views.items() if os.path.exists(p)}

SW = int(sheet.width * H / sheet.height) if sheet else 0
RW = 1100
canvas = Image.new('RGB', (SW + RW, H + 34), (20, 22, 30))
d = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype('arial.ttf', 18)
except OSError:
    font = ImageFont.load_default()
if sheet:
    canvas.paste(sheet.resize((SW, H), Image.LANCZOS), (0, 34))
    d.text((10, 8), f'Accepted sheet: {nation}-{sheet_name}.webp', fill=(230, 220, 190), font=font)
d.text((SW + 10, 8), f'In game (fleet build, live scene renderer): {nation} {kind}', fill=(230, 220, 190), font=font)
# Right side: hero 1100 x 440, then four 275 x 280 tiles.
if 'hero' in views:
    canvas.paste(fit(views['hero'], RW, 440), (SW, 34))
for i, v in enumerate(['top', 'side', 'front', 'rear']):
    if v in views:
        canvas.paste(fit(views[v], RW // 4 - 4, H - 444), (SW + i * (RW // 4) + 2, 34 + 444))
        d.text((SW + i * (RW // 4) + 8, 34 + 448), v, fill=(200, 200, 200), font=font)
os.makedirs(os.path.join(HERE, 'shots', 'ship-art'), exist_ok=True)
out = os.path.join(HERE, 'shots', 'ship-art', out_name + '.jpg')
canvas.save(out, quality=88)
print(out)
