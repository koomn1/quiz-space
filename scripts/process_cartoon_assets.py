
import os
from PIL import Image

def process_image(input_path, output_path, size=None, format='WEBP', quality=80):
    with Image.open(input_path) as img:
        if size:
            img = img.resize(size, Image.Resampling.LANCZOS)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save
        if format.upper() == 'WEBP':
            img.save(output_path, 'WEBP', quality=quality, lossless=False)
        else:
            img.save(output_path, format.upper())
        print(f"Processed: {input_path} -> {output_path} ({os.path.getsize(output_path)//1024}KB)")

# Base paths
repo_root = '/home/ubuntu/projects/quiz-space-repo'
gen_brand = os.path.join(repo_root, 'public/brand')
gen_avatars = os.path.join(repo_root, 'public/avatars')

# 1. Process Logo
logo_source = os.path.join(gen_brand, 'quizspace-logo-cartoon.png')
process_image(logo_source, os.path.join(gen_brand, 'quizspace-logo-512.webp'), size=(512, 512))
process_image(logo_source, os.path.join(gen_brand, 'quizspace-icon-192.png'), size=(192, 192), format='PNG')
process_image(logo_source, os.path.join(gen_brand, 'quizspace-icon-64.png'), size=(64, 64), format='PNG')
process_image(logo_source, os.path.join(gen_brand, 'quizspace-favicon-32.png'), size=(32, 32), format='PNG')

# 2. Process Avatars
for i in range(1, 7):
    # Boy
    boy_source = os.path.join(gen_avatars, f'boy-cartoon-{i}.png')
    process_image(boy_source, os.path.join(gen_avatars, f'boy-{i}.webp'), size=(256, 256))
    
    # Girl
    girl_source = os.path.join(gen_avatars, f'girl-cartoon-{i}.png')
    process_image(girl_source, os.path.join(gen_avatars, f'girl-{i}.webp'), size=(256, 256))

print("Image processing complete.")
