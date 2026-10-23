"""Contact sheet of the six audit shots: python scripts/sheet.py <prefix> -> shots/<prefix>-sheet.jpg"""
import sys
from PIL import Image
pre = sys.argv[1]
names = ['start', 'mars', 'sun', 'saturn', 'stars', 'fight']
W, H = 640, 360
sheet = Image.new('RGB', (W * 2, H * 3))
for i, n in enumerate(names):
    im = Image.open(f'shots/{pre}-{n}.jpg').resize((W, H))
    sheet.paste(im, ((i % 2) * W, (i // 2) * H))
sheet.save(f'shots/{pre}-sheet.jpg', quality=88)
