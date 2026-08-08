from pathlib import Path
from PIL import Image, ImageFilter

root = Path('/home/ubuntu/quiz-space/public')
logo = Image.open(root / 'brand/quizspace-logo-transparent.png').convert('RGBA')
for name in ('share-card.png', 'quiz-share-card.png'):
    path = root / name
    card = Image.open(path).convert('RGBA')
    mark = logo.copy()
    mark.thumbnail((150, 150), Image.Resampling.LANCZOS)
    # Add a soft dark glass tile behind the mark for contrast.
    tile = Image.new('RGBA', (190, 190), (7, 6, 30, 0))
    tile.putalpha(190)
    tile = tile.filter(ImageFilter.GaussianBlur(0.4))
    card.alpha_composite(tile, (60, 54))
    card.alpha_composite(mark, (80 + (110 - mark.width // 2), 74 + (110 - mark.height // 2)))
    card.save(path, optimize=True)
    print(path)
