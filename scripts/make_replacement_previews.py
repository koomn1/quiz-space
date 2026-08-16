from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path('/home/ubuntu/quiz-space-audit/public/clean-assets-replacement')
OUT = ROOT / 'previews'
OUT.mkdir(exist_ok=True)
size = 512
cell = 32
board = Image.new('RGB', (size, size), '#f4f7fb')
draw = ImageDraw.Draw(board)
for y in range(0, size, cell):
    for x in range(0, size, cell):
        if (x // cell + y // cell) % 2:
            draw.rectangle([x, y, x + cell - 1, y + cell - 1], fill='#c7d2e2')
for path in sorted(ROOT.glob('*-transparent.webp')):
    image = Image.open(path).convert('RGBA')
    composed = board.convert('RGBA')
    composed.alpha_composite(image)
    composed.convert('RGB').save(OUT / f'{path.stem}-preview.jpg', quality=92, optimize=True)
    print(OUT / f'{path.stem}-preview.jpg')
