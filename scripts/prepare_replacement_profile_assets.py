from __future__ import annotations

from pathlib import Path
import cv2
import numpy as np
from PIL import Image

PROJECT = Path('/home/ubuntu/quiz-space-audit')
SOURCE = Path('/home/ubuntu/webdev-static-assets')
OUT = PROJECT / 'public' / 'clean-assets-replacement'
PREVIEWS = OUT / 'previews'
OUT.mkdir(parents=True, exist_ok=True)
PREVIEWS.mkdir(parents=True, exist_ok=True)

AVATARS = {
    'boy-robotics': 'quizspace-avatar-reference-robotics.png',
    'girl-pottery': 'quizspace-v2-avatar-girl-pottery.png',
    'boy-chef': 'quizspace-v2-avatar-boy-chef.png',
    'girl-dance': 'quizspace-v2-avatar-girl-dance.png',
    'boy-photography': 'quizspace-v2-avatar-boy-photography.png',
    'girl-cycling': 'quizspace-v2-avatar-girl-cycling.png',
}
FRAMES = {
    'galaxy-ring': 'images/frame-galaxy.webp',
    'cyber-orbit': 'images/frame-cyber-punk.webp',
    'nature-leaf': 'images/frame-nature-leaf.webp',
    'ramadan-green': 'images/frame-ramadan-green.webp',
    'school-bus': 'images/frame-school-bus.webp',
    'neon-orbit': 'images/frame-neon-orbit.webp',
    'aurora-glass': 'images/frame-aurora.webp',
    'fire-trail': 'images/frame-fire.webp',
    'crystal-luxe': 'images/frame-crystal-luxe.webp',
    'star-crown': 'images/frame-star-crown.webp',
    'royal-gold': 'images/frame-royal-gold.webp',
    'school-stationary': 'images/frame-school-stationary.webp',
}


def read_rgba(path: Path) -> np.ndarray | None:
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        print(f'SKIP missing {path}')
        return None
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
    if image.shape[2] == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
    else:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2RGBA)
    return image


def trim_and_resize(rgba: np.ndarray, size: int = 512) -> Image.Image:
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 12)
    if len(xs) and len(ys):
        x0, x1 = max(0, xs.min() - 12), min(rgba.shape[1], xs.max() + 13)
        y0, y1 = max(0, ys.min() - 12), min(rgba.shape[0], ys.max() + 13)
        rgba = rgba[y0:y1, x0:x1]
    image = Image.fromarray(rgba, 'RGBA')
    image.thumbnail((size - 24, size - 24), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def save_webp(image: Image.Image, stem: str) -> None:
    target = OUT / f'{stem}-transparent.webp'
    image.save(target, 'WEBP', quality=92, method=6)
    alpha = np.asarray(image.getchannel('A'))
    print(f'{target.name}: size={target.stat().st_size} alpha_min={alpha.min()} alpha_max={alpha.max()} transparent={(alpha < 16).mean():.1%}')


def clean_avatar(stem: str, filename: str) -> None:
    source_path = SOURCE / filename
    rgba = read_rgba(source_path)
    if rgba is None:
        return
    rgb = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
    height, width = rgb.shape[:2]
    mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    margin = max(12, int(min(width, height) * 0.025))
    rect = (margin, margin, max(1, width - margin * 2), max(1, height - margin * 2))
    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(rgb, mask, rect, bg_model, fg_model, 7, cv2.GC_INIT_WITH_RECT)
    foreground = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    foreground = cv2.medianBlur(foreground, 5)
    foreground = cv2.GaussianBlur(foreground, (0, 0), 1.0)
    source_alpha = rgba[:, :, 3]
    if source_alpha.min() < 250:
        foreground = cv2.min(foreground, source_alpha)
    out = np.dstack([rgba[:, :, :3], foreground]).astype(np.uint8)
    save_webp(trim_and_resize(out), stem)


def clean_frame(stem: str, filename: str) -> None:
    source_path = PROJECT / 'public' / filename
    if not source_path.exists():
        source_path = SOURCE / filename
    rgba = read_rgba(source_path)
    if rgba is None:
        return
    height, width = rgba.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width]
    cx, cy = (width - 1) / 2, (height - 1) / 2
    radius = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    outer_radius = min(width, height) * 0.49
    inner_radius = min(width, height) * 0.255
    feather = max(3.0, min(width, height) * 0.012)
    outer = np.clip((outer_radius - radius) / feather, 0, 1)
    inner = np.clip((radius - inner_radius) / feather, 0, 1)
    ring_alpha = np.minimum(outer, inner) * 255
    source_alpha = rgba[:, :, 3].astype(np.float32)
    rgb = rgba[:, :, :3].astype(np.float32)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    green_screen = (green > 90) & (green > red * 1.18) & (green > blue * 1.12)
    alpha = np.minimum(ring_alpha, source_alpha)
    alpha[green_screen] = 0
    out = np.dstack([rgba[:, :, :3], alpha.astype(np.uint8)]).astype(np.uint8)
    image = Image.fromarray(out, 'RGBA').resize((512, 512), Image.Resampling.LANCZOS)
    save_webp(image, stem)


for stem, filename in AVATARS.items():
    clean_avatar(stem, filename)
for stem, filename in FRAMES.items():
    clean_frame(stem, filename)
