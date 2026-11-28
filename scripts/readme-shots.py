# Converts the PNGs written by scripts/readme-shots.mjs into the README WebPs (docs/images) and the OG image (public/og.jpg),
# and writes a contact sheet to check them side by side. Needs Pillow.
# Usage: python -I scripts/readme-shots.py [srcDir]   (default .shots/readme)
import json
import sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '.shots/readme')
ROOT = Path(__file__).resolve().parent.parent
# The names are the ones readme-shots.mjs wrote (README_SHOTS there); README*.md link docs/images/<name>.webp.
manifest = json.loads((SRC / 'shots.json').read_text(encoding='utf-8'))
if not manifest['complete']:
    sys.exit('readme-shots.mjs did not write every shot; nothing converted')
NAMES = manifest['names']
WEBP_QUALITY = 80
# The OG card is the home-night picture (1440 x 900) cropped to the box: 1200 x 630 is the OG size, and the origin keeps the
# whole box with its cords inside (the box spans about x 235-1200, y 340-865 in that picture).
OG_SOURCE, OG_ORIGIN, OG_SIZE, OG_QUALITY = 'home-night', (140, 255), (1200, 630), 85

for name in NAMES:
    im = Image.open(SRC / f'{name}.png').convert('RGB')
    out = ROOT / 'docs' / 'images' / f'{name}.webp'
    im.save(out, 'WEBP', quality=WEBP_QUALITY, method=6)
    print(out.relative_to(ROOT), im.size, out.stat().st_size)

og = Image.open(SRC / f'{OG_SOURCE}.png').convert('RGB')
x, y = OG_ORIGIN
og = og.crop((x, y, x + OG_SIZE[0], y + OG_SIZE[1]))
og_path = ROOT / 'public' / 'og.jpg'
og.save(og_path, 'JPEG', quality=OG_QUALITY, optimize=True)
print(og_path.relative_to(ROOT), og.size, og_path.stat().st_size)

thumbs = [Image.open(SRC / f'{n}.png').convert('RGB') for n in NAMES] + [og]
for t in thumbs:
    t.thumbnail((480, 480))
sheet = Image.new('RGB', (sum(t.width for t in thumbs) + 8 * len(thumbs), max(t.height for t in thumbs)), 'black')
cx = 0
for t in thumbs:
    sheet.paste(t, (cx, 0))
    cx += t.width + 8
sheet.save(SRC / 'sheet.png')
print(SRC / 'sheet.png')
