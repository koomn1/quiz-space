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

app_gradle.write_text(text, encoding='utf-8')
print(f'Configured release signing in {app_gradle}')
