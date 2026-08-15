from pathlib import Path
from PIL import Image

ASSET_DIR = Path('/home/ubuntu/webdev-static-assets')
NAMES = [
    'quizspace-avatar-football-boy',
    'quizspace-avatar-girl-studying',
    'quizspace-avatar-boy-music',
    'quizspace-avatar-girl-walking',
    'quizspace-avatar-boy-cap-glasses',
    'frame-diamond-comet',
    'frame-diamond-crown',
    'frame-ramadan-crescent',
    'frame-back-school',
]

for name in NAMES:
    source = ASSET_DIR / f'{name}.png'
    if not source.exists():
        continue
    target = ASSET_DIR / f'{name}.webp'
    with Image.open(source) as image:
        image = image.convert('RGBA')
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=88, method=6)
        print(f'{target.name}: {source.stat().st_size} -> {target.stat().st_size} bytes')
