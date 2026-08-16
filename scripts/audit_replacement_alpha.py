from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path('/home/ubuntu/quiz-space-audit/public/clean-assets-replacement')
for path in sorted(ROOT.glob('*-transparent.webp')):
    image = Image.open(path).convert('RGBA')
    rgba = np.asarray(image)
    alpha = rgba[:, :, 3]
    h, w = alpha.shape
    samples = {
        'tl': int(alpha[2, 2]),
        'tr': int(alpha[2, w - 3]),
        'bl': int(alpha[h - 3, 2]),
        'br': int(alpha[h - 3, w - 3]),
        'center': int(alpha[h // 2, w // 2]),
        'inner_near': int(alpha[h // 2, w // 2 + 90]),
    }
    corners_ok = max(samples[k] for k in ('tl', 'tr', 'bl', 'br')) <= 8
    center_ok = samples['center'] <= 8
    print(f'{path.name}: size={path.stat().st_size} bytes alpha={alpha.min()}..{alpha.max()} corners_ok={corners_ok} center_ok={center_ok} samples={samples}')
