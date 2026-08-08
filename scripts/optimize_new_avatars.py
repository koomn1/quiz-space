from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/quiz-space/public/avatars')
for path in sorted(root.glob('*.png')):
    if not any(path.name.startswith(prefix) for prefix in ('boy-8', 'boy-9', 'boy-10', 'boy-11', 'girl-8', 'girl-9', 'girl-10', 'girl-11')):
        continue
    with Image.open(path) as image:
        image = image.convert('RGB')
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        image.save(path, format='PNG', optimize=True, compress_level=9)
