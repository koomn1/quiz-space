from pathlib import Path
from PIL import Image

src = Path('/home/ubuntu/quiz-space/public/brand/quizspace-logo-transparent.png')
im = Image.open(src).convert('RGBA')
pix = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = pix[x, y]
        # Remove green temporary background while preserving colored logo edges.
        green_strength = g - max(r, b)
        if green_strength > 18 and g > 65:
            alpha = max(0, min(255, int(255 - green_strength * 8)))
            pix[x, y] = (r, max(0, min(255, int(g * 0.55))), b, min(a, alpha))
        elif green_strength > 8 and g > 50:
            alpha = max(0, min(255, int(255 - green_strength * 13)))
            pix[x, y] = (r, max(0, min(255, int(g * 0.7))), b, min(a, alpha))

# Trim only fully transparent outer pixels, retaining a little clear space.
alpha = im.getchannel('A')
bbox = alpha.getbbox()
if bbox:
    pad = 34
    bbox = (max(0, bbox[0]-pad), max(0, bbox[1]-pad), min(im.width, bbox[2]+pad), min(im.height, bbox[3]+pad))
    im = im.crop(bbox)
im.save(src, optimize=True)
print(src, im.size)
