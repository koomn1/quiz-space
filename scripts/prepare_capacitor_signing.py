from pathlib import Path

root = Path(__file__).resolve().parents[1]
android = root / 'android'
gradle_file = android / 'app' / 'build.gradle'
properties_file = android / 'key.properties'

if not properties_file.exists():
    raise SystemExit('android/key.properties is missing')
if not gradle_file.exists():
    raise SystemExit('android/app/build.gradle is missing')

text = gradle_file.read_text(encoding='utf-8')
imports = 'import java.util.Properties\nimport java.io.FileInputStream\n\n'
if 'import java.util.Properties' not in text:
    text = imports + text
properties = """def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

"""
if 'def keystorePropertiesFile' not in text:
    text = text.replace('android {', properties + 'android {', 1)

if 'signingConfigs {' not in text:
    signing = """    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
"""
    text = text.replace('    buildTypes {', signing + '    buildTypes {', 1)

text = text.replace('        release {\n            minifyEnabled false', """        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true""", 1)
text = text.replace("getDefaultProguardFile('proguard-android.txt')", "getDefaultProguardFile('proguard-android-optimize.txt')", 1)

gradle_file.write_text(text, encoding='utf-8')
print('Configured signed Capacitor release with R8 and resource shrinking')
