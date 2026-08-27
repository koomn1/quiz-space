from pathlib import Path
import os

path = Path('android/app/build.gradle')
text = path.read_text(encoding='utf-8')
version_code = os.environ['VERSION_CODE']
version_name = os.environ['VERSION_NAME']
text = text.replace('versionCode 1', f'versionCode {version_code}', 1)
text = text.replace('versionName "1.0"', f'versionName "{version_name}"', 1)
path.write_text(text, encoding='utf-8')
print(f'Configured Android version {version_name} ({version_code})')
