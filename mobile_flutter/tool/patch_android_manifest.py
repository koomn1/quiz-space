from pathlib import Path
import re
import sys

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('android/app/src/main/AndroidManifest.xml')
text = path.read_text(encoding='utf-8')

if 'io.quizspace.mobile' in text:
    print('Deep link already configured')
    raise SystemExit(0)

activity_pattern = re.compile(r'(<activity\b(?=[^>]*android:name="\\.MainActivity")[^>]*>)', re.DOTALL)
match = activity_pattern.search(text)
if not match:
    raise SystemExit('MainActivity entry was not found in AndroidManifest.xml')

intent_filter = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="io.quizspace.mobile"
                    android:host="login-callback" />
            </intent-filter>'''

updated = text[:match.end()] + intent_filter + text[match.end():]
path.write_text(updated, encoding='utf-8')
print(f'Configured deep link in {path}')
