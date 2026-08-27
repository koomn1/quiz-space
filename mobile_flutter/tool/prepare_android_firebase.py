from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
android = root / 'android'
config = root / 'config' / 'google-services.json'
app_manifest = android / 'app' / 'google-services.json'

if not config.exists():
    raise SystemExit('Firebase Android configuration is missing')
app_manifest.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(config, app_manifest)

settings = next((path for path in (android / 'settings.gradle.kts', android / 'settings.gradle') if path.exists()), None)
app_gradle = next((path for path in (android / 'app' / 'build.gradle.kts', android / 'app' / 'build.gradle') if path.exists()), None)
if settings is None or app_gradle is None:
    raise SystemExit('Generated Android Gradle files are missing')

settings_text = settings.read_text(encoding='utf-8')
if settings.suffix == '.kts':
    settings_text = re.sub(r'(id\("org\.jetbrains\.kotlin\.android"\) version )"[^"]+"', r'\1"2.3.0"', settings_text, count=1)
else:
    settings_text = re.sub(r'(id [\'\"]org\.jetbrains\.kotlin\.android[\'\"] version [\'\"])[^\'\"]+([\'\"])', r'\g<1>2.3.0\g<2>', settings_text, count=1)
if 'com.google.gms.google-services' not in settings_text:
    if settings.suffix == '.kts':
        marker = '  id("org.jetbrains.kotlin.android") version "'
        match = re.search(r'(\s*id\("org\.jetbrains\.kotlin\.android"\) version "[^"]+" apply false)', settings_text)
        line = '  id("com.google.gms.google-services") version "4.4.2" apply false'
    else:
        match = re.search(r'(\s*id [\'\"]org\.jetbrains\.kotlin\.android[\'\"] version [\'\"][^\'\"]+[\'\"] apply false)', settings_text)
        line = "  id 'com.google.gms.google-services' version '4.4.2' apply false"
    if match:
        settings_text = settings_text[:match.end()] + '\n' + line + settings_text[match.end():]
    else:
        settings_text = settings_text.replace('plugins {', 'plugins {\n' + line, 1)
    settings.write_text(settings_text, encoding='utf-8')

app_text = app_gradle.read_text(encoding='utf-8')
if app_gradle.suffix == '.kts':
    app_text, app_id_count = re.subn(r'applicationId\s*=\s*"[^"]+"', 'applicationId = "com.quizspace.badawy"', app_text, count=1)
else:
    app_text, app_id_count = re.subn(r'applicationId\s+[\'\"][^\'\"]+[\'\"]', "applicationId 'com.quizspace.badawy'", app_text, count=1)
if app_id_count != 1:
    raise SystemExit('Android applicationId entry is missing')

if 'com.google.gms.google-services' not in app_text:
    if app_gradle.suffix == '.kts':
        marker = 'id("dev.flutter.flutter-gradle-plugin")'
        replacement = marker + '\n    id("com.google.gms.google-services")'
    else:
        marker = "id 'dev.flutter.flutter-gradle-plugin'"
        replacement = marker + "\n    id 'com.google.gms.google-services'"
    if marker not in app_text:
        raise SystemExit('Flutter Gradle plugin entry is missing')
    app_text = app_text.replace(marker, replacement, 1)
    app_gradle.write_text(app_text, encoding='utf-8')

print(f'Prepared Firebase Android config for {app_manifest}')
