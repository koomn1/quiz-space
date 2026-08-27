from pathlib import Path
import os

path = Path(__file__).resolve().parents[1] / 'android' / 'app' / 'build.gradle'
text = path.read_text(encoding='utf-8')
version_code = os.environ['VERSION_CODE']
version_name = os.environ['VERSION_NAME']

if not version_code.isdigit() or not version_name.replace('.', '').isdigit():
    raise SystemExit('Invalid Android release version')

text, code_count = __import__('re').subn(r'versionCode\s+\d+', f'versionCode {version_code}', text, count=1)
text, name_count = __import__('re').subn(r'versionName\s+["\'][^"\']+["\']', f'versionName "{version_name}"', text, count=1)
if code_count != 1 or name_count != 1:
    raise SystemExit('Android version fields are missing')
path.write_text(text, encoding='utf-8')
print(f'Configured Android version {version_name} ({version_code})')
