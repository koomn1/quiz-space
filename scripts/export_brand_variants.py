from pathlib import Path
from PIL import Image

src = Path('/home/ubuntu/quiz-space/public/brand/quizspace-logo-transparent.png')
im = Image.open(src).convert('RGBA')
brand = src.parent
for size, name in [(512, 'quizspace-logo-512.png'), (192, 'quizspace-icon-192.png'), (64, 'quizspace-icon-64.png'), (32, 'quizspace-favicon-32.png')]:
    out = im.copy()
    out.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(out, ((size - out.width)//2, (size - out.height)//2))
    canvas.save(brand / name, optimize=True)
    print(name, (brand / name).stat().st_size)
