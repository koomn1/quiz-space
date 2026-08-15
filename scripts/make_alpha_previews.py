from pathlib import Path
from PIL import Image, ImageDraw

root = Path('/home/ubuntu/quiz-space-audit/public/clean-assets-deterministic')
out = root / 'previews'
out.mkdir(exist_ok=True)
for name in ['avatar-football-pro-transparent.webp', 'avatar-music-pro-transparent.webp', 'avatar-studying-pro-transparent.webp', 'frame-diamond-comet-quizspace-transparent.webp']:
    source = Image.open(root / name).convert('RGBA')
    bg = Image.new('RGBA', source.size, (255, 255, 255, 255))
    for y in range(0, source.height, 32):
        for x in range(0, source.width, 32):
            if ((x // 32) + (y // 32)) % 2 == 0:
                ImageDraw.Draw(bg).rectangle((x, y, x + 31, y + 31), fill=(226, 232, 240, 255))
    preview = Image.alpha_composite(bg, source)
    preview.save(out / name.replace('.webp', '-preview.png'))
    print(name, 'alpha', source.getchannel('A').getextrema())
