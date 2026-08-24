from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/quiz-space/public')
for source_name, target_name in [('share-card.png', 'share-card.jpg'), ('quiz-share-card.png', 'quiz-share-card.jpg')]:
    source = root / source_name
    target = root / target_name
    with Image.open(source) as image:
        rgb = image.convert('RGB')
        rgb.thumbnail((1200, 675), Image.Resampling.LANCZOS)
        rgb.save(target, 'JPEG', quality=78, optimize=True, progressive=True)
        print(f'{target}: {target.stat().st_size} bytes, {rgb.width}x{rgb.height}')
