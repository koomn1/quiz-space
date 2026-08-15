from __future__ import annotations

from pathlib import Path
from rembg import new_session, remove
from PIL import Image

ROOT = Path('/home/ubuntu/quiz-space-audit')
OUT = ROOT / 'public' / 'clean-assets'
OUT.mkdir(parents=True, exist_ok=True)

ASSETS = [
    ('avatars/avatar-football-pro.webp', 'avatar-football-pro-clean.webp'),
    ('avatars/avatar-music-pro.webp', 'avatar-music-pro-clean.webp'),
    ('avatars/avatar-studying-pro.webp', 'avatar-studying-pro-clean.webp'),
    ('avatars/avatar-skater-pro.webp', 'avatar-skater-pro-clean.webp'),
    ('avatars/girl-studying-activity.webp', 'girl-studying-activity-clean.webp'),
    ('avatars/girl-school-walk.webp', 'girl-school-walk-clean.webp'),
    ('avatars/new_girl_avatar.webp', 'new-girl-avatar-clean.webp'),
    ('images/frame-diamond-comet-quizspace.webp', 'frame-diamond-comet-clean.webp'),
    ('images/frame-diamond-crown-quizspace.webp', 'frame-diamond-crown-clean.webp'),
    ('images/frame-ramadan-lantern-quizspace.webp', 'frame-ramadan-lantern-clean.webp'),
    ('images/frame-back-to-school-quizspace.webp', 'frame-back-to-school-clean.webp'),
]

session = new_session('isnet-general-use')
for relative, output_name in ASSETS:
    source_path = ROOT / 'public' / relative
    if not source_path.exists():
        print(f'SKIP missing: {source_path}')
        continue
    with Image.open(source_path).convert('RGBA') as source:
        # rembg returns RGBA with an estimated foreground alpha; keep a compact working size.
        result = remove(source, session=session, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=10, alpha_matting_erode_size=10)
        result = result.convert('RGBA').resize((512, 512), Image.Resampling.LANCZOS)
        result.save(OUT / output_name, 'WEBP', quality=92, method=6)
        alpha = result.getchannel('A')
        print(f'{output_name}: alpha={alpha.getextrema()} size={(OUT / output_name).stat().st_size}')
