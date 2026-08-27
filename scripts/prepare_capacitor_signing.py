from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
android = root / 'android'
properties_file = android / 'key.properties'
gradle_file = android / 'app' / 'build.gradle'

if not properties_file.exists():
    raise SystemExit('android/key.properties is missing')
if not gradle_file.exists():
    raise SystemExit('android/app/build.gradle is missing')

text = gradle_file.read_text(encoding='utf-8')
if 'signingConfigs {' in text and 'signingConfigs.release' in text:
    print('Capacitor release signing already configured')
    raise SystemExit(0)

imports = '''import java.util.Properties\nimport java.io.FileInputStream\n\n'''
if 'import java.util.Properties' not in text:
    text = imports + text

properties = '''def keystoreProperties = new Properties()\ndef keystorePropertiesFile = rootProject.file('key.properties')\nkeystoreProperties.load(new FileInputStream(keystorePropertiesFile))\n\n'''
text = text.replace('android {', properties + 'android {', 1)

signing = '''    signingConfigs {\n        release {\n            keyAlias keystoreProperties['keyAlias']\n            keyPassword keystoreProperties['keyPassword']\n            storeFile file(keystoreProperties['storeFile'])\n            storePassword keystoreProperties['storePassword']\n        }\n    }\n'''
marker = '    buildTypes {'
if marker not in text:
    raise SystemExit('buildTypes block is missing')
text = text.replace(marker, signing + marker, 1)
text = text.replace('        release {\n            minifyEnabled false', '        release {\n            signingConfig signingConfigs.release\n            minifyEnabled false', 1)

gradle_file.write_text(text, encoding='utf-8')
print('Configured Capacitor release signing')
