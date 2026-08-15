from __future__ import annotations

from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path('/home/ubuntu/quiz-space-audit')
AVATAR_ASSETS = [
    'avatars/avatar-football-pro.webp',
    'avatars/avatar-music-pro.webp',
    'avatars/avatar-studying-pro.webp',
    'avatars/avatar-skater-pro.webp',
    'avatars/girl-studying-activity.webp',
    'avatars/girl-school-walk.webp',
    'avatars/new_girl_avatar.webp',
]
FRAME_ASSETS = [
    'images/frame-diamond-comet-quizspace.webp',
    'images/frame-diamond-crown-quizspace.webp',
    'images/frame-ramadan-lantern-quizspace.webp',
    'images/frame-back-to-school-quizspace.webp',
]
OUT = ROOT / 'public' / 'clean-assets-deterministic'
OUT.mkdir(parents=True, exist_ok=True)


def save_rgba(rgb: np.ndarray, alpha: np.ndarray, target: Path) -> None:
    rgba = np.dstack([cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB), alpha.astype(np.uint8)])
    image = Image.fromarray(rgba, 'RGBA').resize((512, 512), Image.Resampling.LANCZOS)
    image.save(target, 'WEBP', quality=94, method=6)
    alpha_image = image.getchannel('A')
    print(f'{target.name}: alpha={alpha_image.getextrema()} transparent={sum(p < 16 for p in alpha_image.getdata())/(image.width*image.height):.1%}')


def clean_avatar(relative: str) -> None:
    source_path = ROOT / 'public' / relative
    image = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
    if image is None:
        print(f'SKIP missing {source_path}')
        return
    height, width = image.shape[:2]
    mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    margin = max(8, int(min(width, height) * 0.035))
    rect = (margin, margin, width - margin * 2, height - margin * 2)
    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(image, mask, rect, bg_model, fg_model, 8, cv2.GC_INIT_WITH_RECT)
    foreground = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    foreground = cv2.medianBlur(foreground, 5)
    foreground = cv2.GaussianBlur(foreground, (0, 0), 1.15)
    output = OUT / (Path(relative).stem + '-transparent.webp')
    save_rgba(image, foreground, output)


def clean_frame(relative: str) -> None:
    source_path = ROOT / 'public' / relative
    image = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
    if image is None:
        print(f'SKIP missing {source_path}')
        return
    height, width = image.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width]
    center_x, center_y = (width - 1) / 2, (height - 1) / 2
    radius = np.sqrt((xx - center_x) ** 2 + (yy - center_y) ** 2)
    # The frame is a ring. Remove both the square outside and the image area inside it.
    outer = np.clip((282 - radius) * 12, 0, 255)
    inner = np.clip((radius - 112) * 12, 0, 255)
    alpha = np.minimum(outer, inner).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.2)
    output = OUT / (Path(relative).stem + '-transparent.webp')
    save_rgba(image, alpha, output)


for asset in AVATAR_ASSETS:
    clean_avatar(asset)
for asset in FRAME_ASSETS:
    clean_frame(asset)
