from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
android = root / 'android'
key_properties = android / 'key.properties'
if not key_properties.exists():
    raise SystemExit('Android key.properties is missing')

app_gradle = next((path for path in (android / 'app' / 'build.gradle.kts', android / 'app' / 'build.gradle') if path.exists()), None)
if app_gradle is None:
    raise SystemExit('Generated Android app Gradle file is missing')

text = app_gradle.read_text(encoding='utf-8')
if 'signingConfigs.create("release")' in text or 'signingConfigs { release {' in text:
    print('Android release signing already configured')
    raise SystemExit(0)

if app_gradle.suffix == '.kts':
    imports = 'import java.io.FileInputStream\nimport java.util.Properties\n\n'
    if 'import java.io.FileInputStream' not in text:
        text = imports + text
    properties = '''val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

'''
    text = text.replace('android {', properties + 'android {', 1)
    signing = '''    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties.getProperty("keyAlias")
            keyPassword = keystoreProperties.getProperty("keyPassword")
            storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
            storePassword = keystoreProperties.getProperty("storePassword")
        }
    }
'''
    build_types = re.search(r'(?m)^\s*buildTypes\s*\{', text)
    if not build_types:
        raise SystemExit('Android buildTypes block is missing')
    text = text[:build_types.start()] + signing + text[build_types.start():]
    text = text.replace('signingConfig = signingConfigs.getByName("debug")', 'signingConfig = signingConfigs.getByName("release")', 1)
    if 'isMinifyEnabled = true' not in text:
        build_types_start = text.find('buildTypes {')
        build_types_text = text[build_types_start:] if build_types_start >= 0 else ''
        release_match = re.search(r'(?m)^(\s*release\s*\{)', build_types_text)
        if release_match:
            indent = release_match.group(1)[: -len('release {')] + '    '
            hardening = f'\n{indent}isMinifyEnabled = true\n{indent}isShrinkResources = true\n{indent}proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")'
            absolute_end = build_types_start + release_match.end()
            text = text[:absolute_end] + hardening + text[absolute_end:]
else:
    imports = 'import java.util.Properties\nimport java.io.FileInputStream\n\n'
    if 'import java.util.Properties' not in text:
        text = imports + text
    properties = '''def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

'''
    text = text.replace('android {', properties + 'android {', 1)
    signing = '''    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
'''
    build_types = re.search(r'(?m)^\s*buildTypes\s*\{', text)
    if not build_types:
        raise SystemExit('Android buildTypes block is missing')
    text = text[:build_types.start()] + signing + text[build_types.start():]
    text = text.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release', 1)
    if 'minifyEnabled true' not in text:
        build_types_start = text.find('buildTypes {')
        build_types_text = text[build_types_start:] if build_types_start >= 0 else ''
        release_match = re.search(r'(?m)^(\s*release\s*\{)', build_types_text)
        if release_match:
            indent = release_match.group(1)[: -len('release {')] + '    '
            hardening = f'\n{indent}minifyEnabled true\n{indent}shrinkResources true\n{indent}proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"'
            absolute_end = build_types_start + release_match.end()
            text = text[:absolute_end] + hardening + text[absolute_end:]

proguard_rules = android / 'app' / 'proguard-rules.pro'
if not proguard_rules.exists():
    proguard_rules.write_text('# QuizSpace keeps release rules minimal; do not add secrets here.\n', encoding='utf-8')

app_gradle.write_text(text, encoding='utf-8')
print(f'Configured release signing and R8 hardening in {app_gradle}')
