from __future__ import annotations
from pathlib import Path
from PIL import Image

ROOT = Path('/home/ubuntu/quiz-space-audit')
paths = [
    ROOT / 'public/avatars/avatar-football-pro.webp',
    ROOT / 'public/avatars/avatar-music-pro.webp',
    ROOT / 'public/avatars/avatar-studying-pro.webp',
    ROOT / 'public/avatars/avatar-skater-pro.webp',
    ROOT / 'public/avatars/girl-studying-activity.webp',
    ROOT / 'public/avatars/girl-school-walk.webp',
    ROOT / 'public/images/frame-diamond-comet-quizspace.webp',
    ROOT / 'public/images/frame-diamond-crown-quizspace.webp',
    ROOT / 'public/images/frame-ramadan-lantern-quizspace.webp',
    ROOT / 'public/images/frame-back-to-school-quizspace.webp',
]
for path in paths:
    with Image.open(path) as source:
        image = source.convert('RGBA')
        alpha = image.getchannel('A')
        extrema = alpha.getextrema()
        corners = [image.getpixel((x, y)) for x, y in [(0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1)]]
        transparent = sum(1 for pixel in alpha.getdata() if pixel < 16)
        print(f'{path.name}: {image.width}x{image.height}, alpha={extrema}, transparent={transparent / (image.width * image.height):.1%}, corners={corners}')
